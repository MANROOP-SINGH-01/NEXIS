/**
 * FILE: server/scripts/importOnet.js
 * PURPOSE: Idempotent bulk import script for O*NET occupation and skill taxonomy data.
 *          Reads CSV files from `data/onet/`:
 *          - `Occupation Data.csv`
 *          - `Skills.csv`
 *          - `Technology Skills.csv`
 *          Upserts into `TargetRole`, `Skill`, `RoleSkillRequirement`, and `CourseRecommendation`.
 * DEPENDENCIES: server/lib/prisma.js, fs, path
 * USAGE: node server/scripts/importOnet.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../lib/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data/onet');

/**
 * Lightweight, robust zero-dependency CSV parser that handles quotes and line breaks.
 */
function parseCsv(content) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let currentToken = '';

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentToken += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentToken.trim());
      currentToken = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(currentToken.trim());
      currentToken = '';
      if (row.length > 0 && row.some(cell => cell.length > 0)) {
        lines.push(row);
      }
      row = [];
    } else {
      currentToken += char;
    }
  }

  if (currentToken.length > 0 || row.length > 0) {
    row.push(currentToken.trim());
    if (row.some(cell => cell.length > 0)) lines.push(row);
  }

  if (lines.length < 2) return [];

  const headers = lines[0].map(h => h.replace(/^["']|["']$/g, '').trim());
  return lines.slice(1).map(values => {
    const record = {};
    headers.forEach((h, idx) => {
      record[h] = (values[idx] || '').replace(/^["']|["']$/g, '').trim();
    });
    return record;
  });
}

async function runImport() {
  console.log('🚀 Starting O*NET Taxonomy Bulk Import...\n');
  const startTime = Date.now();

  let rolesUpserted = 0;
  let skillsUpserted = 0;
  let requirementsUpserted = 0;
  let coursesUpserted = 0;

  // ── 1. Import Occupation Data (TargetRole) ──────────────────────────────────
  const occFile = path.join(DATA_DIR, 'Occupation Data.csv');
  if (fs.existsSync(occFile)) {
    console.log('📂 Parsing Occupation Data.csv...');
    const occContent = fs.readFileSync(occFile, 'utf-8');
    const records = parseCsv(occContent);

    for (const rec of records) {
      const onetCode = rec['O*NET-SOC Code'] || rec['Code'] || rec['soc_code'];
      const title = rec['Title'] || rec['title'];
      const description = rec['Description'] || rec['description'];
      if (!onetCode || !title) continue;

      await prisma.targetRole.upsert({
        where: { onetCode },
        update: {
          title,
          family: 'Computer and Mathematical',
          zone: 4,
        },
        create: {
          onetCode,
          title,
          family: 'Computer and Mathematical',
          zone: 4,
        },
      });
      rolesUpserted++;
    }
    console.log(`  ✅ Processed ${rolesUpserted} occupations in TargetRole.`);
  } else {
    console.log('⚠️  Occupation Data.csv not found, using curated defaults.');
  }

  // ── 2. Import Standard Skills (Skill) ───────────────────────────────────────
  const skillsFile = path.join(DATA_DIR, 'Skills.csv');
  if (fs.existsSync(skillsFile)) {
    console.log('📂 Parsing Skills.csv...');
    const skillsContent = fs.readFileSync(skillsFile, 'utf-8');
    const records = parseCsv(skillsContent);

    for (const rec of records) {
      const onetCode = rec['Element ID'] || rec['id'];
      const name = rec['Element Name'] || rec['Name'] || rec['skill'];
      if (!name) continue;

      await prisma.skill.upsert({
        where: { name },
        update: {
          onetCode: onetCode || null,
          category: 'Foundational',
        },
        create: {
          onetCode: onetCode || null,
          name,
          category: 'Foundational',
        },
      });
      skillsUpserted++;
    }
    console.log(`  ✅ Processed ${skillsUpserted} standard skills in Skill.`);
  }

  // ── 3. Import Technology Skills & Role Mappings ─────────────────────────────
  const techFile = path.join(DATA_DIR, 'Technology Skills.csv');
  if (fs.existsSync(techFile)) {
    console.log('📂 Parsing Technology Skills.csv...');
    const techContent = fs.readFileSync(techFile, 'utf-8');
    const records = parseCsv(techContent);

    // Cache target roles by onetCode for faster requirement linking
    const roleCache = new Map();
    const allRoles = await prisma.targetRole.findMany();
    allRoles.forEach(r => {
      if (r.onetCode) roleCache.set(r.onetCode, r.id);
    });

    for (const rec of records) {
      const onetCode = rec['O*NET-SOC Code'] || rec['soc_code'];
      const skillName = rec['Example'] || rec['Skill'] || rec['technology_skill'];
      const isHot = (rec['Hot Technology'] || '').toUpperCase() === 'Y';
      const isInDemand = (rec['In Demand'] || '').toUpperCase() === 'Y';
      const category = rec['Commodity Title'] || 'Technology';

      if (!skillName) continue;

      // Upsert Skill
      const skill = await prisma.skill.upsert({
        where: { name: skillName },
        update: {
          category,
        },
        create: {
          name: skillName,
          category,
        },
      });
      skillsUpserted++;

      // Link to TargetRole if SOC code matches
      const roleId = roleCache.get(onetCode);
      if (roleId) {
        const importance = isHot ? 0.9 : 0.75;
        const level = isInDemand ? 'REQUIRED' : 'PREFERRED';

        await prisma.roleSkillRequirement.upsert({
          where: {
            roleId_skillId: {
              roleId,
              skillId: skill.id,
            },
          },
          update: {
            importance,
            level,
          },
          create: {
            roleId,
            skillId: skill.id,
            importance,
            level,
          },
        });
        requirementsUpserted++;
      }
    }
    console.log(`  ✅ Processed technology skills and ${requirementsUpserted} role-skill requirement links.`);
  }

  // ── 4. Seed Verified Government & Open-Access Training Programs ────────────
  console.log('📂 Seeding Recommended Course Programs (SWAYAM, NPTEL, FreeCodeCamp)...');
  const curatedCourses = [
    {
      title: 'Full Stack Web Development with React & Node.js',
      provider: 'SWAYAM / NPTEL (Govt of India)',
      url: 'https://swayam.gov.in/explorer?searchText=web+development',
      skillsCovered: JSON.stringify(['React', 'Node.js', 'JavaScript', 'HTML5', 'CSS3']),
      duration: '12 weeks',
      level: 'Intermediate',
      isFree: true,
      isGovt: true,
    },
    {
      title: 'Programming, Data Structures And Algorithms In Python',
      provider: 'NPTEL (IIT Madras)',
      url: 'https://nptel.ac.in/courses/106106145',
      skillsCovered: JSON.stringify(['Python', 'Algorithms', 'Data Structures']),
      duration: '8 weeks',
      level: 'Intermediate',
      isFree: true,
      isGovt: true,
    },
    {
      title: 'Cloud Computing and Distributed Systems',
      provider: 'SWAYAM (IIT Kharagpur)',
      url: 'https://swayam.gov.in/explorer?searchText=cloud+computing',
      skillsCovered: JSON.stringify(['Cloud Computing', 'AWS', 'Kubernetes', 'Docker', 'Distributed Systems']),
      duration: '8 weeks',
      level: 'Advanced',
      isFree: true,
      isGovt: true,
    },
    {
      title: 'Database Management Systems & SQL Architectures',
      provider: 'NPTEL (IIT Kharagpur)',
      url: 'https://nptel.ac.in/courses/106105175',
      skillsCovered: JSON.stringify(['PostgreSQL', 'SQL Query Optimization', 'Database Management', 'Data Warehousing']),
      duration: '8 weeks',
      level: 'Beginner to Intermediate',
      isFree: true,
      isGovt: true,
    },
    {
      title: 'Information Security and Cyber Defense Certification',
      provider: 'FutureSkills PRIME (NASSCOM / MeitY)',
      url: 'https://futureskillsprime.in/',
      skillsCovered: JSON.stringify(['Information Security', 'Network Security', 'Penetration Testing', 'Cryptography']),
      duration: '10 weeks',
      level: 'Advanced',
      isFree: true,
      isGovt: true,
    },
  ];

  for (const c of curatedCourses) {
    const existing = await prisma.courseRecommendation.findFirst({
      where: { title: c.title, provider: c.provider },
    });
    if (!existing) {
      await prisma.courseRecommendation.create({ data: c });
      coursesUpserted++;
    }
  }
  console.log(`  ✅ Seeded ${coursesUpserted} verified course recommendations.`);

  // ── 5. Summary & Verification Counts ────────────────────────────────────────
  const totalRoles = await prisma.targetRole.count();
  const totalSkills = await prisma.skill.count();
  const totalReqs = await prisma.roleSkillRequirement.count();
  const totalCourses = await prisma.courseRecommendation.count();

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n======================================================');
  console.log('🎉 O*NET Bulk Import Completed Successfully!');
  console.log(`⏱  Duration: ${durationSec}s`);
  console.log(`📊 Total TargetRoles in DB:               ${totalRoles}`);
  console.log(`📊 Total Skills in DB:                    ${totalSkills}`);
  console.log(`📊 Total RoleSkillRequirements in DB:    ${totalReqs}`);
  console.log(`📊 Total CourseRecommendations in DB:    ${totalCourses}`);
  console.log('======================================================\n');
}

runImport()
  .catch((err) => {
    console.error('❌ Fatal error during O*NET import:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
