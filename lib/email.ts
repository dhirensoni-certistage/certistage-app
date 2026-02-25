import nodemailer from 'nodemailer'

const EMAIL_BRAND = {
  primary: '#171717',
  accent: '#171717',
  accentSoft: '#f5f5f5',
  textMuted: '#6b7280'
} as const

// Create SMTP transporter with resilient settings for serverless
function createTransporter(port: number) {
  const isPort465 = port === 465

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port,
    secure: isPort465, // true for 465 (SSL), false for 587 (STARTTLS)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    // More tolerant timeouts to reduce transient provider timeout failures
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 30000,
    pool: false,
    maxConnections: 1,
    requireTLS: !isPort465, // Force STARTTLS upgrade on 587
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    }
  } as nodemailer.TransportOptions)
}

export interface EmailTemplate {
  to: string
  subject: string
  html: string
}

export interface SendEmailOptions extends EmailTemplate {
  template?: string
  cc?: string | string[]
  metadata?: {
    userId?: string
    userName?: string
    type?: string
    [key: string]: any
  }
}

// Log email to database
async function logEmail(options: {
  to: string
  subject: string
  template: string
  htmlContent: string
  status: "initiated" | "sent" | "failed"
  errorMessage?: string
  metadata?: any
}) {
  try {
    // Dynamic import to avoid circular dependencies
    const connectDB = (await import('@/lib/mongodb')).default
    const EmailLog = (await import('@/models/EmailLog')).default
    
    await connectDB()
    
    await EmailLog.create({
      to: options.to,
      subject: options.subject,
      template: options.template,
      htmlContent: options.htmlContent,
      status: options.status,
      errorMessage: options.errorMessage,
      metadata: options.metadata,
      sentAt: options.status === "sent" ? new Date() : undefined
    })
  } catch (error) {
    console.error('Failed to log email:', error)
  }
}

export async function sendEmail({ to, subject, html, template = "custom", cc, metadata }: SendEmailOptions): Promise<{ success: boolean; error?: any; data?: any }> {
  // Try SendGrid first (if configured), fallback to SMTP
  if (process.env.SENDGRID_API_KEY) {
    console.log('Using SendGrid for email delivery...')
    const { sendEmailViaSendGrid } = await import('./email-sendgrid')
    
    const result = await sendEmailViaSendGrid({ to, subject, html, cc, template, metadata })
    
    // Log email
    await logEmail({
      to,
      subject,
      template,
      htmlContent: html,
      status: result.success ? "sent" : "failed",
      errorMessage: result.success ? undefined : result.error,
      metadata
    })
    
    return result
  }

  // Fallback to SMTP (Hostinger)
  console.log('Using SMTP for email delivery...')
  
  // Check if SMTP is configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP not configured, skipping email')
    await logEmail({
      to,
      subject,
      template,
      htmlContent: html,
      status: "failed",
      errorMessage: "SMTP not configured",
      metadata
    })
    return { success: false, error: 'SMTP not configured' }
  }

  const configuredPort = parseInt(process.env.SMTP_PORT || '587')
  const fallbackPort = configuredPort === 465 ? 587 : 465
  const portsToTry = Array.from(new Set([configuredPort, fallbackPort]))

  const mailOptions: any = {
    from: process.env.FROM_EMAIL || `CertiStage <${process.env.SMTP_USER}>`,
    to,
    subject,
    html
  }

  if (cc) {
    mailOptions.cc = cc
  }

  let lastError: any = null

  for (const port of portsToTry) {
    const transporter = createTransporter(port)
    try {
      console.log(`Attempting to send email via SMTP port ${port}...`)
      const info = await transporter.sendMail(mailOptions)
      console.log('Email sent successfully:', info.messageId, `(port ${port})`)

      await logEmail({
        to,
        subject,
        template,
        htmlContent: html,
        status: "sent",
        metadata: {
          ...metadata,
          smtpPort: port
        }
      })

      transporter.close()
      return { success: true, data: info }
    } catch (error: any) {
      lastError = error
      console.error(`SMTP send failed on port ${port}:`, error.message || error)
      transporter.close()
    }
  }

  await logEmail({
    to,
    subject,
    template,
    htmlContent: html,
    status: "failed",
    errorMessage: lastError?.message || 'Email sending failed',
    metadata
  })

  return { success: false, error: lastError?.message || 'Email sending failed' }
}

// Email header helper function
function getEmailHeader(type: 'simple' | 'marketing' = 'simple'): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://certistage.com'
  const logoUrl = `${appUrl}/Certistage-logo.svg`
  const logoIconUrl = `${appUrl}/Certistage_icon.svg`
  
  if (type === 'simple') {
    // Simple header for transactional emails (signup, payment, verification)
    return `
      <div style="background: linear-gradient(135deg, ${EMAIL_BRAND.primary} 0%, #262626 100%); padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <img src="${logoIconUrl}" alt="CertiStage" width="40" height="40" style="width: 40px; height: 40px; margin-bottom: 10px; display: inline-block; object-fit: contain;" onerror="this.style.display='none'">
              <h1 style="color: white; margin: 10px 0 5px 0; font-size: 28px; font-weight: 700; letter-spacing: 0.2px; font-family: Arial, sans-serif;">CertiStage</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 14px; font-family: Arial, sans-serif;">Professional Certificate Issuing Platform</p>
            </td>
          </tr>
        </table>
      </div>
    `
  } else {
    // Marketing header - you can add your fancy design here later
    return `
      <div style="background: linear-gradient(135deg, ${EMAIL_BRAND.primary} 0%, #262626 100%); padding: 40px 20px; text-align: center;">
        <img src="${logoUrl}" alt="CertiStage" style="height: 50px; margin-bottom: 15px;">
        <h1 style="color: white; font-size: 32px; margin: 0; font-family: Arial, sans-serif;">Professional Certificate Issuing Platform</h1>
        <p style="color: rgba(255,255,255,0.95); font-size: 16px; margin: 10px 0 0 0; font-family: Arial, sans-serif;">Secure | Professional | Reliable</p>
      </div>
    `
  }
}

// Email footer helper function
function getEmailFooter(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://certistage.com'
  return `
    <div style="background: #111111; padding: 25px 20px; text-align: center; border-radius: 0 0 12px 12px; margin-top: 30px;">
      <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 13px; font-family: Arial, sans-serif;">This is an automated email from CertiStage. Please do not reply.</p>
      <p style="margin: 0; color: #6b7280; font-size: 12px; font-family: Arial, sans-serif;">(c) 2026 CertiStage. All rights reserved.</p>
      <p style="margin: 10px 0 0 0; font-family: Arial, sans-serif;">
        <a href="${appUrl}" style="color: #d1d5db; text-decoration: none; font-size: 12px;">www.certistage.com</a>
        <span style="color: #4b5563; margin: 0 10px;">|</span>
        <a href="mailto:support@certistage.com" style="color: #d1d5db; text-decoration: none; font-size: 12px;">support@certistage.com</a>
      </p>
    </div>
  `
}

// Email Templates
export const emailTemplates = {
  welcome: (name: string) => ({
    subject: 'Welcome to CertiStage',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f3f4f6;">
          <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin: 20px;">
            ${getEmailHeader('simple')}
            <div style="padding: 30px 20px;">
              <h2 style="color: #1f2937; margin-top: 0;">Hi ${name},</h2>
              <p>Thank you for joining CertiStage! We're excited to help you create and manage professional certificates with ease.</p>
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${EMAIL_BRAND.accent};">
                <h3 style="color: #171717; margin-top: 0; font-size: 18px;">Get Started:</h3>
                <ul style="padding-left: 20px; margin: 10px 0;">
                  <li style="margin: 8px 0;">Create and manage events</li>
                  <li style="margin: 8px 0;">Upload digital certificate templates</li>
                  <li style="margin: 8px 0;">Upload or add recipient data</li>
                  <li style="margin: 8px 0;">Generate certificate links</li>
                  <li style="margin: 8px 0;">Share individual or public link and download certificates instantly</li>
                </ul>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/client/events" style="background: ${EMAIL_BRAND.accent}; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 15px;">Start Creating Certificates</a>
              </div>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Need help? Reply to this email or visit our <a href="${process.env.NEXT_PUBLIC_APP_URL}/contact" style="color: ${EMAIL_BRAND.accent}; text-decoration: none;">support page</a>.</p>
            </div>
            ${getEmailFooter()}
          </div>
        </body>
      </html>
    `
  }),

  emailVerification: (name: string, verificationLink: string) => ({
    subject: 'Verify Your Email - CertiStage',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f3f4f6;">
          <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin: 20px;">
            ${getEmailHeader('simple')}
            <div style="padding: 30px 20px;">
              <h2 style="color: #1f2937; margin-top: 0;">Welcome to CertiStage</h2>
              <p>Hi ${name},</p>
              <p>Thank you for signing up with CertiStage! We're excited to have you on board.</p>
              <p>To complete your registration and start creating professional certificates, please verify your email address by clicking the button below:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationLink}" style="background: ${EMAIL_BRAND.accent}; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 15px;">Verify Email Address</a>
              </div>
              <div style="background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px;"><strong>Security Note:</strong> This verification link will expire in 24 hours. If you didn't create an account with CertiStage, please ignore this email.</p>
              </div>
              <p style="color: #6b7280; font-size: 13px; margin-top: 20px;">If the button doesn't work, copy and paste this link into your browser: <br><a href="${verificationLink}" style="color: ${EMAIL_BRAND.accent}; word-break: break-all; font-size: 12px;">${verificationLink}</a></p>
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${EMAIL_BRAND.accent};">
                <h3 style="color: #171717; margin-top: 0; font-size: 18px;">What's Next?</h3>
                <p style="margin: 10px 0; font-size: 14px;">Once verified, you'll be able to:</p>
                <ul style="padding-left: 20px; margin: 10px 0;">
                  <li style="margin: 8px 0;">Create and manage events</li>
                  <li style="margin: 8px 0;">Upload digital certificate templates</li>
                  <li style="margin: 8px 0;">Upload or add recipient data</li>
                  <li style="margin: 8px 0;">Generate certificate links</li>
                  <li style="margin: 8px 0;">Share individual or public link and download certificates instantly</li>
                </ul>
              </div>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Need help? Contact us at <a href="mailto:support@certistage.com" style="color: ${EMAIL_BRAND.accent}; text-decoration: none;">support@certistage.com</a></p>
            </div>
            ${getEmailFooter()}
          </div>
        </body>
      </html>
    `
  }),

  passwordReset: (name: string, resetUrl: string) => ({
    subject: 'Reset Your CertiStage Password',
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f3f4f6;">
          <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin: 20px;">
            ${getEmailHeader('simple')}
            <div style="padding: 30px 20px;">
              <h2 style="color: #1f2937; margin-top: 0;">Password Reset Request</h2>
              <p>Hi ${name},</p>
              <p>We received a request to reset your password for your CertiStage account.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background: ${EMAIL_BRAND.accent}; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 15px;">Reset Password</a>
              </div>
              <div style="background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; font-size: 14px;"><strong>Security Note:</strong> This link will expire in 1 hour. If you didn't request this reset, please ignore this email.</p>
              </div>
              <p style="color: #6b7280; font-size: 13px; margin-top: 20px;">If the button doesn't work, copy and paste this link: <br><a href="${resetUrl}" style="color: ${EMAIL_BRAND.accent}; word-break: break-all; font-size: 12px;">${resetUrl}</a></p>
            </div>
            ${getEmailFooter()}
          </div>
        </body>
      </html>
    `
  }),

  adminNotification: (type: 'signup' | 'payment', data: any) => ({
    subject: type === 'signup' ? 'New User Signup' : 'New Payment Received',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f3f4f6;">
          <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin: 20px; padding: 30px 20px;">
            <h2 style="color: #1f2937; margin-top: 0;">${type === 'signup' ? 'New User Signup' : 'New Payment Received'}</h2>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid ${EMAIL_BRAND.accent};">
              ${type === 'signup' ? `
                <p style="margin: 5px 0;"><strong>Name:</strong> ${data.name}</p>
                <p style="margin: 5px 0;"><strong>Email:</strong> ${data.email}</p>
                <p style="margin: 5px 0;"><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
                <p style="margin: 5px 0;"><strong>Organization:</strong> ${data.organization || 'Not provided'}</p>
              ` : `
                <p style="margin: 5px 0;"><strong>User:</strong> ${data.userName} (${data.userEmail})</p>
                <p style="margin: 5px 0;"><strong>Plan:</strong> ${data.plan}</p>
                <p style="margin: 5px 0;"><strong>Amount:</strong> Rs ${data.amount / 100}</p>
                <p style="margin: 5px 0;"><strong>Payment ID:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${data.paymentId}</code></p>
              `}
              <p style="margin: 5px 0;"><strong>Time:</strong> ${new Date().toLocaleString('en-IN')}</p>
            </div>
            <div style="text-align: center; margin-top: 25px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/${type === 'signup' ? 'users' : 'revenue'}" style="background: ${EMAIL_BRAND.accent}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 14px;">View in Admin Panel</a>
            </div>
          </div>
        </body>
      </html>
    `
  }),

  invoice: (data: {
    invoiceNumber: string
    customerName: string
    customerEmail: string
    customerPhone?: string
    customerOrganization?: string
    planName: string
    amount: number
    gatewayFee?: number
    totalAmount: number
    paymentId: string
    paymentDate: Date
    validUntil: Date
    invoiceUrl?: string
  }) => {
    const formattedDate = data.paymentDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    const formattedValidUntil = data.validUntil.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    const showGatewayFee = process.env.SHOW_GATEWAY_FEE_INVOICE === 'true' && !!data.gatewayFee
    const customerOrganization = String(data.customerOrganization || '').trim()
    const normalizedOrg = customerOrganization.toLowerCase()
    const showCustomerOrganization =
      customerOrganization.length > 0 &&
      normalizedOrg !== 'certistage' &&
      normalizedOrg !== 'certistage.com' &&
      normalizedOrg !== 'certificate generation platform'
    
    return {
      subject: `Payment Receipt #${data.invoiceNumber} - CertiStage ${data.planName} Plan`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invoice #${data.invoiceNumber}</title>
          </head>
          <body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 650px; margin: 0 auto; padding: 0; background-color: #f3f4f6;">
            <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin: 20px;">
              
              <!-- Header -->
              ${getEmailHeader('simple')}

              <!-- Invoice Details -->
              <div style="padding: 30px 20px;">
                
                <!-- Invoice Number Badge -->
                <div style="text-align: center; margin-bottom: 25px;">
                  <div style="background: #f8fafc; display: inline-block; padding: 10px 20px; border-radius: 8px; border: 2px solid #171717;">
                    <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Invoice Number</p>
                    <p style="margin: 5px 0 0 0; color: #1f2937; font-size: 18px; font-weight: 700;">#${data.invoiceNumber}</p>
                  </div>
                </div>

                <!-- Company & Customer Info -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 25px;">
                  <tr>
                    <td width="50%" style="vertical-align: top; padding-right: 10px;">
                      <p style="color: #171717; margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">From</p>
                      <p style="margin: 0; font-weight: 600; font-size: 15px;">CertiStage</p>
                      <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">Certificate Generation Platform</p>
                      <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">support@certistage.com</p>
                      <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">www.certistage.com</p>
                    </td>
                    <td width="50%" style="vertical-align: top; text-align: right; padding-left: 10px;">
                      <p style="color: #171717; margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Bill To</p>
                      <p style="margin: 0; font-weight: 600; font-size: 15px;">${data.customerName}</p>
                      <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">${data.customerEmail}</p>
                      ${data.customerPhone ? `<p style="margin: 5px 0; color: #6b7280; font-size: 14px;">${data.customerPhone}</p>` : ''}
                      ${showCustomerOrganization ? `<p style="margin: 5px 0; color: #6b7280; font-size: 14px;">${customerOrganization}</p>` : ''}
                    </td>
                  </tr>
                </table>

                <!-- Invoice Meta -->
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
                  <table width="100%" cellpadding="5" cellspacing="0" border="0">
                    <tr>
                      <td style="color: #6b7280; font-size: 13px;">Invoice Date:</td>
                      <td style="text-align: right; font-weight: 500;">${formattedDate}</td>
                    </tr>
                    <tr>
                      <td style="color: #6b7280; font-size: 13px;">Valid Until:</td>
                      <td style="text-align: right; font-weight: 500;">${formattedValidUntil}</td>
                    </tr>
                    <tr>
                      <td style="color: #6b7280; font-size: 13px;">Payment ID:</td>
                      <td style="text-align: right; font-weight: 500; font-family: monospace; font-size: 11px;">${data.paymentId}</td>
                    </tr>
                    <tr>
                      <td style="color: #6b7280; font-size: 13px;">Status:</td>
                      <td style="text-align: right;"><span style="background: #f5f5f5; color: #171717; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">PAID</span></td>
                    </tr>
                  </table>
                </div>

                <!-- Items Table -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
                  <thead>
                    <tr style="background: #f8fafc;">
                      <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Description</th>
                      <th style="padding: 12px; text-align: center; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Duration</th>
                      <th style="padding: 12px; text-align: right; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style="padding: 15px 12px; border-bottom: 1px solid #e5e7eb;">
                        <p style="margin: 0; font-weight: 600;">${data.planName} Plan</p>
                        <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 13px;">Annual Subscription - CertiStage</p>
                      </td>
                      <td style="padding: 15px 12px; text-align: center; border-bottom: 1px solid #e5e7eb;">1 Year</td>
                      <td style="padding: 15px 12px; text-align: right; border-bottom: 1px solid #e5e7eb; font-weight: 500;">Rs ${(data.amount / 100).toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>

                <!-- Totals -->
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                  <table width="100%" cellpadding="8" cellspacing="0" border="0">
                    <tr>
                      <td style="color: #6b7280;">Plan Amount</td>
                      <td style="text-align: right;">Rs ${(data.amount / 100).toLocaleString('en-IN')}</td>
                    </tr>
                    ${showGatewayFee ? `
                    <tr>
                      <td style="color: #6b7280;">Processing Fee</td>
                      <td style="text-align: right;">Rs ${((data.gatewayFee || 0) / 100).toLocaleString('en-IN')}</td>
                    </tr>
                    ` : ''}
                    <tr style="border-top: 2px solid #e5e7eb;">
                      <td style="padding-top: 12px; font-size: 18px; font-weight: 700; color: #171717;">Total Paid</td>
                      <td style="padding-top: 12px; text-align: right; font-size: 18px; font-weight: 700; color: #171717;">Rs ${(data.totalAmount / 100).toLocaleString('en-IN')}</td>
                    </tr>
                  </table>
                </div>

                <!-- Thank You Note -->
                <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #f5f5f5 0%, #eeeeee 100%); border-radius: 8px; margin-bottom: 20px;">
                  <p style="margin: 0; font-size: 16px; color: #171717; font-weight: 600;">Thank you for your purchase.</p>
                  <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">Your ${data.planName} plan is now active.</p>
                </div>

                <!-- CTA Button -->
                <div style="text-align: center;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/client/dashboard" style="background: ${EMAIL_BRAND.accent}; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 15px;">Go to Dashboard</a>
                </div>
                ${data.invoiceUrl ? `
                <div style="text-align: center; margin-top: 12px;">
                  <a href="${data.invoiceUrl}" style="display: inline-block; color: #171717; font-size: 13px; font-weight: 600; text-decoration: underline;">Download PDF Receipt</a>
                </div>
                ` : ''}
              </div>

              <!-- Footer -->
              ${getEmailFooter()}
            </div>
          </body>
        </html>
      `
    }
  }
}









