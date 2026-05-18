const { TransactionalEmailsApi, ApiClient, SendSmtpEmail } = require('@getbrevo/brevo');

const apiInstance = new TransactionalEmailsApi();
apiInstance.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

const sendMail = async ({ to, subject, html }) => {
  const email = new SendSmtpEmail();
  email.to = [{ email: to }];
  email.subject = subject;
  email.htmlContent = html;
  email.sender = { name: 'Equipo TecHub', email: 'SoporteTecHub@gmail.com' };

  await apiInstance.sendTransacEmail(email);
};

module.exports = { sendMail };