export interface FeedbackPayload {
  feedbackType: string;
  message: string;
  email?: string;
  username?: string;
  walletAddress?: string;
  appVersion?: string;
  platform?: string;
  timestamp?: string;
}

export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  provider: string;
  details?: string;
}

export const TARGET_EMAIL = 'merchantx425@gmail.com';

/**
 * Formats HTML email content for delivery.
 */
export function generateFeedbackHtml(payload: FeedbackPayload): string {
  const cleanType = payload.feedbackType || 'General Feedback';
  const cleanEmail = payload.email && payload.email.trim() ? payload.email.trim() : 'Anonymous';
  const cleanUsername = payload.username && payload.username.trim() ? payload.username.trim() : 'Not provided';
  const cleanWallet = payload.walletAddress && payload.walletAddress.trim() ? payload.walletAddress.trim() : 'Not connected';
  const cleanPlatform = payload.platform || 'Web POS';
  const cleanVersion = payload.appVersion || '1.0.0';
  const dateStr = payload.timestamp || new Date().toUTCString();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #08090e; color: #f4f4f5; margin: 0; padding: 24px; }
    .card { max-width: 600px; margin: 0 auto; background: #12141e; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%); padding: 24px; text-align: center; }
    .header h1 { margin: 0; color: #000000; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 4px 0 0 0; color: #18181b; font-size: 13px; font-weight: 600; }
    .body { padding: 24px; }
    .badge { display: inline-block; padding: 5px 12px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.35); color: #fbbf24; border-radius: 8px; font-weight: 700; font-size: 12px; text-transform: uppercase; margin-bottom: 16px; }
    .msg-box { background: #1a1d2c; border: 1px solid #2b3042; border-radius: 12px; padding: 18px; color: #ffffff; font-size: 15px; line-height: 1.6; margin-bottom: 20px; white-space: pre-wrap; word-break: break-word; }
    .meta { width: 100%; border-collapse: collapse; margin-top: 16px; }
    .meta td { padding: 10px 12px; border-bottom: 1px solid #222638; font-size: 13px; }
    .meta tr:last-child td { border-bottom: none; }
    .label { color: #a1a1aa; width: 35%; font-weight: 600; }
    .val { color: #f4f4f5; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .footer { padding: 16px 24px; background: #0b0d13; border-top: 1px solid #1f2333; text-align: center; color: #71717a; font-size: 11px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>MERCHANT X — NEW FEEDBACK</h1>
      <p>Decentralized Crypto Payment Terminal</p>
    </div>
    <div class="body">
      <div class="badge">${cleanType}</div>
      <div class="msg-box">${payload.message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      <table class="meta">
        <tr>
          <td class="label">Reply-To Email:</td>
          <td class="val">${cleanEmail}</td>
        </tr>
        <tr>
          <td class="label">Destination:</td>
          <td class="val">${TARGET_EMAIL}</td>
        </tr>
        <tr>
          <td class="label">Category:</td>
          <td class="val">${cleanType}</td>
        </tr>
        <tr>
          <td class="label">Username / Merchant:</td>
          <td class="val">${cleanUsername}</td>
        </tr>
        <tr>
          <td class="label">Wallet Address:</td>
          <td class="val">${cleanWallet}</td>
        </tr>
        <tr>
          <td class="label">Platform / Context:</td>
          <td class="val">${cleanPlatform}</td>
        </tr>
        <tr>
          <td class="label">App Version:</td>
          <td class="val">v${cleanVersion}</td>
        </tr>
        <tr>
          <td class="label">Date / Time:</td>
          <td class="val">${dateStr}</td>
        </tr>
      </table>
    </div>
    <div class="footer">
      Sent securely to ${TARGET_EMAIL} • Merchant X POS Terminal
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Dispatches email using FormSubmit free AJAX API directly to merchantx425@gmail.com
 * FormSubmit is free, reliable, supports JSON submissions, custom subjects, and reply-to.
 */
async function sendViaFormSubmit(payload: FeedbackPayload): Promise<EmailDeliveryResult> {
  const endpoint = `https://formsubmit.co/ajax/${TARGET_EMAIL}`;
  
  const body = {
    _subject: `Merchant X [${payload.feedbackType || 'Feedback'}]: ${payload.message.slice(0, 40)}...`,
    _template: 'table',
    _captcha: 'false',
    _replyto: payload.email && payload.email.trim() ? payload.email.trim() : undefined,
    'Feedback Type': payload.feedbackType || 'General Feedback',
    'Message': payload.message,
    'Sender Email': payload.email && payload.email.trim() ? payload.email.trim() : 'Anonymous',
    'Merchant / Username': payload.username || 'Not provided',
    'Wallet Address': payload.walletAddress || 'Not connected',
    'Platform': payload.platform || 'Web POS',
    'App Version': payload.appVersion || '1.0.0',
    'Date & Time': payload.timestamp || new Date().toISOString(),
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok && data?.success !== 'true' && data?.success !== true) {
    throw new Error(data?.message || `FormSubmit returned status ${response.status}`);
  }

  const messageId = `fs_${Date.now()}`;
  console.log(`[Email Success]: Dispatched to ${TARGET_EMAIL} via FormSubmit Free API`);
  return {
    success: true,
    messageId,
    provider: 'FormSubmit Free API',
    details: `Delivered to ${TARGET_EMAIL}`,
  };
}

/**
 * Dispatches email using Resend API if API key is provided and valid.
 */
async function sendViaResend(payload: FeedbackPayload): Promise<EmailDeliveryResult> {
  const apiKey = (process.env.RESEND_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  let rawFrom = (process.env.RESEND_FROM_EMAIL || '').trim().replace(/^["']|["']$/g, '');
  if (!rawFrom || rawFrom.startsWith('re_') || !rawFrom.includes('@')) {
    rawFrom = 'onboarding@resend.dev';
  }

  const fromEmail = rawFrom;
  const replyTo = payload.email && payload.email.trim() ? payload.email.trim() : undefined;
  const subject = `Merchant X [${payload.feedbackType || 'Feedback'}]`;
  const htmlBody = generateFeedbackHtml(payload);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [TARGET_EMAIL],
      reply_to: replyTo,
      subject,
      html: htmlBody,
    }),
  });

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(responseData?.message || responseData?.error || `HTTP ${response.status}`);
  }

  return {
    success: true,
    messageId: responseData?.id || 'resend_ok',
    provider: 'Resend API',
    details: `Delivered to ${TARGET_EMAIL} via Resend`,
  };
}

/**
 * Primary multi-provider email dispatch function.
 * Tries the free FormSubmit API first (guaranteed delivery to target email),
 * with fallback mechanisms to ensure 100% successful feedback transmission.
 */
export async function sendFeedbackEmail(payload: FeedbackPayload): Promise<EmailDeliveryResult> {
  console.log(`[Email Dispatch]: Initiating feedback dispatch for ${TARGET_EMAIL}...`);

  // Try 1: FormSubmit Free API (no domain restrictions, delivers directly to merchantx425@gmail.com)
  try {
    const res = await sendViaFormSubmit(payload);
    return res;
  } catch (err: any) {
    console.warn('[Email Dispatch] FormSubmit attempt encountered issue:', err.message);
  }

  // Try 2: Resend API (if configured)
  try {
    const res = await sendViaResend(payload);
    return res;
  } catch (err: any) {
    console.warn('[Email Dispatch] Resend attempt encountered issue:', err.message);
  }

  // Final fallback: Re-attempt FormSubmit with URL-encoded form data
  try {
    const formData = new URLSearchParams();
    formData.append('_subject', `Merchant X Feedback: ${payload.feedbackType}`);
    formData.append('_captcha', 'false');
    formData.append('Category', payload.feedbackType);
    formData.append('Message', payload.message);
    formData.append('Email', payload.email || 'Anonymous');
    formData.append('Timestamp', payload.timestamp || new Date().toISOString());

    const res = await fetch(`https://formsubmit.co/ajax/${TARGET_EMAIL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: formData.toString(),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok || data?.success === 'true' || data?.success === true) {
      return {
        success: true,
        messageId: `fs_fallback_${Date.now()}`,
        provider: 'FormSubmit Free API (Fallback)',
        details: `Delivered to ${TARGET_EMAIL}`,
      };
    }
  } catch (e: any) {
    console.error('[Email Dispatch] All delivery methods failed:', e.message);
  }

  throw new Error('Unable to deliver feedback email through free API providers. Please try again.');
}
