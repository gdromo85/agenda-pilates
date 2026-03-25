import sgMail from '@sendgrid/mail'

type SendEmailInput = {
  to: string
  subject: string
  text: string
}

/**
 * MVP provider for notifications.
 * Current provider is email via SendGrid; if missing config, logs and continues.
 */
export async function sendNotificationEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY
  const from = process.env.SENDGRID_FROM_EMAIL ?? 'no-reply@pilates.example.com'

  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.warn('SENDGRID_API_KEY not configured, fallback log notification', {
      to: input.to,
      subject: input.subject,
      text: input.text,
    })
    return
  }

  sgMail.setApiKey(apiKey)
  await sgMail.send({
    to: input.to,
    from,
    subject: input.subject,
    text: input.text,
  })
}

export default { sendNotificationEmail }
