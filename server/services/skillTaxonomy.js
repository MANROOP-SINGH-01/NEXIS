/**
 * FILE: server/services/skillTaxonomy.js
 * PURPOSE: Permitted Skill & Occupation Taxonomy with NSQF Alignment,
 *          ESCO Crosswalk References, and Multilingual (EN/MR/HI) Metadata.
 * SPEC: Master Implementation Spec Section 13.4, 17.5, and Phase 6 (Defect #3 Fix).
 */

export const SKILL_CATEGORIES = {
  TECHNICAL: 'Technical',
  SOFT: 'Soft',
  TOOL: 'Tool',
  DOMAIN: 'Domain',
};

export const NSQF_LEVELS = {
  FOUNDATIONAL: 3,
  INTERMEDIATE: 4,
  ADVANCED: 5,
  SPECIALIZED: 6,
  LEADERSHIP: 7,
};

/**
 * Standard Skill Catalog with NSQF, ESCO Crosswalk, and Multilingual Labels
 */
export const TAXONOMY_SKILLS = [
  // ── Software & Web Engineering (NSQF Level 5-6 / QP: SSC/Q0501, SSC/Q0503) ──
  {
    id: 'skl_react',
    name: 'React.js',
    aliases: ['React', 'ReactJS', 'React Native'],
    category: SKILL_CATEGORIES.TECHNICAL,
    nsqfLevel: 5,
    qualificationPack: 'SSC/Q0503',
    escoCrosswalkId: 'http://data.europa.eu/esco/skill/e322306f-6f91-4c42-b062-817887e0b5f1',
    marathiLabel: 'रिएक्ट.जेएस वेब विकास',
    hindiLabel: 'रिएक्ट.जेएस वेब डेवलपमेंट',
    description: 'Component-based frontend library for building modern dynamic web interfaces.',
  },
  {
    id: 'skl_typescript',
    name: 'TypeScript',
    aliases: ['TS', 'TypeScript 5', 'Typed JavaScript'],
    category: SKILL_CATEGORIES.TECHNICAL,
    nsqfLevel: 5,
    qualificationPack: 'SSC/Q0501',
    escoCrosswalkId: 'http://data.europa.eu/esco/skill/446261c4-d130-4e3e-bfa1-d4ea96384fa6',
    marathiLabel: 'टाइपस्क्रिप्ट प्रोग्रामिंग',
    hindiLabel: 'टाइपस्क्रिप्ट प्रोग्रामिंग',
    description: 'Strongly typed programming language that builds on JavaScript.',
  },
  {
    id: 'skl_nodejs',
    name: 'Node.js',
    aliases: ['Node', 'NodeJS', 'Express.js', 'ExpressJS', 'Server-side JavaScript'],
    category: SKILL_CATEGORIES.TECHNICAL,
    nsqfLevel: 5,
    qualificationPack: 'SSC/Q0501',
    escoCrosswalkId: 'http://data.europa.eu/esco/skill/7dc62758-20cf-46d5-a33d-71b56ce85c3c',
    marathiLabel: 'नोड.जेएस बॅकएंड विकास',
    hindiLabel: 'नोड.जेएस बैकएंड डेवलपमेंट',
    description: 'Asynchronous event-driven JavaScript runtime environment for backend services.',
  },
  {
    id: 'skl_postgresql',
    name: 'PostgreSQL',
    aliases: ['Postgres', 'Postgres DB', 'SQL', 'Relational Database', 'RDBMS'],
    category: SKILL_CATEGORIES.TECHNICAL,
    nsqfLevel: 5,
    qualificationPack: 'SSC/Q0501',
    escoCrosswalkId: 'http://data.europa.eu/esco/skill/db479428-ec2b-4565-a834-8c8f4955bca7',
    marathiLabel: 'पोस्टग्रेसक्यूएल डेटाबेस व्यवस्थापन',
    hindiLabel: 'पोस्टग्रेएसक्यूएल डेटाबेस प्रबंधन',
    description: 'Advanced open-source object-relational database system.',
  },
  {
    id: 'skl_python',
    name: 'Python',
    aliases: ['Python 3', 'Python Programming', 'PySpark'],
    category: SKILL_CATEGORIES.TECHNICAL,
    nsqfLevel: 5,
    qualificationPack: 'SSC/Q0702',
    escoCrosswalkId: 'http://data.europa.eu/esco/skill/9c67b93a-867c-4731-8ca6-1fb9c9586144',
    marathiLabel: 'पायथन प्रोग्रॅमिंग',
    hindiLabel: 'पायथन प्रोग्रामिंग',
    description: 'High-level general-purpose programming language for backend, automation, and AI.',
  },
  {
    id: 'skl_docker_k8s',
    name: 'Docker & Kubernetes',
    aliases: ['Docker', 'Kubernetes', 'K8s', 'Containerization', 'Container Orchestration'],
    category: SKILL_CATEGORIES.TOOL,
    nsqfLevel: 6,
    qualificationPack: 'SSC/Q0901',
    escoCrosswalkId: 'http://data.europa.eu/esco/skill/c4e75871-ae62-43ce-94f7-bf7f94bb2e81',
    marathiLabel: 'डॉकर आणि कुबरनेट्स कंटेनर व्यवस्थापन',
    hindiLabel: 'डॉकर और कुबेरनेट्स कंटेनर प्रबंधन',
    description: 'Platform for developing, shipping, and orchestrating containerized microservices.',
  },
  {
    id: 'skl_git',
    name: 'Git & Version Control',
    aliases: ['Git', 'GitHub', 'GitLab', 'Version Control'],
    category: SKILL_CATEGORIES.TOOL,
    nsqfLevel: 4,
    qualificationPack: 'SSC/Q0501',
    escoCrosswalkId: 'http://data.europa.eu/esco/skill/7cf347a5-d85c-4eb2-a63e-db26dfda2e03',
    marathiLabel: 'गिट आवृत्ती नियंत्रण',
    hindiLabel: 'गिट वर्जन कंट्रोल',
    description: 'Distributed version control system for tracking changes in source code.',
  },
  {
    id: 'skl_rest_api',
    name: 'RESTful API Design',
    aliases: ['REST APIs', 'RESTful Services', 'API Integration', 'GraphQL'],
    category: SKILL_CATEGORIES.TECHNICAL,
    nsqfLevel: 5,
    qualificationPack: 'SSC/Q0501',
    escoCrosswalkId: 'http://data.europa.eu/esco/skill/29e1eb1c-6d8b-491b-b27b-58d04269e8fa',
    marathiLabel: 'रेस्टफुल एपीआय रचना आणि जोडणी',
    hindiLabel: 'रेस्टफुल एपीआई डिजाइन और एकीकरण',
    description: 'Designing, securing, and integrating stateless web service interfaces.',
  },
  {
    id: 'skl_cloud_aws',
    name: 'Cloud Infrastructure (AWS/GCP/Azure)',
    aliases: ['AWS', 'Amazon Web Services', 'GCP', 'Google Cloud', 'Azure', 'Cloud Computing'],
    category: SKILL_CATEGORIES.TECHNICAL,
    nsqfLevel: 6,
    qualificationPack: 'SSC/Q0901',
    escoCrosswalkId: 'http://data.europa.eu/esco/skill/70b04c86-13cb-4655-9b2d-1fc057c3e536',
    marathiLabel: 'क्लाउड पायाभूत सुविधा व्यवस्थापन',
    hindiLabel: 'क्लाउड इंफ्रास्ट्रक्चर प्रबंधन',
    description: 'Deploying, managing, and scaling serverless and VM infrastructure on cloud providers.',
  },
  {
    id: 'skl_ci_cd',
    name: 'CI/CD Automation Pipelines',
    aliases: ['CI/CD', 'Continuous Integration', 'GitHub Actions', 'Jenkins'],
    category: SKILL_CATEGORIES.TOOL,
    nsqfLevel: 5,
    qualificationPack: 'SSC/Q0901',
    escoCrosswalkId: 'http://data.europa.eu/esco/skill/96431980-60b6-4fa2-bfba-cfec6ff3c178',
    marathiLabel: 'स्वयंचलित सीआय/सीडी पाइपलाइन',
    hindiLabel: 'स्वचालित सीआई/सीडी पाइपलाइन',
    description: 'Automated build, test, and release deployment pipelines.',
  },

  // ── Vocational & Maharashtra Sector Skills (NSQF Level 3-5) ──
  {
    id: 'skl_solar_pv',
    name: 'Solar PV System Installation',
    aliases: ['Solar PV', 'Solar Rooftop', 'Solar Panel Installation', 'Inverter Wiring'],
    category: SKILL_CATEGORIES.TECHNICAL,
    nsqfLevel: 4,
    qualificationPack: 'ELE/Q0101',
    escoCrosswalkId: 'http://data.europa.eu/esco/skill/4fd5e971-d8ec-4581-80a5-f8670bf69947',
    marathiLabel: 'सौर ऊर्जा पीव्ही प्रणाली स्थापना',
    hindiLabel: 'सौर पीवी प्रणाली स्थापना एवं रखरखाव',
    description: 'Mounting, DC wiring, inverter configuration, and testing for solar electrical systems.',
  },
  {
    id: 'skl_electrical_wiring',
    name: 'Industrial Electrical Wiring & Safety',
    aliases: ['Electrical Wiring', 'Single Phase Wiring', 'Three Phase Wiring', 'LT Switchgear'],
    category: SKILL_CATEGORIES.TECHNICAL,
    nsqfLevel: 4,
    qualificationPack: 'ELE/Q0101',
    escoCrosswalkId: 'http://data.europa.eu/esco/skill/6ff66100-c91f-4f81-a6c6-946bf8b2a8d3',
    marathiLabel: 'औद्योगिक विद्युत वायरिंग आणि सुरक्षा',
    hindiLabel: 'औद्योगिक विद्युत वायरिंग और सुरक्षा',
    description: 'Installation of power distribution, protective relays, switchgears, and earthing.',
  },
  {
    id: 'skl_cnc_programming',
    name: 'CNC Machine Programming & Operation',
    aliases: ['CNC', 'CNC Milling', 'CNC Lathe', 'G-Code', 'M-Code'],
    category: SKILL_CATEGORIES.TECHNICAL,
    nsqfLevel: 4,
    qualificationPack: 'AUR/Q0102',
    escoCrosswalkId: 'http://data.europa.eu/esco/skill/3e0cbca9-f01d-4078-953a-c80f4f9f7a93',
    marathiLabel: 'सीएनसी मशीन प्रोग्रामिंग आणि ऑपरेशन्स',
    hindiLabel: 'सीएनसी मशीन प्रोग्रामिंग और संचालन',
    description: 'Precision machining workpiece programming, tooling setup, and dimensional inspection.',
  },
  {
    id: 'skl_quality_inspection',
    name: 'Quality Assurance & Precision Measurement',
    aliases: ['Quality Inspection', 'Vernier Caliper', 'Micrometer', 'Geometric Tolerancing'],
    category: SKILL_CATEGORIES.TECHNICAL,
    nsqfLevel: 4,
    qualificationPack: 'AUR/Q0102',
    escoCrosswalkId: 'http://data.europa.eu/esco/skill/1cbe1c34-eb17-48f8-b391-7f81f1bcf55b',
    marathiLabel: 'गुणवत्ता तपासणी आणि अचूक मापन',
    hindiLabel: 'गुणवत्ता आश्वासन और परिशुद्धता माप',
    description: 'Inspection of engineered components against engineering drawings and ISO tolerances.',
  },

  // ── Foundational Soft & Professional Competencies ──
  {
    id: 'skl_problem_solving',
    name: 'Analytical Problem Solving',
    aliases: ['Problem Solving', 'Debugging', 'Root Cause Analysis', 'Troubleshooting'],
    category: SKILL_CATEGORIES.SOFT,
    nsqfLevel: 4,
    qualificationPack: 'SSC/Q0501',
    escoCrosswalkId: 'http://data.europa.eu/esco/skill/6bfd08b3-3a13-4d40-84c4-79fa2981ce81',
    marathiLabel: 'विश्लेषणात्मक समस्या निवारण',
    hindiLabel: 'विश्लेषणात्मक समस्या समाधान',
    description: 'Systematic diagnosis and resolution of engineering and operational defects.',
  },
  {
    id: 'skl_agile_scrum',
    name: 'Agile & Collaborative Workflows',
    aliases: ['Agile', 'Scrum', 'Sprint Planning', 'Cross-functional Collaboration'],
    category: SKILL_CATEGORIES.SOFT,
    nsqfLevel: 4,
    qualificationPack: 'SSC/Q0501',
    escoCrosswalkId: 'http://data.europa.eu/esco/skill/ea4c5a08-251f-4efc-8e8f-7c0a969e2c60',
    marathiLabel: 'अजाइल पद्धती आणि सांघिक कार्य',
    hindiLabel: 'एजाइल कार्यप्रणाली और टीम सहयोग',
    description: 'Iterative delivery, peer code reviews, and structured sprint rituals.',
  },
];

/**
 * Standard Target Occupations mapped to NSQF and required skills
 */
export const TARGET_OCCUPATIONS = [
  {
    id: 'occ_fullstack_dev',
    code: 'SSC/Q0503',
    onetCode: '15-1254.00',
    title: 'Web & Full Stack Developer',
    marathiTitle: 'वेब आणि फुल स्टॅक डेव्हलपर',
    hindiTitle: 'वेब एवं फुल स्टैक डेवलपर',
    family: 'Information Technology & Software',
    nsqfLevel: 5,
    requiredSkills: [
      { skillId: 'skl_react', requiredLevel: 'ADVANCED', importance: 0.95, isMandatory: true },
      { skillId: 'skl_typescript', requiredLevel: 'INTERMEDIATE', importance: 0.90, isMandatory: true },
      { skillId: 'skl_nodejs', requiredLevel: 'ADVANCED', importance: 0.90, isMandatory: true },
      { skillId: 'skl_postgresql', requiredLevel: 'INTERMEDIATE', importance: 0.85, isMandatory: true },
      { skillId: 'skl_rest_api', requiredLevel: 'ADVANCED', importance: 0.85, isMandatory: true },
      { skillId: 'skl_git', requiredLevel: 'INTERMEDIATE', importance: 0.80, isMandatory: true },
      { skillId: 'skl_docker_k8s', requiredLevel: 'BASIC', importance: 0.70, isMandatory: false },
      { skillId: 'skl_agile_scrum', requiredLevel: 'INTERMEDIATE', importance: 0.65, isMandatory: false },
    ],
  },
  {
    id: 'occ_software_eng',
    code: 'SSC/Q0501',
    onetCode: '15-1252.00',
    title: 'Software Developer & Backend Engineer',
    marathiTitle: 'सॉफ्टवेअर डेव्हलपर आणि बॅकएंड अभियंता',
    hindiTitle: 'सॉफ्टवेयर डेवलपर एवं बैकएंड इंजीनियर',
    family: 'Information Technology & Software',
    nsqfLevel: 5,
    requiredSkills: [
      { skillId: 'skl_typescript', requiredLevel: 'ADVANCED', importance: 0.95, isMandatory: true },
      { skillId: 'skl_nodejs', requiredLevel: 'ADVANCED', importance: 0.90, isMandatory: true },
      { skillId: 'skl_postgresql', requiredLevel: 'ADVANCED', importance: 0.90, isMandatory: true },
      { skillId: 'skl_rest_api', requiredLevel: 'ADVANCED', importance: 0.85, isMandatory: true },
      { skillId: 'skl_git', requiredLevel: 'INTERMEDIATE', importance: 0.85, isMandatory: true },
      { skillId: 'skl_problem_solving', requiredLevel: 'ADVANCED', importance: 0.85, isMandatory: true },
      { skillId: 'skl_cloud_aws', requiredLevel: 'INTERMEDIATE', importance: 0.75, isMandatory: false },
      { skillId: 'skl_docker_k8s', requiredLevel: 'INTERMEDIATE', importance: 0.75, isMandatory: false },
    ],
  },
  {
    id: 'occ_cloud_devops',
    code: 'SSC/Q0901',
    onetCode: '15-1251.00',
    title: 'Cloud Infrastructure & DevOps Engineer',
    marathiTitle: 'क्लाउड इन्फ्रास्ट्रक्चर आणि डेव्हऑप्स अभियंता',
    hindiTitle: 'क्लाउड इंफ्रास्ट्रक्चर और डेवऑप्स इंजीनियर',
    family: 'Information Technology & Infrastructure',
    nsqfLevel: 6,
    requiredSkills: [
      { skillId: 'skl_docker_k8s', requiredLevel: 'ADVANCED', importance: 0.95, isMandatory: true },
      { skillId: 'skl_cloud_aws', requiredLevel: 'ADVANCED', importance: 0.95, isMandatory: true },
      { skillId: 'skl_ci_cd', requiredLevel: 'ADVANCED', importance: 0.90, isMandatory: true },
      { skillId: 'skl_git', requiredLevel: 'ADVANCED', importance: 0.85, isMandatory: true },
      { skillId: 'skl_python', requiredLevel: 'INTERMEDIATE', importance: 0.80, isMandatory: true },
      { skillId: 'skl_postgresql', requiredLevel: 'INTERMEDIATE', importance: 0.75, isMandatory: false },
      { skillId: 'skl_problem_solving', requiredLevel: 'ADVANCED', importance: 0.85, isMandatory: true },
    ],
  },
  {
    id: 'occ_solar_technician',
    code: 'ELE/Q0101',
    onetCode: '47-2231.00',
    title: 'Solar PV Installation & Maintenance Technician',
    marathiTitle: 'सौर ऊर्जा पीव्ही तंत्रज्ञ',
    hindiTitle: 'सोलर पीवी तकनीशियन',
    family: 'Green Energy & Electronics',
    nsqfLevel: 4,
    requiredSkills: [
      { skillId: 'skl_solar_pv', requiredLevel: 'ADVANCED', importance: 0.95, isMandatory: true },
      { skillId: 'skl_electrical_wiring', requiredLevel: 'ADVANCED', importance: 0.95, isMandatory: true },
      { skillId: 'skl_quality_inspection', requiredLevel: 'INTERMEDIATE', importance: 0.85, isMandatory: true },
      { skillId: 'skl_problem_solving', requiredLevel: 'INTERMEDIATE', importance: 0.80, isMandatory: true },
    ],
  },
  {
    id: 'occ_cnc_machinist',
    code: 'AUR/Q0102',
    onetCode: '51-4041.00',
    title: 'CNC Machinist & Precision Manufacturing Operator',
    marathiTitle: 'सीएनसी मशीनिस्ट आणि उत्पादन ऑपरेटर',
    hindiTitle: 'सीएनसी मशीनिस्ट ऑपरेटर',
    family: 'Automotive & Precision Manufacturing',
    nsqfLevel: 4,
    requiredSkills: [
      { skillId: 'skl_cnc_programming', requiredLevel: 'ADVANCED', importance: 0.95, isMandatory: true },
      { skillId: 'skl_quality_inspection', requiredLevel: 'ADVANCED', importance: 0.90, isMandatory: true },
      { skillId: 'skl_problem_solving', requiredLevel: 'INTERMEDIATE', importance: 0.80, isMandatory: true },
    ],
  },
];

// Helper maps for O(1) lookups
const skillMap = new Map(TAXONOMY_SKILLS.map((s) => [s.id, s]));
const occupationMap = new Map(TARGET_OCCUPATIONS.map((o) => [o.id, o]));

/**
 * Returns all skills in the taxonomy catalog
 */
export function getAllSkills() {
  return TAXONOMY_SKILLS;
}

/**
 * Returns a skill by ID
 */
export function getSkillById(id) {
  return skillMap.get(id) || null;
}

/**
 * Finds a skill by exact name or alias match
 */
export function findSkillByNameOrAlias(query) {
  if (!query || typeof query !== 'string') return null;
  const q = query.trim().toLowerCase();

  for (const skill of TAXONOMY_SKILLS) {
    if (skill.name.toLowerCase() === q) return skill;
    if (skill.aliases && skill.aliases.some((a) => a.toLowerCase() === q)) return skill;
  }
  return null;
}

/**
 * Returns all registered occupations
 */
export function getAllOccupations() {
  return TARGET_OCCUPATIONS;
}

/**
 * Returns an occupation by ID or code
 */
export function getOccupationById(idOrCode) {
  if (!idOrCode) return null;
  return occupationMap.get(idOrCode) || TARGET_OCCUPATIONS.find((o) => o.code === idOrCode || o.onetCode === idOrCode) || null;
}

/**
 * Returns the required skills with resolved skill definitions for an occupation
 */
export function getOccupationSkills(occupationId) {
  const occ = getOccupationById(occupationId);
  if (!occ) return [];

  return occ.requiredSkills.map((req) => {
    const skill = getSkillById(req.skillId);
    return {
      ...req,
      skill,
    };
  });
}
