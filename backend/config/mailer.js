const Brevo = require('@getbrevo/brevo');

const client = Brevo.ApiClient.instance;
client.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

const apiInstance = new Brevo.TransactionalEmailsApi();

const sendMail = async ({ to, subject, html }) => {
  const email = new Brevo.SendSmtpEmail();
  email.to = [{ email: to }];
  email.subject = subject;
  email.htmlContent = html;
  email.sender = { name: 'Equipo TecHub', email: 'SoporteTecHub@gmail.com' };

  await apiInstance.sendTransacEmail(email);
};

module.exports = { sendMail };