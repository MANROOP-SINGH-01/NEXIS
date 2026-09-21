/**
 * FILE: src/i18n.ts
 * PURPOSE: Centralized application-wide internationalization system (English, Hindi, Marathi).
 * SPEC: Enforces true tri-lingual UX across all product sections with persistent locale storage.
 */

export type Locale = 'en' | 'hi' | 'mr';

export interface TranslationDict {
  // Navigation & Sections
  overview: string;
  dashboard: string;
  jobs: string;
  savedJobs: string;
  resume: string;
  newCv: string;
  resumeFixer: string;
  skills: string;
  skillGaps: string;
  careerProfile: string;
  applications: string;
  applicationTracker: string;
  agentWorkspace: string;
  settings: string;
  aiProviders: string;
  language: string;
  logout: string;
  profile: string;
  careerHealth: string;
  recommendedPrograms: string;
  interviewPrep: string;
  careerPassport: string;
  myOutcome: string;
  linkedinIntegration: string;

  // Career Overview Dashboard
  heroTitle: string;
  heroSubtitle: string;
  findMatchingJobs: string;
  improveResume: string;
  yourCareerStatus: string;
  profileCompleteness: string;
  resumeStatus: string;
  targetRole: string;
  preferredLocation: string;
  notSet: string;
  jobsForYou: string;
  matchScore: string;
  whyThisMatches: string;
  matched: string;
  missing: string;
  viewJob: string;
  tailorResume: string;
  saveJob: string;
  skillsToWorkOn: string;
  highPriority: string;
  mediumPriority: string;
  lowPriority: string;
  applicationOverview: string;
  saved: string;
  applied: string;
  interview: string;
  offer: string;
  recommendedNextSteps: string;
  completeYourProfile: string;
  completeProfileCta: string;
  analyzeYourResume: string;
  analyzeResumeCta: string;
  exploreMatchingJobs: string;
  exploreJobsCta: string;
  noApplicationsYet: string;
  noJobsYet: string;
  noResumeYet: string;
  resumeUploaded: string;
  lastAnalyzed: string;
  atsScore: string;
  roleAlignment: string;
  issuesFound: string;
  highPriorityImprovements: string;

  // Common Controls & Statuses
  submit: string;
  cancel: string;
  close: string;
  save: string;
  loading: string;
  error: string;
  success: string;
  noData: string;
  searchPlaceholder: string;
  uploadResume: string;
  pasteResume: string;
  analyzeResume: string;
  targetJobDescription: string;
  runPhaseOne: string;
  demoMode: string;
  demoModeActive: string;
  loadDemoData: string;
  dedupReview: string;
  analytics: string;
  mainNavigation: string;
  agentPanel: string;
  simulationCanvas: string;
  consentTitle: string;
  consentSubtitle: string;

  // BYOK & AI Settings
  geminiApiKey: string;
  byokConnected: string;
  byokDisconnected: string;
  testKey: string;
  replaceKey: string;
  removeKey: string;
  getApiKey: string;
}

const strings: Record<Locale, TranslationDict> = {
  en: {
    overview: 'Overview',
    dashboard: 'Career Overview',
    jobs: 'Jobs',
    savedJobs: 'Saved Jobs',
    resume: 'My Resume',
    newCv: 'Resume',
    resumeFixer: 'Resume Fixer',
    skills: 'Skills',
    skillGaps: 'Skill Gaps',
    careerProfile: 'Career Profile',
    applications: 'Applications',
    applicationTracker: 'Applications',
    agentWorkspace: 'Agent Workspace',
    settings: 'Settings',
    aiProviders: 'AI Providers',
    language: 'Language',
    logout: 'Logout',
    profile: 'Profile',
    careerHealth: 'Career Overview',
    recommendedPrograms: 'Learning',
    interviewPrep: 'Interview Prep',
    careerPassport: 'Career Passport',
    myOutcome: 'Outcomes',
    linkedinIntegration: 'Network',

    heroTitle: 'Find the right jobs. Build the right application.',
    heroSubtitle: 'NEXIS analyzes your profile and resume, finds matching jobs, identifies skill gaps, and prepares tailored application material.',
    findMatchingJobs: 'Find Matching Jobs',
    improveResume: 'Improve My Resume',
    yourCareerStatus: 'Your Career Status',
    profileCompleteness: 'Profile Completeness',
    resumeStatus: 'Resume Status',
    targetRole: 'Target Role',
    preferredLocation: 'Preferred Location',
    notSet: 'Not set',
    jobsForYou: 'Jobs for You',
    matchScore: 'Match',
    whyThisMatches: 'Why this job matches',
    matched: 'Matched',
    missing: 'Missing',
    viewJob: 'View Job',
    tailorResume: 'Tailor Resume',
    saveJob: 'Save',
    skillsToWorkOn: 'Skills to Work On',
    highPriority: 'HIGH PRIORITY',
    mediumPriority: 'MEDIUM',
    lowPriority: 'LOW',
    applicationOverview: 'Applications',
    saved: 'Saved',
    applied: 'Applied',
    interview: 'Interview',
    offer: 'Offer',
    recommendedNextSteps: 'Recommended Next Steps',
    completeYourProfile: 'Complete your profile',
    completeProfileCta: 'Complete Profile →',
    analyzeYourResume: 'Analyze your resume',
    analyzeResumeCta: 'Analyze Resume →',
    exploreMatchingJobs: 'Explore matching jobs',
    exploreJobsCta: 'Explore Jobs →',
    noApplicationsYet: 'No applications tracked yet. Start applying to open positions.',
    noJobsYet: 'No matching jobs found yet. Adjust your role preferences or upload your resume.',
    noResumeYet: 'No resume uploaded yet. Upload your resume to unlock ATS compatibility scoring and job tailoring.',
    resumeUploaded: 'Resume Uploaded',
    lastAnalyzed: 'Last analyzed',
    atsScore: 'ATS Compatibility',
    roleAlignment: 'Role Alignment',
    issuesFound: 'Issues found',
    highPriorityImprovements: 'High-priority improvements',

    submit: 'Submit',
    cancel: 'Cancel',
    close: 'Close',
    save: 'Save',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    noData: 'No data available',
    searchPlaceholder: 'Search jobs, skills, roles...',
    uploadResume: 'Upload Resume',
    pasteResume: 'Paste Resume',
    analyzeResume: 'Analyze Resume',
    targetJobDescription: 'Target Job Description',
    runPhaseOne: 'Run Phase 1 Analysis',
    demoMode: 'Demo Mode',
    demoModeActive: 'Demonstration Data Active',
    loadDemoData: 'Load Demo Data',
    dedupReview: 'Trainee Deduplication',
    analytics: 'Analytics Console',
    mainNavigation: 'Main navigation',
    agentPanel: 'Agent interaction panel',
    simulationCanvas: '3D Agent simulation',
    consentTitle: 'Citizen Consent & Data Privacy',
    consentSubtitle: 'Your record is privacy-first in compliance with the DPDP Act.',

    geminiApiKey: 'Google Gemini API Key',
    byokConnected: 'Connected',
    byokDisconnected: 'Not Configured',
    testKey: 'Test Key',
    replaceKey: 'Replace Key',
    removeKey: 'Remove Key',
    getApiKey: 'Get Gemini API Key',
  },

  hi: {
    overview: 'अवलोकन',
    dashboard: 'कैरियर अवलोकन',
    jobs: 'नौकरियां',
    savedJobs: 'सहेजी गई नौकरियां',
    resume: 'मेरा रिज़्यूमे',
    newCv: 'रिज़्यूमे',
    resumeFixer: 'रिज़्यूमे सुधारक',
    skills: 'कौशल',
    skillGaps: 'कौशल अंतराल',
    careerProfile: 'कैरियर प्रोफ़ाइल',
    applications: 'आवेदन',
    applicationTracker: 'आवेदन ट्रैकर',
    agentWorkspace: 'एजेंट कार्यक्षेत्र',
    settings: 'सेटिंग्स',
    aiProviders: 'एआई प्रदाता',
    language: 'भाषा',
    logout: 'लॉगआउट',
    profile: 'प्रोफ़ाइल',
    careerHealth: 'कैरियर अवलोकन',
    recommendedPrograms: 'प्रशिक्षण',
    interviewPrep: 'साक्षात्कार तैयारी',
    careerPassport: 'कैरियर पासपोर्ट',
    myOutcome: 'परिणाम',
    linkedinIntegration: 'नेटवर्क',

    heroTitle: 'सही नौकरियां खोजें। सही आवेदन तैयार करें।',
    heroSubtitle: 'NEXIS आपकी प्रोफ़ाइल और रिज़्यूमे का विश्लेषण करता है, उपयुक्त नौकरियां ढूंढता है, कौशल अंतराल बताता है और आवेदन सामग्री तैयार करता है।',
    findMatchingJobs: 'उपयुक्त नौकरियां खोजें',
    improveResume: 'मेरा रिज़्यूमे सुधारें',
    yourCareerStatus: 'आपकी कैरियर स्थिति',
    profileCompleteness: 'प्रोफ़ाइल पूर्णता',
    resumeStatus: 'रिज़्यूमे स्थिति',
    targetRole: 'लक्ष्य भूमिका',
    preferredLocation: 'पसंदीदा स्थान',
    notSet: 'निर्धारित नहीं',
    jobsForYou: 'आपके लिए नौकरियां',
    matchScore: 'मिलान',
    whyThisMatches: 'यह नौकरी क्यों मेल खाती है',
    matched: 'उपलब्ध कौशल',
    missing: 'अपेक्षित कौशल',
    viewJob: 'नौकरी देखें',
    tailorResume: 'रिज़्यूमे अनुकूलित करें',
    saveJob: 'सहेजें',
    skillsToWorkOn: 'सीखने योग्य कौशल',
    highPriority: 'उच्च प्राथमिकता',
    mediumPriority: 'मध्यम',
    lowPriority: 'कम',
    applicationOverview: 'आवेदन स्थिति',
    saved: 'सहेजे गए',
    applied: 'आवेदन किया',
    interview: 'साक्षात्कार',
    offer: 'प्रस्ताव',
    recommendedNextSteps: 'अनुशंसित अगले कदम',
    completeYourProfile: 'अपनी प्रोफ़ाइल पूरी करें',
    completeProfileCta: 'प्रोफ़ाइल पूर्ण करें →',
    analyzeYourResume: 'अपने रिज़्यूमे का विश्लेषण करें',
    analyzeResumeCta: 'रिज़्यूमे विश्लेषण →',
    exploreMatchingJobs: 'उपयुक्त नौकरियां देखें',
    exploreJobsCta: 'नौकरियां खोजें →',
    noApplicationsYet: 'अभी तक कोई आवेदन ट्रैक नहीं किया गया है। नौकरियों में आवेदन शुरू करें।',
    noJobsYet: 'अभी कोई उपयुक्त नौकरी नहीं मिली। अपनी वरीयताएं बदलें या रिज़्यूमे अपलोड करें।',
    noResumeYet: 'अद्याप कोणताही रेझ्युमे अपलोड केलेला नाही. एटीएस स्कोअरिंग आणि नोकरी टेलरिंगसाठी आपला रेझ्युमे अपलोड करा.',
    resumeUploaded: 'रिज़्यूमे अपलोड किया गया',
    lastAnalyzed: 'अंतिम विश्लेषण',
    atsScore: 'ATS अनुकूलता',
    roleAlignment: 'भूमिका संरेखण',
    issuesFound: 'पहचाने गए मुद्दे',
    highPriorityImprovements: 'उच्च प्राथमिकता सुधार',

    submit: 'जमा करें',
    cancel: 'रद्द करें',
    close: 'बंद करें',
    save: 'सहेजें',
    loading: 'लोड हो रहा है...',
    error: 'त्रुटि',
    success: 'सफल',
    noData: 'कोई डेटा उपलब्ध नहीं',
    searchPlaceholder: 'नौकरियां, कौशल, पद खोजें...',
    uploadResume: 'रिज़्यूमे अपलोड करें',
    pasteResume: 'रिज़्यूमे पेस्ट करें',
    analyzeResume: 'रिज़्यूमे विश्लेषण',
    targetJobDescription: 'लक्ष्य नौकरी विवरण',
    runPhaseOne: 'चरण 1 विश्लेषण चलाएं',
    demoMode: 'डेमो मोड',
    demoModeActive: 'प्रदर्शन डेटा सक्रिय',
    loadDemoData: 'डेमो डेटा लोड करें',
    dedupReview: 'डुप्लीकेट समीक्षा',
    analytics: 'विश्लेषिकी कंसोल',
    mainNavigation: 'मुख्य नेविगेशन',
    agentPanel: 'एजेंट पैनल',
    simulationCanvas: '3D सिमुलेशन',
    consentTitle: 'सहमति और डेटा गोपनीयता',
    consentSubtitle: 'आपका रिकॉर्ड DPDP अधिनियम के तहत सुरक्षित है।',

    geminiApiKey: 'Google Gemini API कुंजी',
    byokConnected: 'संबद्ध',
    byokDisconnected: 'कॉन्फ़िगर नहीं किया गया',
    testKey: 'कुंजी का परीक्षण करें',
    replaceKey: 'कुंजी बदलें',
    removeKey: 'कुंजी हटाएं',
    getApiKey: 'Gemini कुंजी प्राप्त करें',
  },

  mr: {
    overview: 'आढावा',
    dashboard: 'करिअर आढावा',
    jobs: 'नोकऱ्या',
    savedJobs: 'जतन केलेल्या नोकऱ्या',
    resume: 'माझा रिझ्युमे',
    newCv: 'रिझ्युमे',
    resumeFixer: 'रिझ्युमे सुधारक',
    skills: 'कौशल्ये',
    skillGaps: 'कौशल्य तफावत',
    careerProfile: 'करिअर प्रोफाइल',
    applications: 'अर्ज',
    applicationTracker: 'अर्ज ट्रॅकर',
    agentWorkspace: 'एजंट वर्कस्पेस',
    settings: 'सेटिंग्ज',
    aiProviders: 'AI प्रदाते',
    language: 'भाषा',
    logout: 'लॉगआउट',
    profile: 'प्रोफाइल',
    careerHealth: 'करिअर आढावा',
    recommendedPrograms: 'प्रशिक्षण',
    interviewPrep: 'मुलाखत तयारी',
    careerPassport: 'करिअर पासपोर्ट',
    myOutcome: 'परिणाम',
    linkedinIntegration: 'नेटवर्क',

    heroTitle: 'योग्य नोकऱ्या शोधा. योग्य अर्ज तयार करा.',
    heroSubtitle: 'NEXIS तुमच्या प्रोफाइल आणि रिझ्युमेचे विश्लेषण करते, योग्य नोकऱ्या शोधते, कौशल्य तफावत ओळखते आणि लक्ष्यित अर्ज तयार करते.',
    findMatchingJobs: 'जुळणाऱ्या नोकऱ्या शोधा',
    improveResume: 'माझा रिझ्युमे सुधारा',
    yourCareerStatus: 'तुमची करिअर स्थिती',
    profileCompleteness: 'प्रोफाइल पूर्णता',
    resumeStatus: 'रिझ्युमे स्थिती',
    targetRole: 'लक्ष्य भूमिका',
    preferredLocation: 'पसंतीचे ठिकाण',
    notSet: 'निश्चित नाही',
    jobsForYou: 'तुमच्यासाठी नोकऱ्या',
    matchScore: 'साम्य',
    whyThisMatches: 'ही नोकरी का जुळते',
    matched: 'उपलब्ध कौशल्ये',
    missing: 'अपेक्षित कौशल्ये',
    viewJob: 'नोकरी पहा',
    tailorResume: 'रिझ्युमे अनुकूल करा',
    saveJob: 'जतन करा',
    skillsToWorkOn: 'शिकण्यासारखी कौशल्ये',
    highPriority: 'उच्च प्राधान्य',
    mediumPriority: 'मध्यम',
    lowPriority: 'कमी',
    applicationOverview: 'अर्ज स्थिती',
    saved: 'जतन केलेले',
    applied: 'अर्ज केला',
    interview: 'मुलाखत',
    offer: 'ऑफर',
    recommendedNextSteps: 'पुढील शिफारस केलेले टप्पे',
    completeYourProfile: 'तुमचे प्रोफाइल पूर्ण करा',
    completeProfileCta: 'प्रोफाइल पूर्ण करा →',
    analyzeYourResume: 'तुमचा रिझ्युमे विश्लेषित करा',
    analyzeResumeCta: 'रिझ्युमे विश्लेषण →',
    exploreMatchingJobs: 'जुळणाऱ्या नोकऱ्या एक्सप्लोर करा',
    exploreJobsCta: 'नोकऱ्या शोधा →',
    noApplicationsYet: 'अद्याप कोणतेही अर्ज ट्रॅक केलेले नाहीत. नोकऱ्यांसाठी अर्ज करण्यास सुरुवात करा.',
    noJobsYet: 'अद्याप जुळणाऱ्या नोकऱ्या सापडल्या नाहीत. पसंती बदला किंवा रिझ्युमे अपलोड करा.',
    noResumeYet: 'अजून कोणताही रिझ्युमे अपलोड केलेला नाही. एटीएस स्कोअर आणि जॉब टेलरिंगसाठी आपला रिझ्युमे अपलोड करा.',
    resumeUploaded: 'रिझ्युमे अपलोड केला',
    lastAnalyzed: 'शेवटचे विश्लेषण',
    atsScore: 'ATS अनुकूलता',
    roleAlignment: 'भूमिका संरेखन',
    issuesFound: 'आढळलेल्या त्रुटी',
    highPriorityImprovements: 'उच्च प्राधान्य सुधारणा',

    submit: 'सबमिट करा',
    cancel: 'रद्द करा',
    close: 'बंद करा',
    save: 'जतन करा',
    loading: 'लोड होत आहे...',
    error: 'त्रुटी',
    success: 'यशस्वी',
    noData: 'माहिती उपलब्ध नाही',
    searchPlaceholder: 'नोकऱ्या, कौशल्ये, पदे शोधा...',
    uploadResume: 'रिझ्युमे अपलोड करा',
    pasteResume: 'रिझ्युमे पेस्ट करा',
    analyzeResume: 'रिझ्युमे विश्लेषण',
    targetJobDescription: 'लक्ष्य नोकरी तपशील',
    runPhaseOne: 'टप्पा 1 विश्लेषण सुरू करा',
    demoMode: 'डेमो मोड',
    demoModeActive: 'डेमो डेटा सक्रिय',
    loadDemoData: 'डेमो डेटा लोड करा',
    dedupReview: 'डुप्लिकेट पुनरावलोकन',
    analytics: 'अॅनालिटिक्स कन्सोल',
    mainNavigation: 'मुख्य नेव्हिगेशन',
    agentPanel: 'एजंट पॅनेल',
    simulationCanvas: '3D सिमुलेशन',
    consentTitle: 'सहमती आणि डेटा गोपनीयता',
    consentSubtitle: 'तुमचा डेटा DPDP कायद्यानुसार पूर्णपणे सुरक्षित आहे.',

    geminiApiKey: 'Google Gemini API की',
    byokConnected: 'जोडलेले',
    byokDisconnected: 'कॉन्फिगर केलेले नाही',
    testKey: 'की तपासा',
    replaceKey: 'की बदला',
    removeKey: 'की काढा',
    getApiKey: 'Gemini की मिळवा',
  },
};

export type StringKey = keyof TranslationDict;

let currentLocale: Locale = 'en';

// Subscribers for reactive updates across components without heavy contexts
const listeners = new Set<(locale: Locale) => void>();

export function setLocale(locale: Locale) {
  currentLocale = locale;
  try {
    localStorage.setItem('nexis-locale', locale);
  } catch {}

  // Notify all subscribing components
  listeners.forEach((fn) => {
    try { fn(locale); } catch {}
  });

  // Sync with DB if user is logged in
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('nexis-auth');
    if (token) {
      fetch('/api/profile/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredLocale: locale }),
      }).catch(() => {});
    }
  }
}

export function getLocale(): Locale {
  return currentLocale;
}

export function subscribeLocale(fn: (locale: Locale) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function t(key: StringKey | string, fallback?: string): string {
  const dict = strings[currentLocale] || strings.en;
  return (dict as any)?.[key] ?? (strings.en as any)?.[key] ?? fallback ?? key;
}

// React Hook for dynamic re-rendering on language change
import { useState, useEffect } from 'react';

export function useLocale() {
  const [locale, setLocalLocale] = useState<Locale>(currentLocale);

  useEffect(() => {
    return subscribeLocale((newLoc) => setLocalLocale(newLoc));
  }, []);

  return {
    locale,
    setLocale,
    t,
  };
}

// Initialize from localStorage
try {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('nexis-locale') as Locale | null;
    if (saved && strings[saved]) currentLocale = saved;
  }
} catch {}

export { strings };
