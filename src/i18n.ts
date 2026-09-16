// ponytail: JSON dict i18n, no framework. Add languages when needed.
// Covers citizen-facing sidebar, main nav, and key labels.

const strings = {
  en: {
    // Sidebar
    careerHealth: 'Career Health',
    dashboard: 'Dashboard',
    skillGaps: 'Skill Gaps',
    jobMatches: 'Job Matches',
    recommendedPrograms: 'Recommended Programs',
    interviewPrep: 'Interview Prep',
    newCv: 'New CV',
    myOutcome: 'My Outcome',
    linkedinIntegration: 'LinkedIn Integration',
    
    // Controls
    uploadResume: 'Upload Resume',
    pasteResume: 'Paste Resume',
    analyzeResume: 'Analyze Resume',
    targetJobDescription: 'Target Job Description',
    runPhaseOne: 'Run Phase 1 Analysis',
    
    // Agents
    nexusDirector: 'Nexus Director',
    nexusHunter: 'Nexus Hunter',
    nexusMirror: 'Nexus Mirror',
    
    // Common
    submit: 'Submit',
    cancel: 'Cancel',
    close: 'Close',
    save: 'Save',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    noData: 'No data available',
    
    // Demo
    demoMode: 'Demo Mode',
    demoModeActive: 'Demonstration Data Active',
    loadDemoData: 'Load Demo Data',
    
    // Admin
    dedupReview: 'Trainee Deduplication',
    analytics: 'Analytics Dashboard',
    
    // a11y labels
    mainNavigation: 'Main navigation',
    agentPanel: 'Agent interaction panel',
    simulationCanvas: '3D Agent simulation',
  },
  hi: {
    careerHealth: 'कैरियर स्वास्थ्य',
    dashboard: 'डैशबोर्ड',
    skillGaps: 'कौशल अंतराल',
    jobMatches: 'नौकरी मिलान',
    recommendedPrograms: 'अनुशंसित कार्यक्रम',
    interviewPrep: 'साक्षात्कार तैयारी',
    newCv: 'नया सीवी',
    myOutcome: 'मेरा परिणाम',
    linkedinIntegration: 'लिंक्डइन एकीकरण',
    
    uploadResume: 'रिज़्यूमे अपलोड करें',
    pasteResume: 'रिज़्यूमे पेस्ट करें',
    analyzeResume: 'रिज़्यूमे विश्लेषण',
    targetJobDescription: 'लक्ष्य नौकरी विवरण',
    runPhaseOne: 'चरण 1 विश्लेषण चलाएं',
    
    nexusDirector: 'नेक्सस निदेशक',
    nexusHunter: 'नेक्सस हंटर',
    nexusMirror: 'नेक्सस मिरर',
    
    submit: 'जमा करें',
    cancel: 'रद्द करें',
    close: 'बंद करें',
    save: 'सहेजें',
    loading: 'लोड हो रहा है...',
    error: 'त्रुटि',
    success: 'सफल',
    noData: 'कोई डेटा उपलब्ध नहीं',
    
    demoMode: 'डेमो मोड',
    demoModeActive: 'प्रदर्शन डेटा सक्रिय',
    loadDemoData: 'डेमो डेटा लोड करें',
    
    dedupReview: 'प्रशिक्षु डुप्लीकेट समीक्षा',
    analytics: 'विश्लेषिकी डैशबोर्ड',
    
    mainNavigation: 'मुख्य नेविगेशन',
    agentPanel: 'एजेंट इंटरैक्शन पैनल',
    simulationCanvas: '3D एजेंट सिमुलेशन',
  },
  ta: {
    dashboard: 'டாஷ்போர்டு',
    skillGaps: 'திறன் இடைவெளி',
    jobMatches: 'வேலை பொருத்தம்',
    recommendedPrograms: 'பரிந்துரைக்கப்பட்ட திட்டங்கள்',
    interviewPrep: 'நேர்காணல் தயாரிப்பு',
    newCv: 'புதிய சுயவிவரம்',
    myOutcome: 'எனது முடிவு',
    linkedinIntegration: 'லிங்க்ட்இன் ஒருங்கிணைப்பு',
    
    uploadResume: 'சுயவிவரம் பதிவேற்றம்',
    pasteResume: 'சுயவிவரம் ஒட்டவும்',
    analyzeResume: 'சுயவிவரம் பகுப்பாய்வு',
    targetJobDescription: 'இலக்கு வேலை விவரம்',
    runPhaseOne: 'படி 1 பகுப்பாய்வு',
    
    nexusDirector: 'நெக்சஸ் இயக்குநர்',
    nexusHunter: 'நெக்சஸ் ஹண்டர்',
    nexusMirror: 'நெக்சஸ் மிரர்',
    
    submit: 'சமர்ப்பிக்க',
    cancel: 'ரத்து',
    close: 'மூடு',
    save: 'சேமி',
    loading: 'ஏற்றுகிறது...',
    error: 'பிழை',
    success: 'வெற்றி',
    noData: 'தரவு இல்லை',
    
    demoMode: 'டெமோ பயன்முறை',
    demoModeActive: 'காட்சி தரவு செயலில்',
    loadDemoData: 'டெமோ தரவை ஏற்றவும்',
    
    dedupReview: 'பயிற்சியாளர் நகல் ஆய்வு',
    analytics: 'பகுப்பாய்வு டாஷ்போர்டு',
    
    mainNavigation: 'முதன்மை வழிசெலுத்தல்',
    agentPanel: 'முகவர் தொடர்பு பேனல்',
    simulationCanvas: '3D முகவர் உருவகிப்பு',
  },
} as const;

export type Locale = keyof typeof strings;
export type StringKey = keyof typeof strings['en'];

let currentLocale: Locale = 'en';

export function setLocale(locale: Locale) {
  currentLocale = locale;
  localStorage.setItem('nexis-locale', locale);
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: StringKey): string {
  return strings[currentLocale]?.[key] ?? strings.en[key] ?? key;
}

// Init from localStorage on load
try {
  const saved = localStorage.getItem('nexis-locale') as Locale | null;
  if (saved && strings[saved]) currentLocale = saved;
} catch {}

export { strings };
