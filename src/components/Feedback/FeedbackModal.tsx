import React, { useState } from 'react';
import { MessageSquare, Bug, Lightbulb, FileText, Send, CheckCircle2, X, AlertCircle, Sparkles, Mail, ShieldCheck, RefreshCw } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FeedbackType = 'Bug / Problem' | 'Feature Request' | 'Suggestion' | 'General Feedback';

const FEEDBACK_TYPES: { id: FeedbackType; label: string; icon: typeof Bug; color: string }[] = [
  { id: 'Bug / Problem', label: 'Bug / Problem', icon: Bug, color: 'text-red-400 border-red-500/30 bg-red-500/10' },
  { id: 'Feature Request', label: 'Feature Request', icon: Lightbulb, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  { id: 'Suggestion', label: 'Suggestion', icon: FileText, color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' },
  { id: 'General Feedback', label: 'General Feedback', icon: MessageSquare, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
];

const OWNER_EMAIL = 'merchantx425@gmail.com';

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [selectedType, setSelectedType] = useState<FeedbackType>('General Feedback');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [confirmedProvider, setConfirmedProvider] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTestingPipeline, setIsTestingPipeline] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setErrorMessage('Please enter your feedback message before sending.');
      return;
    }

    setErrorMessage(null);
    setTestResult(null);
    setIsSubmitting(true);

    const payload = {
      feedbackType: selectedType,
      message: message.trim(),
      email: email.trim(),
      timestamp: new Date().toISOString(),
      appVersion: '1.0.0',
      platform: typeof window !== 'undefined' ? `${window.navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'} / Browser POS` : 'Web POS',
    };

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setIsSuccess(true);
        setConfirmedProvider(data.provider || 'Free Email API');
        setMessage('');
        setEmail('');
      } else {
        setIsSuccess(false);
        const errMsg = data.error || "We couldn't send your feedback right now. Please try again.";
        setErrorMessage(errMsg);
      }
    } catch (err: any) {
      setIsSuccess(false);
      setErrorMessage("We couldn't send your feedback right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestPipeline = async () => {
    setIsTestingPipeline(true);
    setErrorMessage(null);
    setTestResult(null);

    try {
      const res = await fetch('/api/feedback/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setTestResult(`✓ Test email delivered to ${OWNER_EMAIL}`);
      } else {
        setErrorMessage(data.error || "We couldn't send your feedback right now. Please try again.");
      }
    } catch (err: any) {
      setErrorMessage("We couldn't send your feedback right now. Please try again.");
    } finally {
      setIsTestingPipeline(false);
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    setErrorMessage(null);
    setTestResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#12141e] border border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Glow Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors cursor-pointer z-10"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {isSuccess ? (
          /* Verified Success Screen */
          <div className="text-center py-8 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-bold font-display text-white">Thank you! Your feedback has been sent successfully.</h3>
              <p className="text-sm text-emerald-300 font-medium">
                Sent to <span className="font-mono font-bold text-white">{OWNER_EMAIL}</span>
              </p>
              {confirmedProvider && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-950/60 border border-emerald-800/60 rounded-lg text-[11px] text-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Delivered securely via {confirmedProvider}</span>
                </div>
              )}
              <p className="text-xs text-zinc-400 pt-2 max-w-xs mx-auto">
                Your feedback has been sent directly to the development inbox.
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={handleClose}
                className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Feedback Form */
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Header */}
            <div className="space-y-1 pr-8">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold font-display text-white">Send Merchant X Feedback</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Report bugs, suggest features, or share feedback. All messages are dispatched directly to{' '}
                <span className="text-amber-400 font-mono font-semibold">{OWNER_EMAIL}</span>.
              </p>
            </div>

            {/* Feedback Type Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300 block">Feedback Type</label>
              <div className="grid grid-cols-2 gap-2">
                {FEEDBACK_TYPES.map((type) => {
                  const isSelected = selectedType === type.id;
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setSelectedType(type.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all text-left cursor-pointer ${
                        isSelected
                          ? `${type.color} font-bold shadow-sm ring-1 ring-amber-500/40`
                          : 'bg-[#181b28] border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Message Area */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                <span>Your Message</span>
                <span className="text-[10px] text-zinc-500 font-normal">{message.length} characters</span>
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what's working well, bugs you encountered, or new features you'd like to see..."
                className="w-full bg-[#181b28] border border-zinc-800 rounded-2xl p-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/50 resize-none transition-all leading-relaxed"
              />
            </div>

            {/* Optional Email (used as Reply-To) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Your email (for reply)</span>
                </span>
                <span className="text-[10px] text-zinc-500">Optional</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#181b28] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/50 transition-all"
              />
            </div>

            {/* Destination Verification & Test Bar */}
            <div className="flex items-center justify-between p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl text-[11px] text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span>To: <strong className="text-zinc-200 font-mono">{OWNER_EMAIL}</strong></span>
              </div>
              <button
                type="button"
                onClick={handleTestPipeline}
                disabled={isTestingPipeline}
                className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 font-semibold cursor-pointer disabled:opacity-50"
                title="Send a verified test email to verify delivery"
              >
                <RefreshCw className={`w-3 h-3 ${isTestingPipeline ? 'animate-spin' : ''}`} />
                <span>{isTestingPipeline ? 'Testing...' : 'Test Delivery'}</span>
              </button>
            </div>

            {/* Test Result Bar */}
            {testResult && (
              <div className="flex items-center gap-2 p-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{testResult}</span>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Actions */}
            <div className="pt-1 flex items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Sending feedback...
                  </span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>SEND FEEDBACK</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

