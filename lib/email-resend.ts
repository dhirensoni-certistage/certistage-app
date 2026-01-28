// Alternative email service using Resend (works better with Vercel)
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmailViaResend(options: {
  to: string
  subject: string
  html: string
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'CertiStage <noreply@certistage.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error: error.message }
    }

    console.log('Email sent via Resend:', data?.id)
    return { success: true, data }
  } catch (error: any) {
    console.error('Resend exception:', error)
    return { success: false, error: error.message }
  }
}
