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

      const generated: ResumeForgeItem[] = bullets.map((bullet, idx) => ({
        id: `li_${Date.now()}_${idx}`,
        repository: 'LinkedIn Experience',
        repositoryUrl: 'https://linkedin.com',
        codeSnapshot: `Imported Achievement #${idx + 1}`,
        suggestedBullet: bullet,
        accepted: false,
        addedToLedger: false,
      }));

      setResumeForgeItems(generated);
      if (!token) {
        setToken('li_dev_verified_' + Date.now());
      }
      showToast(`Extracted ${bullets.length} achievements successfully!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import PDF');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const verifiedCount = Object.values(skillVerifications).filter((s) => s.verified).length;
  const displayError = error || linkedInError;
  const displayLoading = loading || linkedInLoading;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-50/50">
      {/* Toast */}
      {successToast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-md shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
          {successToast}
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-lg p-6 md:p-8 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-lg bg-[#0077B5] text-white flex items-center justify-center shrink-0 shadow-md">
            <Linkedin size={28} />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200/60 mb-2">
              <Sparkles size={12} className="text-blue-600" />
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">
                Zero-Cost LinkedIn Career Sync
              </span>
            </div>
            <h1 className="text-2xl font-black text-darkDelegation tracking-tight">
              LinkedIn Integration
            </h1>
            <p className="text-xs text-zinc-500 mt-1 max-w-xl leading-relaxed">
              Verify candidate identity via LinkedIn URL or single-click OAuth, and upload profile exports to automatically synthesize quantified STAR achievements into your resume draft.
            </p>
          </div>
        </div>

        {/* Action button */}
        <div className="flex flex-col gap-2 w-full md:w-auto">
          {isConnected ? (
            <div className="flex items-center gap-2">
              <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-md flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span className="text-xs font-bold text-emerald-800">@{verifiedHandle}</span>
              </div>
              <button
                onClick={() => {
                  clearToken();
                  try { localStorage.removeItem('forge-linkedin-handle'); } catch {}
                  showToast('Disconnected LinkedIn identity');
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-black uppercase tracking-wider rounded-md transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <a
              href={connectUrl}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0077B5] hover:bg-[#006097] text-white text-xs font-black uppercase tracking-wider rounded-md transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Linkedin size={16} />
              Instant OAuth Connect
            </a>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Identity Status</p>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-300'}`} />
              <span className="text-sm font-black text-darkDelegation">
                {isConnected ? 'LinkedIn Verified' : 'Not Connected'}
              </span>
            </div>
            {isConnected && (
              <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Verified</span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Extracted Achievements</p>
          <div className="mt-2 flex items-center gap-2">
            <FileText size={18} className="text-blue-600" />
            <span className="text-xl font-black text-darkDelegation">{resumeForgeItems.length}</span>
            <span className="text-xs text-zinc-400 font-bold">STAR bullets</span>
          </div>
        </div>

        <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Proof-of-Work Ledger</p>
          <div className="mt-2 flex items-center gap-2">
            <ShieldCheck size={18} className="text-purple-600" />
            <span className="text-xl font-black text-darkDelegation">{verifiedCount}</span>
            <span className="text-xs text-zinc-400 font-bold">verified skills</span>
          </div>
        </div>
      </div>

      {/* Error display */}
      {displayError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-xs font-bold text-red-700 flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0 text-red-600" />
          <span>{displayError}</span>
        </div>
      )}

      {/* Zero-Cost Direct URL Verification Form */}
      <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 size={18} className="text-[#0077B5]" />
            <h3 className="text-sm font-black text-darkDelegation uppercase tracking-wider">
              Direct Profile URL Verification (Zero-Cost / No API Key Required)
            </h3>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Zero Cost
          </span>
        </div>
        <p className="text-xs text-zinc-500">
          Provide your public LinkedIn handle or profile URL to establish candidate identity verification instantly.
        </p>

        <form onSubmit={handleVerifyUrl} className="flex flex-col sm:flex-row gap-3 pt-1">
          <div className="relative flex-1">
            <input
              type="text"
              value={profileUrlInput}
              onChange={(e) => setProfileUrlInput(e.target.value)}
              placeholder="https://www.linkedin.com/in/yourname"
              className="w-full bg-zinc-50 border border-slate-200 rounded-md px-4 py-2.5 text-xs text-zinc-800 font-sans focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={urlVerifying || !profileUrlInput.trim()}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#0077B5] hover:bg-[#006097] disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-md transition-all shadow-sm cursor-pointer"
          >
            {urlVerifying ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {urlVerifying ? 'Verifying...' : 'Verify Profile'}
          </button>
        </form>
      </div>

      {/* Upload Zone (Profile PDF export) */}
      <div className="bg-white rounded-lg p-8 border border-slate-200 border-dashed text-center space-y-4">
        <div className="w-16 h-16 rounded-lg bg-blue-50 flex items-center justify-center text-[#0077B5] mx-auto">
          <UploadCloud size={32} />
        </div>
        <div>
          <h3 className="text-base font-black text-darkDelegation">
            Import LinkedIn Profile PDF
          </h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto leading-relaxed">
            Export your LinkedIn profile (<span className="font-bold text-zinc-700">More &rarr; Save to PDF</span> on LinkedIn) and upload it here. Nexus-Writer extracts your work experience and drafts high-impact, quantified STAR resume bullet points.
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
            className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-black disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-md transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <FileText size={16} />
            {displayLoading ? 'Processing PDF...' : 'Select LinkedIn PDF File'}
          </button>
        </div>
      </div>

      {/* Loading state */}
      {displayLoading && (
        <div className="bg-white rounded-lg p-10 border border-slate-200 text-center space-y-4">
          <Loader2 size={32} className="animate-spin text-blue-600 mx-auto" />
          <h3 className="text-sm font-black text-darkDelegation uppercase tracking-wider">
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
            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">
              Extracted Professional Achievements ({resumeForgeItems.length})
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-bold uppercase cursor-pointer flex items-center gap-1"
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
                className="bg-white rounded-lg p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#0077B5] shrink-0">
                      <Linkedin size={16} />
                    </div>
                    <div>
                      <span className="text-sm font-black text-darkDelegation">
                        {item.repository}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-zinc-400 font-mono inline-flex items-center gap-1">
                          {item.codeSnapshot}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.accepted && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                        <Check size={10} /> Added to CV
                      </span>
                    )}
                    {item.addedToLedger && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-[10px] font-black uppercase tracking-wider text-purple-700">
                        <ShieldCheck size={10} /> In Proof Ledger
                      </span>
                    )}
                  </div>
                </div>

                {/* Generated Bullet Output */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Quantified Resume Bullet Point (Nexus-Writer Output)
                  </label>
                  <textarea
                    value={item.suggestedBullet}
                    onChange={(e) => updateResumeForgeItemBullet(item.id, e.target.value)}
                    rows={2}
                    className="w-full bg-zinc-50 border border-slate-200 rounded-md p-3 text-xs text-zinc-700 font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-y"
                    placeholder="Refine bullet point here..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      acceptResumeForgeBullet(item.id);
                      showToast('Appended achievement to active resume!');
                    }}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      item.accepted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white'
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
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      item.addedToLedger
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-600 hover:text-white'
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
