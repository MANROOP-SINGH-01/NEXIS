import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  History,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../primitives/Button';
import { Card } from '../primitives/Card';
import { Badge } from '../primitives/Badge';
import { DpdpConsentPurpose } from '../../types';

type Lang = 'en' | 'mr' | 'hi';

interface ConsentRecordItem {
  granted: boolean;
  grantedAt?: string;
  revokedAt?: string | null;
  version?: string;
}

interface AuditLogItem {
  id: string;
  action: string;
  actorRole: string;
  targetEntity?: string;
  targetId?: string;
  ipAddress?: string;
  payload?: any;
  timestamp: string;
}

export const ConsentManagementView: React.FC = () => {
  const [lang, setLang] = useState<Lang>('en');
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [consents, setConsents] = useState<Record<string, ConsentRecordItem>>({});
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState<boolean>(false);
  const [purging, setPurging] = useState<boolean>(false);

  const fetchConsents = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('forge-active-token') || '';
      const res = await fetch('/api/consent/me', {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setConsents(data.consent || {});
        setAuditLogs(data.auditEvents || []);
      } else {
        // Fallback to local storage if offline
        const local = localStorage.getItem('forge-consents');
        if (local) {
          setConsents(JSON.parse(local));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load consent records');
      const local = localStorage.getItem('forge-consents');
      if (local) setConsents(JSON.parse(local));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsents();
  }, []);

  const handleToggle = async (purpose: string, currentlyGranted: boolean) => {
    setUpdating(purpose);
    setError(null);
    setSuccessMsg(null);
    const token = localStorage.getItem('forge-active-token') || '';

    try {
      if (currentlyGranted) {
        // Revoke / Withdraw
        const res = await fetch('/api/consent/withdraw', {
          method: 'POST',
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ purpose, reason: 'User self-withdrawal via Settings' }),
        });

        if (res.ok) {
          const data = await res.json();
          setConsents((prev) => ({
            ...prev,
            [purpose]: {
              granted: false,
              revokedAt: data.revokedAt || new Date().toISOString(),
              version: prev[purpose]?.version || 'v2.0',
            },
          }));
          setSuccessMsg(
            lang === 'mr'
              ? `${purpose} साठी संमती यशस्वीरित्या मागे घेण्यात आली. प्रक्रिया तात्काळ थांबवली आहे.`
              : lang === 'hi'
              ? `${purpose} के लिए सहमति वापस ले ली गई है। प्रोसेसिंग तुरंत रोक दी गई है।`
              : `Consent for ${purpose} revoked. Downstream processing was terminated immediately.`
          );
        } else {
          throw new Error('Failed to revoke consent on server');
        }
      } else {
        // Grant
        const res = await fetch('/api/consent/grant', {
          method: 'POST',
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ purpose, version: 'v2.0' }),
        });

        if (res.ok) {
          const data = await res.json();
          setConsents((prev) => ({
            ...prev,
            [purpose]: {
              granted: true,
              grantedAt: data.grantedAt || new Date().toISOString(),
              revokedAt: null,
              version: data.version || 'v2.0',
            },
          }));
          setSuccessMsg(
            lang === 'mr'
              ? `${purpose} साठी संमती यशस्वीरित्या मंजूर झाली.`
              : lang === 'hi'
              ? `${purpose} के लिए सहमति सफलतापूर्वक स्वीकृत की गई।`
              : `Consent for ${purpose} granted successfully.`
          );
        } else {
          throw new Error('Failed to grant consent on server');
        }
      }

      // Re-fetch audit trail
      await fetchConsents();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setUpdating(null);
    }
  };

  const handlePurgeRequest = async () => {
    setPurging(true);
    setError(null);
    const token = localStorage.getItem('forge-active-token') || '';

    try {
      const res = await fetch('/api/consent/purge-request', {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        localStorage.removeItem('forge-active-token');
        localStorage.removeItem('forge-consents');
        localStorage.removeItem('forge-trainee-profile');
        alert(
          'DPDP Section 12 Right-to-be-Forgotten executed. All personal records and active sessions have been permanently erased.'
        );
        window.location.href = '/';
      } else {
        throw new Error('Server returned error on purge request');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit purge request');
    } finally {
      setPurging(false);
      setShowPurgeConfirm(false);
    }
  };

  const purposesList = [
    {
      id: 'OUTCOME_TRACKING',
      name: { en: 'Longitudinal Outcome Tracking', mr: 'दीर्घकालीन निष्पत्ती ट्रॅकिंग', hi: 'दीर्घकालिक परिणाम ट्रैकिंग' },
      desc: { en: '30, 90, 180, and 365 day milestone records for MSSDS reporting.', mr: '३०, ९०, १८० आणि ३६५ दिवसांचे रोजगार टप्पे.', hi: '30, 90, 180 और 365 दिन के रोजगार मील के पत्थर।' },
    },
    {
      id: 'LONGITUDINAL_SURVEY',
      name: { en: 'Post-Placement Surveys', mr: 'प्लेसमेंट नंतरचे सर्वेक्षण', hi: 'प्लेसमेंट के बाद सर्वेक्षण' },
      desc: { en: 'Automated check-ins for job stability and employer satisfaction.', mr: 'कामाची स्थिरता आणि समाधानासाठी नियमित संपर्क.', hi: 'कार्य स्थिरता और संतुष्टि के लिए स्वचालित चेक-इन।' },
    },
    {
      id: 'EMPLOYER_VERIFICATION',
      name: { en: 'Employer & Wage Verification', mr: 'नियोक्ता आणि वेतन पडताळणी', hi: 'नियोक्ता और वेतन सत्यापन' },
      desc: { en: 'Direct tenure cross-checking with enterprise hiring partners.', mr: 'कॉर्पोरेट भागीदारांसह कार्यकाळ पडताळणी.', hi: 'कॉर्पोरेट भागीदारों के साथ कार्यकाल सत्यापन।' },
    },
    {
      id: 'WAGE_ANALYSIS',
      name: { en: 'Wage Safeguards & Parity', mr: 'वेतन संरक्षण आणि समानता', hi: 'वेतन सुरक्षा और समानता' },
      desc: { en: 'Statutory minimum wage compliance checks.', mr: 'किमान वेतन नियमांचे पालन तपासणी.', hi: 'न्यूनतम वेतन नियमों का अनुपालन सत्यापन।' },
    },
    {
      id: 'CAREER_RECOMMENDATIONS',
      name: { en: 'AI Career Progression', mr: 'एआय करिअर प्रगती', hi: 'एआई करियर प्रगति' },
      desc: { en: 'Automated skill gap and up-skilling recommendations.', mr: 'कौशल्य वाढ आणि नवीन नोकऱ्यांच्या शिफारसी.', hi: 'कौशल सुधार और नई नौकरियों की सिफारिशें।' },
    },
    {
      id: 'SMS_NOTIFICATIONS',
      name: { en: 'SMS Notifications', mr: 'एसएमएस सूचना', hi: 'एसएमएस सूचनाएं' },
      desc: { en: 'Essential verification OTPs and interview reminders.', mr: 'पडताळणी कोड आणि मुलाखत स्मरणपत्रे.', hi: 'सत्यापन कोड और साक्षात्कार अनुस्मारक।' },
    },
    {
      id: 'WHATSAPP_NOTIFICATIONS',
      name: { en: 'WhatsApp Bot Assistant', mr: 'व्हॉट्सॲप बॉट सहाय्यक', hi: 'व्हाट्सएप बॉट सहायक' },
      desc: { en: 'Self-reporting outcome updates via WhatsApp.', mr: 'व्हॉट्सॲप द्वारे थेट अहवाल.', hi: 'व्हाट्सएप द्वारा सीधे परिणाम रिपोर्टिंग।' },
    },
    {
      id: 'ANONYMIZED_RESEARCH',
      name: { en: 'Anonymized Research', mr: 'निनावी धोरण संशोधन', hi: 'अनामित नीति अनुसंधान' },
      desc: { en: 'De-identified vocational metrics for policy analysis.', mr: 'धोरण सुधारण्यासाठी निनावी डेटा वापर.', hi: 'नीति सुधार के लिए अनामित डेटा का उपयोग।' },
    },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono mb-2">
            <ShieldCheck size={14} />
            <span>DPDP ACT 2023 PRIVACY VAULT</span>
          </div>
          <h1 className="text-2xl font-bold font-['Space_Grotesk'] text-white">
            {lang === 'mr' ? 'संमती आणि डेटा गोपनीयता नियंत्रण' : lang === 'hi' ? 'सहमति और डेटा गोपनीयता नियंत्रण' : 'Consent & Privacy Management'}
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            {lang === 'mr'
              ? 'तुमच्या डेटा प्रक्रियेचे संपूर्ण नियंत्रण ठेवा. संमती कधीही बदला किंवा मागे घ्या.'
              : lang === 'hi'
              ? 'अपने डेटा प्रोसेसिंग पर पूर्ण नियंत्रण रखें। किसी भी समय सहमति बदलें या वापस लें।'
              : 'Review and manage your data processing permissions. Withdrawals take immediate effect across all services.'}
          </p>
        </div>

        {/* Language switcher & refresh */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setLang('en')}
              className={`px-2 py-1 rounded font-medium ${lang === 'en' ? 'bg-indigo-600 text-white' : 'text-zinc-400'}`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('mr')}
              className={`px-2 py-1 rounded font-medium ${lang === 'mr' ? 'bg-indigo-600 text-white' : 'text-zinc-400'}`}
            >
              मराठी
            </button>
            <button
              onClick={() => setLang('hi')}
              className={`px-2 py-1 rounded font-medium ${lang === 'hi' ? 'bg-indigo-600 text-white' : 'text-zinc-400'}`}
            >
              हिंदी
            </button>
          </div>

          <button
            onClick={fetchConsents}
            disabled={loading}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg border border-zinc-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl flex items-center gap-2">
          <ShieldAlert size={16} className="text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Granular Purpose Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {purposesList.map((item) => {
          const record = consents[item.id];
          const isGranted = Boolean(record && record.granted && !record.revokedAt);
          const isBusy = updating === item.id;

          return (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition-all ${
                isGranted
                  ? 'bg-zinc-900/70 border-zinc-800'
                  : 'bg-zinc-950/40 border-zinc-900 opacity-80'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-zinc-100">{item.name[lang]}</span>
                    <Badge variant={isGranted ? 'mint' : 'neutral'} size="sm">
                      {isGranted ? 'ACTIVE' : 'WITHDRAWN'}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-400 mb-2">{item.desc[lang]}</p>
                  <div className="text-[10px] font-mono text-zinc-500 space-y-0.5">
                    <div>Purpose ID: {item.id}</div>
                    {record?.grantedAt && (
                      <div>Granted: {new Date(record.grantedAt).toLocaleDateString()}</div>
                    )}
                    {record?.revokedAt && (
                      <div className="text-rose-400">
                        Revoked: {new Date(record.revokedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0 pt-1">
                  <Button
                    size="sm"
                    variant={isGranted ? 'danger' : 'outline'}
                    isLoading={isBusy}
                    onClick={() => handleToggle(item.id, isGranted)}
                  >
                    {isGranted
                      ? lang === 'mr'
                        ? 'मागे घ्या'
                        : lang === 'hi'
                        ? 'वापस लें'
                        : 'Withdraw'
                      : lang === 'mr'
                      ? 'संमती द्या'
                      : lang === 'hi'
                      ? 'सहमति दें'
                      : 'Grant'}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Right to be Forgotten Section */}
      <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-900/30 space-y-3">
        <div className="flex items-center gap-2 text-rose-400">
          <AlertTriangle size={18} />
          <h3 className="text-sm font-semibold">
            {lang === 'mr'
              ? 'कलम १२: विसरण्याचा अधिकार (Right to be Forgotten)'
              : lang === 'hi'
              ? 'धारा 12: भूलने का अधिकार (Right to be Forgotten)'
              : 'DPDP Act 2023 Section 12: Right to be Forgotten'}
          </h3>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          {lang === 'mr'
            ? 'तुम्ही तुमची वैयक्तिक माहिती, संपर्क क्रमांक आणि सर्व सक्रिय सत्रे कायमस्वरूपी हटवण्याची विनंती करू शकता. ही क्रिया अपरिवर्तनीय आहे.'
            : lang === 'hi'
            ? 'आप अपनी व्यक्तिगत जानकारी, संपर्क नंबर और सभी सक्रिय सत्रों को स्थायी रूप से हटाने का अनुरोध कर सकते हैं। यह क्रिया अपरिवर्तनीय है।'
            : 'You have the statutory right to request complete and irrevocable deletion of your phone number, profile, active sessions, and consent logs.'}
        </p>

        {!showPurgeConfirm ? (
          <Button
            size="sm"
            variant="danger"
            onClick={() => setShowPurgeConfirm(true)}
            leftIcon={<Trash2 size={13} />}
          >
            Request Permanent Data Purge
          </Button>
        ) : (
          <div className="p-3 bg-rose-900/30 border border-rose-800 rounded-xl space-y-2">
            <p className="text-xs text-rose-200 font-semibold">
              Are you absolutely sure? This will immediately log you out and delete your personal data.
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="danger"
                isLoading={purging}
                onClick={handlePurgeRequest}
              >
                Yes, Purge My Data Permanently
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowPurgeConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Immutable Audit Log Trail */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-zinc-300">
          <History size={16} />
          <h3 className="text-sm font-semibold">Tamper-Evident Consent Audit Trail</h3>
        </div>

        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl overflow-hidden text-xs">
          {auditLogs.length === 0 ? (
            <div className="p-4 text-center text-zinc-500">No consent change events recorded yet.</div>
          ) : (
            <div className="divide-y divide-zinc-800/60 max-h-60 overflow-y-auto custom-scrollbar">
              {auditLogs.map((log, idx) => (
                <div key={log.id || idx} className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        log.action?.includes('GRANTED') ? 'bg-emerald-400' : 'bg-rose-400'
                      }`}
                    />
                    <div>
                      <span className="font-mono text-zinc-200 font-semibold">{log.action}</span>
                      <span className="text-zinc-500 ml-2 font-mono">
                        {log.targetId || log.targetEntity || ''}
                      </span>
                    </div>
                  </div>
                  <div className="text-[11px] text-zinc-500 font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConsentManagementView;
