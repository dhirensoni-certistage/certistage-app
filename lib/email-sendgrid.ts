// SendGrid email service (works perfectly with Vercel)
import sgMail from '@sendgrid/mail'

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

export interface SendGridEmailOptions {
  to: string | string[]
  subject: string
  html: string
  cc?: string | string[]
  template?: string
  metadata?: any
}

export async function sendEmailViaSendGrid(options: SendGridEmailOptions): Promise<{ success: boolean; error?: any; data?: any }> {
  // Check if SendGrid is configured
  if (!process.env.SENDGRID_API_KEY) {
    console.error('SendGrid API key not configured')
    return { success: false, error: 'SendGrid not configured' }
  }

  if (!process.env.SENDGRID_FROM_EMAIL) {
    console.error('SendGrid FROM email not configured')
    return { success: false, error: 'SendGrid FROM email not configured' }
  }

  try {
    const msg: any = {
      to: options.to,
      from: process.env.SENDGRID_FROM_EMAIL, // Must be verified in SendGrid
      subject: options.subject,
      html: options.html,
    }

    // Add CC if provided
    if (options.cc) {
      msg.cc = options.cc
    }

    // Send email
    const response = await sgMail.send(msg)
    
    console.log('Email sent via SendGrid successfully:', response[0].statusCode)
    
    return { 
      success: true, 
      data: { 
        statusCode: response[0].statusCode,
        messageId: response[0].headers['x-message-id']
      } 
    }
  } catch (error: any) {
    console.error('SendGrid error:', error.response?.body || error.message || error)
    
    return { 
      success: false, 
      error: error.response?.body?.errors?.[0]?.message || error.message || 'SendGrid email failed' 
    }
  }
}
