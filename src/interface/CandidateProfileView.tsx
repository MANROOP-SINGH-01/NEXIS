import React, { useState } from 'react';
import {
  User, Briefcase, MapPin, DollarSign, ShieldAlert, CheckCircle2,
  Plus, X, Save, Sparkles, Building2, Calendar, Award, ExternalLink,
  Target, FileText, Check, Sliders
} from 'lucide-react';
import { useCoreStore } from '../integration/store/coreStore';
import { CareerPreferences, WorkHistoryRole } from '../types';
import { NexusCard, NexusBadge, NexusButton, NexusTabs } from './nexus';

export const CandidateProfileView: React.FC = () => {
  const { 
    preferences, 
    setPreferences, 
    workHistoryProfile, 
    setWorkHistoryProfile,
    traineeProfile
  } = useCoreStore();

  const [activeTab, setActiveTab] = useState<'preferences' | 'history' | 'competencies'>('preferences');
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // Active preferences state
  const prefs = preferences;
  const history = workHistoryProfile;

  const [targetRoles, setTargetRoles] = useState<string[]>(prefs.targetRoles || []);
  const [locations, setLocations] = useState<string[]>(prefs.locations || []);
  const [workModes, setWorkModes] = useState<('REMOTE' | 'HYBRID' | 'ONSITE')[]>(prefs.workModes || ['REMOTE', 'HYBRID']);
  const [minSalary, setMinSalary] = useState<string>(String(prefs.minimumSalary || '₹28,00,000 / year'));
  const [dealbreakers, setDealbreakers] = useState<string[]>(prefs.dealbreakers || []);
  const [mustHaves, setMustHaves] = useState<string[]>(prefs.mustHaves || []);
  const [niceToHaves, setNiceToHaves] = useState<string[]>(prefs.niceToHaves || []);

  // New tag input states
  const [newDealbreaker, setNewDealbreaker] = useState('');
  const [newMustHave, setNewMustHave] = useState('');
  const [newRole, setNewRole] = useState('');

  const handleSave = () => {
    const updated: CareerPreferences = {
      targetRoles,
      locations,
      workModes,
      minimumSalary: minSalary,
      dealbreakers,
      mustHaves,
      niceToHaves,
    };
    setPreferences(updated);
    setSaveNotice('Preferences & dealbreakers synchronized across all matching engines!');
    setTimeout(() => setSaveNotice(null), 3500);
  };

  const handleToggleWorkMode = (mode: 'REMOTE' | 'HYBRID' | 'ONSITE') => {
    if (workModes.includes(mode)) {
      if (workModes.length > 1) {
        setWorkModes(workModes.filter(m => m !== mode));
      }
    } else {
      setWorkModes([...workModes, mode]);
    }
  };

  const addDealbreaker = () => {
    const trimmed = newDealbreaker.trim();
    if (trimmed && !dealbreakers.includes(trimmed)) {
      setDealbreakers([...dealbreakers, trimmed]);
      setNewDealbreaker('');
    }
  };

  const removeDealbreaker = (item: string) => {
    setDealbreakers(dealbreakers.filter(d => d !== item));
  };

  const addMustHave = () => {
    const trimmed = newMustHave.trim();
    if (trimmed && !mustHaves.includes(trimmed)) {
      setMustHaves([...mustHaves, trimmed]);
      setNewMustHave('');
    }
  };

  const removeMustHave = (item: string) => {
    setMustHaves(mustHaves.filter(m => m !== item));
  };

  const addTargetRole = () => {
    const trimmed = newRole.trim();
    if (trimmed && !targetRoles.includes(trimmed)) {
      setTargetRoles([...targetRoles, trimmed]);
      setNewRole('');
    }
  };

  const removeTargetRole = (item: string) => {
    setTargetRoles(targetRoles.filter(r => r !== item));
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 bg-[#0A0B0E] text-[#EDEDED]">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── Candidate Profile Header Banner ────────────────────────── */}
        <div className="bg-[#121317] border border-white/8 rounded-[10px] p-6 sm:p-8 shadow-[0_8px_24px_rgba(0,0,0,0.4)] relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-[10px] bg-gradient-to-br from-[#FF5C1A] to-[#E04006] text-white flex items-center justify-center font-bold text-2xl shrink-0 shadow-[0_0_20px_rgba(255,92,26,0.35)]">
                PS
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl font-extrabold text-[#EDEDED] tracking-tight">
                    {traineeProfile?.trainee?.name || history.candidateName || 'Priya Sharma'}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/25 text-[#22C55E]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] shadow-[0_0_6px_rgba(34,197,94,0.6)] animate-pulse" />
                    VERIFIED CANDIDATE
                  </span>
                </div>
                <p className="text-sm font-medium text-[#8B949E] mt-0.5">
                  Staff Backend & Distributed Systems Engineer &bull; 6+ YOE
                </p>
                <p className="text-xs text-[#6E7681] mt-1 font-mono">
                  Autonomous Agent Mesh: Active &bull; DPDP Consent: Granted
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#6E7681] block">
                  Profile Completeness
                </span>
                <span className="text-lg font-mono font-extrabold text-[#EDEDED]">
                  94%
                </span>
              </div>

              <button
                onClick={handleSave}
                className="h-[36px] px-4 rounded-[8px] bg-gradient-to-r from-[#FF5C1A] to-[#E04006] hover:brightness-110 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(255,92,26,0.35)] transition-all cursor-pointer"
              >
                <Save size={14} />
                <span>Save Profile</span>
              </button>
            </div>
          </div>

          {saveNotice && (
            <div className="mt-4 p-2.5 rounded-[8px] bg-[#22C55E]/10 border border-[#22C55E]/25 text-xs text-[#22C55E] font-medium flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 size={14} />
              <span>{saveNotice}</span>
            </div>
          )}
        </div>

        {/* ── Navigation Tabs ────────────────────────────────────────── */}
        <div className="flex border-b border-white/8 gap-6 font-mono">
          <button
            onClick={() => setActiveTab('preferences')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'preferences'
                ? 'border-[#FF5C1A] text-[#FF5C1A]'
                : 'border-transparent text-[#8B949E] hover:text-[#EDEDED]'
            }`}
          >
            <ShieldAlert size={14} />
            <span>Dealbreakers & Preferences</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'history'
                ? 'border-[#FF5C1A] text-[#FF5C1A]'
                : 'border-transparent text-[#8B949E] hover:text-[#EDEDED]'
            }`}
          >
            <Briefcase size={14} />
            <span>Work History & Accomplishments</span>
          </button>

          <button
            onClick={() => setActiveTab('competencies')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'competencies'
                ? 'border-[#FF5C1A] text-[#FF5C1A]'
                : 'border-transparent text-[#8B949E] hover:text-[#EDEDED]'
            }`}
          >
            <Award size={14} />
            <span>Verified Competencies</span>
          </button>
        </div>

        {/* ── TAB 1: DEALBREAKERS & CAREER PREFERENCES ──────────────────── */}
        {activeTab === 'preferences' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Proficiently Dealbreaker Engine (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Dealbreakers Panel */}
              <div className="bg-[#121317] border border-white/8 rounded-[10px] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-sm font-bold text-[#EDEDED] flex items-center gap-2 font-mono">
                      <span className="w-2 h-2 rounded-full bg-[#EF4444] shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
                      Dealbreakers (Immediate Skip)
                    </h2>
                    <p className="text-xs text-[#8B949E] mt-0.5">
                      Jobs triggering any dealbreaker are automatically sorted into the <strong>IGNORE</strong> bucket.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 bg-[#EF4444]/10 text-[#EF4444] rounded-full border border-[#EF4444]/25">
                    {dealbreakers.length} Active
                  </span>
                </div>

                {/* Dealbreaker Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {dealbreakers.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-medium bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/25"
                    >
                      <span>{item}</span>
                      <button
                        onClick={() => removeDealbreaker(item)}
                        className="hover:text-white cursor-pointer"
                        title="Remove Dealbreaker"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Add Dealbreaker Form */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newDealbreaker}
                    onChange={(e) => setNewDealbreaker(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDealbreaker(); } }}
                    placeholder="e.g. Requires >2 days on-site, compensation < ₹25L..."
                    className="flex-1 h-[36px] px-3.5 bg-[#1A1B20] border border-white/10 rounded-[8px] text-xs text-[#EDEDED] focus:outline-none focus:border-[#FF5C1A] placeholder-[#6E7681]"
                  />
                  <button
                    onClick={addDealbreaker}
                    className="h-[36px] px-3.5 rounded-[8px] bg-[#1A1B20] hover:bg-[#22242B] border border-white/10 text-xs font-bold text-[#EDEDED] flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Plus size={14} />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Must-Haves Panel */}
              <div className="bg-[#121317] border border-white/8 rounded-[10px] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-sm font-bold text-[#EDEDED] flex items-center gap-2 font-mono">
                      <span className="w-2 h-2 rounded-full bg-[#22C55E] shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
                      Must-Haves (Strict Requirements)
                    </h2>
                    <p className="text-xs text-[#8B949E] mt-0.5">
                      Target roles must fulfill these criteria to score 85%+ into the <strong>APPLY NOW</strong> bucket.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 bg-[#22C55E]/10 text-[#22C55E] rounded-full border border-[#22C55E]/25">
                    {mustHaves.length} Active
                  </span>
                </div>

                {/* Must-Have Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {mustHaves.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-medium bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/25"
                    >
                      <span>{item}</span>
                      <button
                        onClick={() => removeMustHave(item)}
                        className="hover:text-white cursor-pointer"
                        title="Remove Must-Have"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Add Must-Have Form */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newMustHave}
                    onChange={(e) => setNewMustHave(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMustHave(); } }}
                    placeholder="e.g. Production TypeScript backend, mentorship track..."
                    className="flex-1 h-[36px] px-3.5 bg-[#1A1B20] border border-white/10 rounded-[8px] text-xs text-[#EDEDED] focus:outline-none focus:border-[#FF5C1A] placeholder-[#6E7681]"
                  />
                  <button
                    onClick={addMustHave}
                    className="h-[36px] px-3.5 rounded-[8px] bg-[#1A1B20] hover:bg-[#22242B] border border-white/10 text-xs font-bold text-[#EDEDED] flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Plus size={14} />
                    <span>Add</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Right Column: Roles, Work Modes, Salary (5 cols) */}
            <div className="lg:col-span-5 space-y-6">

              {/* Target Roles */}
              <div className="bg-[#121317] border border-white/8 rounded-[10px] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
                <h2 className="text-sm font-bold text-[#EDEDED] mb-3 flex items-center gap-2 font-mono">
                  <Target size={15} className="text-[#FF5C1A]" />
                  Target Role Titles
                </h2>

                <div className="flex flex-wrap gap-2 mb-4">
                  {targetRoles.map((role) => (
                    <span
                      key={role}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-[#1A1B20] text-[#EDEDED] border border-white/10"
                    >
                      <span>{role}</span>
                      <button
                        onClick={() => removeTargetRole(role)}
                        className="text-[#6E7681] hover:text-white cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTargetRole(); } }}
                    placeholder="Add target title..."
                    className="flex-1 h-[36px] px-3.5 bg-[#1A1B20] border border-white/10 rounded-[8px] text-xs text-[#EDEDED] focus:outline-none focus:border-[#FF5C1A] placeholder-[#6E7681]"
                  />
                  <button
                    onClick={addTargetRole}
                    className="h-[36px] px-3.5 rounded-[8px] bg-[#1A1B20] hover:bg-[#22242B] border border-white/10 text-xs font-bold text-[#EDEDED] flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>

              {/* Work Mode & Compensation */}
              <div className="bg-[#121317] border border-white/8 rounded-[10px] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.4)] space-y-5">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#8B949E] mb-2.5 font-mono">
                    Permitted Work Modes
                  </h2>
                  <div className="grid grid-cols-3 gap-2">
                    {(['REMOTE', 'HYBRID', 'ONSITE'] as const).map((mode) => {
                      const isSelected = workModes.includes(mode);
                      return (
                        <button
                          key={mode}
                          onClick={() => handleToggleWorkMode(mode)}
                          className={`h-[36px] px-3 rounded-[8px] text-xs font-bold font-mono transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-[#1A1B20] text-white border-[#FF5C1A] shadow-[0_0_12px_rgba(255,92,26,0.25)]'
                              : 'bg-[#0A0B0E] text-[#8B949E] border-white/8 hover:border-white/16'
                          }`}
                        >
                          {mode}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#8B949E] mb-1.5 font-mono">
                    Minimum Target Compensation
                  </h2>
                  <div className="relative flex items-center">
                    <DollarSign size={14} className="absolute left-3 text-[#6E7681]" />
                    <input
                      type="text"
                      value={minSalary}
                      onChange={(e) => setMinSalary(e.target.value)}
                      placeholder="e.g. ₹28,00,000 / year"
                      className="w-full h-[36px] pl-8 pr-3 bg-[#1A1B20] border border-white/10 rounded-[8px] text-xs font-mono font-semibold text-[#EDEDED] focus:outline-none focus:border-[#FF5C1A]"
                    />
                  </div>
                </div>

                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#8B949E] mb-1.5 font-mono">
                    Preferred Hubs / Locations
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {locations.map((loc) => (
                      <span key={loc} className="px-2.5 py-1 bg-[#1A1B20] rounded-md text-xs font-mono text-[#8B949E] border border-white/8">
                        {loc}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ── TAB 2: WORK HISTORY & ACCOMPLISHMENTS ────────────────────── */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="bg-[#121317] border border-white/8 rounded-[10px] p-6 sm:p-8 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-base font-bold text-[#EDEDED] font-mono">
                    Chronological Roles & Proven Impact (STAR Format)
                  </h2>
                  <p className="text-xs text-[#8B949E] mt-0.5">
                    Quantified accomplishment bullets formatted to satisfy institutional Flesch &gt;90 clarity standards.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {history.roles.map((role, idx) => (
                  <div
                    key={idx}
                    className="p-5 bg-[#1A1B20] border border-white/8 rounded-[10px] space-y-3.5 hover:border-white/16 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-[#EDEDED] font-mono">
                          {role.title}
                        </h3>
                        <p className="text-xs font-semibold text-[#FF5C1A] flex items-center gap-1 mt-0.5">
                          <Building2 size={13} />
                          {role.company}
                        </p>
                      </div>
                      <span className="text-xs font-mono font-medium px-3 py-1 bg-[#121317] rounded-md border border-white/8 text-[#8B949E] shrink-0 self-start sm:self-center">
                        {role.startDate} &mdash; {role.endDate}
                      </span>
                    </div>

                    <p className="text-xs text-[#8B949E] leading-relaxed italic">
                      "{role.companyContext}"
                    </p>

                    {/* Accomplishments */}
                    <div className="space-y-2 pt-2 border-t border-white/8">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#6E7681] block">
                        Verified STAR Accomplishments
                      </span>
                      {role.accomplishments.map((acc, aIdx) => (
                        <div key={aIdx} className="text-xs text-[#EDEDED] flex items-start gap-2 leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] shadow-[0_0_6px_rgba(34,197,94,0.6)] mt-2 shrink-0" />
                          <div>
                            <strong>{acc.headline}:</strong> {acc.action} resulting in {acc.result}.
                            {acc.metrics.length > 0 && (
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {acc.metrics.map((m, mIdx) => (
                                  <span key={mIdx} className="text-[10px] font-mono font-bold px-2 py-0.5 bg-[#22C55E]/10 text-[#22C55E] rounded-md border border-[#22C55E]/25">
                                    {m}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Tools */}
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {role.tools.map((t) => (
                        <span key={t} className="text-[10px] font-mono px-2 py-0.5 bg-[#121317] text-[#8B949E] rounded-md border border-white/8">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: VERIFIED COMPETENCIES ────────────────────────────── */}
        {activeTab === 'competencies' && (
          <div className="bg-[#121317] border border-white/8 rounded-[10px] p-6 sm:p-8 shadow-[0_8px_24px_rgba(0,0,0,0.4)] space-y-6">
            <div>
              <h2 className="text-base font-bold text-[#EDEDED] font-mono">
                O*NET Standard Competency Mapping & Government Certifications
              </h2>
              <p className="text-xs text-[#8B949E] mt-0.5">
                Cryptographically anchored skill proofs verifiable via W3C compliant Career Passport.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {[
                { name: 'Distributed Systems Architecture', level: 'Expert (95%)', verified: true, source: 'O*NET 15-1252.00' },
                { name: 'TypeScript & Node.js Production Runtimes', level: 'Advanced (92%)', verified: true, source: 'GitHub Telemetry' },
                { name: 'PostgreSQL & Database Sharding', level: 'Advanced (88%)', verified: true, source: 'NPTEL Govt Certified' },
                { name: 'Redis Cache Cluster Engineering', level: 'Proficient (85%)', verified: true, source: 'SWAYAM Cloud Architecture' },
                { name: 'Zero-Downtime Microservices', level: 'Proficient (82%)', verified: true, source: 'AWS Verified Proof' },
                { name: 'DPDP Cryptographic Audit & Privacy', level: 'Specialist (90%)', verified: true, source: 'MeitY Regulatory Module' },
              ].map((c) => (
                <div key={c.name} className="p-4 bg-[#1A1B20] border border-white/8 rounded-[10px] space-y-2 hover:border-white/16 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-[#22C55E]/10 text-[#22C55E] rounded-full border border-[#22C55E]/25 flex items-center gap-1">
                      <Check size={11} className="stroke-[3]" />
                      VERIFIED
                    </span>
                    <span className="text-[10px] font-mono text-[#6E7681]">{c.source}</span>
                  </div>
                  <p className="text-xs font-mono font-bold text-[#EDEDED]">{c.name}</p>
                  <p className="text-[11px] text-[#8B949E]">{c.level}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CandidateProfileView;
