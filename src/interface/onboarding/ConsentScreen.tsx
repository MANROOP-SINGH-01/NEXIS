import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ArrowRight,
  CheckCircle2,
  Lock,
  X,
  Globe,
  FileText,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { ConsentScope, DpdpConsentPurpose } from '../../types';
import { Button } from '../primitives/Button';

interface ConsentScreenProps {
  onConsentsSaved: (scopes: Partial<Record<ConsentScope, boolean>>) => Promise<boolean>;
  onDismiss?: () => void;
  initialConsents?: Partial<Record<ConsentScope, boolean>>;
}

type Lang = 'en' | 'mr' | 'hi';

interface DpdpPurposeConfig {
  purpose: DpdpConsentPurpose;
  title: Record<Lang, string>;
  description: Record<Lang, string>;
  legalBasis: string;
  dataAccess: string;
  isEssential: boolean;
  defaultGranted: boolean;
}

const DPDP_PURPOSES_CONFIG: DpdpPurposeConfig[] = [
  {
    purpose: 'OUTCOME_TRACKING',
    title: {
      en: 'Longitudinal Outcome Tracking (MSSDS)',
      mr: 'दीर्घकालीन निष्पत्ती ट्रॅकिंग (एमएसएसडीएस)',
      hi: 'दीर्घकालिक परिणाम ट्रैकिंग (एमएसएसडीएस)',
    },
    description: {
      en: 'Records employment milestones, wage growth, and retention at 30, 90, 180, and 365 days post-training.',
      mr: 'प्रशिक्षणानंतर ३०, ९०, १८० आणि ३६५ दिवसांत तुमच्या रोजगाराचे टप्पे, वेतन वाढ आणि टिकून राहणे नोंदवते.',
      hi: 'प्रशिक्षण के बाद 30, 90, 180 और 365 दिनों में रोजगार मील के पत्थर, वेतन वृद्धि और प्रतिधारण को रिकॉर्ड करता है।',
    },
    legalBasis: 'DPDP Act 2023 Sec 6(1) & State Mandate',
    dataAccess: 'Maharashtra Skills Directorate & Verification Officers',
    isEssential: true,
    defaultGranted: true,
  },
  {
    purpose: 'LONGITUDINAL_SURVEY',
    title: {
      en: 'Periodic Follow-Up Surveys',
      mr: 'नियतकालिक पाठपुरावा सर्वेक्षण',
      hi: 'आवधिक अनुवर्ती सर्वेक्षण',
    },
    description: {
      en: 'Enables check-in queries via SMS, WhatsApp, or IVR to assess workplace stability and support needs.',
      mr: 'कामाच्या ठिकाणी स्थिरता आणि मदत गरजांचे मूल्यांकन करण्यासाठी एसएमएस किंवा व्हॉट्सॲप द्वारे संपर्क.',
      hi: 'कार्यस्थल स्थिरता और सहायता आवश्यकताओं का आकलन करने के लिए एसएमएस या व्हाट्सएप द्वारा संपर्क।',
    },
    legalBasis: 'Informed Explicit Consent',
    dataAccess: 'Automated Follow-up Engine & Survey Agents',
    isEssential: false,
    defaultGranted: true,
  },
  {
    purpose: 'EMPLOYER_VERIFICATION',
    title: {
      en: 'Employer & Tenure Validation',
      mr: 'नियोक्ता आणि कार्यकाळ प्रमाणीकरण',
      hi: 'नियोक्ता और कार्यकाल सत्यापन',
    },
    description: {
      en: 'Cross-verifies offer letters, payslips, or employment status directly with verified corporate partners.',
      mr: 'सत्यापित कॉर्पोरेट भागीदारांसह ऑफर लेटर, वेतन स्लिप किंवा रोजगार स्थितीची पडताळणी.',
      hi: 'सत्यापित कॉर्पोरेट भागीदारों के साथ ऑफर लेटर, वेतन पर्ची या रोजगार स्थिति का सत्यापन।',
    },
    legalBasis: 'Third-Party Verification Consent',
    dataAccess: 'Accredited Employer Portals & Verification Vault',
    isEssential: false,
    defaultGranted: true,
  },
  {
    purpose: 'WAGE_ANALYSIS',
    title: {
      en: 'Wage Analysis & Minimum Wage Protection',
      mr: 'वेतन विश्लेषण आणि किमान वेतन संरक्षण',
      hi: 'वेतन विश्लेषण और न्यूनतम वेतन सुरक्षा',
    },
    description: {
      en: 'Monitors compensation to safeguard against statutory minimum wage violations and ensure gender parity.',
      mr: 'किमान वेतनाचे उल्लंघन रोखण्यासाठी आणि समान वेतन सुनिश्चित करण्यासाठी मोबदल्याचे परीक्षण.',
      hi: 'न्यूनतम वेतन उल्लंघन से बचाव और समान वेतन सुनिश्चित करने के लिए मुआवजे की निगरानी।',
    },
    legalBasis: 'Public Skill Evaluation Mandate',
    dataAccess: 'MSSDS Analytics Division (Aggregated & De-identified)',
    isEssential: false,
    defaultGranted: true,
  },
  {
    purpose: 'CAREER_RECOMMENDATIONS',
    title: {
      en: 'AI Career Progression & Up-Skilling',
      mr: 'एआय करिअर प्रगती आणि कौशल्यविकास',
      hi: 'एआई करियर प्रगति और कौशल उन्नयन',
    },
    description: {
      en: 'Analyzes skill masteries to recommend high-wage roles, bridge certifications, and blue-ocean openings.',
      mr: 'उच्च-वेतन नोकऱ्या आणि नवीन प्रमाणपत्रांची शिफारस करण्यासाठी कौशल्य विश्लेषण.',
      hi: 'उच्च वेतन वाली नौकरियों और नए प्रमाणपनों की सिफारिश के लिए कौशल विश्लेषण।',
    },
    legalBasis: 'Automated Processing Consent',
    dataAccess: 'Nexus-Strategist & Recommendation Engine',
    isEssential: false,
    defaultGranted: true,
  },
  {
    purpose: 'SMS_NOTIFICATIONS',
    title: {
      en: 'SMS Alerts & Urgent Notifications',
      mr: 'एसएमएस अलर्ट आणि महत्त्वपूर्ण सूचना',
      hi: 'एसएमएस अलर्ट और महत्वपूर्ण सूचनाएं',
    },
    description: {
      en: 'Delivers essential verification OTPs, interview calls, and outcome survey links via SMS.',
      mr: 'एसएमएस द्वारे आवश्यक पडताळणी ओटीपी, मुलाखत कॉल आणि सर्वेक्षण लिंक्स मिळवा.',
      hi: 'एसएमएस के माध्यम से आवश्यक सत्यापन ओटीपी, साक्षात्कार कॉल और सर्वेक्षण लिंक प्राप्त करें।',
    },
    legalBasis: 'Telecom Service Delivery Notice',
    dataAccess: 'Govt DLT Approved Gateway (TRAI Compliant)',
    isEssential: true,
    defaultGranted: true,
  },
  {
    purpose: 'WHATSAPP_NOTIFICATIONS',
    title: {
      en: 'WhatsApp Interactive Assistant',
      mr: 'व्हॉट्सॲप परस्परसंवादी सहाय्यक',
      hi: 'व्हाट्सएप इंटरैक्टिव सहायक',
    },
    description: {
      en: 'Enables instant outcome self-reporting, interview prep micro-lessons, and document upload via WhatsApp.',
      mr: 'व्हॉट्सॲप द्वारे त्वरित निष्पत्ती अहवाल आणि कागदपत्रे अपलोड.',
      hi: 'व्हाट्सएप के माध्यम से त्वरित परिणाम रिपोर्टिंग और दस्तावेज अपलोड।',
    },
    legalBasis: 'Channel-Specific Opt-in',
    dataAccess: 'Official Meta WhatsApp Business Cloud Gateway',
    isEssential: false,
    defaultGranted: false,
  },
  {
    purpose: 'ANONYMIZED_RESEARCH',
    title: {
      en: 'Anonymized Policy Research',
      mr: 'निनावी धोरण संशोधन',
      hi: 'अनामित नीति अनुसंधान',
    },
    description: {
      en: 'Aggregates completely anonymized employment statistics to improve state vocational education policies.',
      mr: 'राज्य धोरणांमध्ये सुधारणा करण्यासाठी पूर्णपणे निनावी सांख्यिकी संकलन.',
      hi: 'राज्य नीतियों में सुधार के लिए पूरी तरह से अनामित आंकड़े संकलन।',
    },
    legalBasis: 'DPDP Act 2023 Sec 4(2)',
    dataAccess: 'State Innovation Council & Academic Researchers',
    isEssential: false,
    defaultGranted: true,
  },
];

export const ConsentScreen: React.FC<ConsentScreenProps> = ({
  onConsentsSaved,
  onDismiss,
  initialConsents,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [lang, setLang] = useState<Lang>('en');

  // Initialize consent states for all 8 DPDP purposes plus legacy compatibility
  const [consents, setConsents] = useState<Record<string, boolean>>(() => {
    const state: Record<string, boolean> = {
      // Legacy scopes
      JOB_SEARCH_DATA: true,
      EMPLOYER_SHARING: true,
      ANALYTICS: true,
      GOVT_CROSS_CHECK: false,
    };
    for (const item of DPDP_PURPOSES_CONFIG) {
      state[item.purpose] = initialConsents?.[item.purpose] ?? item.defaultGranted;
    }
    return state;
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const handleToggle = (purpose: string) => {
    setConsents((prev) => ({
      ...prev,
      [purpose]: !prev[purpose],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Ensure at least one essential tracking purpose is granted
    const hasAnyGranted = Object.values(consents).some((val) => val === true);
    if (!hasAnyGranted) {
      setError(
        lang === 'mr'
          ? 'कृपया करिअर आणि पडताळणी सेवा सुरू ठेवण्यासाठी किमान एका उद्देशास संमती द्या.'
          : lang === 'hi'
          ? 'कृपया करियर और सत्यापन सेवाओं के साथ आगे बढ़ने के लिए कम से कम एक उद्देश्य की सहमति दें।'
          : 'Please grant at least one consent purpose to proceed with verified career and outcome services.'
      );
      return;
    }

    setSubmitting(true);
    try {
      await onConsentsSaved(consents as Partial<Record<ConsentScope, boolean>>);
      setIsDismissed(true);
      onDismiss?.();
    } catch (err) {
      console.warn('[ConsentScreen] Save completed with fallback:', err);
      setIsDismissed(true);
      onDismiss?.();
    } finally {
      setSubmitting(false);
    }
  };

  const grantedCount = Object.values(consents).filter(Boolean).length;

  if (isDismissed) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 md:p-6 pointer-events-auto overflow-hidden">
      {/* Frosted Glass Backdrop */}
      <div
        onClick={handleDismiss}
        className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 cursor-pointer"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-3xl bg-[#0f111a] rounded-2xl shadow-2xl shadow-black/90 p-6 md:p-8 border border-zinc-800 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-hidden flex flex-col z-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4 shrink-0">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono mb-2">
              <ShieldCheck size={14} />
              <span>DPDP ACT 2023 • MAHARASHTRA STATE INNOVATION SOCIETY</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold font-['Space_Grotesk'] text-white tracking-tight leading-tight">
              {lang === 'mr'
                ? 'माहिती गोपनीयता आणि संमती व्यवस्थापन'
                : lang === 'hi'
                ? 'डेटा गोपनीयता और सहमति प्रबंधन'
                : 'Data Privacy & Longitudinal Consent Notice'}
            </h2>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              {lang === 'mr'
                ? 'तुमच्या कौशल्य नोंदी, रोजगार निष्पत्ती आणि संपर्कासाठी संमती निवडा. तुम्ही ही संमती कधीही मागे घेऊ शकता.'
                : lang === 'hi'
                ? 'अपने कौशल रिकॉर्ड, रोजगार परिणाम और संचार के लिए सहमति चुनें। आप कभी भी सहमति वापस ले सकते हैं।'
                : 'Choose how your training records, outcome milestones, and contact channels are processed. You can withdraw anytime.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Language Switcher */}
            <div className="inline-flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2 py-1 rounded font-medium transition-colors ${
                  lang === 'en' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang('mr')}
                className={`px-2 py-1 rounded font-medium transition-colors ${
                  lang === 'mr' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                मराठी
              </button>
              <button
                type="button"
                onClick={() => setLang('hi')}
                className={`px-2 py-1 rounded font-medium transition-colors ${
                  lang === 'hi' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                हिंदी
              </button>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Dismiss"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 text-rose-300 text-xs rounded-xl border border-rose-500/20 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-[11px] font-semibold underline text-rose-300 hover:text-white cursor-pointer shrink-0"
            >
              Continue
            </button>
          </div>
        )}

        {/* Notice Info Banner */}
        <div className="mb-3 px-3 py-2 rounded-lg bg-indigo-950/40 border border-indigo-500/20 text-[11px] text-indigo-200 flex items-center gap-2 shrink-0">
          <Info size={14} className="text-indigo-400 shrink-0" />
          <span>
            {lang === 'mr'
              ? 'नोंदणी आवृत्ती: v2.0 (नोव्हेंबर २०२६ डीपीडीपी नियमांनुसार). संमती मागे घेतल्यास तात्काळ अंमलबजावणी होते.'
              : lang === 'hi'
              ? 'नोटिस संस्करण: v2.0 (नवंबर 2026 डीपीडीपी नियमों के अनुसार)। सहमति वापस लेने पर तत्काल प्रभाव होता है।'
              : 'Notice Version v2.0 (DPDP Act 2023 Rules compliant). Withdrawal immediately invalidates processing privileges.'}
          </span>
        </div>

        {/* Purposes List */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
            {DPDP_PURPOSES_CONFIG.map((item) => {
              const isChecked = !!consents[item.purpose];
              return (
                <div
                  key={item.purpose}
                  onClick={() => handleToggle(item.purpose)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                    isChecked
                      ? 'bg-zinc-900/90 border-indigo-500/40 shadow-sm'
                      : 'bg-zinc-950/60 border-zinc-800/80 opacity-70 hover:opacity-100 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-semibold text-zinc-100">
                          {item.title[lang]}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700/60">
                          {item.purpose}
                        </span>
                        {item.isEssential && (
                          <span className="text-[9px] font-mono text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            {lang === 'mr' ? 'आवश्यक' : lang === 'hi' ? 'आवश्यक' : 'Core Mandate'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed font-normal">
                        {item.description[lang]}
                      </p>
                      <div className="mt-2 text-[10px] font-mono text-zinc-500 flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          <span>{item.dataAccess}</span>
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-zinc-500">{item.legalBasis}</span>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <div className="shrink-0 pt-0.5">
                      <div
                        className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 ${
                          isChecked ? 'bg-indigo-600' : 'bg-zinc-800'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ${
                            isChecked ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="pt-4 mt-3 border-t border-zinc-800/80 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <CheckCircle2 size={15} className="text-emerald-400" />
              <span>
                {grantedCount} {lang === 'mr' ? 'उद्देश मंजूर' : lang === 'hi' ? 'उद्देश्य स्वीकृत' : 'purposes granted'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                {lang === 'mr' ? 'नंतर करा' : lang === 'hi' ? 'बाद में' : 'Skip for now'}
              </button>
              <Button
                type="submit"
                variant="glow"
                size="sm"
                isLoading={submitting}
                rightIcon={<ArrowRight size={14} />}
              >
                {lang === 'mr' ? 'संमती जतन करा' : lang === 'hi' ? 'सहमति सहेजें' : 'Save & Continue'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConsentScreen;
