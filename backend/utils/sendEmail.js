const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, htmlContent) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // your Gmail
        pass: process.env.EMAIL_PASS  // app password (not normal Gmail password)
      }
    });

    const mailOptions = {
      from: `"EcoRide" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Verification email sent to:", to);
  } catch (error) {
    console.error("❌ Email send error:", error);
  }
};

module.exports = sendEmail;