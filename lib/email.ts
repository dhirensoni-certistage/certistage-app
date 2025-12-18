import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailTemplate {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: EmailTemplate) {
  try {
    const data = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'CertiStage <noreply@certistage.com>',
      to: [to],
      subject,
      html,
    })
    
    console.log('Email sent successfully:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Email sending failed:', error)
    return { success: false, error }
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
          <title>Welcome to CertiStage</title>
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
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/client/events" 
                 style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Start Creating Certificates
              </a>
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
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin: 0;">CertiStage</h1>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
            <h2 style="color: #1f2937; margin-top: 0;">Password Reset Request</h2>
            <p>Hi ${name},</p>
            <p>We received a request to reset your password for your CertiStage account.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
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
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Successful</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin: 0;">Payment Successful! 🎉</h1>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
            <h2 style="color: #1f2937; margin-top: 0;">Thank you, ${name}!</h2>
            <p>Your payment has been processed successfully. Welcome to the ${plan} plan!</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #10b981; margin-top: 0;">📋 Payment Details:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Plan:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${plan}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Amount:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${amount}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Status:</strong></td>
                  <td style="padding: 8px 0; text-align: right; color: #10b981;"><strong>Paid</strong></td>
                </tr>
              </table>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/client/dashboard" 
                 style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Access Dashboard
              </a>
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
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin: 0;">Welcome to CertiStage! 🎉</h1>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
            <h2 style="color: #1f2937; margin-top: 0;">Hi ${name}! 👋</h2>
            <p>Thank you for signing up with CertiStage! We're excited to have you on board.</p>
            <p>To complete your registration and set up your password, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
                Verify Email & Set Password
              </a>
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
              <p><strong>Amount:</strong> ₹${data.amount}</p>
              <p><strong>Payment ID:</strong> ${data.paymentId}</p>
            `}
            <p><strong>Time:</strong> ${new Date().toLocaleString('en-IN')}</p>
          </div>
        </body>
      </html>
    `
  })
}