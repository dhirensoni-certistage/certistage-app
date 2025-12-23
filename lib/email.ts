import nodemailer from 'nodemailer'

// Create SMTP transporter with better settings for serverless
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    // Better settings for serverless
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 15000,
    pool: false, // Don't use connection pooling in serverless
    maxConnections: 1
  } as nodemailer.TransportOptions)
}

export interface EmailTemplate {
  to: string
  subject: string
  html: string
}

export interface SendEmailOptions extends EmailTemplate {
  template?: string
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

export async function sendEmail({ to, subject, html, template = "custom", metadata }: SendEmailOptions): Promise<{ success: boolean; error?: any; data?: any }> {
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

  try {
    const transporter = createTransporter()
    
    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL || `CertiStage <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    })
    
    console.log('Email sent successfully:', info.messageId)
    
    // Log successful email
    await logEmail({
      to,
      subject,
      template,
      htmlContent: html,
      status: "sent",
      metadata
    })
    
    // Close connection
    transporter.close()
    
    return { success: true, data: info }
  } catch (error: any) {
    console.error('Email sending failed:', error.message || error)
    
    // Log failed email
    await logEmail({
      to,
      subject,
      template,
      htmlContent: html,
      status: "failed",
      errorMessage: error.message || 'Email sending failed',
      metadata
    })
    
    return { success: false, error: error.message || 'Email sending failed' }
  }
}

// Email Templates
export const emailTemplates = {
  welcome: (name: string, email: string) => ({
    subject: 'Welcome to CertiStage! 🎉',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin: 0;">Welcome to CertiStage!</h1>
          </div>
          <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
            <h2 style="color: #1f2937; margin-top: 0;">Hi ${name}! 👋</h2>
            <p>Thank you for joining CertiStage! We're excited to help you create and manage professional certificates with ease.</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #10b981; margin-top: 0;">🚀 Get Started:</h3>
              <ul style="padding-left: 20px;">
                <li>Create your first event</li>
                <li>Design certificate templates</li>
                <li>Add recipients and generate certificates</li>
                <li>Share and download certificates</li>
              </ul>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/client/events" style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Start Creating Certificates</a>
            </div>
          </div>
          <div style="text-align: center; color: #6b7280; font-size: 14px;">
            <p>Need help? Reply to this email or visit our <a href="${process.env.NEXT_PUBLIC_APP_URL}/contact" style="color: #10b981;">support page</a>.</p>
            <p>© 2025 CertiStage. All rights reserved.</p>
          </div>
        </body>
      </html>
    `
  }),

  passwordReset: (name: string, resetUrl: string) => ({
    subject: 'Reset Your CertiStage Password 🔐',
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;"><h1 style="color: #10b981; margin: 0;">CertiStage</h1></div>
          <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
            <h2 style="color: #1f2937; margin-top: 0;">Password Reset Request</h2>
            <p>Hi ${name},</p>
            <p>We received a request to reset your password for your CertiStage account.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Reset Password</a>
            </div>
            <div style="background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; font-size: 14px;"><strong>Security Note:</strong> This link will expire in 1 hour. If you didn't request this reset, please ignore this email.</p>
            </div>
          </div>
          <div style="text-align: center; color: #6b7280; font-size: 14px;">
            <p>If the button doesn't work, copy and paste this link: <br><a href="${resetUrl}" style="color: #10b981; word-break: break-all;">${resetUrl}</a></p>
            <p>© 2025 CertiStage. All rights reserved.</p>
          </div>
        </body>
      </html>
    `
  }),

  paymentSuccess: (name: string, plan: string, amount: number) => ({
    subject: `Payment Successful - Welcome to ${plan}! 💳`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;"><h1 style="color: #10b981; margin: 0;">Payment Successful! 🎉</h1></div>
          <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
            <h2 style="color: #1f2937; margin-top: 0;">Thank you, ${name}!</h2>
            <p>Your payment has been processed successfully. Welcome to the ${plan} plan!</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #10b981; margin-top: 0;">📋 Payment Details:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Plan:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${plan}</td></tr>
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Amount:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${amount / 100}</td></tr>
                <tr><td style="padding: 8px 0;"><strong>Status:</strong></td><td style="padding: 8px 0; text-align: right; color: #10b981;"><strong>Paid</strong></td></tr>
              </table>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/client/dashboard" style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Access Dashboard</a>
            </div>
          </div>
          <div style="text-align: center; color: #6b7280; font-size: 14px;">
            <p>Questions? Contact us at <a href="mailto:support@certistage.com" style="color: #10b981;">support@certistage.com</a></p>
            <p>© 2025 CertiStage. All rights reserved.</p>
          </div>
        </body>
      </html>
    `
  }),

  emailVerification: (name: string, verificationUrl: string) => ({
    subject: 'Verify Your Email - Complete CertiStage Registration 📧',
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;"><h1 style="color: #10b981; margin: 0;">Welcome to CertiStage! 🎉</h1></div>
          <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
            <h2 style="color: #1f2937; margin-top: 0;">Hi ${name}! 👋</h2>
            <p>Thank you for signing up with CertiStage! We're excited to have you on board.</p>
            <p>To complete your registration and set up your password, please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">Verify Email & Set Password</a>
            </div>
            <div style="background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; font-size: 14px;"><strong>Important:</strong> This link will expire in 24 hours. If you didn't create this account, please ignore this email.</p>
            </div>
          </div>
          <div style="text-align: center; color: #6b7280; font-size: 14px;">
            <p>If the button doesn't work, copy and paste this link: <br><a href="${verificationUrl}" style="color: #10b981; word-break: break-all;">${verificationUrl}</a></p>
            <p>Need help? Reply to this email or visit our <a href="${process.env.NEXT_PUBLIC_APP_URL}/contact" style="color: #10b981;">support page</a>.</p>
            <p>© 2025 CertiStage. All rights reserved.</p>
          </div>
        </body>
      </html>
    `
  }),

  adminNotification: (type: 'signup' | 'payment', data: any) => ({
    subject: type === 'signup' ? '🆕 New User Signup' : '💰 New Payment Received',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>${type === 'signup' ? '🆕 New User Signup' : '💰 New Payment Received'}</h2>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px;">
            ${type === 'signup' ? `
              <p><strong>Name:</strong> ${data.name}</p>
              <p><strong>Email:</strong> ${data.email}</p>
              <p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
              <p><strong>Organization:</strong> ${data.organization || 'Not provided'}</p>
            ` : `
              <p><strong>User:</strong> ${data.userName} (${data.userEmail})</p>
              <p><strong>Plan:</strong> ${data.plan}</p>
              <p><strong>Amount:</strong> ₹${data.amount / 100}</p>
              <p><strong>Payment ID:</strong> ${data.paymentId}</p>
            `}
            <p><strong>Time:</strong> ${new Date().toLocaleString('en-IN')}</p>
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
  }) => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://certistage.com'
    const logoUrl = `${appUrl}/Certistage-logo.svg`
    const formattedDate = data.paymentDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    const formattedValidUntil = data.validUntil.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    
    return {
      subject: `Invoice #${data.invoiceNumber} - CertiStage ${data.planName} Plan`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invoice #${data.invoiceNumber}</title>
          </head>
          <body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 650px; margin: 0 auto; padding: 20px; background-color: #f3f4f6;">
            <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              
              <!-- Header with Logo -->
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
                <img src="${logoUrl}" alt="CertiStage" style="height: 40px; margin-bottom: 10px;" onerror="this.style.display='none'">
                <h1 style="color: white; margin: 10px 0 5px 0; font-size: 28px; font-weight: 600;">INVOICE</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 14px;">#${data.invoiceNumber}</p>
              </div>

              <!-- Invoice Details -->
              <div style="padding: 30px;">
                
                <!-- Company & Customer Info -->
                <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
                  <div style="flex: 1;">
                    <h3 style="color: #10b981; margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">From</h3>
                    <p style="margin: 0; font-weight: 600;">CertiStage</p>
                    <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">Certificate Generation Platform</p>
                    <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">support@certistage.com</p>
                    <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">www.certistage.com</p>
                  </div>
                  <div style="flex: 1; text-align: right;">
                    <h3 style="color: #10b981; margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Bill To</h3>
                    <p style="margin: 0; font-weight: 600;">${data.customerName}</p>
                    <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">${data.customerEmail}</p>
                    ${data.customerPhone ? `<p style="margin: 5px 0; color: #6b7280; font-size: 14px;">${data.customerPhone}</p>` : ''}
                    ${data.customerOrganization ? `<p style="margin: 5px 0; color: #6b7280; font-size: 14px;">${data.customerOrganization}</p>` : ''}
                  </div>
                </div>

                <!-- Invoice Meta -->
                <div style="background: #f8fafc; padding: 15px 20px; border-radius: 8px; margin-bottom: 25px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 5px 0;"><span style="color: #6b7280; font-size: 13px;">Invoice Date:</span></td>
                      <td style="padding: 5px 0; text-align: right; font-weight: 500;">${formattedDate}</td>
                      <td style="padding: 5px 0; padding-left: 30px;"><span style="color: #6b7280; font-size: 13px;">Payment ID:</span></td>
                      <td style="padding: 5px 0; text-align: right; font-weight: 500; font-family: monospace; font-size: 12px;">${data.paymentId}</td>
                    </tr>
                    <tr>
                      <td style="padding: 5px 0;"><span style="color: #6b7280; font-size: 13px;">Valid Until:</span></td>
                      <td style="padding: 5px 0; text-align: right; font-weight: 500;">${formattedValidUntil}</td>
                      <td style="padding: 5px 0; padding-left: 30px;"><span style="color: #6b7280; font-size: 13px;">Status:</span></td>
                      <td style="padding: 5px 0; text-align: right;"><span style="background: #d1fae5; color: #059669; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">PAID</span></td>
                    </tr>
                  </table>
                </div>

                <!-- Items Table -->
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                  <thead>
                    <tr style="background: #f8fafc;">
                      <th style="padding: 12px 15px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Description</th>
                      <th style="padding: 12px 15px; text-align: center; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Duration</th>
                      <th style="padding: 12px 15px; text-align: right; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style="padding: 15px; border-bottom: 1px solid #e5e7eb;">
                        <p style="margin: 0; font-weight: 600;">${data.planName} Plan</p>
                        <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 13px;">Annual Subscription - CertiStage</p>
                      </td>
                      <td style="padding: 15px; text-align: center; border-bottom: 1px solid #e5e7eb;">1 Year</td>
                      <td style="padding: 15px; text-align: right; border-bottom: 1px solid #e5e7eb; font-weight: 500;">₹${(data.amount / 100).toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>

                <!-- Totals -->
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Plan Amount</td>
                      <td style="padding: 8px 0; text-align: right;">₹${(data.amount / 100).toLocaleString('en-IN')}</td>
                    </tr>
                    ${data.gatewayFee ? `
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Payment Gateway Charges</td>
                      <td style="padding: 8px 0; text-align: right;">₹${(data.gatewayFee / 100).toLocaleString('en-IN')}</td>
                    </tr>
                    ` : ''}
                    <tr style="border-top: 2px solid #e5e7eb;">
                      <td style="padding: 12px 0; font-size: 18px; font-weight: 700; color: #10b981;">Total Paid</td>
                      <td style="padding: 12px 0; text-align: right; font-size: 18px; font-weight: 700; color: #10b981;">₹${(data.totalAmount / 100).toLocaleString('en-IN')}</td>
                    </tr>
                  </table>
                </div>

                <!-- Thank You Note -->
                <div style="text-align: center; margin-top: 30px; padding: 20px; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 8px;">
                  <p style="margin: 0; font-size: 16px; color: #059669; font-weight: 600;">🎉 Thank you for your purchase!</p>
                  <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">Your ${data.planName} plan is now active.</p>
                </div>

                <!-- CTA Button -->
                <div style="text-align: center; margin-top: 25px;">
                  <a href="${appUrl}/client/dashboard" style="background: #10b981; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 15px;">Go to Dashboard</a>
                </div>
              </div>

              <!-- Footer -->
              <div style="background: #1f2937; padding: 25px; text-align: center;">
                <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 13px;">This is a computer-generated invoice and does not require a signature.</p>
                <p style="margin: 0; color: #6b7280; font-size: 12px;">© 2025 CertiStage. All rights reserved.</p>
                <p style="margin: 10px 0 0 0;">
                  <a href="${appUrl}" style="color: #10b981; text-decoration: none; font-size: 12px;">www.certistage.com</a>
                  <span style="color: #4b5563; margin: 0 10px;">|</span>
                  <a href="mailto:support@certistage.com" style="color: #10b981; text-decoration: none; font-size: 12px;">support@certistage.com</a>
                </p>
              </div>
            </div>
          </body>
        </html>
      `
    }
  }
}
