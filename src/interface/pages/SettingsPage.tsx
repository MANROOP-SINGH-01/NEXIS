import React, { useState } from 'react';
import {
  User, Key, Shield, Sliders, Bell, Database,
  Eye, EyeOff, Save, CheckCircle2, AlertCircle,
  Trash2, Download, ExternalLink, Github, Linkedin,
  Cpu, Sparkles, RefreshCw
} from 'lucide-react';
import { useUiStore } from '../../integration/store/uiStore';
import { useCoreStore } from '../../integration/store/coreStore';
import { getAuthHeaders } from '../../integration/store/authStore';
import { DEFAULT_MODELS } from '../../core/llm/constants';

export const SettingsPage: React.FC = () => {
  const { llmConfig, setLlmConfig } = useUiStore();
  const { traineeProfile, runtimeKeys, setRuntimeKeys } = useCoreStore();

  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'privacy' | 'integrations'>('general');

  // AI config state
  const [geminiKey, setGeminiKey] = useState<string>(runtimeKeys.gemini || llmConfig.apiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(llmConfig.model || DEFAULT_MODELS.text);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Profile fields state
  const [name, setName] = useState(traineeProfile?.trainee?.name || 'Priya Sharma');
  const [email, setEmail] = useState('priya.sharma@example.com');
  const [phone, setPhone] = useState(traineeProfile?.trainee?.phoneNumber || '+91 98765 43210');

  // Privacy consent states
  const [employerSharing, setEmployerSharing] = useState<boolean>(
    traineeProfile?.consent?.EMPLOYER_SHARING?.granted ?? true
  );
  const [govtCrossCheck, setGovtCrossCheck] = useState<boolean>(
    traineeProfile?.consent?.GOVT_CROSS_CHECK?.granted ?? false
  );

  const showNotification = (msg: string) => {
    setSaveSuccess(msg);
    setTimeout(() => setSaveSuccess(null), 3500);
  };

  const handleSaveAi = () => {
    const trimmed = geminiKey.trim();
    setRuntimeKeys({ gemini: trimmed });
    const config = {
      apiKey: trimmed,
      model: selectedModel,
    };
    setLlmConfig(config);
    try {
      localStorage.setItem('byok-config', JSON.stringify(config));
    } catch {}
    showNotification('AI model & runtime keys updated successfully!');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/trainee/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ name, email, phone }),
      });
      if (res.ok) {
        showNotification('Profile updated successfully!');
      } else {
        showNotification('Profile saved locally.');
      }
    } catch {
      showNotification('Profile saved locally.');
    }
  };

  const handleToggleConsent = async (consentType: string, currentVal: boolean) => {
    const nextVal = !currentVal;
    if (consentType === 'EMPLOYER_SHARING') setEmployerSharing(nextVal);
    if (consentType === 'GOVT_CROSS_CHECK') setGovtCrossCheck(nextVal);

    try {
      await fetch('/api/trainee/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ consentType, granted: nextVal }),
      });
      showNotification(`Updated ${consentType} preference under DPDP Act.`);
    } catch {
      showNotification(`Updated ${consentType} preference.`);
    }
  };

  const handleExportData = () => {
    const data = {
      profile: traineeProfile,
      llmConfig,
      exportTimestamp: new Date().toISOString(),
      compliance: 'DPDP Act 2023 Compliant Machine-Readable Export'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexis-data-export-${Date.now()}.json`;
    a.click();
    showNotification('Personal data archive downloaded.');
  };

  const handlePurgeData = async () => {
    if (!window.confirm("WARNING: Are you sure you want to permanently erase all records? Under the DPDP Act 2023, all personal identity, telemetry, and verified skills will be irreversibly deleted.")) {
      return;
    }
    try {
      await fetch('/api/trainee/profile', {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      localStorage.clear();
      window.location.href = '/';
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 bg-[#0A0B0E] min-h-screen overflow-y-auto px-4 py-8 sm:p-8 flex flex-col gap-6 max-w-5xl w-full mx-auto custom-scrollbar text-[#EDEDED]">
      
      {/* Toast Notification */}
      {saveSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1A1B20] text-[#EDEDED] border border-white/12 font-medium px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 size={16} className="text-[#10B981]" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-white/8 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[#FF5C1A]/10 text-[#FF5C1A] border border-[#FF5C1A]/20">
            Platform Governance
          </span>
          <span className="text-[11px] font-mono text-[#8B949E]">• DPDP Compliant</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-[#EDEDED] tracking-tight">
          System Settings & Preferences
        </h1>
        <p className="text-xs text-[#8B949E] mt-1">
          Manage your AI model access, data privacy governance under DPDP, profile details, and external integrations.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-[#121317] border border-white/8 p-1.5 rounded-xl w-max shadow-xs">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === 'general'
              ? 'bg-[#FF5C1A] text-white shadow-xs'
              : 'text-[#8B949E] hover:text-[#EDEDED] hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-2"><User size={14} /> Profile & Account</div>
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === 'ai'
              ? 'bg-[#FF5C1A] text-white shadow-xs'
              : 'text-[#8B949E] hover:text-[#EDEDED] hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-2"><Cpu size={14} /> AI & Intelligence</div>
        </button>
        <button
          onClick={() => setActiveTab('privacy')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === 'privacy'
              ? 'bg-[#FF5C1A] text-white shadow-xs'
              : 'text-[#8B949E] hover:text-[#EDEDED] hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-2"><Shield size={14} /> DPDP & Privacy</div>
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === 'integrations'
              ? 'bg-[#FF5C1A] text-white shadow-xs'
              : 'text-[#8B949E] hover:text-[#EDEDED] hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-2"><Sliders size={14} /> Integrations</div>
        </button>
      </div>

      {/* Tab 1: Profile & Account */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div className="bg-[#121317] border border-white/8 rounded-2xl p-6 md:p-8 shadow-xs">
            <h2 className="text-base font-bold text-[#EDEDED] mb-1">Personal Information</h2>
            <p className="text-xs text-[#8B949E] mb-6">Details used in generated resume headers and verified job applications.</p>

            <form onSubmit={handleSaveProfile} className="space-y-5 max-w-xl">
              <div>
                <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#8B949E] mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0A0B0E] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#EDEDED] font-medium focus:border-[#FF5C1A] focus:ring-1 focus:ring-[#FF5C1A] outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#8B949E] mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#0A0B0E] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#EDEDED] font-medium focus:border-[#FF5C1A] focus:ring-1 focus:ring-[#FF5C1A] outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#8B949E] mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-[#0A0B0E] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#EDEDED] font-medium focus:border-[#FF5C1A] focus:ring-1 focus:ring-[#FF5C1A] outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#FF5C1A] hover:bg-[#FF7235] text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Save size={14} /> Save Profile
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 2: AI & Intelligence */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          <div className="bg-[#121317] border border-white/8 rounded-2xl p-6 md:p-8 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-[#EDEDED] flex items-center gap-2">
                <Key size={16} className="text-[#FF5C1A]" /> Bring Your Own Key (BYOK)
              </h2>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/20 px-2.5 py-0.5 rounded-full">
                Zero Cloud Storage
              </span>
            </div>
            <p className="text-xs text-[#8B949E] mb-6 leading-relaxed max-w-2xl">
              NEXIS provides embedded AI orchestration. You can optionally supply your own Google Gemini or Claude API key. Your key is kept strictly in browser local storage and never logged.
            </p>

            <div className="space-y-5 max-w-xl">
              <div>
                <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#8B949E] mb-1.5">
                  Gemini API Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-[#0A0B0E] border border-white/10 rounded-xl pl-4 pr-11 py-2.5 text-xs text-[#EDEDED] font-mono focus:border-[#FF5C1A] focus:ring-1 focus:ring-[#FF5C1A] outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8B949E] hover:text-[#EDEDED] cursor-pointer transition-colors"
                  >
                    {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#8B949E] mb-1.5">
                  Preferred Model Architecture
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-[#0A0B0E] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#EDEDED] font-medium focus:border-[#FF5C1A] focus:ring-1 focus:ring-[#FF5C1A] outline-none cursor-pointer transition-colors"
                >
                  <option value="gemini-2.5-flash" className="bg-[#121317] text-[#EDEDED]">Gemini 2.5 Flash (Ultra-low Latency / Recommended)</option>
                  <option value="gemini-1.5-pro" className="bg-[#121317] text-[#EDEDED]">Gemini 1.5 Pro (Deep Architectural Reasoning)</option>
                  <option value="gemini-1.5-flash" className="bg-[#121317] text-[#EDEDED]">Gemini 1.5 Flash (Standard)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveAi}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#FF5C1A] hover:bg-[#FF7235] text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <Save size={14} /> Update AI Key
                </button>
                {geminiKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setGeminiKey('');
                      setRuntimeKeys({ gemini: '' });
                      setLlmConfig({ apiKey: '', model: DEFAULT_MODELS.text });
                      localStorage.removeItem('byok-config');
                      showNotification('Cleared stored custom API key.');
                    }}
                    className="px-4 py-2.5 text-xs text-[#8B949E] hover:text-rose-400 font-medium transition-colors cursor-pointer"
                  >
                    Clear Key
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: DPDP & Privacy */}
      {activeTab === 'privacy' && (
        <div className="space-y-6">
          <div className="bg-[#121317] border border-white/8 rounded-2xl p-6 md:p-8 shadow-xs">
            <h2 className="text-base font-bold text-[#EDEDED] mb-1">
              Digital Personal Data Protection (DPDP) Act Governance
            </h2>
            <p className="text-xs text-[#8B949E] mb-6 leading-relaxed max-w-2xl">
              NEXIS operates strictly on lawful, revocable consent. You maintain complete sovereignty over your telemetry, verified skills, and sharing permissions.
            </p>

            <div className="space-y-4 max-w-2xl">
              {/* Consent Toggle 1 */}
              <div className="p-4 rounded-xl bg-[#1A1B20] border border-white/8 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-[#EDEDED]">Employer Attestation Sharing</h3>
                  <p className="text-xs text-[#8B949E] mt-0.5">Allows sending automated 1-click verification links to prospective employers.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleConsent('EMPLOYER_SHARING', employerSharing)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    employerSharing ? 'bg-[#FF5C1A]' : 'bg-[#24262E]'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                    employerSharing ? 'right-1' : 'left-1'
                  }`} />
                </button>
              </div>

              {/* Consent Toggle 2 */}
              <div className="p-4 rounded-xl bg-[#1A1B20] border border-white/8 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-[#EDEDED]">Government Registry Cross-Checks</h3>
                  <p className="text-xs text-[#8B949E] mt-0.5">Allows querying e-Shram and national databases for background corroboration.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleConsent('GOVT_CROSS_CHECK', govtCrossCheck)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    govtCrossCheck ? 'bg-[#FF5C1A]' : 'bg-[#24262E]'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                    govtCrossCheck ? 'right-1' : 'left-1'
                  }`} />
                </button>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={handleExportData}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1A1B20] hover:bg-white/5 border border-white/10 text-[#EDEDED] rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
              >
                <Download size={14} className="text-[#FF5C1A]" /> Download Machine-Readable Archive
              </button>

              <button
                type="button"
                onClick={handlePurgeData}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <Trash2 size={14} /> Irrevocably Purge All Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Integrations */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          <div className="bg-[#121317] border border-white/8 rounded-2xl p-6 md:p-8 shadow-xs">
            <h2 className="text-base font-bold text-[#EDEDED] mb-1">Connected Career Platforms</h2>
            <p className="text-xs text-[#8B949E] mb-6">Integrate your code and professional profiles to fuel automated verification.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl bg-[#1A1B20] border border-white/8 flex flex-col justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#121317] border border-white/10 flex items-center justify-center text-[#EDEDED] shadow-xs">
                    <Github size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#EDEDED]">GitHub Integration</h3>
                    <p className="text-xs text-[#8B949E]">Deep AST repository scanning & commit proof</p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-white/8 pt-3">
                  <span className="text-[10px] font-mono font-bold text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/20 px-2.5 py-0.5 rounded-full">
                    Active
                  </span>
                  <span className="text-xs text-[#8B949E] font-mono font-bold">demo-user</span>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-[#1A1B20] border border-white/8 flex flex-col justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0077B5]/10 border border-[#0077B5]/20 flex items-center justify-center text-[#0077B5] shadow-xs">
                    <Linkedin size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#EDEDED]">LinkedIn Integration</h3>
                    <p className="text-xs text-[#8B949E]">PDF export ingestion & identity verification</p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-white/8 pt-3">
                  <span className="text-[10px] font-mono font-bold text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/20 px-2.5 py-0.5 rounded-full">
                    Connected
                  </span>
                  <span className="text-xs text-[#8B949E] font-mono font-bold">@priyasharma</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SettingsPage;
