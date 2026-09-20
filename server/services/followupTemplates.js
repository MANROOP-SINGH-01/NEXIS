/**
 * FILE: server/services/followupTemplates.js
 * PURPOSE: Multilingual message templates and operator assisted-call scripts for
 *          longitudinal follow-up checkpoints (T_0, T_30, T_90, T_180, T_365).
 * LANGUAGES: Marathi (mr), Hindi (hi), English (en)
 * CHANNELS: SMS, WhatsApp Interactive, Assisted Operator Call
 * SPEC: Master Implementation Spec Section 14.3, Section 19.4, and Maharashtra State Innovation Society Guidelines
 */

export const CHECKPOINTS = Object.freeze(['T_0', 'T_30', 'T_90', 'T_180', 'T_365']);
export const SUPPORTED_LANGUAGES = Object.freeze(['mr', 'hi', 'en']);
export const CHANNELS = Object.freeze(['SMS', 'WHATSAPP', 'ASSISTED_CALL', 'EMAIL']);

export const FOLLOWUP_TEMPLATES = Object.freeze({
  T_0: {
    checkpoint: 'T_0',
    title: {
      en: 'Course Completion & Placement Readiness Check',
      mr: 'प्रशिक्षण पूर्णता आणि रोजगार पूर्वतयारी तपासणी',
      hi: 'प्रशिक्षण पूर्णता और प्लेसमेंट तत्परता सत्यापन',
    },
    daysOffset: 0,
    sms: {
      en: 'MSSDS NEXIS: Congratulations on completing your training! Have you joined a job or apprenticeship? Reply 1 for Yes, 2 for Seeking Support. Help: 1800-123-6394',
      mr: 'MSSDS NEXIS: आपले कौशल्य प्रशिक्षण यशस्वीरित्या पूर्ण केल्याबद्दल अभिनंदन! आपण नोकरी किंवा प्रशिक्षण सुरू केले आहे का? होय असल्यास 1, मार्गदर्शनासाठी 2 पाठवा.',
      hi: 'MSSDS NEXIS: अपना कौशल प्रशिक्षण सफलतापूर्वक पूरा करने पर बधाई! क्या आपने नौकरी या अप्रेंटिसशिप शुरू की है? हाँ के लिए 1, सहायता के लिए 2 भेजें।',
    },
    whatsapp: {
      en: {
        header: '🎓 Training Completion Milestone (T+0)',
        body: 'Namaste {{name}}! Congratulations on completing your vocational training with MSSDS. To support your career journey, please let us know your current status:',
        options: [
          { id: 'PLACED', title: '✅ Yes, Joined Job / Apprenticeship' },
          { id: 'SEARCHING', title: '🔍 Actively Seeking Opportunities' },
          { id: 'HIGHER_STUDIES', title: '📚 Enrolled in Higher Education' },
          { id: 'NEED_CALL', title: '📞 Request Counselor Call' },
        ],
        footer: 'Maharashtra State Innovation Society | DPDP Compliant',
      },
      mr: {
        header: '🎓 प्रशिक्षण पूर्णता टप्पा (T+0)',
        body: 'नमस्ते {{name}}! MSSDS सोबत आपले कौशल्य प्रशिक्षण पूर्ण केल्याबद्दल अभिनंदन. आपल्या पुढील वाटचालीसाठी, कृपया आपली सद्यस्थिती निवडा:',
        options: [
          { id: 'PLACED', title: '✅ होय, नोकरी / शिकाऊ उमेदवारी सुरू' },
          { id: 'SEARCHING', title: '🔍 रोजगाराच्या शोधात आहे' },
          { id: 'HIGHER_STUDIES', title: '📚 उच्च शिक्षणासाठी प्रवेश घेतला' },
          { id: 'NEED_CALL', title: '📞 समुपदेशकाचा कॉल हवा आहे' },
        ],
        footer: 'महाराष्ट्र राज्य नाविन्यता सोसायटी | DPDP कायदेशीर अनुपालन',
      },
      hi: {
        header: '🎓 प्रशिक्षण पूर्णता माइलस्टोन (T+0)',
        body: 'नमस्ते {{name}}! MSSDS के साथ अपना कौशल प्रशिक्षण पूरा करने पर बधाई। आपके करियर में सहायता हेतु कृपया अपनी वर्तमान स्थिति चुनें:',
        options: [
          { id: 'PLACED', title: '✅ हाँ, नौकरी / अप्रेंटिसशिप शुरू की' },
          { id: 'SEARCHING', title: '🔍 सक्रिय रूप से नौकरी तलाश रहे हैं' },
          { id: 'HIGHER_STUDIES', title: '📚 उच्च शिक्षा में प्रवेश लिया' },
          { id: 'NEED_CALL', title: '📞 काउंसलर से कॉल का अनुरोध करें' },
        ],
        footer: 'महाराष्ट्र राज्य नवाचार सोसाइटी | DPDP कानून सम्मत',
      },
    },
    assistedCall: {
      en: {
        greeting: 'Hello {{name}}, this is {{operator}} calling from the Department of Skills, Maharashtra (MSSDS NEXIS desk).',
        objective: 'Verifying course completion and immediate placement transition.',
        questions: [
          'Have you secured employment, joined an apprenticeship, or started self-employment?',
          'If placed: What is the company name, role title, and monthly wage band?',
          'If searching: Would you like to be connected with our Nexus-Hunter job matching desk?',
        ],
      },
      mr: {
        greeting: 'नमस्कार {{name}}, मी कौशल्य विकास विभाग, महाराष्ट्र शासन (MSSDS NEXIS कक्ष) कडून {{operator}} बोलत आहे.',
        objective: 'प्रशिक्षण पूर्णता आणि रोजगार स्थितीची नोंद घेणे.',
        questions: [
          'आपण नोकरी, शिकाऊ उमेदवारी किंवा स्वतःचा व्यवसाय सुरू केला आहे का?',
          'नोकरी मिळाली असल्यास: कंपनीचे नाव, पद आणि अंदाजे मासिक वेतन काय आहे?',
          'शोधत असल्यास: आपल्याला मोफत मुलाखत मार्गदर्शन हवे आहे का?',
        ],
      },
      hi: {
        greeting: 'नमस्ते {{name}}, मैं कौशल विकास विभाग, महाराष्ट्र सरकार (MSSDS NEXIS डेस्क) से {{operator}} बात कर रहा हूँ।',
        objective: 'प्रशिक्षण पूर्णता और वर्तमान रोजगार स्थिति की पुष्टि करना।',
        questions: [
          'क्या आपने नौकरी, अप्रेंटिसशिप या स्व-रोजगार शुरू किया है?',
          'यदि हाँ: कंपनी का नाम, पद और मासिक वेतन सीमा क्या है?',
          'यदि तलाश में हैं: क्या आपको रोजगार सहायता और इंटरव्यू तैयारी चाहिए?',
        ],
      },
    },
  },

  T_30: {
    checkpoint: 'T_30',
    title: {
      en: '30-Day Placement & Initial Wage Check',
      mr: '३० दिवस रोजगार स्थिरता आणि वेतन पडताळणी',
      hi: '30 दिन रोजगार स्थिरता और प्रारंभिक वेतन सत्यापन',
    },
    daysOffset: 30,
    sms: {
      en: 'MSSDS NEXIS: Checking in at 30 days. Have you received your first month salary at your job? Reply 1 for Received, 2 for Pending, 3 for Left Job.',
      mr: 'MSSDS NEXIS: ३० दिवसांनंतर तपासणी. आपल्या नोकरीचे पहिले वेतन मिळाले आहे का? मिळाले असल्यास 1, प्रलंबित असल्यास 2, नोकरी सोडली असल्यास 3 पाठवा.',
      hi: 'MSSDS NEXIS: 30 दिन का फॉलो-अप। क्या आपको अपनी नौकरी का पहला वेतन मिल गया है? प्राप्त होने पर 1, बाकी होने पर 2, नौकरी छोड़ने पर 3 भेजें।',
    },
    whatsapp: {
      en: {
        header: '💼 30-Day Milestone Check-in (T+30)',
        body: 'Hello {{name}}, it has been 30 days since your placement. We are checking in to verify your workplace satisfaction and wage receipt:',
        options: [
          { id: 'RETAINED_WAGE_OK', title: '💵 Employed & Wage Received' },
          { id: 'RETAINED_WAGE_PENDING', title: '⏳ Employed & Wage Pending' },
          { id: 'ROLE_MISMATCH', title: '⚠️ Job Role Mismatched' },
          { id: 'LEFT_JOB', title: '❌ Left Job / Need Re-placement' },
        ],
        footer: 'Your responses help improve training programs across Maharashtra.',
      },
      mr: {
        header: '💼 ३० दिवसांचा टप्पा (T+30)',
        body: 'नमस्कार {{name}}, आपण नोकरी सुरू करून ३० दिवस झाले आहेत. कामाचे समाधान आणि वेतन पावतीबद्दल जाणून घेण्यासाठी:',
        options: [
          { id: 'RETAINED_WAGE_OK', title: '💵 नोकरीत आहे आणि वेतन मिळाले' },
          { id: 'RETAINED_WAGE_PENDING', title: '⏳ नोकरीत आहे पण वेतन प्रलंबित' },
          { id: 'ROLE_MISMATCH', title: '⚠️ प्रशिक्षणानुसार काम नाही' },
          { id: 'LEFT_JOB', title: '❌ नोकरी सोडली / नवीन संधी हवी' },
        ],
        footer: 'आपला अभिप्राय महाराष्ट्रातील कौशल्य विकासाचा दर्जा सुधारण्यास मदत करतो.',
      },
      hi: {
        header: '💼 30-दिवसीय माइलस्टोन (T+30)',
        body: 'नमस्ते {{name}}, आपकी नियुक्ति को 30 दिन हो चुके हैं। आपके कार्य अनुभव और वेतन प्राप्ति की पुष्टि के लिए:',
        options: [
          { id: 'RETAINED_WAGE_OK', title: '💵 कार्यरत हैं और वेतन प्राप्त हुआ' },
          { id: 'RETAINED_WAGE_PENDING', title: '⏳ कार्यरत हैं पर वेतन लंबित है' },
          { id: 'ROLE_MISMATCH', title: '⚠️ काम ट्रेड के अनुसार नहीं है' },
          { id: 'LEFT_JOB', title: '❌ नौकरी छोड़ दी / नई सहायता चाहिए' },
        ],
        footer: 'आपकी जानकारी से राज्य के प्रशिक्षण कार्यक्रमों में सुधार होता है।',
      },
    },
    assistedCall: {
      en: {
        greeting: 'Hello {{name}}, this is {{operator}} following up on your 30-day placement milestone with MSSDS.',
        objective: 'Confirm first month tenure, salary receipt, and workplace safety.',
        questions: [
          'Are you continuing in the same role at {{employerName}}?',
          'Did you receive your expected salary on time?',
          'Is the job role directly related to the vocational skills you learned?',
        ],
      },
      mr: {
        greeting: 'नमस्कार {{name}}, मी MSSDS कडून {{operator}} बोलत आहे, आपल्या नोकरीच्या ३० व्या दिवसाच्या आढाव्यासाठी.',
        objective: 'पहिल्या महिन्याचे वेतन आणि कामाच्या ठिकाणच्या परिस्थितीची खात्री करणे.',
        questions: [
          'आपण {{employerName}} मध्ये त्याच पदावर कार्यरत आहात का?',
          'आपल्याला ठरलेले मासिक वेतन वेळेत मिळाले का?',
          'कामाचे स्वरूप आपण शिकलेल्या कौशल्यांशी सुसंगत आहे का?',
        ],
      },
      hi: {
        greeting: 'नमस्ते {{name}}, मैं MSSDS से {{operator}} बात कर रहा हूँ, आपके 30 दिन के रोजगार की स्थिति जानने हेतु।',
        objective: 'पहले महीने के वेतन और कार्यस्थल की सुरक्षा सुनिश्चित करना।',
        questions: [
          'क्या आप {{employerName}} में उसी पद पर कार्य कर रहे हैं?',
          'क्या आपको पहला वेतन समय पर और सही मिला?',
          'क्या यह काम आपके प्रशिक्षण ट्रेड से संबंधित है?',
        ],
      },
    },
  },

  T_90: {
    checkpoint: 'T_90',
    title: {
      en: '90-Day Retention & Statutory Benefits (EPFO/ESIC)',
      mr: '९० दिवस रोजगार सातत्य आणि पीएफ/ईएसआयसी लाभ',
      hi: '90 दिन रोजगार निरंतरता और पीएफ/ईएसआईसी लाभ',
    },
    daysOffset: 90,
    sms: {
      en: 'MSSDS NEXIS: 90-day retention review. Are you continuing in your job with EPF/ESIC benefits? Reply 1 for Yes, 2 for Switched Job, 3 for Assistance.',
      mr: 'MSSDS NEXIS: ९० दिवस रोजगार सातत्य. आपण पीएफ/ईएसआयसी लाभांसह नोकरीत कायम आहात का? होय असल्यास 1, नोकरी बदलली असल्यास 2 पाठवा.',
      hi: 'MSSDS NEXIS: 90 दिन का रोजगार सत्यापन। क्या आप पीएफ/ईएसआईसी लाभों के साथ नौकरी पर बने हुए हैं? हाँ के लिए 1, नौकरी बदली तो 2 भेजें।',
    },
    whatsapp: {
      en: {
        header: '🛡️ 90-Day Retention Milestone (T+90)',
        body: 'Namaste {{name}}! Reaching 90 days in employment marks official statutory retention. Please verify your current status:',
        options: [
          { id: 'RETAINED_BENEFITS_OK', title: '✅ Retained (EPF/ESIC Active)' },
          { id: 'RETAINED_NO_BENEFITS', title: '⚠️ Retained (No EPF/ESIC)' },
          { id: 'SWITCHED_BETTER_JOB', title: '🚀 Switched to Better Job' },
          { id: 'UNEMPLOYED_NEED_HELP', title: '🛑 Left Employment' },
        ],
        footer: 'Statutory milestone reporting under Maharashtra Skills Mission.',
      },
      mr: {
        header: '🛡️ ९० दिवसांचा सातत्य टप्पा (T+90)',
        body: 'नमस्ते {{name}}! नोकरीत ९० दिवस पूर्ण होणे हा अधिकृत शासकीय सातत्य टप्पा आहे. कृपया आपली माहिती नोंदवा:',
        options: [
          { id: 'RETAINED_BENEFITS_OK', title: '✅ नोकरीत कायम (पीएफ/विमा सुरू)' },
          { id: 'RETAINED_NO_BENEFITS', title: '⚠️ नोकरीत कायम (पीएफ नाही)' },
          { id: 'SWITCHED_BETTER_JOB', title: '🚀 चांगल्या नोकरीत गेलो' },
          { id: 'UNEMPLOYED_NEED_HELP', title: '🛑 काम थांबवले / मदत हवी' },
        ],
        footer: 'महाराष्ट्र कौशल्य विकास अभियान अंतर्गत अधिकृत पडताळणी.',
      },
      hi: {
        header: '🛡️ 90-दिवसीय निरंतरता माइलस्टोन (T+90)',
        body: 'नमस्ते {{name}}! रोजगार में 90 दिन पूरे होना एक महत्वपूर्ण उपलब्धि है। कृपया अपनी वर्तमान स्थिति बताएं:',
        options: [
          { id: 'RETAINED_BENEFITS_OK', title: '✅ कार्यरत (पीएफ/ईएसआईसी सक्रिय)' },
          { id: 'RETAINED_NO_BENEFITS', title: '⚠️ कार्यरत (पीएफ नहीं मिल रहा)' },
          { id: 'SWITCHED_BETTER_JOB', title: '🚀 बेहतर अवसर पर स्विच किया' },
          { id: 'UNEMPLOYED_NEED_HELP', title: '🛑 नौकरी छूट गई / सहायता चाहिए' },
        ],
        footer: 'महाराष्ट्र कौशल मिशन के अंतर्गत आधिकारिक सत्यापन।',
      },
    },
    assistedCall: {
      en: {
        greeting: 'Hello {{name}}, this is {{operator}} from MSSDS NEXIS for your 90-day employment review.',
        objective: 'Statutory retention audit, probation completion, and social security benefit verification.',
        questions: [
          'Have you completed your probation period at {{employerName}}?',
          'Has your employer activated your EPFO UAN and ESIC card?',
          'What is your current monthly take-home salary?',
        ],
      },
      mr: {
        greeting: 'नमस्कार {{name}}, मी MSSDS NEXIS कडून {{operator}} बोलत आहे, आपल्या ९० दिवसांच्या रोजगार पडताळणीसाठी.',
        objective: 'शासकीय रोजगार सातत्य आणि पीएफ/विमा लाभांची तपासणी करणे.',
        questions: [
          'आपला प्रोबेशन काळ यशस्वीरीत्या पूर्ण झाला आहे का?',
          'आपला पीएफ (EPFO UAN) आणि ईएसआयसी विमा क्रमांक सुरू झाला आहे का?',
          'सध्या आपले मासिक वेतन किती आहे?',
        ],
      },
      hi: {
        greeting: 'नमस्ते {{name}}, मैं MSSDS NEXIS से {{operator}} बात कर रहा हूँ, आपके 90-दिवसीय रोजगार ऑडिट हेतु।',
        objective: 'प्रोबेशन पूरा होने और पीएफ/ईएसआईसी सामाजिक सुरक्षा लाभों की पुष्टि।',
        questions: [
          'क्या आपका प्रोबेशन पीरियड सफलतापूर्वक पूरा हुआ?',
          'क्या कंपनी द्वारा पीएफ (UAN) और ईएसआईसी शुरू किया गया है?',
          'वर्तमान में आपका मासिक वेतन कितना है?',
        ],
      },
    },
  },

  T_180: {
    checkpoint: 'T_180',
    title: {
      en: '180-Day Career Stability & Wage Progression',
      mr: '१८० दिवस कारकीर्द स्थिरता आणि वेतन वाढ',
      hi: '180 दिन करियर स्थिरता और वेतन वृद्धि',
    },
    daysOffset: 180,
    sms: {
      en: 'MSSDS NEXIS: 6-month career check! Have you received a salary increment or promotion? Reply 1 for Yes, 2 for Same Wage, 3 for Looking to Switch.',
      mr: 'MSSDS NEXIS: ६ महिन्यांचा कारकीर्द आढावा! आपल्याला वेतनवाढ किंवा बढती मिळाली आहे का? होय असल्यास 1, समान वेतनासाठी 2 पाठवा.',
      hi: 'MSSDS NEXIS: 6 महीने का करियर रिव्यू! क्या आपको वेतन वृद्धि या पदोन्नति मिली है? हाँ के लिए 1, समान वेतन के लिए 2 भेजें।',
    },
    whatsapp: {
      en: {
        header: '📈 6-Month Career Growth Check-in (T+180)',
        body: 'Congratulations {{name}} on completing 6 months of professional work! Please let us know how your career is progressing:',
        options: [
          { id: 'PROMOTED_OR_HIKE', title: '🎉 Promoted / Wage Increment' },
          { id: 'STABLE_CURRENT_WAGE', title: '💼 Continuing at Current Wage' },
          { id: 'WANT_ADVANCED_COURSE', title: '📖 Want Advanced Upskilling' },
          { id: 'SEEKING_NEW_ROLE', title: '🔍 Seeking Higher-Paying Role' },
        ],
        footer: 'Longitudinal career tracking supported by Maharashtra State Innovation Society.',
      },
      mr: {
        header: '📈 ६ महिन्यांचा प्रगती आढावा (T+180)',
        body: 'अभिनंदन {{name}}, आपण नोकरीत ६ महिने पूर्ण केले आहेत! आपल्या प्रगतीबद्दल माहिती द्या:',
        options: [
          { id: 'PROMOTED_OR_HIKE', title: '🎉 बढती किंवा वेतनवाढ मिळाली' },
          { id: 'STABLE_CURRENT_WAGE', title: '💼 चालू वेतनावर कार्यरत आहे' },
          { id: 'WANT_ADVANCED_COURSE', title: '📖 प्रगत कौशल्य शिकायचे आहे' },
          { id: 'SEEKING_NEW_ROLE', title: '🔍 चांगल्या पगाराची नोकरी हवी' },
        ],
        footer: 'महाराष्ट्र राज्य नाविन्यता सोसायटी द्वारे कारकीर्द मार्गक्रमण.',
      },
      hi: {
        header: '📈 6 महीने का प्रगति रिव्यू (T+180)',
        body: 'बधाई {{name}}, आपने 6 महीने का सफल कार्यकाल पूरा किया! कृपया अपनी प्रगति साझा करें:',
        options: [
          { id: 'PROMOTED_OR_HIKE', title: '🎉 पदोन्नति या वेतन वृद्धि मिली' },
          { id: 'STABLE_CURRENT_WAGE', title: '💼 वर्तमान वेतन पर कार्यरत' },
          { id: 'WANT_ADVANCED_COURSE', title: '📖 एडवांस्ड स्किल कोर्स करना है' },
          { id: 'SEEKING_NEW_ROLE', title: '🔍 अधिक वेतन वाले पद की तलाश' },
        ],
        footer: 'महाराष्ट्र राज्य नवाचार सोसाइटी द्वारा करियर ट्रैकिंग।',
      },
    },
    assistedCall: {
      en: {
        greeting: 'Hello {{name}}, this is {{operator}} from MSSDS checking in on your 6-month career progression.',
        objective: 'Longitudinal wage growth tracking and upskilling recommendation.',
        questions: [
          'Has your monthly wage increased since your initial placement?',
          'Have your job responsibilities expanded or have you received a promotion?',
          'Are there any advanced technical skills you would like to acquire?',
        ],
      },
      mr: {
        greeting: 'नमस्कार {{name}}, मी MSSDS कडून {{operator}} बोलत आहे, आपल्या ६ महिन्यांच्या कारकीर्द प्रगती आढाव्यासाठी.',
        objective: 'वेतनवाढ आणि पुढील कौशल्य प्रशिक्षणासाठी मार्गदर्शन.',
        questions: [
          'सुरुवातीच्या तुलनेत आपल्या मासिक वेतनात वाढ झाली आहे का?',
          'कामात नवीन जबाबदाऱ्या किंवा बढती मिळाली आहे का?',
          'आपल्याला कोणतेही प्रगत कौशल्य मोफत शिकायला आवडेल का?',
        ],
      },
      hi: {
        greeting: 'नमस्ते {{name}}, मैं MSSDS से {{operator}} बात कर रहा हूँ, आपके 6 महीने के कार्य अनुभव के संबंध में।',
        objective: 'वेतन वृद्धि और उन्नत कौशल परामर्श।',
        questions: [
          'क्या शुरुआती वेतन की तुलना में आपके वेतन में बढ़ोतरी हुई है?',
          'क्या आपको पदोन्नति या नई जिम्मेदारियां मिली हैं?',
          'क्या आप कोई उन्नत तकनीकी कौशल सीखना चाहते हैं?',
        ],
      },
    },
  },

  T_365: {
    checkpoint: 'T_365',
    title: {
      en: '365-Day 1-Year Career Stabilization & Impact Audit',
      mr: '३६५ दिवस १ वर्ष कारकीर्द स्थैर्य आणि प्रभाव लेखापरीक्षण',
      hi: '365 दिन 1 वर्ष करियर स्थायित्व एवं प्रभाव मूल्यांकन',
    },
    daysOffset: 365,
    sms: {
      en: 'MSSDS NEXIS: 1-Year Milestone! You have achieved 1 year of formal career tenure. Reply 1 if Employed, 2 if Entrepreneur/Self-Employed, 3 to share feedback.',
      mr: 'MSSDS NEXIS: १ वर्षाचा सुवर्ण टप्पा! आपण १ वर्ष यशस्वीपणे पूर्ण केले आहे. नोकरीत असल्यास 1, स्वतःचा व्यवसाय असल्यास 2 पाठवा.',
      hi: 'MSSDS NEXIS: 1 वर्ष का स्वर्णिम माइलस्टोन! आपने 1 वर्ष का सफल कार्यकाल पूरा किया। कार्यरत होने पर 1, स्व-रोजगार होने पर 2 भेजें।',
    },
    whatsapp: {
      en: {
        header: '🏆 1-Year Longitudinal Milestone (T+365)',
        body: 'Congratulations {{name}}! Completing one full year in the workforce is a tremendous achievement for you and MSSDS. Please record your 1-year status:',
        options: [
          { id: 'EMPLOYED_ESTABLISHED', title: '💼 Formally Employed & Established' },
          { id: 'ENTREPRENEUR', title: '🚀 Running Own Business / Self-Employed' },
          { id: 'HIGHER_STUDIES_OR_OTHER', title: '🎓 Pursuing Higher Studies' },
          { id: 'ALUMNI_MENTOR', title: '🤝 Ready to Mentor New Trainees' },
        ],
        footer: 'NCVET & MSSDS Longitudinal Vocational Impact Registry.',
      },
      mr: {
        header: '🏆 १ वर्षाचा ऐतिहासिक टप्पा (T+365)',
        body: 'हार्दिक अभिनंदन {{name}}! कार्यक्षेत्रात १ वर्ष यशस्वीरीत्या पूर्ण करणे ही अभिमानास्पद बाब आहे. कृपया आपली सद्यस्थिती नोंदवा:',
        options: [
          { id: 'EMPLOYED_ESTABLISHED', title: '💼 नोकरीत पूर्णपणे स्थिर' },
          { id: 'ENTREPRENEUR', title: '🚀 स्वतःचा व्यवसाय / उद्योग सुरू' },
          { id: 'HIGHER_STUDIES_OR_OTHER', title: '🎓 उच्च शिक्षण सुरू' },
          { id: 'ALUMNI_MENTOR', title: '🤝 नवीन विद्यार्थ्यांना मार्गदर्शन करण्यास तयार' },
        ],
        footer: 'NCVET आणि MSSDS अधिकृत व्यावसायिक प्रभाव नोंदणी.',
      },
      hi: {
        header: '🏆 1 वर्ष का ऐतिहासिक माइलस्टोन (T+365)',
        body: 'हार्दिक बधाई {{name}}! कार्यक्षेत्र में 1 वर्ष का कार्यकाल पूर्ण करना अत्यंत सराहनीय उपलब्धि है। कृपया अपनी स्थिति साझा करें:',
        options: [
          { id: 'EMPLOYED_ESTABLISHED', title: '💼 औपचारिक रोजगार में पूरी तरह स्थिर' },
          { id: 'ENTREPRENEUR', title: '🚀 अपना व्यवसाय / स्व-रोजगार चला रहे हैं' },
          { id: 'HIGHER_STUDIES_OR_OTHER', title: '🎓 उच्च अध्ययन जारी है' },
          { id: 'ALUMNI_MENTOR', title: '🤝 नए छात्रों को मेंटर करने के लिए तैयार' },
        ],
        footer: 'NCVET और MSSDS आधिकारिक व्यावसायिक प्रभाव रजिस्ट्री।',
      },
    },
    assistedCall: {
      en: {
        greeting: 'Hello {{name}}, this is {{operator}} from MSSDS celebrating your 1-year career completion milestone!',
        objective: 'Formal 1-year longitudinal impact study and state alumni network registration.',
        questions: [
          'What is your overall feedback on the vocational training and job placement support?',
          'What is your current monthly salary compared to when you started 12 months ago?',
          'Would you like to register as a mentor for newly graduated trainees in your home district?',
        ],
      },
      mr: {
        greeting: 'नमस्कार {{name}}, मी MSSDS कडून {{operator}} बोलत आहे, आपल्या १ वर्षाच्या यशस्वी कारकीर्दीच्या अभिनंदनासाठी!',
        objective: 'शासकीय १ वर्ष प्रभाव अभ्यास आणि माजी विद्यार्थी (Alumni) नेटवर्क नोंदणी.',
        questions: [
          'प्रशिक्षणाचा आपल्या जीवनावर काय सकारात्मक परिणाम झाला आहे?',
          '१२ महिन्यांपूर्वीच्या सुरुवातीच्या पगाराच्या तुलनेत आज आपले वेतन किती आहे?',
          'आपल्या जिल्ह्यातील नवीन विद्यार्थ्यांना मार्गदर्शन करायला आपल्याला आवडेल का?',
        ],
      },
      hi: {
        greeting: 'नमस्ते {{name}}, मैं MSSDS से {{operator}} बात कर रहा हूँ, आपके 1 वर्ष के सफल करियर की बधाई हेतु!',
        objective: '1-वर्षीय प्रभाव अध्ययन और राज्य एलुमनाई नेटवर्क में पंजीकरण।',
        questions: [
          'प्रशिक्षण और रोजगार सहायता पर आपका समग्र अनुभव कैसा रहा?',
          '12 महीने पहले के शुरुआती वेतन की तुलना में आज आपका वेतन कितना है?',
          'क्या आप अपने जिले के नए प्रशिक्षुओं का मार्गदर्शन करना चाहेंगे?',
        ],
      },
    },
  },
});

/**
 * Renders a localized message with variable interpolation.
 * @param {string} checkpoint - e.g. 'T_0', 'T_30', 'T_90', 'T_180', 'T_365'
 * @param {string} channel - 'SMS' | 'WHATSAPP' | 'ASSISTED_CALL'
 * @param {string} language - 'mr' | 'hi' | 'en'
 * @param {Object} variables - { name, operator, employerName, ... }
 * @returns {Object|string}
 */
export function renderTemplate(checkpoint, channel, language = 'en', variables = {}) {
  const tpl = FOLLOWUP_TEMPLATES[checkpoint];
  if (!tpl) {
    throw new Error(`Unknown checkpoint: "${checkpoint}". Valid checkpoints: ${CHECKPOINTS.join(', ')}`);
  }

  const lang = SUPPORTED_LANGUAGES.includes(language) ? language : 'en';
  const name = variables.name || 'Candidate';
  const operator = variables.operator || 'MSSDS Officer';
  const employerName = variables.employerName || 'your employer';

  if (channel === 'SMS') {
    let raw = tpl.sms[lang] || tpl.sms.en;
    return raw.replace(/\{\{name\}\}/g, name).replace(/\{\{operator\}\}/g, operator);
  }

  if (channel === 'WHATSAPP') {
    const raw = tpl.whatsapp[lang] || tpl.whatsapp.en;
    return {
      header: raw.header,
      body: raw.body.replace(/\{\{name\}\}/g, name),
      options: raw.options,
      footer: raw.footer,
    };
  }

  if (channel === 'ASSISTED_CALL') {
    const raw = tpl.assistedCall[lang] || tpl.assistedCall.en;
    return {
      greeting: raw.greeting.replace(/\{\{name\}\}/g, name).replace(/\{\{operator\}\}/g, operator),
      objective: raw.objective,
      questions: raw.questions.map((q) =>
        q.replace(/\{\{name\}\}/g, name).replace(/\{\{employerName\}\}/g, employerName)
      ),
    };
  }

  throw new Error(`Unsupported channel: "${channel}". Must be SMS, WHATSAPP, or ASSISTED_CALL`);
}
