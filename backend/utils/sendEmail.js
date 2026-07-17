import nodemailer from 'nodemailer';

const sendEmail = async ({ to, subject, text }) => {
  if (!process.env.SMTP_HOST) {
    console.log(`[DEV EMAIL] To: ${to} | ${subject} | ${text}`);
    return;
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, text });
};

export default sendEmail;
