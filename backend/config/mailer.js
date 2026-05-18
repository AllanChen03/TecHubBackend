const sendMail = async ({ to, subject, html }) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: 'TecHub <onboarding@resend.dev>',
      to: 'allan031199@gmail.com', // ← tu email registrado en Resend
      subject,
      html
    })
  });

  const data = await response.json();
  console.log('Respuesta Resend:', JSON.stringify(data));

  if (!response.ok) {
    console.error('❌ Error Resend:', data);
    throw new Error(data.message);
  }

  console.log('✅ Correo enviado');
};

module.exports = { sendMail };