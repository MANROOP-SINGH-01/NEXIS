import React, { useState, useEffect, useCallback } from 'react';
import { 
  BookOpen, Award, CheckCircle2, ShieldCheck, 
  ExternalLink, Code, Loader2, FileCheck, RefreshCw, GraduationCap
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
      case 'CODE_EVIDENCE': return <Code size={20} className="text-blue-500" />;
      case 'PROJECT_EVIDENCE': return <FileCheck size={20} className="text-purple-500" />;
      case 'CERTIFICATE': return <Award size={20} className="text-amber-500" />;
      case 'EDUCATION': return <GraduationCap size={20} className="text-emerald-500" />;
      default: return <BookOpen size={20} className="text-zinc-500" />;
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto px-4 py-8 sm:p-8 flex flex-col gap-6 max-w-5xl w-full mx-auto custom-scrollbar">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-zinc-950 flex items-center justify-center shrink-0 shadow-lg shadow-zinc-900/10">
            <ShieldCheck size={22} strokeWidth={2} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-zinc-950 tracking-tight leading-tight">Career Passport</h1>
            <p className="text-xs text-zinc-500 font-medium mt-1">
              Your verified record of skills, projects, and credentials.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={triggerGitHubScan}
            disabled={scanning}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-all disabled:opacity-50"
          >
            {scanning ? <Loader2 size={14} className="animate-spin" /> : <Code size={14} />}
            <span>Nexus-Verifier Scan</span>
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-all shadow-[var(--shadow-subtle)] disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 font-medium">
          {error}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Verified Skills</div>
          <div className="text-3xl font-display font-bold text-zinc-950">{evidenceItems.length}</div>
        </div>
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Certifications</div>
          <div className="text-3xl font-display font-bold text-zinc-950">
            {passportItems.filter(i => i.type === 'CERTIFICATE').length}
          </div>
        </div>
      </div>

      {/* Verified Evidence (Nexus Verifier) */}
      <div className="mt-6">
        <h2 className="text-sm font-display font-bold text-zinc-900 uppercase tracking-widest mb-4 flex items-center gap-2">
          <ShieldCheck size={16} className="text-blue-600" /> Nexus-Verified Evidence
        </h2>
        
        {evidenceItems.length === 0 && !loading && (
          <div className="p-8 border border-dashed border-zinc-300 rounded-3xl text-center">
            <p className="text-sm text-zinc-500 font-medium">No verified evidence found. Run a Nexus-Verifier scan to analyze your GitHub.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {evidenceItems.map(item => (
            <div key={item.id} className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-sm flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0">
                {renderIcon(item.evidenceType)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-zinc-900 text-sm">{item.skill}</h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                    <CheckCircle2 size={12} /> {item.source}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 font-medium mb-3">{item.evidenceDetails}</p>
                
                <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.round(item.confidence * 100)}%` }}></div>
                </div>
                <div className="text-[10px] text-zinc-400 font-bold mt-1 text-right">{Math.round(item.confidence * 100)}% Confidence</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Passport Items (Manual) */}
      <div className="mt-8">
        <h2 className="text-sm font-display font-bold text-zinc-900 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Award size={16} className="text-amber-600" /> Credentials & Education
        </h2>

        {passportItems.length === 0 && !loading && (
          <div className="p-8 border border-dashed border-zinc-300 rounded-3xl text-center">
            <p className="text-sm text-zinc-500 font-medium">No credentials added yet.</p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {passportItems.map(item => (
            <div key={item.id} className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0">
                  {renderIcon(item.type)}
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 text-sm">{item.title}</h3>
                  <p className="text-xs text-zinc-500 font-medium">{item.issuedBy} • {item.issuedAt ? new Date(item.issuedAt).getFullYear() : 'Ongoing'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {item.verified && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                    <ShieldCheck size={14} /> Verified
                  </span>
                )}
                {item.url && (
                  <a href={item.url} target="_blank" rel="noreferrer" className="p-2 text-zinc-400 hover:text-zinc-700 bg-zinc-50 hover:bg-zinc-100 rounded-xl transition-colors">
                    <ExternalLink size={16} />
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
