const sendMail = async ({ to, subject, html }) => {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY
    },
    body: JSON.stringify({
      sender: { name: 'Equipo TecHub', email: 'SoporteTecHub@gmail.com' },
      to: [{ email: to }],
      subject,
      htmlContent: html
    })
  });

  const data = await response.json();
  console.log('Respuesta Brevo:', JSON.stringify(data)); // ← agrega esto

  if (!response.ok) {
    console.error('❌ Error Brevo:', data);
    throw new Error(data.message);
  }

  console.log('✅ Correo enviado a:', to);
};

module.exports = { sendMail };