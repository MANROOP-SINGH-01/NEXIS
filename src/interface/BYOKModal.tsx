/**
 * FILE: src/interface/BYOKModal.tsx
 * PURPOSE: Authenticated BYOK (Bring Your Own Key) Modal for Gemini.
 * SPEC: Master Specification Section 10 & 11.
 * SECURITY: AES-256-GCM server-side encryption. Raw key is NEVER stored in localStorage or exposed to the client.
 */

import { Eye, EyeOff, Trash2, X, Key, Shield, ExternalLink, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { getAuthHeaders } from '../integration/store/authStore';

interface BYOKModalProps {
  onClose: () => void;
}

export const BYOKModal: React.FC<BYOKModalProps> = ({ onClose }) => {
  const [apiKey, setApiKey] = useState<string>('');
  const [showKey, setShowKey] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);

  // Key status from server
  const [keyStatus, setKeyStatus] = useState<{
    hasKey: boolean;
    provider: string;
    keyLastFour: string;
    isActive: boolean;
  }>({
    hasKey: false,
    provider: 'GEMINI',
    keyLastFour: '',
    isActive: false,
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch current server-side status
  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/byok/status', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setKeyStatus({
          hasKey: Boolean(data.hasKey),
          provider: data.provider || 'GEMINI',
          keyLastFour: data.keyLastFour || '',
          isActive: Boolean(data.isActive),
        });
      }
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  // Save new key (encrypted server-side)
  const handleSave = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setNotice({ type: 'error', message: 'Please enter a valid Gemini API key.' });
      return;
    }

    setSubmitting(true);
    setNotice(null);
    try {
      const res = await fetch('/api/ai/byok/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ apiKey: trimmed, provider: 'GEMINI' }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to validate or encrypt key.');
      }

      setNotice({ type: 'success', message: 'Gemini API key validated and securely encrypted on server.' });
      setApiKey('');
      setIsReplacing(false);
      await loadStatus();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Key validation failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Test active key via backend endpoint
  const handleTestKey = async () => {
    setTesting(true);
    setNotice(null);
    try {
      const res = await fetch('/api/ai/byok/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNotice({ type: 'success', message: `Key connected! ${data.message}` });
      } else {
        setNotice({ type: 'error', message: data.message || data.error || 'Connection failed.' });
      }
    } catch {
      setNotice({ type: 'error', message: 'Network error communicating with AI verification service.' });
    } finally {
      setTesting(false);
    }
  };

  // Remove key from server
  const handleRemoveKey = async () => {
    setSubmitting(true);
    setNotice(null);
    try {
      const res = await fetch('/api/ai/byok', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ provider: 'GEMINI' }),
      });

      if (res.ok) {
        setNotice({ type: 'success', message: 'Stored Gemini API key removed from server.' });
        setKeyStatus({
          hasKey: false,
          provider: 'GEMINI',
          keyLastFour: '',
          isActive: false,
        });
        setIsReplacing(false);
      }
    } catch {
      setNotice({ type: 'error', message: 'Failed to remove API key.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 pointer-events-auto overflow-hidden">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="absolute inset-0 bg-[#111111]/60 backdrop-blur-xs transition-opacity duration-200"
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white border-4 border-[#111111] shadow-[8px_8px_0px_#111111] p-6 md:p-8 animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 bg-white border-2 border-[#111111] flex items-center justify-center text-[#111111] hover:bg-[#E53935] hover:text-white transition-colors cursor-pointer shadow-[2px_2px_0px_#111111] z-20"
        >
          <X size={16} />
        </button>

        <div className="max-w-md mx-auto flex flex-col gap-5">
          {/* Header */}
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-12 h-12 bg-[#F4C430] border-2 border-[#111111] flex items-center justify-center shadow-[3px_3px_0px_#111111] mb-1">
              <Key size={22} className="text-[#111111]" />
            </div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#555555]">
              [BYOK] // ENCRYPTED CREDENTIAL MANAGEMENT
            </div>
            <h2 className="text-xl font-['Space_Grotesk'] font-black uppercase text-[#111111] tracking-tight">
              Bring Your Own Gemini API Key
            </h2>
            <p className="text-xs font-mono text-[#555555] max-w-sm leading-relaxed">
              Your key is securely encrypted on the server using AES-256-GCM. Raw keys are never stored in browser storage or exposed to other users.
            </p>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#2457A6] hover:bg-[#1C4587] text-white border-2 border-[#111111] text-xs font-mono font-bold uppercase tracking-wider shadow-[2px_2px_0px_#111111] transition-all mt-1"
            >
              <span>Get Free Gemini Key</span>
              <ExternalLink size={12} />
            </a>
          </div>

          {/* Notice Feedback */}
          {notice && (
            <div className={`p-3 border-2 flex items-start gap-2.5 shadow-[2px_2px_0px_#111111] text-xs font-mono font-bold ${
              notice.type === 'success' 
                ? 'bg-[#2E7D32]/10 border-[#2E7D32] text-[#2E7D32]'
                : 'bg-[#E53935]/10 border-[#E53935] text-[#E53935]'
            }`}>
              {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              <span className="leading-tight">{notice.message}</span>
            </div>
          )}

          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs font-mono text-[#777777]">
              <RefreshCw className="w-5 h-5 animate-spin text-[#111111]" />
              <span>Checking encrypted credentials...</span>
            </div>
          ) : keyStatus.hasKey && !isReplacing ? (
            /* Connected Masked Key Display */
            <div className="space-y-4">
              <div className="p-4 bg-[#F5F0E6] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-black uppercase text-[#111111]">Status:</span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-[#2E7D32] text-white">
                    <CheckCircle2 size={12} /> Connected & Active
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-mono font-black uppercase text-[#111111]">Key:</span>
                  <span className="font-mono text-xs font-bold text-[#111111] tracking-widest bg-white px-2 py-1 border border-[#111111]">
                    ••••••••••••{keyStatus.keyLastFour}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestKey}
                  disabled={testing}
                  className="flex-1 py-2.5 px-3 bg-[#111111] hover:bg-[#E53935] text-white border-2 border-[#111111] text-xs font-mono font-bold uppercase shadow-[2px_2px_0px_#111111] transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                  <span>{testing ? 'Testing...' : 'Test Key'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsReplacing(true)}
                  className="py-2.5 px-3 bg-white hover:bg-[#F5F0E6] text-[#111111] border-2 border-[#111111] text-xs font-mono font-bold uppercase shadow-[2px_2px_0px_#111111] transition-all cursor-pointer"
                >
                  Replace Key
                </button>

                <button
                  type="button"
                  onClick={handleRemoveKey}
                  disabled={submitting}
                  title="Remove Key"
                  className="p-2.5 bg-white hover:bg-[#E53935] hover:text-white text-[#E53935] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ) : (
            /* Input for New or Replaced Key */
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#111111] flex items-center gap-2">
                  <Shield size={14} className="text-[#2457A6]" /> Enter Gemini API Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    disabled={submitting}
                    className="w-full bg-[#F5F0E6] border-2 border-[#111111] px-4 py-2.5 pr-12 text-xs text-[#111111] font-mono placeholder:text-[#7A7A7A] focus:outline-none focus:border-[#E53935] shadow-[2px_2px_0px_#111111] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555555] hover:text-[#111111] transition-colors cursor-pointer w-7 h-7 flex items-center justify-center"
                  >
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-1">
                {isReplacing && (
                  <button
                    type="button"
                    onClick={() => { setIsReplacing(false); setApiKey(''); }}
                    className="px-4 py-2.5 bg-white hover:bg-[#F5F0E6] text-[#111111] border-2 border-[#111111] text-xs font-mono font-bold uppercase shadow-[2px_2px_0px_#111111] cursor-pointer"
                  >
                    Cancel
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!apiKey.trim() || submitting}
                  className="flex-1 py-2.5 bg-[#E53935] hover:bg-[#D32F2F] text-white border-2 border-[#111111] text-xs font-mono font-bold uppercase tracking-wider shadow-[3px_3px_0px_#111111] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#111111] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Validating & Encrypting...</span>
                    </>
                  ) : (
                    <span>Save & Encrypt Key</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BYOKModal;
