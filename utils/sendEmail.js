const nodemailer = require("nodemailer");

// Is SMTP fully configured? If not, fall back to logging (dev mode).
const isSmtpConfigured = () =>
  Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );

// Lazy transport so nodemailer is only wired when SMTP credentials exist.
let transporterCache = null;
const getTransporter = () => {
  if (!transporterCache) {
    transporterCache = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporterCache;
};

/**
 * Send an email via nodemailer.
 *
 * TODO: Configure SMTP credentials in .env before going to production:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.
 * Until then, emails are logged to the console (dev mode).
 */
const sendEmail = async ({ to, subject, text, html }) => {
  if (!isSmtpConfigured()) {
    console.log(`[DEV-EMAIL] To: ${to}\nSubject: ${subject}\n${text || ""}\n`);
    return { provider: "dev-log", messageId: `dev_${Date.now()}` };
  }

  const info = await getTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });

  return { provider: "smtp", messageId: info.messageId };
};

module.exports = { sendEmail, isSmtpConfigured };
