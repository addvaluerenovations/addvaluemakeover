const DEFAULT_TO = "hello@avr.nz";
const SITE_NAME = "Add Value Makeover";
const WINDOW_MS = 10 * 60 * 1000;
const MAX_SUBMISSIONS_PER_WINDOW = 5;
const rateBuckets = new Map();

function clean(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim();
}

function isEmail(value) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(value || ""));
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function getIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) return forwarded.split(",")[0].trim();
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "unknown";
}

function isRateLimited(ip) {
  const now = Date.now();
  const bucket = rateBuckets.get(ip) || [];
  const recent = bucket.filter((time) => now - time < WINDOW_MS);
  recent.push(now);
  rateBuckets.set(ip, recent);
  return recent.length > MAX_SUBMISSIONS_PER_WINDOW;
}

function hasSpamContent(fields) {
  const text = fields.join(" ").toLowerCase();
  const linkCount = (text.match(/https?:\/\//g) || []).length + (text.match(/\bwww\./g) || []).length;
  if (linkCount > 1) return true;
  if (/\b(?:casino|crypto|forex|loan|viagra|seo package|backlinks?)\b/i.test(text)) return true;
  return false;
}

function validSubmitTime(value) {
  const submittedAt = Number(value);
  if (!Number.isFinite(submittedAt)) return false;
  const age = Date.now() - submittedAt;
  return age >= 3000 && age <= 2 * 60 * 60 * 1000;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  let body = {};
  if (typeof req.body === "string") {
    try {
      body = JSON.parse(req.body);
    } catch {
      return sendJson(res, 400, { error: "Invalid JSON" });
    }
  } else if (typeof req.body === "object" && req.body) {
    body = req.body;
  }

  const honeypot = clean(body.company);
  if (honeypot) return sendJson(res, 200, { ok: true });

  if (!validSubmitTime(body.submittedAt)) {
    return sendJson(res, 400, { error: "Please try again in a moment." });
  }

  const ip = getIp(req);
  if (isRateLimited(ip)) {
    return sendJson(res, 429, { error: "Too many enquiries. Please try again later." });
  }

  const name = clean(body.name);
  const phone = clean(body.phone);
  const email = clean(body.email);
  const address = clean(body.address);
  const service = clean(body.service, "Not specified");
  const listDate = clean(body.listDate, "Not specified");
  const message = clean(body.message);
  const page = clean(body.page);
  const source = clean(body.source, `${SITE_NAME} - Contact form`);

  if (!name) return sendJson(res, 400, { error: "Name is required." });
  if (!phone && !email) return sendJson(res, 400, { error: "Phone or email is required." });
  if (email && !isEmail(email)) return sendJson(res, 400, { error: "Enter a valid email address." });

  const lengthChecks = [
    [name, 80],
    [phone, 40],
    [email, 120],
    [address, 160],
    [service, 120],
    [listDate, 80],
    [message, 1200]
  ];
  if (lengthChecks.some(([value, max]) => value.length > max)) {
    return sendJson(res, 400, { error: "One of the fields is too long." });
  }

  if (hasSpamContent([name, phone, email, address, service, listDate, message])) {
    return sendJson(res, 400, { error: "Your enquiry could not be sent." });
  }

  const webhookUrl = process.env.EMAIL_WEBHOOK_URL;
  const token = process.env.EMAIL_WEBHOOK_TOKEN;
  if (!webhookUrl || !token) {
    return sendJson(res, 500, { error: "Contact form is not configured." });
  }

  const to = clean(process.env.CONTACT_TO_EMAIL, DEFAULT_TO) || DEFAULT_TO;
  const subject = `${SITE_NAME} enquiry - ${name}`;
  const lines = [
    `New ${SITE_NAME} website enquiry.`,
    "",
    `Name: ${name}`,
    `Phone: ${phone || "-"}`,
    `Email: ${email || "-"}`,
    `Property: ${address || "-"}`,
    `Service: ${service}`,
    `Listing timing: ${listDate}`,
    message ? `Message: ${message}` : "",
    "",
    `Source: ${source}`,
    `Page: ${page || "-"}`,
    `IP: ${ip}`,
    `Submitted: ${new Date().toLocaleString("en-NZ", { timeZone: "Pacific/Auckland" })}`
  ].filter(Boolean);

  const payload = {
    token,
    action: "send",
    to,
    subject,
    body: lines.join("\n"),
    fromName: `${SITE_NAME} Website`,
    replyTo: email || undefined
  };

  let response;
  try {
    response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "manual"
    });
  } catch {
    return sendJson(res, 502, { error: "Email service failed." });
  }

  if (response.status < 200 || response.status >= 400) {
    return sendJson(res, 502, { error: "Email service failed." });
  }

  return sendJson(res, 200, { ok: true });
};
