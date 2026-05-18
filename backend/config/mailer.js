const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendMail = async ({ to, subject, html }) => {
  const { data, error } = await resend.emails.send({
    from: 'TecHub <onboarding@resend.dev>',
    to: 'allan031199@gmail.com',
    subject,
    html
  });

  if (error) throw new Error(error.message);
  return data;
};

module.exports = { sendMail };