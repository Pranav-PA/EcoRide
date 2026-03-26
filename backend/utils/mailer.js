const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,         // e.g. smtp.gmail.com
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendVerificationEmail(toEmail, name, link) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject: 'Verify your email for Ecoride',
    html: `
      <p>Hi ${name || 'there'},</p>
      <p>Thanks for signing up. Click the link below to verify your email:</p>
      <p><a href="${link}">Verify my email</a></p>
      <p>If the link doesn't work, copy-paste this URL into your browser:</p>
      <pre>${link}</pre>
      <p>If you didn't register, ignore this email.</p>
    `
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { sendVerificationEmail };