const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAILPASSWORD
  }
});

transporter.verify().then(() => {
  console.log('✅ Listo para enviar correos');
}).catch((error) => {
  console.error('❌ Error configurando el correo:', error.message);
});

const sendMail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"Equipo TecHub" <${process.env.EMAIL}>`,
    to,
    subject,
    html
  });
};

module.exports = { sendMail };