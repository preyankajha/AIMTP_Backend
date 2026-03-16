const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Use a test account or configure your real SMTP credentials in .env
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false // Helps with some local dev certificate issues
    }
  });

  const mailOptions = {
    from: `All India Mutual Transfer Portal <${process.env.SMTP_USER || 'noreply@aimtp.in'}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
