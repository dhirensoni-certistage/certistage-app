import nodemailer from 'nodemailer'

const EMAIL_BRAND = {
  ink: '#111111',
  text: '#3f3f3f',
  muted: '#7a7a7a',
  line: '#e6e6e3',
  page: '#f3f3f1',
  gold: '#C8961E',
  goldSoft: '#FBF4E4'
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

export interface EmailAttachment {
  filename: string
  content: Buffer
  contentType?: string
}

export interface SendEmailOptions extends EmailTemplate {
  template?: string
  cc?: string | string[]
  replyTo?: string
  attachments?: EmailAttachment[]
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

export async function sendEmail({ to, subject, html, template = "custom", cc, replyTo, metadata, attachments }: SendEmailOptions): Promise<{ success: boolean; error?: any; data?: any }> {
  // Provider order: Brevo (BREVO_API_KEY), then SendGrid, then SMTP
  if (process.env.BREVO_API_KEY) {
    const { sendEmailViaBrevo } = await import('./email-brevo')
    const result = await sendEmailViaBrevo({ to, subject, html, cc, attachments, replyTo, tags: [template] })
    await logEmail({
      to,
      subject,
      template,
      htmlContent: html,
      status: result.success ? "sent" : "failed",
      errorMessage: result.success ? undefined : result.error,
      metadata: { ...metadata, provider: "brevo" }
    })
    return result
  }

  if (process.env.SENDGRID_API_KEY) {
    console.log('Using SendGrid for email delivery...')
    const { sendEmailViaSendGrid } = await import('./email-sendgrid')
    
    const result = await sendEmailViaSendGrid({ to, subject, html, cc, template, metadata, attachments })
    
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
  if (replyTo) {
    mailOptions.replyTo = replyTo
  }
  if (attachments?.length) {
    mailOptions.attachments = attachments.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType }))
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
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.certistage.com').replace(/\/$/, '')
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
const MONO = "'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace"

const esc = (value: unknown) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

/**
 * Shared email shell. Table-based so Gmail, Outlook and Apple Mail render it
 * the same way. The logo is a PNG (SVG does not render in most mail clients)
 * on a dark header, which stays dark when Gmail applies its dark theme.
 */
function emailLayout({ preheader, body, footerNote }: { preheader?: string; body: string; footerNote?: string }): string {
  const b = EMAIL_BRAND
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>CertiStage</title>
<style>:root{color-scheme:light;supported-color-schemes:light}</style>
</head>
<body style="margin:0;padding:0;background:${b.page};-webkit-text-size-adjust:100%;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">${esc(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${b.page}" style="background:${b.page};">
<tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
  <tr><td bgcolor="${b.ink}" style="background:${b.ink};padding:18px 28px;border-radius:12px 12px 0 0;">
    <a href="${APP_URL}" style="text-decoration:none;"><img src="${APP_URL}/email/logo-dark.png" width="170" height="42" alt="CertiStage" style="display:block;width:170px;height:42px;border:0;"></a>
  </td></tr>
  <tr><td bgcolor="#ffffff" style="background:#ffffff;padding:36px 28px 32px;border:1px solid ${b.line};border-top:0;border-radius:0 0 12px 12px;font-family:${FONT};color:${b.text};font-size:15px;line-height:1.6;">
    ${body}
  </td></tr>
  <tr><td style="padding:20px 8px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${b.muted};text-align:center;">
    ${footerNote ? `${esc(footerNote)}<br>` : ''}
    <a href="${APP_URL}" style="color:${b.muted};text-decoration:none;">www.certistage.com</a>
    &nbsp;&middot;&nbsp;
    <a href="mailto:support@certistage.com" style="color:${b.muted};text-decoration:none;">support@certistage.com</a>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

const h1 = (text: string) => `<h1 style="margin:0 0 10px;font-family:${FONT};font-size:22px;line-height:1.3;font-weight:600;color:${EMAIL_BRAND.ink};letter-spacing:-0.2px;">${text}</h1>`
const para = (text: string, extra = '') => `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.6;color:${EMAIL_BRAND.text};${extra}">${text}</p>`
const small = (text: string) => `<p style="margin:0;font-family:${FONT};font-size:13px;line-height:1.6;color:${EMAIL_BRAND.muted};">${text}</p>`
const button = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px;"><tr><td bgcolor="${EMAIL_BRAND.ink}" style="background:${EMAIL_BRAND.ink};border-radius:8px;">
    <a href="${href}" style="display:inline-block;padding:12px 22px;font-family:${FONT};font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">${label}</a>
  </td></tr></table>`
const divider = () => `<hr style="border:0;border-top:1px solid ${EMAIL_BRAND.line};margin:24px 0;">`
const keyValueRows = (rows: Array<[string, unknown]>) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${EMAIL_BRAND.line};border-radius:8px;border-collapse:separate;overflow:hidden;">
    ${rows.map(([k, v], i) => `<tr>
      <td style="padding:10px 14px;font-family:${FONT};font-size:13px;color:${EMAIL_BRAND.muted};white-space:nowrap;${i ? `border-top:1px solid ${EMAIL_BRAND.line};` : ''}">${esc(k)}</td>
      <td style="padding:10px 14px;font-family:${FONT};font-size:14px;color:${EMAIL_BRAND.ink};text-align:right;${i ? `border-top:1px solid ${EMAIL_BRAND.line};` : ''}">${esc(v === undefined || v === null || v === '' ? '-' : v)}</td>
    </tr>`).join('')}
  </table>`

function otpEmail({ code, subject, heading, intro, note, preheader }: { code: string; subject: string; heading: string; intro: string; note: string; preheader: string }) {
  const b = EMAIL_BRAND
  const body = `
    ${h1(heading)}
    ${para(intro)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;"><tr>
      <td bgcolor="${b.goldSoft}" align="center" style="background:${b.goldSoft};border:1px solid ${b.gold};border-radius:10px;padding:20px 12px;">
        <span style="font-family:${MONO};font-size:34px;line-height:1;font-weight:700;letter-spacing:10px;color:${b.ink};margin-right:-10px;">${code}</span>
      </td>
    </tr></table>
    ${small(note)}
  `
  return { subject, html: emailLayout({ preheader, body, footerNote: 'You received this email because this address was used on CertiStage.' }) }
}

const inr = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const planTitle = (name: string) => (/\bplan$/i.test(String(name).trim()) ? String(name).trim() : `${String(name).trim()} plan`)

export const emailTemplates = {
  welcome: (name: string) => ({
    subject: 'Welcome to CertiStage',
    html: emailLayout({
      preheader: 'Your account is ready. Create your first event and issue certificates in minutes.',
      body: `
        ${h1(`Welcome, ${esc(name)}`)}
        ${para('Your CertiStage account is ready. Here is how most organizers get their first certificates out:')}
        <ol style="margin:0 0 8px;padding-left:20px;font-family:${FONT};font-size:15px;line-height:1.7;color:${EMAIL_BRAND.text};">
          <li>Create an event and add a certificate type.</li>
          <li>Upload your certificate design and place the name on it.</li>
          <li>Import recipients from Excel, or add them one by one.</li>
          <li>Share the download link. Each person finds and downloads their own certificate.</li>
        </ol>
        ${button(`${APP_URL}/client/events`, 'Open your dashboard')}
        ${divider()}
        ${small(`Questions? Reply to this email or write to <a href="mailto:support@certistage.com" style="color:${EMAIL_BRAND.ink};">support@certistage.com</a>.`)}
      `,
      footerNote: 'You received this email because you created a CertiStage account.'
    })
  }),

  emailVerification: (name: string, verificationLink: string) => ({
    subject: 'Verify your email for CertiStage',
    html: emailLayout({
      preheader: 'Confirm your email to finish creating your CertiStage account.',
      body: `
        ${h1('Verify your email')}
        ${para(`Hi ${esc(name)}, confirm this email address to finish creating your account.`)}
        ${button(verificationLink, 'Verify email')}
        ${small('This link works for 24 hours. If you did not sign up for CertiStage, you can ignore this email.')}
        ${divider()}
        ${small(`If the button does not work, open this link:<br><a href="${verificationLink}" style="color:${EMAIL_BRAND.ink};word-break:break-all;">${verificationLink}</a>`)}
      `,
      footerNote: 'You received this email because this address was used to sign up on CertiStage.'
    })
  }),

  loginOtp: (name: string, code: string) =>
    otpEmail({
      code,
      subject: `${code} is your CertiStage login code`,
      preheader: `Your login code is ${code}. It expires in 10 minutes.`,
      heading: 'Your login code',
      intro: `Hi ${esc(name)}, enter this code on the CertiStage sign-in page. It expires in 10 minutes and works once.`,
      note: 'If you did not try to sign in, ignore this email. Nobody can use the code without access to this inbox.'
    }),

  signupOtp: (name: string, code: string) =>
    otpEmail({
      code,
      subject: `${code} is your CertiStage verification code`,
      preheader: `Your verification code is ${code}. It expires in 15 minutes.`,
      heading: 'Verify your email',
      intro: `Hi ${esc(name)}, enter this code on the sign-up page to finish creating your account. It expires in 15 minutes.`,
      note: 'If you did not sign up for CertiStage, ignore this email and no account will be created.'
    }),

  planExpiring: (data: { name: string; planName: string; expiresAt: Date; daysLeft: number; oneTime: boolean }) => {
    const when = data.expiresAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    const plan = planTitle(data.planName)
    const days = data.daysLeft <= 1 ? 'tomorrow' : `in ${data.daysLeft} days`
    return {
      subject: `Your ${plan} ends ${days}`,
      html: emailLayout({
        preheader: `Your ${plan} is active until ${when}. Renew to keep issuing certificates without a break.`,
        body: `
          ${h1(`Your ${esc(plan)} ends ${days}`)}
          ${para(`Hi ${esc(data.name)}, your <strong style="color:${EMAIL_BRAND.ink};">${esc(plan)}</strong> is active until <strong style="color:${EMAIL_BRAND.ink};">${when}</strong>.`)}
          ${para(data.oneTime
            ? 'After that your organiser access ends. Recipients can still open their download links. Running another event? Buy the one-event plan again, or move to an annual plan and the one-event price is credited.'
            : 'After that the account returns to the Free plan: new recipients stop at the Free limit and Excel import switches off. Recipients can still download their certificates. Renew now and the new term starts when the current one ends.')}
          ${button(`${APP_URL}/client/upgrade`, data.oneTime ? 'See plans' : 'Renew now')}
          ${divider()}
          ${small('Questions? Reply to this email or write to support@certistage.com.')}
        `,
        footerNote: 'You received this email because you have a paid plan on CertiStage.'
      })
    }
  },

  planExpired: (data: { name: string; planName: string; expiredAt: Date }) => {
    const when = data.expiredAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    const plan = planTitle(data.planName)
    return {
      subject: `Your ${plan} has ended`,
      html: emailLayout({
        preheader: `Your ${plan} ended on ${when}. Everything is kept; renew whenever you are ready.`,
        body: `
          ${h1(`Your ${esc(plan)} has ended`)}
          ${para(`Hi ${esc(data.name)}, your <strong style="color:${EMAIL_BRAND.ink};">${esc(plan)}</strong> ended on ${when}. Your events, certificates and recipients are all kept, and recipients can still download their certificates.`)}
          ${para('To add recipients beyond the Free limit or import from Excel again, choose a plan. Paying now starts a fresh term from today.')}
          ${button(`${APP_URL}/client/upgrade`, 'Choose a plan')}
          ${divider()}
          ${small('Questions? Reply to this email or write to support@certistage.com.')}
        `,
        footerNote: 'You received this email because a paid plan on your CertiStage account ended.'
      })
    }
  },

  supportReply: (data: { name: string; ticketNumber: string; subject: string; reply: string; url: string }) => ({
    subject: `Re: [${data.ticketNumber}] ${data.subject}`,
    html: emailLayout({
      preheader: `CertiStage support replied to your request: ${data.subject}`,
      body: `
        ${h1('A reply from CertiStage support')}
        ${para(`Hi ${esc(data.name)}, here is our reply to your request <strong style="color:${EMAIL_BRAND.ink};">${esc(data.subject)}</strong> (ticket ${esc(data.ticketNumber)}):`)}
        <div style="margin:0 0 18px;padding:16px;background:${EMAIL_BRAND.page};border-radius:8px;font-family:${FONT};font-size:14px;line-height:1.6;color:${EMAIL_BRAND.ink};white-space:pre-wrap;">${esc(data.reply)}</div>
        ${para('You can answer from the Support page in your account, or simply reply to this email.')}
        ${button(data.url, 'Open the conversation')}
      `,
      footerNote: 'You received this email because you contacted CertiStage support.'
    })
  }),

  adminNotification: (type: 'signup' | 'payment', data: any) => {
    const title = type === 'signup' ? 'New signup' : 'New payment'
    const rows: Array<[string, unknown]> = type === 'signup'
      ? [['Name', data.name], ['Email', data.email], ['Phone', data.phone], ['Organization', data.organization]]
      : [['Customer', `${data.userName} (${data.userEmail})`], ['Plan', planTitle(data.plan || '')], ['Amount', inr(Number(data.amount) || 0)], ['Receipt', data.invoiceNumber], ['Payment ID', data.paymentId]]
    rows.push(['Time', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })])
    return {
      subject: type === 'signup' ? `New signup: ${data.name || data.email}` : `New payment: ${inr(Number(data.amount) || 0)} · ${planTitle(data.plan || '')} · ${data.userName || data.userEmail}`,
      html: emailLayout({
        body: `
          ${h1(title)}
          ${keyValueRows(rows)}
          ${button(`${APP_URL}/admin/${type === 'signup' ? 'users' : 'revenue'}`, 'Open admin panel')}
        `,
        footerNote: 'Internal notification from CertiStage.'
      })
    }
  },

  invoice: (data: {
    invoiceNumber: string
    customerName: string
    customerEmail: string
    customerPhone?: string
    customerOrganization?: string
    planName: string
    term?: string // "1 year" (default) or "60 days" for the one-event plan
    credit?: { amount: number; label: string } // deducted from `amount` to give totalAmount
    amount: number
    gatewayFee?: number
    totalAmount: number
    paymentId: string
    paymentDate: Date
    validUntil: Date
    invoiceUrl?: string
  }) => {
    const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    const showGatewayFee = process.env.SHOW_GATEWAY_FEE_INVOICE === 'true' && !!data.gatewayFee
    const org = String(data.customerOrganization || '').trim()
    const showOrg = org.length > 0 && !['certistage', 'certistage.com', 'certificate generation platform', String(data.customerName || '').trim().toLowerCase()].includes(org.toLowerCase())
    const b = EMAIL_BRAND
    const plan = planTitle(data.planName)
    const cell = `font-family:${FONT};font-size:14px;line-height:1.5;`
    const detail = (label: string, value: string) => `<tr>
      <td style="padding:7px 0;${cell}color:${b.muted};" valign="top">${label}</td>
      <td align="right" style="padding:7px 0;${cell}color:${b.ink};" valign="top">${value}</td>
    </tr>`
    const money = (label: string, value: string, opts: { strong?: boolean; top?: boolean } = {}) => `<tr>
      <td style="padding:${opts.strong ? '14px' : '12px'} 0;${cell}font-size:${opts.strong ? 16 : 14}px;font-weight:${opts.strong ? 600 : 400};color:${opts.strong ? b.ink : b.text};${opts.top ? `border-top:1px solid ${b.line};` : ''}">${label}</td>
      <td align="right" style="padding:${opts.strong ? '14px' : '12px'} 0;${cell}font-size:${opts.strong ? 16 : 14}px;font-weight:${opts.strong ? 600 : 400};color:${b.ink};${opts.top ? `border-top:1px solid ${b.line};` : ''}">${value}</td>
    </tr>`
    return {
      subject: `Your CertiStage receipt ${data.invoiceNumber} · ${plan}`,
      html: emailLayout({
        preheader: `Payment of ${inr(data.totalAmount)} received. Your ${plan} is active until ${fmt(data.validUntil)}. PDF receipt attached.`,
        body: `
          <p style="margin:0 0 6px;font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:1.4px;text-transform:uppercase;color:${b.gold};">Payment received</p>
          <p style="margin:0;font-family:${FONT};font-size:34px;line-height:1.15;font-weight:600;letter-spacing:-0.6px;color:${b.ink};">${inr(data.totalAmount)}</p>
          <p style="margin:6px 0 24px;font-family:${FONT};font-size:14px;color:${b.muted};">Paid on ${fmt(data.paymentDate)}</p>
          ${para(`Hi ${esc(data.customerName)}, thank you for your payment. Your <strong style="color:${b.ink};">${esc(plan)}</strong> is active until <strong style="color:${b.ink};">${fmt(data.validUntil)}</strong>. Your receipt is attached to this email as a PDF.`)}

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${b.page}" style="background:${b.page};border-radius:10px;margin:8px 0 0;">
            <tr><td style="padding:16px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${detail('Receipt number', `<span style="font-family:${MONO};font-size:13px;">${esc(data.invoiceNumber)}</span>`)}
                ${detail('Billed to', `${esc(data.customerName)}${showOrg ? `<br>${esc(org)}` : ''}<br><span style="color:${b.muted};">${esc(data.customerEmail)}</span>`)}
                ${detail('Payment ID', `<span style="font-family:${MONO};font-size:13px;">${esc(data.paymentId)}</span>`)}
                ${detail('Paid with', 'Razorpay')}
              </table>
            </td></tr>
          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 0;">
            <tr>
              <td style="padding:0 0 8px;font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:${b.muted};">Description</td>
              <td align="right" style="padding:0 0 8px;font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:${b.muted};">Amount</td>
            </tr>
            ${money(`${esc(plan)}<br><span style="font-size:13px;color:${b.muted};">${esc(data.term || '1 year')} · ${fmt(data.paymentDate)} to ${fmt(data.validUntil)}</span>`, inr(data.amount), { top: true })}
            ${data.credit && data.credit.amount > 0 ? money(esc(data.credit.label), `&minus; ${inr(data.credit.amount)}`, { top: true }) : ''}
            ${showGatewayFee ? money('Processing fee', inr(data.gatewayFee || 0), { top: true }) : ''}
            ${money('Total paid', inr(data.totalAmount), { strong: true, top: true })}
          </table>

          ${button(`${APP_URL}/client/events`, 'Start issuing certificates')}
          ${small(`Need this receipt again? Download it anytime from <a href="${APP_URL}/client/billing" style="color:${b.ink};">Billing</a> in your account.`)}
          ${divider()}
          ${small('Questions about this payment? Just reply to this email or write to support@certistage.com.')}
        `,
        footerNote: 'You received this email because a payment was made on your CertiStage account. This receipt is computer-generated and needs no signature.'
      })
    }
  }
}

/** Shared shell for internal emails (contact form, support requests). */
export function renderInternalEmail({ title, rows, message, note }: { title: string; rows: Array<[string, unknown]>; message?: string; note?: string }): string {
  const b = EMAIL_BRAND
  return emailLayout({
    body: `
      ${h1(esc(title))}
      ${keyValueRows(rows)}
      ${message ? `<div style="margin:18px 0 0;padding:16px;background:${b.page};border-radius:8px;font-family:${FONT};font-size:14px;line-height:1.6;color:${b.ink};white-space:pre-wrap;">${esc(message)}</div>` : ''}
      ${note ? `<p style="margin:16px 0 0;font-family:${FONT};font-size:13px;color:${b.muted};">${note}</p>` : ''}
    `,
    footerNote: 'Internal notification from CertiStage.'
  })
}

/**
 * Certificate email to a recipient, sent on the organizer's behalf (lib/email-delivery).
 * Links to the recipient's own download page rather than attaching the PDF, so downloads,
 * LinkedIn adds and shares are counted and the message stays small.
 */
export function renderCertificateEmail({ recipientName, eventName, certificateName, issuer, link, linkedinUrl, reminder, openPixel }: {
  recipientName: string
  eventName: string
  certificateName: string
  issuer: string
  link: string
  linkedinUrl?: string // "Add to LinkedIn profile", counted on the dashboard like the download-page button
  reminder?: boolean
  openPixel?: string // 1x1 image that records the open in the Email log
}): { subject: string; html: string } {
  const subject = reminder
    ? `Reminder: your ${eventName} certificate is ready`
    : `Your certificate for ${eventName}`
  const body = `
    ${h1(reminder ? 'Your certificate is waiting' : 'Your certificate is ready')}
    ${para(`Dear ${esc(recipientName)},`)}
    ${para(`${esc(issuer)} has issued your <strong>${esc(certificateName)}</strong> certificate for <strong>${esc(eventName)}</strong>.`)}
    ${button(link, 'View and download certificate')}
    ${linkedinUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;"><tr><td style="border:1px solid ${EMAIL_BRAND.ink};border-radius:8px;">
        <a href="${linkedinUrl}" style="display:inline-block;padding:11px 22px;font-family:${FONT};font-size:14px;font-weight:600;color:${EMAIL_BRAND.ink};text-decoration:none;">Add to LinkedIn profile</a>
      </td></tr></table>`
      : small('On that page you can also add the certificate to your LinkedIn profile.')}
    ${divider()}
    ${small(`If the button does not work, copy this link into your browser:<br><a href="${link}" style="color:${EMAIL_BRAND.muted};word-break:break-all;">${esc(link)}</a>`)}
    ${openPixel ? `<img src="${openPixel}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;">` : ''}
  `
  return {
    subject,
    html: emailLayout({
      preheader: `${issuer} has issued your certificate for ${eventName}.`,
      body,
      footerNote: `You received this email because ${issuer} added you as a participant of ${eventName}.`
    })
  }
}

/** Receipt for an add-on purchase (lib/addons), e.g. a pack of certificate emails */
export function renderAddonReceipt(data: {
  invoiceNumber: string
  customerName: string
  customerEmail: string
  itemName: string
  amount: number // paise
  paymentId: string
  paymentDate: Date
  invoiceUrl?: string
}): { subject: string; html: string } {
  const b = EMAIL_BRAND
  const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const line = (label: string, value: string, strong = false) => `<tr>
      <td style="padding:10px 0;font-family:${FONT};font-size:${strong ? 16 : 14}px;color:${strong ? b.ink : b.muted};font-weight:${strong ? 600 : 400};border-top:1px solid ${b.line};">${label}</td>
      <td align="right" style="padding:10px 0;font-family:${FONT};font-size:${strong ? 16 : 14}px;color:${b.ink};font-weight:${strong ? 600 : 400};border-top:1px solid ${b.line};">${value}</td>
    </tr>`
  return {
    subject: `Receipt ${data.invoiceNumber}: ${data.itemName}`,
    html: emailLayout({
      preheader: `Payment of ${inr(data.amount)} received. ${data.itemName} added to your account.`,
      body: `
        ${h1('Payment received')}
        ${para(`Thank you, ${esc(data.customerName)}. <strong style="color:${b.ink};">${esc(data.itemName)}</strong> ${data.itemName.endsWith('s') ? 'have' : 'has'} been added to your account. They never expire.`)}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 4px;">
          <tr>
            <td style="padding:0 0 8px;font-family:${FONT};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${b.muted};">Receipt</td>
            <td align="right" style="padding:0 0 8px;font-family:${FONT};font-size:13px;color:${b.ink};">${esc(data.invoiceNumber)}</td>
          </tr>
          ${line('Billed to', `${esc(data.customerName)}<br><span style="color:${b.muted};font-size:13px;">${esc(data.customerEmail)}</span>`)}
          ${line('Date', fmt(data.paymentDate))}
          ${line('Payment ID', `<span style="font-family:${MONO};font-size:12px;">${esc(data.paymentId)}</span>`)}
          ${line(`${esc(data.itemName)}, one-time`, inr(data.amount))}
          ${line('Total paid', inr(data.amount), true)}
        </table>
        ${button(`${APP_URL}/client/email-log`, 'Go to email log')}
        ${data.invoiceUrl ? small(`<a href="${data.invoiceUrl}" style="color:${b.ink};">Download PDF receipt</a>`) : ''}
        ${divider()}
        ${small('CertiStage &middot; support@certistage.com &middot; Keep this email as your payment record.')}
      `,
      footerNote: 'You received this email because a payment was made on your CertiStage account.'
    })
  }
}
