import dotenv from 'dotenv';
dotenv.config({ override: true });
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { sendFeedbackEmail, TARGET_EMAIL, FeedbackPayload } from './server/emailService';

const app = express();
const PORT = 3000;

// Body parser for JSON
app.use(express.json());

/**
 * Primary Feedback Submission Endpoint
 * Receives feedback from frontend, dispatches email to merchantx425@gmail.com via free email API.
 */
app.post('/api/feedback', async (req, res) => {
  try {
    const { feedbackType, message, email, username, walletAddress, appVersion, platform, timestamp } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please enter your feedback message before sending.',
      });
    }

    const payload: FeedbackPayload = {
      feedbackType: feedbackType || 'General Feedback',
      message: message.trim(),
      email: email && typeof email === 'string' && email.trim() ? email.trim() : undefined,
      username: username && typeof username === 'string' && username.trim() ? username.trim() : undefined,
      walletAddress: walletAddress && typeof walletAddress === 'string' && walletAddress.trim() ? walletAddress.trim() : undefined,
      appVersion: appVersion || '1.0.0',
      platform: platform || 'Web POS',
      timestamp: timestamp || new Date().toISOString(),
    };

    // Dispatch via free email API securely on server-side
    const deliveryResult = await sendFeedbackEmail(payload);

    return res.status(200).json({
      success: true,
      message: 'Thank you! Your feedback has been sent successfully.',
      deliveredTo: TARGET_EMAIL,
      provider: deliveryResult.provider,
      messageId: deliveryResult.messageId,
    });
  } catch (err: any) {
    console.error('[Feedback Backend Error]:', err.message || err);
    return res.status(500).json({
      success: false,
      error: "We couldn't send your feedback right now. Please try again.",
      details: err.message || 'Unable to deliver feedback.',
    });
  }
});

/**
 * Diagnostic Test Endpoint for Email Delivery
 * Sends a test ping to merchantx425@gmail.com
 */
app.all('/api/feedback/test', async (_req, res) => {
  try {
    const testPayload: FeedbackPayload = {
      feedbackType: 'Diagnostic Test Ping',
      message: `This is an automated test verifying the Merchant X email delivery pipeline at ${new Date().toISOString()}.`,
      email: 'system-test@merchant-x.app',
      appVersion: '1.0.0',
      platform: 'Server Diagnostic Test',
      timestamp: new Date().toISOString(),
    };

    const deliveryResult = await sendFeedbackEmail(testPayload);

    return res.status(200).json({
      success: true,
      message: `Test email successfully dispatched to ${TARGET_EMAIL} via ${deliveryResult.provider}`,
      messageId: deliveryResult.messageId,
      provider: deliveryResult.provider,
      deliveredTo: TARGET_EMAIL,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Feedback Test Error]:', err.message || err);
    return res.status(500).json({
      success: false,
      error: "We couldn't send your feedback right now. Please try again.",
      details: err.message || 'Email delivery test failed.',
    });
  }
});

/**
 * Service Status Endpoint
 */
app.get('/api/feedback/status', (_req, res) => {
  res.json({
    status: 'online',
    provider: 'Free API (FormSubmit + Resend Fallback)',
    targetRecipient: TARGET_EMAIL,
    timestamp: new Date().toISOString(),
  });
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
