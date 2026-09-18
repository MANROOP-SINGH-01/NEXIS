import React, { useState, useEffect, useCallback } from 'react';
import { 
  BookOpen, Award, CheckCircle2, ShieldCheck, 
  ExternalLink, Code, Loader2, FileCheck, RefreshCw, GraduationCap, Sparkles
} from 'lucide-react';
import { useCoreStore } from '../integration/store/coreStore';

export const CareerPassportView: React.FC = () => {
  const { traineeProfile } = useCoreStore();
  const [passportItems, setPassportItems] = useState<any[]>([]);
  const [evidenceItems, setEvidenceItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getActiveToken = useCallback((): string => {
    try {
      const auth = localStorage.getItem('nexis-auth');
      if (auth) {
        const parsed = JSON.parse(auth);
        if (parsed?.state?.token) return parsed.state.token;
      }
    } catch {}
    return '';
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = getActiveToken();
      // Fetch Passport Items
      const passportRes = await fetch('/api/passport', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (passportRes.ok) {
        setPassportItems(await passportRes.json());
      }

      // Fetch Evidence (Nexus-Verifier outputs)
      const evidenceRes = await fetch('/api/evidence', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (evidenceRes.ok) {
        setEvidenceItems(await evidenceRes.json());
      }
    } catch (err) {
      setError('Failed to load Career Passport data');
    } finally {
      setLoading(false);
    }
  }, [getActiveToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const triggerGitHubScan = async () => {
    setScanning(true);
    setError(null);
    try {
      const res = await fetch('/api/evidence/github-scan', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getActiveToken()}` 
        },
        body: JSON.stringify({ githubUsername: 'demo-user' })
      });
      
      if (!res.ok) throw new Error('Scan failed');
      await fetchData(); // Refetch evidence
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'CODE_EVIDENCE': return <Code size={18} className="text-indigo-400" />;
      case 'PROJECT_EVIDENCE': return <FileCheck size={18} className="text-purple-400" />;
      case 'CERTIFICATE': return <Award size={18} className="text-amber-400" />;
      case 'EDUCATION': return <GraduationCap size={18} className="text-emerald-400" />;
      default: return <BookOpen size={18} className="text-zinc-400" />;
    }
  };

  return (
    <div className="flex-1 bg-[#090A0F] min-h-screen overflow-y-auto px-4 py-8 sm:p-8 flex flex-col gap-6 max-w-6xl w-full mx-auto custom-scrollbar text-zinc-100">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#12131C] border border-white/10 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/10">
            <ShieldCheck size={22} className="text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Cryptographic Proof-of-Skill
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-black text-white tracking-tight">Career Passport</h1>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">
              Verified record of analyzed repositories, credentials, and AST-proven competencies.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={triggerGitHubScan}
            disabled={scanning}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {scanning ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span>Nexus-Verifier Scan</span>
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#12131C] border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-indigo-400' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 text-rose-300 text-xs rounded-xl border border-rose-500/20 font-medium">
          {error}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#12131C] border border-white/10 rounded-2xl p-5 shadow-xl">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Verified Capabilities</div>
          <div className="text-3xl font-display font-black text-white">{evidenceItems.length}</div>
        </div>
        <div className="bg-[#12131C] border border-white/10 rounded-2xl p-5 shadow-xl">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Accredited Credentials</div>
          <div className="text-3xl font-display font-black text-white">
            {passportItems.filter(i => i.type === 'CERTIFICATE').length}
          </div>
        </div>
      </div>

      {/* Verified Evidence (Nexus Verifier) */}
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck size={16} className="text-indigo-400" />
          <h2 className="text-xs font-display font-bold text-white uppercase tracking-widest">
            Nexus-Verified Code Evidence
          </h2>
        </div>
        
        {evidenceItems.length === 0 && !loading && (
          <div className="p-12 border border-dashed border-white/10 bg-[#12131C]/50 rounded-3xl text-center">
            <Code size={32} className="text-zinc-600 mx-auto mb-3" />
            <p className="text-sm font-display font-bold text-white mb-1">No verified code evidence yet</p>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Run a Nexus-Verifier scan to parse your GitHub repositories for automated AST code proof.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {evidenceItems.map(item => (
            <div key={item.id} className="bg-[#12131C] border border-white/10 rounded-2xl p-5 shadow-xl flex items-start gap-4 hover:border-white/20 transition-all">
              <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center shrink-0">
                {renderIcon(item.evidenceType)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1 gap-2">
                  <h3 className="font-display font-bold text-white text-sm truncate">{item.skill}</h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                    <CheckCircle2 size={11} /> {item.source}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-medium mb-3 line-clamp-2">{item.evidenceDetails}</p>
                
                <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden border border-white/5">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all" 
                    style={{ width: `${Math.round(item.confidence * 100)}%` }} 
                  />
                </div>
                <div className="text-[10px] text-zinc-400 font-mono font-bold mt-1.5 text-right">
                  {Math.round(item.confidence * 100)}% Confidence Match
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Passport Items (Manual / Accredited) */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Award size={16} className="text-amber-400" />
          <h2 className="text-xs font-display font-bold text-white uppercase tracking-widest">
            Credentials & Formal Education
          </h2>
        </div>

        {passportItems.length === 0 && !loading && (
          <div className="p-8 border border-dashed border-white/10 bg-[#12131C]/50 rounded-3xl text-center">
            <p className="text-xs text-zinc-400">No credentials or certifications registered in this profile yet.</p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {passportItems.map(item => (
            <div key={item.id} className="bg-[#12131C] border border-white/10 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/20 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center shrink-0">
                  {renderIcon(item.type)}
                </div>
                <div>
                  <h3 className="font-display font-bold text-white text-sm">{item.title}</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{item.issuedBy} • {item.issuedAt ? new Date(item.issuedAt).getFullYear() : 'Active'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {item.verified && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                    <ShieldCheck size={13} /> Verified
                  </span>
                )}
                {item.url && (
                  <a href={item.url} target="_blank" rel="noreferrer" className="p-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
                    <ExternalLink size={15} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default CareerPassportView;
