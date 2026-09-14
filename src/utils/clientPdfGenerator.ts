import { jsPDF } from 'jspdf';
import { StructuredResume } from '../types';

/**
 * FILE: src/utils/clientPdfGenerator.ts
 * PURPOSE: High-fidelity client-side A4 resume PDF generation matching backend PDFKit.
 * SPEC: ISO A4 (595.28 x 841.89 pt), 48 pt (~17mm) margins.
 * SECTION ORDER: Header -> Summary -> Experience -> Skills -> Education -> Projects -> Certifications
 */

export function generateClientResumePdf(sr: StructuredResume): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: [595.28, 841.89],
  });

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const leftMargin = 48;
  const topMargin = 40;
  const bottomMargin = 40;
  const contentWidth = pageWidth - leftMargin - 48; // ~499.28 pt

  let currentY = topMargin;

  // Extract fields
  const h = sr?.header || ({} as any);
  const name = String(h.name || '').trim();
  const title = String(h.title || '').trim();
  const contactParts = [h.email, h.phone, h.location].filter((x) => x && String(x).trim());
  const links = Array.isArray(h.links) ? h.links.map((x: any) => String(x).trim()).filter(Boolean) : [];
  const summaryText = String(sr?.summary || '').trim();

  const experience = (Array.isArray(sr?.experience) ? sr.experience : []).filter(
    (e: any) => e && (e.title || e.company || (Array.isArray(e.bullets) && e.bullets.length))
  );

  const skills = sr?.skills || ({} as any);
  const skillLines: { label: string; value: string }[] = [];
  if (skills.core?.length) skillLines.push({ label: 'Core Skills', value: skills.core.join(' • ') });
  if (skills.tools?.length) skillLines.push({ label: 'Tools & Technologies', value: skills.tools.join(' • ') });
  if (skills.cloud?.length) skillLines.push({ label: 'Cloud & Infrastructure', value: skills.cloud.join(' • ') });

  const education = (Array.isArray(sr?.education) ? sr.education : []).filter(
    (e: any) => e && (e.degree || e.school)
  );

  const projects = (Array.isArray(sr?.projects) ? sr.projects : []).filter(
    (p: any) => p && (p.name || (Array.isArray(p.bullets) && p.bullets.length))
  );

  const certifications = (Array.isArray(sr?.certifications) ? sr.certifications : [])
    .map((c: any) => String(c).trim())
    .filter(Boolean);

  // Content budget estimation
  let estimatedLines = 4;
  if (summaryText) estimatedLines += 2 + Math.ceil(summaryText.length / 85);
  experience.forEach((exp: any) => {
    estimatedLines += 2.5;
    (exp.bullets || []).forEach((b: any) => {
      estimatedLines += Math.max(1, Math.ceil(String(b).length / 75));
    });
  });
  if (skillLines.length) estimatedLines += 1.5 + skillLines.length;
  if (education.length) estimatedLines += 1.5 + education.length * 1.5;
  if (projects.length) {
    estimatedLines += 1.5;
    projects.forEach((p: any) => {
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

  // Colors
  const rgbDark: [number, number, number] = [15, 23, 42];      // #0F172A
  const rgbMuted: [number, number, number] = [71, 85, 105];    // #475569
  const rgbBody: [number, number, number] = [30, 41, 59];      // #1E293B
  const rgbRule: [number, number, number] = [203, 213, 225];   // #CBD5E1

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - bottomMargin) {
      doc.addPage();
      currentY = topMargin;
    }
  };

  // 1. HEADER
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

  const renderSectionHeader = (titleText: string) => {
    checkPageBreak(sectionSpaceBefore + 16);
    currentY += sectionSpaceBefore;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(sectionHeaderSize);
    doc.setTextColor(...rgbDark);
    doc.text(titleText.toUpperCase(), leftMargin, currentY + 8);
    currentY += 11;

    // Draw horizontal rule
    doc.setDrawColor(...rgbRule);
    doc.setLineWidth(0.75);
    doc.line(leftMargin, currentY, leftMargin + contentWidth, currentY);
    currentY += sectionSpaceAfter;
  };

  const renderBullet = (bulletText: string) => {
    const bulletWidth = 12;
    const bulletTextWidth = contentWidth - bulletWidth;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(bodySize);
    doc.setTextColor(...rgbBody);

    const splitLines: string[] = doc.splitTextToSize(bulletText, bulletTextWidth);
    const bulletBlockHeight = splitLines.length * bodyLineHeight;
    checkPageBreak(bulletBlockHeight + 2);

    doc.text('•', leftMargin, currentY + bodySize * 0.85);

    splitLines.forEach((line, idx) => {
      doc.text(line, leftMargin + bulletWidth, currentY + (idx * bodyLineHeight) + bodySize * 0.85);
    });

    currentY += bulletBlockHeight + 2;
  };

  const renderTwoColEntry = (leftText: string, rightText: string) => {
    const rightColWidth = 140;

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

  // 2. PROFESSIONAL SUMMARY
  if (summaryText) {
    renderSectionHeader('Professional Summary');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(bodySize);
    doc.setTextColor(...rgbBody);
    const summaryLines: string[] = doc.splitTextToSize(summaryText, contentWidth);
    summaryLines.forEach((line) => {
      checkPageBreak(bodyLineHeight);
      doc.text(line, leftMargin, currentY + bodySize * 0.85);
      currentY += bodyLineHeight;
    });
  }

  // 3. EXPERIENCE
  if (experience.length) {
    renderSectionHeader('Experience');
    experience.forEach((exp: any, idx: number) => {
      const titleCompany = [exp.title, exp.company].filter(Boolean).join(' | ');
      const dateLoc = [exp.location, [exp.start, exp.end].filter(Boolean).join(' – ')].filter(Boolean).join('  |  ');

      renderTwoColEntry(titleCompany, dateLoc);

      const bullets = Array.isArray(exp.bullets) ? exp.bullets : [];
      bullets.forEach((b: any) => {
        renderBullet(String(b).trim());
      });

      if (idx < experience.length - 1) {
        currentY += entrySpaceAfter;
      }
    });
  }

  // 4. SKILLS
  if (skillLines.length) {
    renderSectionHeader('Skills');
    skillLines.forEach((sk) => {
      const labelStr = `${sk.label}: `;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(bodySize);
      const labelWidth = doc.getTextWidth(labelStr);

      const valueWidth = contentWidth - labelWidth;
      const valueLines: string[] = doc.splitTextToSize(sk.value, valueWidth);

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

  // 5. EDUCATION
  if (education.length) {
    renderSectionHeader('Education');
    education.forEach((edu: any, idx: number) => {
      const degreeSchool = [edu.degree, edu.school].filter(Boolean).join(' | ');
      renderTwoColEntry(degreeSchool, String(edu.year || ''));
      if (idx < education.length - 1) {
        currentY += entrySpaceAfter;
      }
    });
  }

  // 6. PROJECTS
  if (projects.length) {
    renderSectionHeader('Projects & Key Initiatives');
    projects.forEach((proj: any, idx: number) => {
      checkPageBreak(bodyLineHeight + 2);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(bodySize + 0.5);
      doc.setTextColor(...rgbDark);
      doc.text(String(proj.name || 'Project'), leftMargin, currentY + bodySize * 0.85);
      currentY += bodyLineHeight + 2;

      const bullets = Array.isArray(proj.bullets) ? proj.bullets : [];
      bullets.forEach((b: any) => {
        renderBullet(String(b).trim());
      });

      if (idx < projects.length - 1) {
        currentY += entrySpaceAfter;
      }
    });
  }

  // 7. CERTIFICATIONS
  if (certifications.length) {
    renderSectionHeader('Certifications');
    certifications.forEach((cert: string) => {
      renderBullet(cert);
    });
  }

  return doc.output('blob');
}
