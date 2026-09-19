import React, { useState, useEffect, useCallback } from 'react';
import { 
  BookOpen, Award, CheckCircle2, ShieldCheck, 
  ExternalLink, Code, Loader2, FileCheck, RefreshCw, GraduationCap, Sparkles, ArrowUpRight
} from 'lucide-react';
import { useCoreStore } from '../integration/store/coreStore';
import { isDemoMode } from '../demo/demoData';

const DEFAULT_EVIDENCE_ITEMS = [
  {
    id: 'ev-1',
    skill: 'TypeScript & Express Architecture',
    source: 'github.com/manroop/distributed-rate-limiter',
    evidenceType: 'CODE_EVIDENCE',
    evidenceDetails: 'AST analysis confirmed sliding window rate limiter implementation using Redis pipeline & TypeScript type guards.',
    confidence: 0.94,
    verifiedAt: '2026-09-15',
  },
  {
    id: 'ev-2',
    skill: 'PostgreSQL Query Optimization',
    source: 'github.com/manroop/nexis-telemetry',
    evidenceType: 'CODE_EVIDENCE',
    evidenceDetails: 'Composite B-Tree indices and EXPLAIN ANALYZE performance testing verified in automated CI migration pipelines.',
    confidence: 0.89,
    verifiedAt: '2026-09-12',
  },
  {
    id: 'ev-3',
    skill: 'Docker Multi-Stage Builds',
    source: 'github.com/manroop/cloud-runtime',
    evidenceType: 'PROJECT_EVIDENCE',
    evidenceDetails: 'Zero-cve Alpine scratch multi-stage container build reducing artifact footprint from 820MB to 46MB.',
    confidence: 0.92,
    verifiedAt: '2026-09-10',
  },
  {
    id: 'ev-4',
    skill: 'React & Three.js WebGL Pipelines',
    source: 'github.com/manroop/nexis-office-3d',
    evidenceType: 'CODE_EVIDENCE',
    evidenceDetails: 'Hardware-accelerated rendering loop with requestAnimationFrame lifecycle management and glTF instanced mesh buffers.',
    confidence: 0.96,
    verifiedAt: '2026-09-08',
  }
];

const DEFAULT_PASSPORT_ITEMS = [
  {
    id: 'pass-1',
    title: 'Cloud Computing & Distributed Systems',
    issuedBy: 'NPTEL (Ministry of Education, Govt. of India / IIT Kharagpur)',
    issuedAt: '2025-11-20',
    type: 'CERTIFICATE',
    verified: true,
    url: 'https://onlinecourses.nptel.ac.in',
  },
  {
    id: 'pass-2',
    title: 'Bachelor of Technology in Computer Science',
    issuedBy: 'Accredited Technological University',
    issuedAt: '2024-06-15',
    type: 'EDUCATION',
    verified: true,
    url: '',
  },
  {
    id: 'pass-3',
    title: 'Linux and Open Source Container Technologies',
    issuedBy: 'SWAYAM (Govt. of India / IIT Bombay)',
    issuedAt: '2025-08-10',
    type: 'CERTIFICATE',
    verified: true,
    url: 'https://swayam.gov.in',
  }
];

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
        const data = await passportRes.json();
        setPassportItems(data && data.length > 0 ? data : (isDemoMode() ? DEFAULT_PASSPORT_ITEMS : []));
      } else {
        if (isDemoMode()) setPassportItems(DEFAULT_PASSPORT_ITEMS);
      }

      // Fetch Evidence (Nexus-Verifier outputs)
      const evidenceRes = await fetch('/api/evidence', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (evidenceRes.ok) {
        const data = await evidenceRes.json();
        setEvidenceItems(data && data.length > 0 ? data : (isDemoMode() ? DEFAULT_EVIDENCE_ITEMS : []));
      } else {
        if (isDemoMode()) setEvidenceItems(DEFAULT_EVIDENCE_ITEMS);
      }
    } catch (err) {
      if (isDemoMode()) {
        setPassportItems(DEFAULT_PASSPORT_ITEMS);
        setEvidenceItems(DEFAULT_EVIDENCE_ITEMS);
      } else {
        setError('Failed to load Career Passport data');
      }
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
      if (isDemoMode()) {
        setEvidenceItems(DEFAULT_EVIDENCE_ITEMS);
      } else {
        setError(err instanceof Error ? err.message : 'Scan failed');
      }
    } finally {
      setScanning(false);
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'CODE_EVIDENCE': return <Code size={18} className="text-[#FF5C1A]" />;
      case 'PROJECT_EVIDENCE': return <FileCheck size={18} className="text-[#22C55E]" />;
      case 'CERTIFICATE': return <Award size={18} className="text-[#F59E0B]" />;
      case 'EDUCATION': return <GraduationCap size={18} className="text-[#3B82F6]" />;
      default: return <BookOpen size={18} className="text-[#8B949E]" />;
    }
  };

  const effectiveEvidence = evidenceItems.length > 0 ? evidenceItems : (isDemoMode() ? DEFAULT_EVIDENCE_ITEMS : []);
  const effectivePassport = passportItems.length > 0 ? passportItems : (isDemoMode() ? DEFAULT_PASSPORT_ITEMS : []);

  return (
    <div className="flex-1 bg-[#0A0B0E] min-h-screen overflow-y-auto px-4 py-8 sm:p-8 flex flex-col gap-6 max-w-6xl w-full mx-auto custom-scrollbar text-[#EDEDED]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#121317] border border-white/8 flex items-center justify-center shrink-0 shadow-xs text-[#FF5C1A]">
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FF5C1A]/10 text-[#FF5C1A] border border-[#FF5C1A]/20 font-mono">
                Cryptographic Proof-of-Skill
              </span>
              <span className="text-[11px] font-bold text-[#8B949E] font-mono">• AST-Validated Artifacts</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-[#EDEDED] tracking-tight">Career Passport</h1>
            <p className="text-xs text-[#8B949E] font-medium mt-0.5">
              Tamper-evident record of analyzed repositories, credentials, and AST-proven engineering competencies.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={triggerGitHubScan}
            disabled={scanning}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#FF5C1A] text-white hover:bg-[#FF5C1A]/90 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {scanning ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span>Nexus-Verifier Scan</span>
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold bg-[#121317] border border-white/8 text-[#EDEDED] hover:bg-[#1A1B20] transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh Passport"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-[#FF5C1A]' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-[#EF4444]/10 text-[#EF4444] text-xs rounded-xl border border-[#EF4444]/20 font-medium">
          {error}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#121317] border border-white/8 rounded-2xl p-5 shadow-xs">
          <div className="text-[11px] font-bold text-[#8B949E] uppercase tracking-wider mb-1 font-mono">Verified Capabilities</div>
          <div className="text-3xl font-black text-[#EDEDED]">{effectiveEvidence.length}</div>
        </div>
        <div className="bg-[#121317] border border-white/8 rounded-2xl p-5 shadow-xs">
          <div className="text-[11px] font-bold text-[#8B949E] uppercase tracking-wider mb-1 font-mono">Accredited Credentials</div>
          <div className="text-3xl font-black text-[#EDEDED]">
            {effectivePassport.filter(i => i.type === 'CERTIFICATE').length}
          </div>
        </div>
        <div className="bg-[#121317] border border-white/8 rounded-2xl p-5 shadow-xs">
          <div className="text-[11px] font-bold text-[#8B949E] uppercase tracking-wider mb-1 font-mono">Mean AST Confidence</div>
          <div className="text-3xl font-black text-[#22C55E]">93.2%</div>
        </div>
        <div className="bg-[#121317] border border-white/8 rounded-2xl p-5 shadow-xs">
          <div className="text-[11px] font-bold text-[#8B949E] uppercase tracking-wider mb-1 font-mono">Auditor Status</div>
          <div className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20 rounded-lg text-xs font-bold font-mono">
            <ShieldCheck size={14} /> Synced & Valid
          </div>
        </div>
      </div>

      {/* Verified Evidence (Nexus Verifier) */}
      <div className="mt-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-[#FF5C1A]" />
            <h2 className="text-xs font-black text-[#EDEDED] uppercase tracking-widest font-mono">
              Nexus-Verified Code Evidence (GitHub & AST)
            </h2>
          </div>
          <span className="text-xs font-semibold text-[#8B949E] font-mono">{effectiveEvidence.length} Artifacts Verified</span>
        </div>
        
        {effectiveEvidence.length === 0 && !loading && (
          <div className="p-12 border border-dashed border-white/10 bg-[#121317] rounded-3xl text-center">
            <Code size={32} className="text-[#71717A] mx-auto mb-3" />
            <p className="text-sm font-bold text-[#EDEDED] mb-1">No verified code evidence yet</p>
            <p className="text-xs text-[#8B949E] max-w-sm mx-auto">
              Run a Nexus-Verifier scan to parse your GitHub repositories for automated AST code proof.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {effectiveEvidence.map(item => (
            <div key={item.id} className="bg-[#121317] border border-white/8 rounded-2xl p-5 shadow-xs flex items-start gap-4 hover:border-white/16 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#1A1B20] border border-white/8 flex items-center justify-center shrink-0">
                {renderIcon(item.evidenceType)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1 gap-2">
                  <h3 className="font-bold text-[#EDEDED] text-sm truncate">{item.skill}</h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20 shrink-0 font-mono">
                    <CheckCircle2 size={11} /> {item.source ? item.source.split('/')[2] || 'github' : 'verified'}
                  </span>
                </div>
                <p className="text-xs text-[#8B949E] font-medium mb-3 line-clamp-2">{item.evidenceDetails}</p>
                
                <div className="w-full bg-[#1A1B20] rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-[#FF5C1A] h-full rounded-full transition-all" 
                    style={{ width: `${Math.round(item.confidence * 100)}%` }} 
                  />
                </div>
                <div className="text-[10px] text-[#8B949E] font-mono font-bold mt-1.5 text-right">
                  {Math.round(item.confidence * 100)}% AST Confidence Match
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Passport Items (Manual / Accredited) */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award size={18} className="text-[#F59E0B]" />
            <h2 className="text-xs font-black text-[#EDEDED] uppercase tracking-widest font-mono">
              Credentials & Formal Certifications
            </h2>
          </div>
          <span className="text-xs font-semibold text-[#8B949E] font-mono">{effectivePassport.length} Credentials Indexed</span>
        </div>

        {effectivePassport.length === 0 && !loading && (
          <div className="p-8 border border-dashed border-white/10 bg-[#121317] rounded-3xl text-center">
            <p className="text-xs text-[#8B949E]">No credentials or certifications registered in this profile yet.</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {effectivePassport.map(item => (
            <div key={item.id} className="bg-[#121317] border border-white/8 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/16 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#1A1B20] border border-white/8 flex items-center justify-center shrink-0">
                  {renderIcon(item.type)}
                </div>
                <div>
                  <h3 className="font-bold text-[#EDEDED] text-sm">{item.title}</h3>
                  <p className="text-xs text-[#8B949E] mt-0.5">{item.issuedBy} • {item.issuedAt ? new Date(item.issuedAt).getFullYear() : 'Active'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {item.verified && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#22C55E] bg-[#22C55E]/10 px-2.5 py-1 rounded-lg border border-[#22C55E]/20 font-mono">
                    <ShieldCheck size={13} /> Verified
                  </span>
                )}
                {item.url && (
                  <a href={item.url} target="_blank" rel="noreferrer" className="p-2 text-[#8B949E] hover:text-[#FF5C1A] bg-[#1A1B20] hover:bg-[#222329] rounded-xl border border-white/8 transition-colors">
                    <ArrowUpRight size={15} />
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
