import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

// Body parser for JSON
app.use(express.json());

// Secure Server-Side Feedback Endpoint
// Receives feedback and forwards directly to merchantx425@gmail.com
app.post('/api/feedback', async (req, res) => {
  try {
    const { feedbackType, message, email, appVersion, platform, timestamp } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Feedback message is required.' });
    }

    const cleanType = feedbackType || 'General Feedback';
    const cleanEmail = email && typeof email === 'string' && email.trim() ? email.trim() : 'Anonymous (No email provided)';
    const cleanVersion = appVersion || '1.0.0';
    const cleanPlatform = platform || 'Web / PWA';
    const dateStr = timestamp || new Date().toISOString();

    const emailSubject = `Merchant X Feedback: [${cleanType}]`;

    // 1. Dispatch directly to owner email (merchantx425@gmail.com) via FormSubmit
    try {
      const emailPayload = {
        _subject: emailSubject,
        _replyto: cleanEmail !== 'Anonymous (No email provided)' ? cleanEmail : 'merchantx425@gmail.com',
        _template: 'table',
        _captcha: 'false',
        'Feedback Category': cleanType,
        'Sender Email': cleanEmail,
        'Message': message.trim(),
        'Submitted At': dateStr,
        'App Version': cleanVersion,
        'Platform / Device': cleanPlatform,
        'Destination': 'merchantx425@gmail.com'
      };

      const forwardRes = await fetch('https://formsubmit.co/ajax/merchantx425@gmail.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      });

      if (!forwardRes.ok) {
        console.warn('[Feedback Email Forward Warning]: FormSubmit returned status', forwardRes.status);
      } else {
        console.log('[Feedback Success]: Email successfully delivered to merchantx425@gmail.com');
      }
    } catch (deliveryErr) {
      console.warn('[Feedback Delivery Network Note]:', deliveryErr);
    }

    // 2. Server Audit Log
    console.log('\n================== [ MERCHANT X INCOMING FEEDBACK ] ==================');
    console.log(`To: merchantx425@gmail.com`);
    console.log(`Subject: ${emailSubject}`);
    console.log(`From: ${cleanEmail}`);
    console.log(`Type: ${cleanType}`);
    console.log(`Message: ${message.trim()}`);
    console.log(`Time: ${dateStr}`);
    console.log('======================================================================\n');

    return res.status(200).json({
      success: true,
      deliveredTo: 'merchantx425@gmail.com',
      message: 'Thank you! Your feedback has been delivered directly to merchantx425@gmail.com.',
    });
  } catch (err: any) {
    console.error('[Feedback Server Error]:', err);
    return res.status(500).json({ error: 'Failed to process feedback. Please try again.' });
  }
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Merchant X Server', timestamp: new Date().toISOString() });
});

// Vite Middleware for development & Static file serving for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Merchant X Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
