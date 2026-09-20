/**
 * FILE: server/utils/consent.js
 * PURPOSE: Resolves "current" consent state for a trainee from both the append-only
 *          ConsentRecord audit log and the granular DPDP Consent entity (Act 2023).
 * DEPENDENCIES: None (accepts prisma client as argument for testability)
 * USED BY: server/routes/trainee.js, server/routes/consent.js, server/middleware/consentMiddleware.js
 */

/**
 * All legacy consent scopes recognised by the system.
 * Preserved as exactly 4 immutable scopes for 100% backward compatibility
 * with existing tests and clients.
 */
export const ALLOWED_SCOPES = Object.freeze([
  'JOB_SEARCH_DATA',
  'EMPLOYER_SHARING',
  'ANALYTICS',
  'GOVT_CROSS_CHECK',
])

/**
 * Granular DPDP Act 2023 operational purposes (Phase 2 & Phase 3).
 * Aligned with the Prisma ConsentPurpose enum.
 */
export const DPDP_PURPOSES = Object.freeze([
  'OUTCOME_TRACKING',
  'LONGITUDINAL_SURVEY',
  'EMPLOYER_VERIFICATION',
  'WAGE_ANALYSIS',
  'CAREER_RECOMMENDATIONS',
  'SMS_NOTIFICATIONS',
  'WHATSAPP_NOTIFICATIONS',
  'ANONYMIZED_RESEARCH',
  'THIRD_PARTY_SHARING',
])

/**
 * Mapping between legacy scopes and canonical DPDP purposes for interoperability.
 */
export const SCOPE_TO_PURPOSE_MAP = Object.freeze({
  JOB_SEARCH_DATA: 'CAREER_RECOMMENDATIONS',
  EMPLOYER_SHARING: 'EMPLOYER_VERIFICATION',
  ANALYTICS: 'ANONYMIZED_RESEARCH',
  GOVT_CROSS_CHECK: 'OUTCOME_TRACKING',
})

export const PURPOSE_TO_SCOPE_MAP = Object.freeze({
  CAREER_RECOMMENDATIONS: 'JOB_SEARCH_DATA',
  EMPLOYER_VERIFICATION: 'EMPLOYER_SHARING',
  ANONYMIZED_RESEARCH: 'ANALYTICS',
  OUTCOME_TRACKING: 'GOVT_CROSS_CHECK',
})

/**
 * Multilingual purpose definitions for Maharashtra DPDP compliance (EN, MR, HI).
 */
export const DPDP_PURPOSE_DEFINITIONS = Object.freeze({
  OUTCOME_TRACKING: {
    id: 'OUTCOME_TRACKING',
    title: {
      en: 'Longitudinal Outcome Tracking',
      mr: 'दीर्घकालीन निष्पत्ती ट्रॅकिंग',
      hi: 'दीर्घकालिक परिणाम ट्रैकिंग',
    },
    description: {
      en: 'Tracks your employment milestones, wage growth, and career progression at 30, 90, 180, and 365 days post-training.',
      mr: 'प्रशिक्षणानंतर ३०, ९०, १८० आणि ३६५ दिवसांत तुमच्या रोजगाराचे टप्पे, वेतन वाढ आणि करिअर प्रगती ट्रॅक करते.',
      hi: 'प्रशिक्षण के बाद 30, 90, 180 और 365 दिनों में आपके रोजगार मील के पत्थर, वेतन वृद्धि और करियर प्रगति को ट्रैक करता है।',
    },
    legalBasis: 'DPDP Act 2023 Section 6(1) & Maharashtra State Innovation Society mandate',
    dataAccess: 'State Skills Directorate & Authorized Monitoring Officers',
    isEssential: true,
    defaultGranted: true,
  },
  LONGITUDINAL_SURVEY: {
    id: 'LONGITUDINAL_SURVEY',
    title: {
      en: 'Post-Placement Follow-Up Surveys',
      mr: 'प्लेसमेंट नंतरचे पाठपुरावा सर्वेक्षण',
      hi: 'प्लेसमेंट के बाद अनुवर्ती सर्वेक्षण',
    },
    description: {
      en: 'Enables periodic outreach via SMS, WhatsApp, or IVR to assess workplace satisfaction and retention.',
      mr: 'कामाच्या ठिकाणी समाधान आणि टिकून राहण्याचे मूल्यांकन करण्यासाठी एसएमएस, व्हॉट्सॲप किंवा आयव्हीआर द्वारे नियमित संपर्क सक्षम करते.',
      hi: 'कार्यस्थल संतुष्टि और प्रतिधारण का आकलन करने के लिए एसएमएस, व्हाट्सएप या आईवीआर के माध्यम से आवधिक संपर्क सक्षम करता है।',
    },
    legalBasis: 'Informed Consent (DPDP Act 2023)',
    dataAccess: 'Automated Follow-up Engine & Verified Survey Agents',
    isEssential: false,
    defaultGranted: true,
  },
  EMPLOYER_VERIFICATION: {
    id: 'EMPLOYER_VERIFICATION',
    title: {
      en: 'Employer Verification & Tenure Validation',
      mr: 'नियोक्ता पडताळणी आणि कार्यकाळ प्रमाणीकरण',
      hi: 'नियोक्ता सत्यापन और कार्यकाल सत्यापन',
    },
    description: {
      en: 'Allows cross-checking offer letters, payslips, or employment status directly with your employer or EPF records.',
      mr: 'तुमच्या नियोक्त्याशी किंवा ईपीएफ नोंदींशी थेट ऑफर लेटर, वेतन स्लिप किंवा रोजगार स्थिती पडताळण्याची अनुमती देते.',
      hi: 'आपके नियोक्ता या ईपीएफ रिकॉर्ड के साथ सीधे ऑफर लेटर, वेतन पर्ची या रोजगार स्थिति की पुष्टि करने की अनुमति देता है।',
    },
    legalBasis: 'Consent for Third-Party Cross-Verification',
    dataAccess: 'Verified Corporate Hiring Partners & EPF Integrations',
    isEssential: false,
    defaultGranted: true,
  },
  WAGE_ANALYSIS: {
    id: 'WAGE_ANALYSIS',
    title: {
      en: 'Wage Analysis & Minimum Wage Safeguards',
      mr: 'वेतन विश्लेषण आणि किमान वेतन संरक्षण',
      hi: 'वेतन विश्लेषण और न्यूनतम वेतन सुरक्षा उपाय',
    },
    description: {
      en: 'Analyzes compensation to ensure fair wages, gender wage parity, and compliance with statutory minimum wages.',
      mr: 'योग्य वेतन, लिंग वेतन समानता आणि वैधानिक किमान वेतनाचे पालन सुनिश्चित करण्यासाठी मोबदल्याचे विश्लेषण करते.',
      hi: 'उचित वेतन, लिंग वेतन समानता और वैधानिक न्यूनतम वेतन का अनुपालन सुनिश्चित करने के लिए मुआवजे का विश्लेषण करता है।',
    },
    legalBasis: 'Public Interest Skill Evaluation Mandate',
    dataAccess: 'MSSDS Analytics Division (Aggregated & De-identified)',
    isEssential: false,
    defaultGranted: true,
  },
  CAREER_RECOMMENDATIONS: {
    id: 'CAREER_RECOMMENDATIONS',
    title: {
      en: 'AI Career Progression & Up-skilling Paths',
      mr: 'एआय करिअर प्रगती आणि कौशल्यवृद्धी मार्ग',
      hi: 'एआई करियर प्रगति और अप-स्किलिंग पथ',
    },
    description: {
      en: 'Uses your skill masteries and market demand signals to recommend high-wage certifications and blue-ocean roles.',
      mr: 'उच्च-वेतन प्रमाणपत्रे आणि नवीन भूमिकांची शिफारस करण्यासाठी तुमची कौशल्ये आणि बाजारपेठ मागणीचे विश्लेषण करते.',
      hi: 'उच्च-वेतन प्रमाणपत्रों और नई भूमिकाओं की सिफारिश करने के लिए आपके कौशल और बाजार मांग संकेतों का उपयोग करता है।',
    },
    legalBasis: 'Informed Consent for Automated Decision Support',
    dataAccess: 'Nexus-Strategist & Recommendation Engine',
    isEssential: false,
    defaultGranted: true,
  },
  SMS_NOTIFICATIONS: {
    id: 'SMS_NOTIFICATIONS',
    title: {
      en: 'SMS Alerts & Status Updates',
      mr: 'एसएमएस सूचना आणि स्थिती अद्यतने',
      hi: 'एसएमएस अलर्ट और स्थिति अपडेट',
    },
    description: {
      en: 'Receive essential verification codes, interview alerts, and check-in reminders via standard SMS.',
      mr: 'प्रमाणित एसएमएस द्वारे आवश्यक पडताळणी कोड, मुलाखत सूचना आणि स्मरणपत्रे प्राप्त करा.',
      hi: 'मानक एसएमएस के माध्यम से आवश्यक सत्यापन कोड, साक्षात्कार अलर्ट और चेक-इन अनुस्मारक प्राप्त करें।',
    },
    legalBasis: 'Telecommunications & Service Delivery Notice',
    dataAccess: 'Govt DLT Approved SMS Gateway (TRAI Compliant)',
    isEssential: true,
    defaultGranted: true,
  },
  WHATSAPP_NOTIFICATIONS: {
    id: 'WHATSAPP_NOTIFICATIONS',
    title: {
      en: 'WhatsApp Interactive Assistant',
      mr: 'व्हॉट्सॲप परस्परसंवादी सहाय्यक',
      hi: 'व्हाट्सएप संवादात्मक सहायक',
    },
    description: {
      en: 'Enables instant outcome self-reporting, interview prep micro-lessons, and document upload via WhatsApp.',
      mr: 'व्हॉट्सॲप द्वारे त्वरित निष्पत्ती स्व-अहवाल, मुलाखत तयारी आणि कागदपत्रे अपलोड सक्षम करते.',
      hi: 'व्हाट्सएप के माध्यम से त्वरित परिणाम स्व-रिपोर्टिंग, साक्षात्कार तैयारी और दस्तावेज़ अपलोड सक्षम करता है।',
    },
    legalBasis: 'Messaging Channel Opt-in',
    dataAccess: 'Meta WhatsApp Business API Cloud Gateway',
    isEssential: false,
    defaultGranted: false,
  },
  ANONYMIZED_RESEARCH: {
    id: 'ANONYMIZED_RESEARCH',
    title: {
      en: 'De-identified Policy Research & Benchmarking',
      mr: 'निनावी धोरण संशोधन आणि मानकीकरण',
      hi: 'अनामित नीति अनुसंधान और बेंचमार्किंग',
    },
    description: {
      en: 'Aggregates anonymized completion and placement data to improve state vocational education policies.',
      mr: 'राज्य व्यावसायिक शिक्षण धोरणांमध्ये सुधारणा करण्यासाठी निनावी पूर्णता आणि प्लेसमेंट डेटा एकत्र करते.',
      hi: 'राज्य व्यावसायिक शिक्षा नीतियों में सुधार के लिए अनामित पूर्णता और प्लेसमेंट डेटा को एकत्रित करता है।',
    },
    legalBasis: 'DPDP Act 2023 Section 4(2) Anonymized Datasets',
    dataAccess: 'Academic Research Institutions & Govt Policy Cells',
    isEssential: false,
    defaultGranted: true,
  },
  THIRD_PARTY_SHARING: {
    id: 'THIRD_PARTY_SHARING',
    title: {
      en: 'Authorized Partner Registry Sharing',
      mr: 'अधिकृत भागीदार नोंदणी सामायिकरण',
      hi: 'अधिकृत साझेदार रजिस्ट्री साझाकरण',
    },
    description: {
      en: 'Shares your verified achievements with accredited skill councils (NSDC, NCVET) for national portability.',
      mr: 'राष्ट्रीय पोर्टेबिलिटीसाठी मान्यताप्राप्त कौशल्य परिषदांसह तुमची सत्यापित यशोगाथा सामायिक करते.',
      hi: 'राष्ट्रीय पोर्टेबिलिटी के लिए मान्यता प्राप्त कौशल परिषदों के साथ आपकी सत्यापित उपलब्धियों को साझा करता है।',
    },
    legalBasis: 'Explicit Third-Party Data Transfer Consent',
    dataAccess: 'National Skill Development Ecosystem Partners',
    isEssential: false,
    defaultGranted: false,
  },
})

/**
 * Checks whether an identifier is a valid legacy scope or DPDP purpose.
 * @param {string} identifier
 * @returns {boolean}
 */
export function isValidConsentIdentifier(identifier) {
  if (!identifier || typeof identifier !== 'string') return false
  const clean = identifier.trim()
  return ALLOWED_SCOPES.includes(clean) || DPDP_PURPOSES.includes(clean)
}

/**
 * Resolves the most-recent Consent state per scope and DPDP purpose for a given traineeId.
 * Merges legacy ConsentRecord events with new DPDP Consent rows deterministically.
 *
 * @param {string} traineeId
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {Promise<Record<string, { granted: boolean, grantedAt: Date|string, revokedAt: Date|string|null, version: string }>>}
 */
async function fastDbRace(promise, ms = 600) {
  let timer;
  const timeout = new Promise((_, rej) => {
    timer = setTimeout(() => rej(new Error('timeout')), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveCurrentConsent(traineeId, prisma) {
  if (!traineeId) return {}
  const consent = {}

  // 1. Check legacy ConsentRecord table
  try {
    if (prisma && prisma.consentRecord && typeof prisma.consentRecord.findMany === 'function') {
      const rows = await fastDbRace(
        prisma.consentRecord.findMany({
          where: { traineeId },
          orderBy: { createdAt: 'desc' },
        }),
        600
      )

      const seen = new Set()
      for (const row of rows) {
        if (seen.has(row.scope)) continue
        seen.add(row.scope)
        consent[row.scope] = {
          granted: row.granted,
          grantedAt: row.grantedAt,
          revokedAt: row.revokedAt,
          version: row.version,
        }
      }
    }
  } catch (err) {
    // Tolerant query failure
  }

  // 2. Check additive Consent table (DPDP Act 2023)
  try {
    if (prisma && prisma.consent && typeof prisma.consent.findMany === 'function') {
      const dpdpRows = await fastDbRace(
        prisma.consent.findMany({
          where: { traineeId },
        }),
        600
      )

      for (const row of dpdpRows) {
        consent[row.purpose] = {
          granted: row.granted,
          grantedAt: row.grantedAt || row.createdAt,
          revokedAt: row.revokedAt,
          version: row.noticeVersion,
        }
      }
    }
  } catch (err) {
    // Tolerant query failure
  }

  return consent
}
