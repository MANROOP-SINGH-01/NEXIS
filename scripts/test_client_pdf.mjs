import fs from 'fs';
import { jsPDF } from 'jspdf';
import { PDFParse } from 'pdf-parse';

const sampleResume = {
  header: {
    name: 'Aarav Sharma',
    title: 'Senior Fullstack & AI Solutions Architect',
    email: 'aarav.sharma@example.gov.in',
    phone: '+91 98765 43210',
    location: 'New Delhi, India',
    links: ['linkedin.com/in/aaravsharma', 'github.com/aaravsharma'],
  },
  summary:
    'Results-driven engineering lead with 7+ years of experience architecting large-scale citizen services, enterprise APIs, and AI workflow automation. Demonstrated expertise in distributed systems, high-concurrency microservices, and secure public digital platforms.',
  experience: [
    {
      title: 'Lead Platform Architect',
      company: 'Digital India Core Services',
      location: 'New Delhi',
      start: '2023',
      end: 'Present',
      bullets: [
        'Spearheaded the technical overhaul of core identity verification APIs, reducing P99 latency by 42% across 12M monthly active sessions.',
        'Engineered high-throughput event processing pipelines handling over 50,000 requests per second with 99.99% uptime utilizing Kafka and Redis.',
        'Designed and implemented strict DPDP Act compliance protocols, zero-trust cryptographic audit trails, and biometric data tokenization architectures.',
        'Mentored an engineering squad of 14 developers in modern TypeScript, automated CI/CD canary deployments, and resilient multi-region infrastructure.',
      ],
    },
    {
      title: 'Senior Fullstack Engineer',
      company: 'Skill India Tech Ecosystem',
      location: 'Bengaluru',
      start: '2020',
      end: '2023',
      bullets: [
        'Architected trainee onboarding, resume tailoring, and skill gap discovery services connecting vocational centers with nationwide employment portals.',
        'Constructed reactive analytics dashboards delivering real-time placement tracking, attendance validation, and provider performance scorecards across 28 states.',
        'Optimized PostgreSQL database query planning, connection pooling, and multi-tenant partitioning, reducing analytical aggregation timeouts by 65%.',
        'Partnered closely with national certification agencies to establish interoperable Open Credential standards across state vocational training systems.',
      ],
    },
    {
      title: 'Software Engineer',
      company: 'National Informatics Labs',
      location: 'Hyderabad',
      start: '2018',
      end: '2020',
      bullets: [
        'Developed fault-tolerant microservices in Node.js and Go for automated document digitization and Optical Character Recognition processing.',
        'Built accessible bilingual citizen application interfaces adhering strictly to Web Content Accessibility Guidelines (WCAG 2.1 AA).',
        'Authored comprehensive unit, integration, and load testing suites achieving 94% code coverage across mission-critical authentication endpoints.',
      ],
    },
  ],
  skills: {
    core: ['Fullstack Architecture', 'Distributed Systems', 'TypeScript', 'Node.js', 'React', 'Python', 'Go'],
    tools: ['Docker', 'Kubernetes', 'Kafka', 'PostgreSQL', 'Redis', 'Prisma ORM', 'Git'],
    cloud: ['AWS', 'Google Cloud Platform', 'Linux Systems', 'CI/CD Pipelines'],
  },
  education: [
    {
      degree: 'B.Tech in Computer Science & Engineering',
      school: 'Indian Institute of Technology (IIT)',
      year: '2018',
    },
  ],
  projects: [
    {
      name: 'NEXIS Citizen Career Orchestration Platform',
      bullets: [
        'Engineered an AI-assisted job matching and recursive interview simulator with verifiable telemetry and decentralized credential corroboration.',
      ],
    },
  ],
  certifications: [
    'AWS Certified Solutions Architect – Professional',
    'Certified Kubernetes Administrator (CKA)',
  ],
};

function renderJsPdf(sr) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: [595.28, 841.89],
  });

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const leftMargin = 48;
  const rightMargin = 48;
  const topMargin = 40;
  const bottomMargin = 40;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  let currentY = topMargin;

  const h = sr?.header || {};
  const name = String(h.name || '').trim();
  const title = String(h.title || '').trim();
  const contactParts = [h.email, h.phone, h.location].filter((x) => x && String(x).trim());
  const links = Array.isArray(h.links) ? h.links.map((x) => String(x).trim()).filter(Boolean) : [];
  const summaryText = String(sr?.summary || '').trim();

  const experience = (Array.isArray(sr?.experience) ? sr.experience : []).filter(
    (e) => e && (e.title || e.company || (Array.isArray(e.bullets) && e.bullets.length))
  );

  const skills = sr?.skills || {};
  const skillLines = [];
  if (skills.core?.length) skillLines.push({ label: 'Core Skills', value: skills.core.join(' • ') });
  if (skills.tools?.length) skillLines.push({ label: 'Tools & Technologies', value: skills.tools.join(' • ') });
  if (skills.cloud?.length) skillLines.push({ label: 'Cloud & Infrastructure', value: skills.cloud.join(' • ') });

  const education = (Array.isArray(sr?.education) ? sr.education : []).filter(
    (e) => e && (e.degree || e.school)
  );

  const projects = (Array.isArray(sr?.projects) ? sr.projects : []).filter(
    (p) => p && (p.name || (Array.isArray(p.bullets) && p.bullets.length))
  );

  const certifications = (Array.isArray(sr?.certifications) ? sr.certifications : [])
    .map((c) => String(c).trim())
    .filter(Boolean);

  let estimatedLines = 4;
  if (summaryText) estimatedLines += 2 + Math.ceil(summaryText.length / 85);
  experience.forEach((exp) => {
    estimatedLines += 2.5;
    (exp.bullets || []).forEach((b) => {
      estimatedLines += Math.max(1, Math.ceil(String(b).length / 75));
    });
  });
  if (skillLines.length) estimatedLines += 1.5 + skillLines.length;
  if (education.length) estimatedLines += 1.5 + education.length * 1.5;
  if (projects.length) {
    estimatedLines += 1.5;
    projects.forEach((p) => {
      estimatedLines += 1.5 + (p.bullets || []).length;
    });
  }
  if (certifications.length) estimatedLines += 1.5 + certifications.length;

  const isVeryLong = estimatedLines > 46;
  const isCompact = estimatedLines > 38;

  const bodySize = isVeryLong ? 9.0 : isCompact ? 9.5 : 10.0;
  const bodyLineHeight = bodySize * 1.25;
  const sectionHeaderSize = isVeryLong ? 10.5 : 11.0;
  const sectionSpaceBefore = isVeryLong ? 8 : isCompact ? 10 : 13;
  const sectionSpaceAfter = isVeryLong ? 4 : isCompact ? 5 : 6;
  const entrySpaceAfter = isVeryLong ? 4 : isCompact ? 5 : 7;

  const rgbDark = [15, 23, 42];
  const rgbMuted = [71, 85, 105];
  const rgbBody = [30, 41, 59];
  const rgbRule = [203, 213, 225];

  const checkPageBreak = (neededHeight) => {
    if (currentY + neededHeight > pageHeight - bottomMargin) {
      doc.addPage();
      currentY = topMargin;
    }
  };

  if (name) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(19);
    doc.setTextColor(...rgbDark);
    doc.text(name.toUpperCase(), pageWidth / 2, currentY + 16, { align: 'center' });
    currentY += 22;
  }

  if (title) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...rgbMuted);
    doc.text(title, pageWidth / 2, currentY + 8, { align: 'center' });
    currentY += 13;
  }

  const allContact = [...contactParts, ...links];
  if (allContact.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(bodySize - 0.5);
    doc.setTextColor(...rgbMuted);
    doc.text(allContact.join('  •  '), pageWidth / 2, currentY + 8, { align: 'center' });
    currentY += 14;
  }

  const renderSectionHeader = (titleText) => {
    checkPageBreak(sectionSpaceBefore + 16);
    currentY += sectionSpaceBefore;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(sectionHeaderSize);
    doc.setTextColor(...rgbDark);
    doc.text(titleText.toUpperCase(), leftMargin, currentY + 8);
    currentY += 11;

    doc.setDrawColor(...rgbRule);
    doc.setLineWidth(0.75);
    doc.line(leftMargin, currentY, leftMargin + contentWidth, currentY);
    currentY += sectionSpaceAfter;
  };

  const renderBullet = (bulletText) => {
    const bulletWidth = 12;
    const bulletTextWidth = contentWidth - bulletWidth;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(bodySize);
    doc.setTextColor(...rgbBody);

    const splitLines = doc.splitTextToSize(bulletText, bulletTextWidth);
    const bulletBlockHeight = splitLines.length * bodyLineHeight;
    checkPageBreak(bulletBlockHeight + 2);

    doc.text('•', leftMargin, currentY + bodySize * 0.85);

    splitLines.forEach((line, idx) => {
      doc.text(line, leftMargin + bulletWidth, currentY + (idx * bodyLineHeight) + bodySize * 0.85);
    });

    currentY += bulletBlockHeight + 2;
  };

  const renderTwoColEntry = (leftText, rightText) => {
    checkPageBreak(bodyLineHeight + 4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(bodySize + 0.5);
    doc.setTextColor(...rgbDark);
    doc.text(leftText, leftMargin, currentY + bodySize * 0.85);

    if (rightText) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(bodySize - 0.5);
      doc.setTextColor(...rgbMuted);
      doc.text(rightText, leftMargin + contentWidth, currentY + bodySize * 0.85, { align: 'right' });
    }

    currentY += bodyLineHeight + 3;
  };

  if (summaryText) {
    renderSectionHeader('Professional Summary');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(bodySize);
    doc.setTextColor(...rgbBody);
    const summaryLines = doc.splitTextToSize(summaryText, contentWidth);
    summaryLines.forEach((line) => {
      checkPageBreak(bodyLineHeight);
      doc.text(line, leftMargin, currentY + bodySize * 0.85);
      currentY += bodyLineHeight;
    });
  }

  if (experience.length) {
    renderSectionHeader('Experience');
    experience.forEach((exp, idx) => {
      const titleCompany = [exp.title, exp.company].filter(Boolean).join(' | ');
      const dateLoc = [exp.location, [exp.start, exp.end].filter(Boolean).join(' – ')].filter(Boolean).join('  |  ');

      renderTwoColEntry(titleCompany, dateLoc);

      const bullets = Array.isArray(exp.bullets) ? exp.bullets : [];
      bullets.forEach((b) => {
        renderBullet(String(b).trim());
      });

      if (idx < experience.length - 1) {
        currentY += entrySpaceAfter;
      }
    });
  }

  if (skillLines.length) {
    renderSectionHeader('Skills');
    skillLines.forEach((sk) => {
      const labelStr = `${sk.label}: `;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(bodySize);
      const labelWidth = doc.getTextWidth(labelStr);

      const valueWidth = contentWidth - labelWidth;
      const valueLines = doc.splitTextToSize(sk.value, valueWidth);

      checkPageBreak(valueLines.length * bodyLineHeight + 2);

      doc.setTextColor(...rgbDark);
      doc.text(labelStr, leftMargin, currentY + bodySize * 0.85);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...rgbBody);
      valueLines.forEach((line, lIdx) => {
        const xPos = lIdx === 0 ? leftMargin + labelWidth : leftMargin + 12;
        doc.text(line, xPos, currentY + (lIdx * bodyLineHeight) + bodySize * 0.85);
      });

      currentY += valueLines.length * bodyLineHeight + 2;
    });
  }

  if (education.length) {
    renderSectionHeader('Education');
    education.forEach((edu, idx) => {
      const degreeSchool = [edu.degree, edu.school].filter(Boolean).join(' | ');
      renderTwoColEntry(degreeSchool, String(edu.year || ''));
      if (idx < education.length - 1) {
        currentY += entrySpaceAfter;
      }
    });
  }

  if (projects.length) {
    renderSectionHeader('Projects & Key Initiatives');
    projects.forEach((proj, idx) => {
      checkPageBreak(bodyLineHeight + 2);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(bodySize + 0.5);
      doc.setTextColor(...rgbDark);
      doc.text(String(proj.name || 'Project'), leftMargin, currentY + bodySize * 0.85);
      currentY += bodyLineHeight + 2;

      const bullets = Array.isArray(proj.bullets) ? proj.bullets : [];
      bullets.forEach((b) => {
        renderBullet(String(b).trim());
      });

      if (idx < projects.length - 1) {
        currentY += entrySpaceAfter;
      }
    });
  }

  if (certifications.length) {
    renderSectionHeader('Certifications');
    certifications.forEach((cert) => {
      renderBullet(cert);
    });
  }

  return Buffer.from(doc.output('arraybuffer'));
}

async function testClient() {
  console.log('Testing client jsPDF generator...');
  const buffer = renderJsPdf(sampleResume);
  fs.writeFileSync('test_client_sample_resume.pdf', buffer);
  console.log(`Saved test_client_sample_resume.pdf (${buffer.length} bytes)`);

  const parser = new PDFParse({ data: buffer });
  const textResult = await parser.getText();
  await parser.destroy();

  console.log(`Total Pages in client-generated PDF: ${textResult.total}`);
  if (textResult.total === 1) {
    console.log('SUCCESS: Client jsPDF resume fits perfectly on 1 A4 page!');
  }
}

testClient().catch(console.error);
