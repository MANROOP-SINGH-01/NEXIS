import React, { useState, useMemo, useRef } from 'react';
import {
  Linkedin,
  Loader2,
  Check,
  Plus,
  FileText,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  UploadCloud,
  Link2,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useLinkedInData } from '../integration/hooks/useLinkedInData';
import { useCoreStore, type ResumeForgeItem } from '../integration/store/coreStore';

export const LinkedInIntegrationView: React.FC = () => {
  const {
    resumeForgeItems,
    setResumeForgeItems,
    updateResumeForgeItemBullet,
    acceptResumeForgeBullet,
    addResumeForgeToLedger,
    skillVerifications,
  } = useCoreStore();

  const { token, setToken, clearToken, connectUrl, importProfilePdf, isLoading: linkedInLoading, error: linkedInError } = useLinkedInData();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [profileUrlInput, setProfileUrlInput] = useState('');
  const [urlVerifying, setUrlVerifying] = useState(false);
  const [verifiedHandle, setVerifiedHandle] = useState<string>(() => {
    try {
      return localStorage.getItem('forge-linkedin-handle') || 'candidate';
    } catch {
      return 'candidate';
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isConnected = useMemo(() => Boolean(token), [token]);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleVerifyUrl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!profileUrlInput.trim()) {
      setError('Please enter a valid LinkedIn profile URL (e.g., https://linkedin.com/in/yourname)');
      return;
    }
    setUrlVerifying(true);
    setError(null);
    try {
      const res = await fetch('/api/linkedin/verify-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: profileUrlInput }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setToken(data.token);
        const handle = data.username || 'candidate';
        setVerifiedHandle(handle);
        try {
          localStorage.setItem('forge-linkedin-handle', handle);
        } catch {
          // ignore
        }
        showToast(`LinkedIn Profile Verified (@${handle})!`);
        setProfileUrlInput('');
      } else {
        setError(data.error || 'Failed to verify LinkedIn URL');
      }
    } catch {
      setError('Failed to reach backend service for LinkedIn verification');
    } finally {
      setUrlVerifying(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setLoading(true);

    try {
      const { bullets } = await importProfilePdf(file);
      
      if (!bullets || bullets.length === 0) {
        throw new Error('Could not extract achievements from this PDF.');
      }

      const newItems: ResumeForgeItem[] = bullets.map((bullet, idx) => ({
        id: `linkedin-pdf-${Date.now()}-${idx}`,
        repository: `LinkedIn Export: ${file.name.replace('.pdf', '')}`,
        repositoryUrl: 'https://www.linkedin.com',
        suggestedBullet: bullet,
        codeSnapshot: `Extracted from PDF section (Experience #${idx + 1})`,
        accepted: false,
        addedToLedger: false,
      }));

      setResumeForgeItems([...resumeForgeItems, ...newItems]);
      showToast(`Successfully extracted ${newItems.length} achievements!`);
    } catch (err: any) {
      setError(err.message || 'Failed to parse LinkedIn PDF');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const verifiedCount = Object.keys(skillVerifications || {}).length;
  const displayLoading = loading || linkedInLoading;
  const displayError = error || linkedInError;

  return (
    <div className="flex-1 bg-[#090A0F] min-h-screen overflow-y-auto px-4 py-8 sm:p-8 flex flex-col gap-6 max-w-6xl w-full mx-auto custom-scrollbar text-zinc-100">
      {/* Toast Feedback */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-zinc-950 font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs animate-in slide-in-from-bottom-5">
          <CheckCircle2 size={16} />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#0077B5]/20 border border-[#0077B5]/40 flex items-center justify-center shrink-0 shadow-lg shadow-[#0077B5]/10">
            <Linkedin size={22} className="text-[#0077B5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Identity & Experience Ingestion
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-black text-white tracking-tight">
              LinkedIn Integration
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 max-w-xl leading-relaxed">
              Verify candidate identity via LinkedIn handle or single-click OAuth, and upload profile exports to automatically synthesize quantified STAR achievements into your resume.
            </p>
          </div>
        </div>

        {/* Action button */}
        <div className="flex flex-col gap-2 w-full md:w-auto">
          {isConnected ? (
            <div className="flex items-center gap-2">
              <div className="px-3.5 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-400" />
                <span className="text-xs font-bold text-emerald-300">@{verifiedHandle}</span>
              </div>
              <button
                onClick={() => {
                  clearToken();
                  try { localStorage.removeItem('forge-linkedin-handle'); } catch {}
                  showToast('Disconnected LinkedIn identity');
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all border border-white/10 cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <a
              href={connectUrl}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#0077B5] hover:bg-[#00669c] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#0077B5]/25 active:scale-95 cursor-pointer"
            >
              <Linkedin size={16} />
              Instant OAuth Connect
            </a>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#12131C] rounded-2xl p-5 border border-white/10 shadow-xl">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Identity Status</p>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse' : 'bg-zinc-600'}`} />
              <span className="text-sm font-display font-bold text-white">
                {isConnected ? 'LinkedIn Verified' : 'Not Connected'}
              </span>
            </div>
            {isConnected && (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">Verified</span>
            )}
          </div>
        </div>

        <div className="bg-[#12131C] rounded-2xl p-5 border border-white/10 shadow-xl">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Extracted Achievements</p>
          <div className="mt-2 flex items-center gap-2.5">
            <FileText size={18} className="text-indigo-400" />
            <span className="text-2xl font-display font-black text-white">{resumeForgeItems.length}</span>
            <span className="text-xs text-zinc-400 font-medium">STAR bullets</span>
          </div>
        </div>

        <div className="bg-[#12131C] rounded-2xl p-5 border border-white/10 shadow-xl">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Proof-of-Work Ledger</p>
          <div className="mt-2 flex items-center gap-2.5">
            <ShieldCheck size={18} className="text-purple-400" />
            <span className="text-2xl font-display font-black text-white">{verifiedCount}</span>
            <span className="text-xs text-zinc-400 font-medium">verified skills</span>
          </div>
        </div>
      </div>

      {/* Error display */}
      {displayError && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-xs font-bold text-rose-300 flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0 text-rose-400" />
          <span>{displayError}</span>
        </div>
      )}

      {/* Zero-Cost Direct URL Verification Form */}
      <div className="bg-[#12131C] rounded-2xl p-6 border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 size={18} className="text-indigo-400" />
            <h3 className="text-xs font-display font-bold text-white uppercase tracking-wider">
              Direct Profile URL Verification (Zero-Cost / No API Key Required)
            </h3>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
            Zero Cost
          </span>
        </div>
        <p className="text-xs text-zinc-400">
          Provide your public LinkedIn handle or profile URL to establish candidate identity verification instantly.
        </p>

        <form onSubmit={handleVerifyUrl} className="flex flex-col sm:flex-row gap-3 pt-1">
          <div className="relative flex-1">
            <input
              type="text"
              value={profileUrlInput}
              onChange={(e) => setProfileUrlInput(e.target.value)}
              placeholder="https://www.linkedin.com/in/yourname"
              className="w-full bg-[#1A1B26] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={urlVerifying || !profileUrlInput.trim()}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-500/20 cursor-pointer"
          >
            {urlVerifying ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {urlVerifying ? 'Verifying...' : 'Verify Profile'}
          </button>
        </form>
      </div>

      {/* Upload Zone (Profile PDF export) */}
      <div className="bg-[#12131C] rounded-2xl p-8 border border-white/10 border-dashed text-center space-y-4 shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
          <UploadCloud size={30} />
        </div>
        <div>
          <h3 className="text-base font-display font-bold text-white">
            Import LinkedIn Profile PDF
          </h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto leading-relaxed">
            Export your profile (<span className="font-semibold text-zinc-200">More &rarr; Save to PDF</span> on LinkedIn) and upload it here. Nexus-Writer extracts your work experience and drafts high-impact, quantified STAR resume bullet points.
          </p>
        </div>

        <div className="pt-2 flex justify-center">
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={displayLoading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/15 border border-white/10 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <FileText size={16} />
            {displayLoading ? 'Processing PDF...' : 'Select LinkedIn PDF Export'}
          </button>
        </div>
      </div>

      {/* Loading state */}
      {displayLoading && (
        <div className="bg-[#12131C] rounded-2xl p-10 border border-white/10 text-center space-y-4">
          <Loader2 size={32} className="animate-spin text-indigo-400 mx-auto" />
          <h3 className="text-sm font-display font-bold text-white uppercase tracking-wider">
            Processing Profile Data...
          </h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Extracting professional experience and generating quantified STAR bullet points with AI assistance.
          </p>
        </div>
      )}

      {/* Repositories & Generated Bullet Points List */}
      {!displayLoading && resumeForgeItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              Extracted Professional Achievements ({resumeForgeItems.length})
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-bold uppercase cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw size={12} />
                Upload another PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {resumeForgeItems.map((item) => (
              <div
                key={item.id}
                className="bg-[#12131C] rounded-2xl p-6 border border-white/10 shadow-xl hover:border-white/20 transition-all space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#0077B5]/20 border border-[#0077B5]/30 flex items-center justify-center text-[#0077B5] shrink-0">
                      <Linkedin size={16} />
                    </div>
                    <div>
                      <span className="text-sm font-display font-bold text-white">
                        {item.repository}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-zinc-400 font-mono inline-flex items-center gap-1">
                          {item.codeSnapshot}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.accepted && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        <Check size={11} /> Added to CV
                      </span>
                    )}
                    {item.addedToLedger && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] font-bold uppercase tracking-wider text-purple-400">
                        <ShieldCheck size={11} /> In Proof Ledger
                      </span>
                    )}
                  </div>
                </div>

                {/* Generated Bullet Output */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Quantified Resume Bullet Point (Nexus-Writer Output)
                  </label>
                  <textarea
                    value={item.suggestedBullet}
                    onChange={(e) => updateResumeForgeItemBullet(item.id, e.target.value)}
                    rows={2}
                    className="w-full bg-[#1A1B26] border border-white/10 rounded-xl p-3.5 text-xs text-zinc-200 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-y"
                    placeholder="Refine bullet point here..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => {
                      acceptResumeForgeBullet(item.id);
                      showToast('Appended achievement to active resume!');
                    }}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      item.accepted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                    }`}
                  >
                    <Check size={13} />
                    {item.accepted ? 'In Resume Draft' : 'Accept into Resume'}
                  </button>

                  <button
                    onClick={() => {
                      addResumeForgeToLedger(item.id);
                      showToast('Added achievement to Proof-of-Work Ledger!');
                    }}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      item.addedToLedger
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20'
                    }`}
                  >
                    <Plus size={13} />
                    {item.addedToLedger ? 'In Proof Ledger' : 'Add to Proof Ledger'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LinkedInIntegrationView;
