ADD VALUE REFRESH — WEBSITE
An Add Value Group company

PAGES
  index.html ............ Home
  process.html .......... Our Process
  projects.html ......... Our Work (real AVR project photos)
  about.html ............ About Us
  team.html ............. Our Team
  add-value-makeover-estimator.html ... Instant Cost Estimator (wizard + PDF)

HOW TO USE
  Open index.html in any browser. All pages are self-contained and cross-linked.
  Upload the whole folder to any web host (or drop into WordPress) and it works as-is.

NOTES
  - Project & team photos are loaded from addvaluerenovations.co.nz. Replace with
    Refresh-specific images on your own hosting when ready.
  - Contact form: posts to /api/contact on Vercel and sends to hello@avr.nz by
    default. Production needs EMAIL_WEBHOOK_URL and EMAIL_WEBHOOK_TOKEN set.
    CONTACT_TO_EMAIL can override the recipient if needed.
  - Estimator: to switch on the auto-email to the owner + Notion lead, open
    add-value-makeover-estimator.html and paste your webhook URL into:
        const WEBHOOK_URL = "";

© 2026 Add Value Group
