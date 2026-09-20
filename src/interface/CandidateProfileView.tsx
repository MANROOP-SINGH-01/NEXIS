import React, { useState } from 'react';
import {
  User, Briefcase, MapPin, DollarSign, ShieldAlert, CheckCircle2,
  Plus, X, Save, Sparkles, Building2, Calendar, Award, ExternalLink,
  Target, FileText, Check, Sliders
} from 'lucide-react';
import { useCoreStore } from '../integration/store/coreStore';
import { CareerPreferences, WorkHistoryRole } from '../types';
import { PageHeader } from './bauhaus/PageHeader';

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

  const candidateName = traineeProfile?.trainee?.name || history.candidateName || 'Priya Sharma';

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 bg-[#F5F0E6] text-[#111111]">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Bauhaus PageHeader */}
        <PageHeader
          sectionNumber="14"
          code="PROFILE"
          title="CANDIDATE PROFILE & PREFERENCES"
          subtitle="MANAGE DEALBREAKERS, MUST-HAVES, WORK MODES & STAR ACCOMPLISHMENTS"
          action={
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-[#E53935] hover:bg-[#111111] text-white text-xs font-mono font-black uppercase flex items-center gap-2 border-2 border-[#111111] shadow-[2px_2px_0px_#111111] transition-all cursor-pointer"
            >
              <Save size={14} />
              <span>Save Profile</span>
            </button>
          }
        />

        {/* ── Candidate Profile Header Banner ────────────────────────── */}
        <div className="bg-[#FFFFFF] border-2 border-[#111111] p-6 sm:p-8 shadow-[4px_4px_0px_#111111] relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-[#F4C430] border-2 border-[#111111] text-[#111111] flex items-center justify-center font-mono font-black text-xl shrink-0 shadow-[2px_2px_0px_#111111]">
                PS
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-mono font-black text-[#111111] uppercase tracking-tight">
                    {candidateName}
                  </h2>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold font-mono px-2 py-0.5 bg-[#EBF3FC] border border-[#2457A6] text-[#2457A6]">
                    <CheckCircle2 size={12} />
                    VERIFIED CANDIDATE
                  </span>
                </div>
                <p className="text-xs font-mono font-bold text-[#555555] mt-1">
                  Staff Backend & Distributed Systems Engineer &bull; 6+ YOE
                </p>
                <p className="text-[11px] text-[#777777] mt-0.5 font-mono">
                  Autonomous Agent Mesh: Active &bull; DPDP Consent: Granted
                </p>
              </div>
            </div>

            <div className="text-right hidden sm:block">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-[#555555] block">
                Profile Completeness
              </span>
              <span className="text-2xl font-mono font-black text-[#111111]">
                94%
              </span>
            </div>
          </div>

          {saveNotice && (
            <div className="mt-4 p-2.5 bg-[#EBF3FC] border-2 border-[#2457A6] text-xs font-mono font-bold text-[#2457A6] flex items-center gap-2">
              <CheckCircle2 size={14} />
              <span>{saveNotice}</span>
            </div>
          )}
        </div>

        {/* ── Navigation Tabs ────────────────────────────────────────── */}
        <div className="flex border-2 border-[#111111] bg-[#FFFFFF] shadow-[3px_3px_0px_#111111] overflow-x-auto">
          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-4 py-2 text-xs font-mono font-bold uppercase transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'preferences'
                ? 'bg-[#111111] text-white'
                : 'text-[#111111] hover:bg-[#EFE7D8]'
            }`}
          >
            <ShieldAlert size={14} />
            <span>Dealbreakers & Preferences</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-xs font-mono font-bold uppercase transition-colors flex items-center gap-2 shrink-0 cursor-pointer border-l-2 border-[#111111] ${
              activeTab === 'history'
                ? 'bg-[#111111] text-white'
                : 'text-[#111111] hover:bg-[#EFE7D8]'
            }`}
          >
            <Briefcase size={14} />
            <span>Work History & Accomplishments</span>
          </button>

          <button
            onClick={() => setActiveTab('competencies')}
            className={`px-4 py-2 text-xs font-mono font-bold uppercase transition-colors flex items-center gap-2 shrink-0 cursor-pointer border-l-2 border-[#111111] ${
              activeTab === 'competencies'
                ? 'bg-[#111111] text-white'
                : 'text-[#111111] hover:bg-[#EFE7D8]'
            }`}
          >
            <Award size={14} />
            <span>Verified Competencies</span>
          </button>
        </div>

        {/* ── TAB 1: DEALBREAKERS & CAREER PREFERENCES ──────────────────── */}
        {activeTab === 'preferences' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Dealbreaker Engine (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Dealbreakers Panel */}
              <div className="bg-[#FFFFFF] border-2 border-[#111111] p-6 shadow-[4px_4px_0px_#111111]">
                <div className="flex items-center justify-between pb-3 border-b-2 border-[#111111] mb-4">
                  <div>
                    <h2 className="text-xs font-mono font-black text-[#111111] flex items-center gap-2 uppercase">
                      <span className="w-2.5 h-2.5 bg-[#E53935]" />
                      Dealbreakers (Immediate Skip)
                    </h2>
                    <p className="text-xs font-mono text-[#555555] mt-0.5">
                      Jobs triggering any dealbreaker are automatically sorted into the <strong>IGNORE</strong> bucket.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-black px-2 py-0.5 bg-[#FDEDEC] text-[#E53935] border border-[#E53935]">
                    {dealbreakers.length} Active
                  </span>
                </div>

                {/* Dealbreaker Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {dealbreakers.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold bg-[#FDEDEC] text-[#E53935] border-2 border-[#E53935] shadow-[2px_2px_0px_#111111]"
                    >
                      <span>{item}</span>
                      <button
                        onClick={() => removeDealbreaker(item)}
                        className="hover:text-black cursor-pointer font-bold"
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
                    className="flex-1 h-[36px] px-3.5 bg-[#F5F0E6] border-2 border-[#111111] text-xs font-mono font-bold text-[#111111] focus:outline-none focus:bg-[#FFFFFF] placeholder-[#777777]"
                  />
                  <button
                    onClick={addDealbreaker}
                    className="h-[36px] px-4 bg-[#FFFFFF] hover:bg-[#EFE7D8] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] text-xs font-mono font-black uppercase text-[#111111] flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Must-Haves Panel */}
              <div className="bg-[#FFFFFF] border-2 border-[#111111] p-6 shadow-[4px_4px_0px_#111111]">
                <div className="flex items-center justify-between pb-3 border-b-2 border-[#111111] mb-4">
                  <div>
                    <h2 className="text-xs font-mono font-black text-[#111111] flex items-center gap-2 uppercase">
                      <span className="w-2.5 h-2.5 bg-[#2457A6]" />
                      Must-Haves (Strict Requirements)
                    </h2>
                    <p className="text-xs font-mono text-[#555555] mt-0.5">
                      Target roles must fulfill these criteria to score 85%+ into the <strong>APPLY NOW</strong> bucket.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-black px-2 py-0.5 bg-[#EBF3FC] text-[#2457A6] border border-[#2457A6]">
                    {mustHaves.length} Active
                  </span>
                </div>

                {/* Must-Have Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {mustHaves.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold bg-[#EBF3FC] text-[#2457A6] border-2 border-[#2457A6] shadow-[2px_2px_0px_#111111]"
                    >
                      <span>{item}</span>
                      <button
                        onClick={() => removeMustHave(item)}
                        className="hover:text-black cursor-pointer font-bold"
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
                    className="flex-1 h-[36px] px-3.5 bg-[#F5F0E6] border-2 border-[#111111] text-xs font-mono font-bold text-[#111111] focus:outline-none focus:bg-[#FFFFFF] placeholder-[#777777]"
                  />
                  <button
                    onClick={addMustHave}
                    className="h-[36px] px-4 bg-[#FFFFFF] hover:bg-[#EFE7D8] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] text-xs font-mono font-black uppercase text-[#111111] flex items-center gap-1.5 transition-all cursor-pointer"
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
              <div className="bg-[#FFFFFF] border-2 border-[#111111] p-6 shadow-[4px_4px_0px_#111111]">
                <h2 className="text-xs font-mono font-black uppercase text-[#111111] mb-3 pb-2 border-b-2 border-[#111111] flex items-center gap-2">
                  <Target size={15} className="text-[#E53935]" />
                  Target Role Titles
                </h2>

                <div className="flex flex-wrap gap-2 mb-4">
                  {targetRoles.map((role) => (
                    <span
                      key={role}
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold bg-[#F5F0E6] text-[#111111] border border-[#111111]"
                    >
                      <span>{role}</span>
                      <button
                        onClick={() => removeTargetRole(role)}
                        className="text-[#555555] hover:text-black cursor-pointer font-bold"
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
                    className="flex-1 h-[36px] px-3.5 bg-[#F5F0E6] border-2 border-[#111111] text-xs font-mono font-bold text-[#111111] focus:outline-none focus:bg-[#FFFFFF] placeholder-[#777777]"
                  />
                  <button
                    onClick={addTargetRole}
                    className="h-[36px] px-4 bg-[#FFFFFF] hover:bg-[#EFE7D8] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] text-xs font-mono font-black uppercase text-[#111111] flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>

              {/* Work Mode & Compensation */}
              <div className="bg-[#FFFFFF] border-2 border-[#111111] p-6 shadow-[4px_4px_0px_#111111] space-y-4">
                <div>
                  <h2 className="text-[10px] font-mono font-black uppercase tracking-wider text-[#555555] mb-2">
                    Permitted Work Modes
                  </h2>
                  <div className="grid grid-cols-3 gap-2">
                    {(['REMOTE', 'HYBRID', 'ONSITE'] as const).map((mode) => {
                      const isSelected = workModes.includes(mode);
                      return (
                        <button
                          key={mode}
                          onClick={() => handleToggleWorkMode(mode)}
                          className={`h-[36px] px-3 text-xs font-mono font-bold uppercase transition-all cursor-pointer border-2 ${
                            isSelected
                              ? 'bg-[#111111] text-white border-[#111111] shadow-[2px_2px_0px_#E53935]'
                              : 'bg-[#F5F0E6] text-[#555555] border-[#111111] hover:bg-[#EFE7D8]'
                          }`}
                        >
                          {mode}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h2 className="text-[10px] font-mono font-black uppercase tracking-wider text-[#555555] mb-1.5">
                    Minimum Target Compensation
                  </h2>
                  <div className="relative flex items-center">
                    <DollarSign size={14} className="absolute left-3 text-[#555555]" />
                    <input
                      type="text"
                      value={minSalary}
                      onChange={(e) => setMinSalary(e.target.value)}
                      placeholder="e.g. ₹28,00,000 / year"
                      className="w-full h-[36px] pl-8 pr-3 bg-[#F5F0E6] border-2 border-[#111111] text-xs font-mono font-bold text-[#111111] focus:outline-none focus:bg-[#FFFFFF]"
                    />
                  </div>
                </div>

                <div>
                  <h2 className="text-[10px] font-mono font-black uppercase tracking-wider text-[#555555] mb-1.5">
                    Preferred Hubs / Locations
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {locations.map((loc) => (
                      <span key={loc} className="px-2.5 py-1 bg-[#F5F0E6] text-xs font-mono font-bold text-[#111111] border border-[#111111]">
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
            <div className="bg-[#FFFFFF] border-2 border-[#111111] p-6 sm:p-8 shadow-[4px_4px_0px_#111111]">
              <div className="pb-3 border-b-2 border-[#111111] mb-6">
                <h2 className="text-xs font-mono font-black uppercase text-[#111111]">
                  Chronological Roles & Proven Impact (STAR Format)
                </h2>
                <p className="text-xs font-mono text-[#555555] mt-0.5">
                  Quantified accomplishment bullets formatted to satisfy institutional Flesch &gt;90 clarity standards.
                </p>
              </div>

              <div className="space-y-6">
                {history.roles.map((role, idx) => (
                  <div
                    key={idx}
                    className="p-5 bg-[#FDFBF7] border-2 border-[#111111] space-y-3.5 shadow-[2px_2px_0px_#111111]"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-mono font-black uppercase text-[#111111]">
                          {role.title}
                        </h3>
                        <p className="text-xs font-mono font-bold text-[#E53935] flex items-center gap-1 mt-0.5">
                          <Building2 size={13} />
                          {role.company}
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold px-3 py-1 bg-[#FFFFFF] border border-[#111111] text-[#555555] shrink-0 self-start sm:self-center">
                        {role.startDate} &mdash; {role.endDate}
                      </span>
                    </div>

                    <p className="text-xs font-mono text-[#555555] leading-relaxed italic bg-[#FFFFFF] p-2.5 border border-[#CCCCCC]">
                      "{role.companyContext}"
                    </p>

                    {/* Accomplishments */}
                    <div className="space-y-2 pt-2 border-t border-[#EFE7D8]">
                      <span className="text-[10px] font-mono font-black uppercase tracking-wider text-[#111111] block">
                        Verified STAR Accomplishments
                      </span>
                      {role.accomplishments.map((acc, aIdx) => (
                        <div key={aIdx} className="text-xs font-mono text-[#111111] flex items-start gap-2 leading-relaxed">
                          <span className="w-2 h-2 bg-[#2457A6] mt-1.5 shrink-0" />
                          <div>
                            <strong>{acc.headline}:</strong> {acc.action} resulting in {acc.result}.
                            {acc.metrics.length > 0 && (
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {acc.metrics.map((m, mIdx) => (
                                  <span key={mIdx} className="text-[10px] font-mono font-black px-2 py-0.5 bg-[#EBF3FC] text-[#2457A6] border border-[#2457A6]">
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
                        <span key={t} className="text-[10px] font-mono font-bold px-2 py-0.5 bg-[#FFFFFF] text-[#555555] border border-[#111111]">
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
          <div className="bg-[#FFFFFF] border-2 border-[#111111] p-6 sm:p-8 shadow-[4px_4px_0px_#111111] space-y-6">
            <div className="pb-3 border-b-2 border-[#111111]">
              <h2 className="text-xs font-mono font-black uppercase text-[#111111]">
                O*NET Standard Competency Mapping & Government Certifications
              </h2>
              <p className="text-xs font-mono text-[#555555] mt-0.5">
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
                <div key={c.name} className="p-4 bg-[#FDFBF7] border-2 border-[#111111] space-y-2 shadow-[2px_2px_0px_#111111]">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-black px-2 py-0.5 bg-[#EBF3FC] text-[#2457A6] border border-[#2457A6] flex items-center gap-1">
                      <Check size={11} className="stroke-[3]" />
                      VERIFIED
                    </span>
                    <span className="text-[10px] font-mono text-[#555555]">{c.source}</span>
                  </div>
                  <p className="text-xs font-mono font-black text-[#111111]">{c.name}</p>
                  <p className="text-[11px] font-mono text-[#555555]">{c.level}</p>
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
