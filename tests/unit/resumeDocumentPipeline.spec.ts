import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';
import { parseResumeBuffer } from '../../server/services/resumeParser.js';
import { buildResumeDocxFromDocument } from '../../server/services/docxGenerator.js';
import { buildResumePdfFromStructured } from '../../server/services/pdfGenerator.js';
import {
  normalizeTextToResumeDocument,
  resumeDocumentToLegacyStructured,
  legacyStructuredToResumeDocument,
} from '../../server/services/documentNormalizer.js';

test.describe('Phase 1: Resume Ingestion & Dual-Format Pipeline Tests', () => {
  const fixturePdfPath = path.resolve('tests/fixtures/prakhar_jaiswal_benchmark.pdf');

  test('Benchmark PDF ingests into canonical ResumeDocument with exact fields', async () => {
    expect(fs.existsSync(fixturePdfPath)).toBe(true);
    const pdfBuffer = fs.readFileSync(fixturePdfPath);

    const result = await parseResumeBuffer(pdfBuffer, {
      fileName: 'prakhar_jaiswal_benchmark.pdf',
      mimeType: 'application/pdf',
    });

    expect(result.format).toBe('pdf');
    expect(result.text).toBeTruthy();

    const doc = result.document;
    expect(doc.metadata.sourceFormat).toBe('pdf');
    expect(doc.contact.name).toBe('Prakhar Jaiswal');
    expect(doc.contact.email).toBe('prkhr.exists@gmail.com');
    expect(doc.contact.phone).toBe('+91-7891516041');
    expect(doc.contact.links).toContain('github.com/prkhrexists');

    // Education
    expect(doc.education.length).toBeGreaterThanOrEqual(1);
    expect(doc.education[0].school).toContain('NMIMS MPSTME');
    expect(doc.education[0].degree).toContain('B.Tech in Computer Science');
    expect(doc.education[0].gpa).toContain('8/10');

    // Experience
    expect(doc.experience.length).toBe(2);
    expect(doc.experience[0].title).toBe('Mechatronics and Researcher');
    expect(doc.experience[0].bullets.length).toBe(4);

    // Projects
    expect(doc.projects.length).toBe(4);
    const projectNames = doc.projects.map((p: any) => p.name.toLowerCase());
    expect(projectNames).toContain('crewyard');
    expect(projectNames).toContain('forge');

    // Skills
    expect(doc.skills.core.length).toBeGreaterThanOrEqual(15);
    expect(doc.skills.core).toContain('Python');
    expect(doc.skills.core).toContain('Docker');

    // Achievements
    expect(doc.achievements.length).toBe(4);
    expect(doc.achievements[0]).toContain('Innovent 2026');
  });

  test('Dual-Format Round-Trip (PDF -> Model -> DOCX -> Model -> PDF) preserves semantics', async () => {
    const pdfBuffer = fs.readFileSync(fixturePdfPath);
    const parsedPdf = await parseResumeBuffer(pdfBuffer, {
      fileName: 'prakhar_jaiswal_benchmark.pdf',
    });
    const docFromPdf = parsedPdf.document;

    // 1. Generate DOCX from ResumeDocument
    const docxBuffer = await buildResumeDocxFromDocument(docFromPdf);
    expect(Buffer.isBuffer(docxBuffer)).toBe(true);
    expect(docxBuffer.length).toBeGreaterThan(3000);

    // 2. Ingest generated DOCX into ResumeDocument
    const parsedDocx = await parseResumeBuffer(docxBuffer, {
      fileName: 'exported.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const docFromDocx = parsedDocx.document;

    expect(parsedDocx.format).toBe('docx');
    expect(docFromDocx.contact.name.toLowerCase()).toBe(docFromPdf.contact.name.toLowerCase());
    expect(docFromDocx.contact.email).toBe(docFromPdf.contact.email);
    expect(docFromDocx.experience.length).toBe(docFromPdf.experience.length);
    expect(docFromDocx.projects.length).toBe(docFromPdf.projects.length);
    expect(docFromDocx.achievements.length).toBe(docFromPdf.achievements.length);

    // 3. Generate PDF from DOCX-derived ResumeDocument
    const pdfFromDocxBuffer = await buildResumePdfFromStructured(docFromDocx);
    expect(Buffer.isBuffer(pdfFromDocxBuffer)).toBe(true);
    expect(pdfFromDocxBuffer.length).toBeGreaterThan(1500);

    // 4. Verify generated PDF text is selectable and complete
    const verifyParser = new PDFParse({ data: pdfFromDocxBuffer });
    const verifyText = await verifyParser.getText();
    await verifyParser.destroy();

    expect(verifyText.text).toContain('PRAKHAR JAISWAL');
    expect(verifyText.text).toContain('prkhr.exists@gmail.com');
    expect(verifyText.total).toBe(1); // Fits on 1 page
  });

  test('Legacy Structured Resume converters ensure 100% backward compatibility', () => {
    const legacy = {
      header: {
        name: 'Legacy User',
        title: 'Lead Architect',
        email: 'legacy@example.com',
        phone: '+1 555 0199',
        location: 'Remote',
        links: ['github.com/legacy'],
      },
      summary: 'Experienced architect',
      skills: { core: ['TypeScript', 'Node.js'], tools: ['Docker'], cloud: ['AWS'] },
      experience: [
        {
          title: 'Architect',
          company: 'Acme',
          location: 'US',
          start: '2020',
          end: 'Present',
          bullets: ['Built scalable microservices.'],
        },
      ],
      projects: [{ name: 'Project Alpha', bullets: ['Launched alpha release.'] }],
      education: [{ degree: 'B.S.', school: 'State University', year: '2019' }],
      certifications: ['AWS Solutions Architect'],
    };

    const doc = legacyStructuredToResumeDocument(legacy);
    expect(doc.contact.name).toBe('Legacy User');
    expect(doc.skills.core).toContain('TypeScript');
    expect(doc.experience[0].title).toBe('Architect');

    const reverted = resumeDocumentToLegacyStructured(doc);
    expect(reverted?.header.name).toBe(legacy.header.name);
    expect(reverted?.experience[0].bullets[0]).toBe('Built scalable microservices.');
  });
});
