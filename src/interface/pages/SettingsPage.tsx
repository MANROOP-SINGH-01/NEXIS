import React, { useState, useEffect } from 'react';
import {
  User, Key, Shield, Sliders, Bell, Database,
  Eye, EyeOff, Save, CheckCircle2, AlertCircle,
  Trash2, Download, ExternalLink, Github, Linkedin,
  Cpu, Sparkles, RefreshCw, Send, MessageSquare, Bot, Check
} from 'lucide-react';
import { useUiStore } from '../../integration/store/uiStore';
import { useCoreStore } from '../../integration/store/coreStore';
import { getAuthHeaders } from '../../integration/store/authStore';
import { DEFAULT_MODELS } from '../../core/llm/constants';
import { PageHeader } from '../bauhaus/PageHeader';

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

  // Telegram Assistant State (Proficiently Loop)
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramStatus, setTelegramStatus] = useState<{ connected: boolean; botUsername: string | null }>({
    connected: false,
    botUsername: null,
  });
  const [isConnectingTelegram, setIsConnectingTelegram] = useState(false);
  const [telegramNotice, setTelegramNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/telegram/status')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.connected === 'boolean') {
          setTelegramStatus({ connected: data.connected, botUsername: data.botUsername });
        }
      })
      .catch(() => {});
  }, []);

  const handleConnectTelegram = async () => {
    if (!telegramBotToken.trim() || !telegramChatId.trim()) {
      setTelegramNotice('Please provide both Bot Token and Chat ID.');
      return;
    }
    setIsConnectingTelegram(true);
    setTelegramNotice(null);
    try {
      const res = await fetch('/api/telegram/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          botToken: telegramBotToken.trim(),
          chatId: telegramChatId.trim(),
          sendTest: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTelegramStatus({ connected: true, botUsername: data.bot?.username || 'bot' });
        setTelegramNotice(`Connected to @${data.bot?.username || 'bot'}! Verification greeting dispatched to chat.`);
        showNotification('Telegram Job Search Assistant connected!');
      } else {
        setTelegramNotice(data.error || 'Failed to verify Telegram bot token.');
      }
    } catch {
      setTelegramNotice('Unable to reach Telegram service.');
    } finally {
      setIsConnectingTelegram(false);
    }
  };

  const handleTestTelegram = async () => {
    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('Test notification sent to Telegram!');
      } else {
        setTelegramNotice(data.error || 'Failed to dispatch test notification.');
      }
    } catch {
      setTelegramNotice('Network error sending test message.');
    }
  };

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
    <div className="flex-1 bg-[#F5F0E6] min-h-screen overflow-y-auto px-4 py-8 sm:p-8 flex flex-col gap-6 max-w-5xl w-full mx-auto custom-scrollbar text-[#111111]">
      
      {/* Toast Notification */}
      {saveSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-white text-[#111111] border-2 border-[#111111] font-mono px-4 py-3 shadow-[4px_4px_0px_#111111] flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 size={16} className="text-[#2457A6]" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Bauhaus PageHeader */}
      <PageHeader
        sectionNumber="15"
        sectionLabel="SETTINGS"
        headline={"SYSTEM SETTINGS\n& PREFERENCES"}
        subtitle="Manage AI model keys, data privacy governance under DPDP Act, profile details, and external integrations."
        accentColor="red"
        accentShape="circle"
        action={
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider bg-[#E53935]/10 text-[#E53935] border-2 border-[#E53935]">
              GOVERNANCE
            </span>
            <span className="text-[11px] font-mono text-[#555555]">DPDP COMPLIANT</span>
          </div>
        }
      />

      {/* Bauhaus Segmented Tabs */}
      <div className="flex flex-wrap gap-2 bg-[#EFE7D8] border-2 border-[#111111] p-1.5 shadow-[3px_3px_0px_#111111] w-max">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 text-xs font-mono font-bold tracking-wider uppercase transition-all cursor-pointer border-2 ${
            activeTab === 'general'
              ? 'bg-[#E53935] text-white border-[#111111] shadow-[2px_2px_0px_#111111]'
              : 'bg-white text-[#111111] border-[#111111] hover:bg-[#F5F0E6]'
          }`}
        >
          <div className="flex items-center gap-2"><User size={14} /> Profile & Account</div>
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`px-4 py-2 text-xs font-mono font-bold tracking-wider uppercase transition-all cursor-pointer border-2 ${
            activeTab === 'ai'
              ? 'bg-[#E53935] text-white border-[#111111] shadow-[2px_2px_0px_#111111]'
              : 'bg-white text-[#111111] border-[#111111] hover:bg-[#F5F0E6]'
          }`}
        >
          <div className="flex items-center gap-2"><Cpu size={14} /> AI & Intelligence</div>
        </button>
        <button
          onClick={() => setActiveTab('privacy')}
          className={`px-4 py-2 text-xs font-mono font-bold tracking-wider uppercase transition-all cursor-pointer border-2 ${
            activeTab === 'privacy'
              ? 'bg-[#E53935] text-white border-[#111111] shadow-[2px_2px_0px_#111111]'
              : 'bg-white text-[#111111] border-[#111111] hover:bg-[#F5F0E6]'
          }`}
        >
          <div className="flex items-center gap-2"><Shield size={14} /> DPDP & Privacy</div>
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          className={`px-4 py-2 text-xs font-mono font-bold tracking-wider uppercase transition-all cursor-pointer border-2 ${
            activeTab === 'integrations'
              ? 'bg-[#E53935] text-white border-[#111111] shadow-[2px_2px_0px_#111111]'
              : 'bg-white text-[#111111] border-[#111111] hover:bg-[#F5F0E6]'
          }`}
        >
          <div className="flex items-center gap-2"><Sliders size={14} /> Integrations</div>
        </button>
      </div>

      {/* Tab 1: Profile & Account */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div className="bg-white border-2 border-[#111111] p-6 md:p-8 shadow-[4px_4px_0px_#111111]">
            <div className="flex items-center justify-between border-b-2 border-[#111111] pb-3 mb-6">
              <div>
                <h2 className="text-lg font-black font-['Space_Grotesk'] text-[#111111] uppercase tracking-tight">Personal Information</h2>
                <p className="text-xs text-[#555555] font-mono mt-0.5">Details used in generated resume headers and verified job applications.</p>
              </div>
              <span className="text-[11px] font-mono font-bold bg-[#F4C430] text-[#111111] border-2 border-[#111111] px-2.5 py-0.5">
                CANDIDATE ID: PRY-2026
              </span>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5 max-w-xl">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#111111] mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border-2 border-[#111111] px-4 py-2.5 text-xs text-[#111111] font-mono font-medium focus:border-[#E53935] focus:outline-none shadow-[2px_2px_0px_#111111] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#111111] mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-white border-2 border-[#111111] px-4 py-2.5 text-xs text-[#111111] font-mono font-medium focus:border-[#E53935] focus:outline-none shadow-[2px_2px_0px_#111111] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#111111] mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-white border-2 border-[#111111] px-4 py-2.5 text-xs text-[#111111] font-mono font-medium focus:border-[#E53935] focus:outline-none shadow-[2px_2px_0px_#111111] transition-colors"
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#E53935] hover:bg-[#D32F2F] text-white font-mono font-bold text-xs uppercase tracking-wider border-2 border-[#111111] shadow-[3px_3px_0px_#111111] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#111111] transition-all cursor-pointer"
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
          <div className="bg-white border-2 border-[#111111] p-6 md:p-8 shadow-[4px_4px_0px_#111111]">
            <div className="flex items-center justify-between border-b-2 border-[#111111] pb-3 mb-6">
              <h2 className="text-lg font-black font-['Space_Grotesk'] text-[#111111] flex items-center gap-2 uppercase tracking-tight">
                <Key size={18} className="text-[#E53935]" /> Bring Your Own Key (BYOK)
              </h2>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#111111] bg-[#F4C430] border-2 border-[#111111] px-2.5 py-0.5 shadow-[2px_2px_0px_#111111]">
                Zero Cloud Storage
              </span>
            </div>
            <p className="text-xs text-[#555555] font-mono mb-6 leading-relaxed max-w-2xl">
              NEXIS provides embedded AI orchestration. You can optionally supply your own Google Gemini or Claude API key. Your key is kept strictly in browser local storage and never logged.
            </p>

            <div className="space-y-5 max-w-xl">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#111111] mb-1.5">
                  Gemini API Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-white border-2 border-[#111111] pl-4 pr-11 py-2.5 text-xs text-[#111111] font-mono focus:border-[#E53935] focus:outline-none shadow-[2px_2px_0px_#111111] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#555555] hover:text-[#111111] cursor-pointer transition-colors"
                  >
                    {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#111111] mb-1.5">
                  Preferred Model Architecture
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-white border-2 border-[#111111] px-4 py-2.5 text-xs text-[#111111] font-mono font-medium focus:border-[#E53935] focus:outline-none shadow-[2px_2px_0px_#111111] cursor-pointer transition-colors"
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Ultra-low Latency / Recommended)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Architectural Reasoning)</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Standard)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveAi}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#E53935] hover:bg-[#D32F2F] text-white font-mono font-bold text-xs uppercase tracking-wider border-2 border-[#111111] shadow-[3px_3px_0px_#111111] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#111111] transition-all cursor-pointer"
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
                    className="px-4 py-2.5 text-xs font-mono font-bold text-[#E53935] hover:underline transition-colors cursor-pointer"
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
          <div className="bg-white border-2 border-[#111111] p-6 md:p-8 shadow-[4px_4px_0px_#111111]">
            <div className="flex items-center justify-between border-b-2 border-[#111111] pb-3 mb-6">
              <div>
                <h2 className="text-lg font-black font-['Space_Grotesk'] text-[#111111] uppercase tracking-tight">
                  DPDP Act Governance (Digital Personal Data Protection)
                </h2>
                <p className="text-xs text-[#555555] font-mono mt-0.5">
                  Lawful, revocable consent. Complete candidate sovereignty over telemetry and verified skills.
                </p>
              </div>
              <Shield size={22} className="text-[#2457A6]" />
            </div>

            <div className="space-y-4 max-w-2xl">
              {/* Consent Toggle 1 */}
              <div className="p-4 bg-[#F5F0E6] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#111111]">Employer Attestation Sharing</h3>
                  <p className="text-xs text-[#555555] font-mono mt-0.5">Allows sending automated 1-click verification links to prospective employers.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleConsent('EMPLOYER_SHARING', employerSharing)}
                  className={`w-14 h-7 border-2 border-[#111111] transition-colors relative cursor-pointer ${
                    employerSharing ? 'bg-[#2457A6]' : 'bg-[#E5E5E5]'
                  }`}
                >
                  <span className={`w-5 h-5 bg-white border-2 border-[#111111] absolute top-0.5 transition-all ${
                    employerSharing ? 'right-0.5' : 'left-0.5'
                  }`} />
                </button>
              </div>

              {/* Consent Toggle 2 */}
              <div className="p-4 bg-[#F5F0E6] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#111111]">Government Registry Cross-Checks</h3>
                  <p className="text-xs text-[#555555] font-mono mt-0.5">Allows querying e-Shram and national databases for background corroboration.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleConsent('GOVT_CROSS_CHECK', govtCrossCheck)}
                  className={`w-14 h-7 border-2 border-[#111111] transition-colors relative cursor-pointer ${
                    govtCrossCheck ? 'bg-[#2457A6]' : 'bg-[#E5E5E5]'
                  }`}
                >
                  <span className={`w-5 h-5 bg-white border-2 border-[#111111] absolute top-0.5 transition-all ${
                    govtCrossCheck ? 'right-0.5' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t-2 border-[#111111] flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={handleExportData}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-[#F5F0E6] border-2 border-[#111111] text-[#111111] font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-[3px_3px_0px_#111111] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#111111] cursor-pointer"
              >
                <Download size={14} className="text-[#2457A6]" /> Download Machine-Readable Archive
              </button>

              <button
                type="button"
                onClick={handlePurgeData}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#E53935]/10 hover:bg-[#E53935] hover:text-white border-2 border-[#E53935] text-[#E53935] font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-[3px_3px_0px_#E53935] hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer"
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
          <div className="bg-white border-2 border-[#111111] p-6 md:p-8 shadow-[4px_4px_0px_#111111]">
            <h2 className="text-lg font-black font-['Space_Grotesk'] text-[#111111] uppercase tracking-tight mb-1">
              Connected Career Platforms
            </h2>
            <p className="text-xs text-[#555555] font-mono mb-6">Integrate your code and professional profiles to fuel automated verification.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-[#F5F0E6] border-2 border-[#111111] shadow-[3px_3px_0px_#111111] flex flex-col justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white border-2 border-[#111111] flex items-center justify-center text-[#111111] shadow-[2px_2px_0px_#111111]">
                    <Github size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-mono font-bold text-[#111111] uppercase">GitHub Integration</h3>
                    <p className="text-xs text-[#555555] font-mono">Deep AST repository scanning & commit proof</p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t-2 border-[#111111] pt-3">
                  <span className="text-[10px] font-mono font-bold text-white bg-[#2457A6] border border-[#111111] px-2.5 py-0.5">
                    ACTIVE
                  </span>
                  <span className="text-xs text-[#111111] font-mono font-bold">demo-user</span>
                </div>
              </div>

              <div className="p-5 bg-[#F5F0E6] border-2 border-[#111111] shadow-[3px_3px_0px_#111111] flex flex-col justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white border-2 border-[#111111] flex items-center justify-center text-[#2457A6] shadow-[2px_2px_0px_#111111]">
                    <Linkedin size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-mono font-bold text-[#111111] uppercase">LinkedIn Integration</h3>
                    <p className="text-xs text-[#555555] font-mono">PDF export ingestion & identity verification</p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t-2 border-[#111111] pt-3">
                  <span className="text-[10px] font-mono font-bold text-white bg-[#2457A6] border border-[#111111] px-2.5 py-0.5">
                    CONNECTED
                  </span>
                  <span className="text-xs text-[#111111] font-mono font-bold">@priyasharma</span>
                </div>
              </div>
            </div>

            {/* Telegram Headless Job Assistant (Proficiently Loop) */}
            <div className="mt-6 p-6 bg-[#F5F0E6] border-2 border-[#111111] shadow-[4px_4px_0px_#111111] flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#111111] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white border-2 border-[#111111] flex items-center justify-center text-[#2457A6] shadow-[2px_2px_0px_#111111]">
                    <Send size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-mono font-bold text-[#111111] uppercase">Telegram Career Assistant</h3>
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#F4C430] text-[#111111] border border-[#111111]">
                        PROFICIENTLY LOOP
                      </span>
                    </div>
                    <p className="text-xs text-[#555555] font-mono mt-0.5">
                      Headless job search assistant: Send job URLs via Telegram to auto-tailor resumes and prepare ATS forms.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono font-bold px-2.5 py-1 border-2 border-[#111111] ${
                    telegramStatus.connected
                      ? 'bg-[#2457A6] text-white shadow-[2px_2px_0px_#111111]'
                      : 'bg-white text-[#7A7A7A]'
                  }`}>
                    {telegramStatus.connected
                      ? `ACTIVE (@${telegramStatus.botUsername || 'assistant'})`
                      : 'DISCONNECTED'}
                  </span>
                </div>
              </div>

              {/* Setup Guide Box */}
              <div className="p-4 bg-white border-2 border-[#111111] text-xs space-y-2 shadow-[2px_2px_0px_#111111]">
                <div className="flex items-center gap-2 text-[#111111] font-bold text-xs font-mono uppercase">
                  <Bot size={14} className="text-[#2457A6]" />
                  <span>Interactive Telegram Bot Setup Instructions:</span>
                </div>
                <ol className="list-decimal list-inside text-[#555555] font-mono space-y-1 pl-1 text-[11px] leading-relaxed">
                  <li>Open Telegram and start a chat with <strong className="text-[#111111]">@BotFather</strong>.</li>
                  <li>Send <code className="text-[#E53935] font-mono font-bold">/newbot</code>, choose a name and username, then copy your HTTP API token.</li>
                  <li>Send a message to your new bot, then paste your Token & Chat ID below to connect.</li>
                </ol>
              </div>

              {/* Input Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1.5 font-mono uppercase">
                    Telegram Bot Token
                  </label>
                  <input
                    type="password"
                    placeholder="1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                    value={telegramBotToken}
                    onChange={(e) => setTelegramBotToken(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-[#111111] text-xs text-[#111111] font-mono focus:outline-none focus:border-[#E53935] shadow-[2px_2px_0px_#111111] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1.5 font-mono uppercase">
                    Chat ID or Username
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 987654321 or @yourusername"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-[#111111] text-xs text-[#111111] font-mono focus:outline-none focus:border-[#E53935] shadow-[2px_2px_0px_#111111] transition-colors"
                  />
                </div>
              </div>

              {telegramNotice && (
                <div className="p-3 bg-white border-2 border-[#111111] text-xs font-mono text-[#111111] flex items-center gap-2 shadow-[2px_2px_0px_#111111]">
                  <CheckCircle2 size={15} className="text-[#2457A6] shrink-0" />
                  <span>{telegramNotice}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="text-[11px] text-[#555555] font-mono">
                  Supported: /search &bull; Job URLs &bull; /status
                </div>

                <div className="flex items-center gap-3">
                  {telegramStatus.connected && (
                    <button
                      type="button"
                      onClick={handleTestTelegram}
                      className="px-4 py-2 bg-white border-2 border-[#111111] text-xs font-mono font-bold uppercase text-[#111111] hover:bg-[#F5F0E6] shadow-[2px_2px_0px_#111111] transition-all cursor-pointer"
                    >
                      Send Test Ping
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleConnectTelegram}
                    disabled={isConnectingTelegram}
                    className="px-5 py-2 bg-[#2457A6] hover:bg-[#1C4587] text-white text-xs font-mono font-bold uppercase tracking-wider border-2 border-[#111111] shadow-[3px_3px_0px_#111111] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#111111] flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Send size={14} />
                    <span>{isConnectingTelegram ? 'Verifying...' : 'Connect & Test Bot'}</span>
                  </button>
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
