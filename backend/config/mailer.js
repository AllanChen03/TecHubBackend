const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('EMAIL:', process.env.EMAIL);         // ← agrega esto
console.log('EMAILPASSWORD:', process.env.EMAILPASSWORD ? 'existe' : 'no existe'); // ← y esto

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAILPASSWORD
  },
  tls: {
    rejectUnauthorized: false
  }
});

transporter.verify().then(() => {
  console.log('Listo para enviar correos de verificación');
}).catch((error) => {
  console.error('Error configurando el correo: ', error);
});

module.exports = transporter;