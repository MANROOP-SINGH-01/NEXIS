/**
 * FILE: scripts/test_resume_dual_format.mjs
 * PURPOSE: Automated test runner validating Phase 1 Dual-Format Resume Ingestion, Generation & Round-Trip.
 * SPEC: Phase 1H Validation & Benchmark Testing.
 */

import fs from 'fs'
import path from 'path'
import { PDFParse } from 'pdf-parse'
import { parseResumeBuffer } from '../server/services/resumeParser.js'
import { buildResumeDocxFromDocument } from '../server/services/docxGenerator.js'
import { buildResumePdfFromStructured } from '../server/services/pdfGenerator.js'

const FIXTURE_DIR = path.resolve('tests/fixtures')
const BENCHMARK_PDF = path.join(FIXTURE_DIR, 'prakhar_jaiswal_benchmark.pdf')
const OUT_DOCX = path.join(FIXTURE_DIR, 'prakhar_jaiswal_generated.docx')
const OUT_PDF = path.join(FIXTURE_DIR, 'prakhar_jaiswal_generated.pdf')

async function run() {
  console.log('===============================================================')
  console.log('       NEXIS PHASE 1: DUAL-FORMAT RESUME PIPELINE BENCHMARK     ')
  console.log('===============================================================')

  if (!fs.existsSync(BENCHMARK_PDF)) {
    throw new Error(`Benchmark fixture not found at: ${BENCHMARK_PDF}`)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: PDF Ingestion of Benchmark Fixture
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[1/5] Ingesting Benchmark PDF fixture...')
  const pdfBuffer = fs.readFileSync(BENCHMARK_PDF)
  const pdfParseResult = await parseResumeBuffer(pdfBuffer, {
    fileName: 'prakhar_jaiswal_benchmark.pdf',
    mimeType: 'application/pdf',
  })

  const docFromPdf = pdfParseResult.document
  console.log(`  ✓ Source format detected: ${pdfParseResult.format}`)
  console.log(`  ✓ Extracted text length: ${pdfParseResult.text.length} chars`)
  console.log(`  ✓ Candidate Name: "${docFromPdf.contact.name}"`)
  console.log(`  ✓ Candidate Email: "${docFromPdf.contact.email}"`)
  console.log(`  ✓ Candidate Phone: "${docFromPdf.contact.phone}"`)
  console.log(`  ✓ Candidate Links: ${docFromPdf.contact.links.join(', ')}`)
  console.log(`  ✓ Education: ${docFromPdf.education.map((e) => `${e.degree} at ${e.school} (${e.year}) [${e.gpa}]`).join('; ')}`)
  console.log(`  ✓ Experience Count: ${docFromPdf.experience.length}`)
  docFromPdf.experience.forEach((e, idx) => {
    console.log(`    ${idx + 1}. ${e.title} @ ${e.company || 'Freelance'} (${e.start} - ${e.end}) [${e.bullets.length} bullets]`)
  })
  console.log(`  ✓ Projects Count: ${docFromPdf.projects.length}`)
  docFromPdf.projects.forEach((p, idx) => {
    console.log(`    ${idx + 1}. ${p.name} [${p.bullets.length} bullets]`)
  })
  console.log(`  ✓ Core Skills Count: ${docFromPdf.skills.core.length} (${docFromPdf.skills.core.slice(0, 8).join(', ')}...)`)
  console.log(`  ✓ Achievements Count: ${docFromPdf.achievements.length}`)
  docFromPdf.achievements.forEach((a, idx) => {
    console.log(`    ${idx + 1}. ${a}`)
  })

  // Assertions for Step 1
  if (!docFromPdf.contact.name.toLowerCase().includes('prakhar')) {
    throw new Error(`Assertion failed: Expected candidate name to contain "Prakhar", got "${docFromPdf.contact.name}"`)
  }
  if (!docFromPdf.contact.email.includes('prkhr.exists@gmail.com')) {
    throw new Error(`Assertion failed: Expected email "prkhr.exists@gmail.com", got "${docFromPdf.contact.email}"`)
  }
  if (docFromPdf.education.length === 0 || !docFromPdf.education[0].school.includes('NMIMS')) {
    throw new Error('Assertion failed: Education school should contain "NMIMS"')
  }
  if (docFromPdf.experience.length < 2) {
    throw new Error(`Assertion failed: Expected at least 2 experience entries, got ${docFromPdf.experience.length}`)
  }
  if (docFromPdf.projects.length < 4) {
    throw new Error(`Assertion failed: Expected at least 4 projects, got ${docFromPdf.projects.length}`)
  }
  if (docFromPdf.skills.core.length < 15) {
    throw new Error(`Assertion failed: Expected at least 15 core skills, got ${docFromPdf.skills.core.length}`)
  }
  if (docFromPdf.achievements.length < 4) {
    throw new Error(`Assertion failed: Expected at least 4 achievements, got ${docFromPdf.achievements.length}`)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: DOCX Generation from Normalized ResumeDocument
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[2/5] Generating editable DOCX document from ResumeDocument...')
  const docxBuffer = await buildResumeDocxFromDocument(docFromPdf)
  fs.writeFileSync(OUT_DOCX, docxBuffer)
  console.log(`  ✓ Generated DOCX written to ${OUT_DOCX} (${docxBuffer.length} bytes)`)

  if (docxBuffer.length < 2000) {
    throw new Error('Assertion failed: Generated DOCX buffer is unexpectedly small.')
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: DOCX Ingestion & Normalization
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[3/5] Ingesting generated DOCX document back into ResumeDocument...')
  const docxParseResult = await parseResumeBuffer(docxBuffer, {
    fileName: 'prakhar_jaiswal_generated.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })

  const docFromDocx = docxParseResult.document
  console.log(`  ✓ Source format detected: ${docxParseResult.format}`)
  console.log(`  ✓ Candidate Name from DOCX: "${docFromDocx.contact.name}"`)
  console.log(`  ✓ Candidate Email from DOCX: "${docFromDocx.contact.email}"`)
  console.log(`  ✓ Candidate Phone from DOCX: "${docFromDocx.contact.phone}"`)
  console.log(`  ✓ Education from DOCX: ${docFromDocx.education[0]?.degree} at ${docFromDocx.education[0]?.school}`)
  console.log(`  ✓ Experience Count from DOCX: ${docFromDocx.experience.length}`)
  console.log(`  ✓ Projects Count from DOCX: ${docFromDocx.projects.length}`)
  console.log(`  ✓ Core Skills from DOCX: ${docFromDocx.skills.core.length}`)
  console.log(`  ✓ Achievements from DOCX: ${docFromDocx.achievements.length}`)

  // Assertions for Step 3
  if (!docFromDocx.contact.name.toLowerCase().includes('prakhar')) {
    throw new Error(`Assertion failed: Expected DOCX candidate name to contain "Prakhar", got "${docFromDocx.contact.name}"`)
  }
  if (!docFromDocx.contact.email.includes('prkhr.exists@gmail.com')) {
    throw new Error(`Assertion failed: Expected DOCX email "prkhr.exists@gmail.com", got "${docFromDocx.contact.email}"`)
  }
  if (docFromDocx.experience.length < 2) {
    throw new Error(`Assertion failed: Expected at least 2 experience entries from DOCX, got ${docFromDocx.experience.length}`)
  }
  if (docFromDocx.projects.length < 4) {
    throw new Error(`Assertion failed: Expected at least 4 projects from DOCX, got ${docFromDocx.projects.length}`)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4: ATS PDF Generation from ResumeDocument
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[4/5] Generating ATS-friendly PDF from ResumeDocument...')
  const generatedPdfBuffer = await buildResumePdfFromStructured(docFromDocx)
  fs.writeFileSync(OUT_PDF, generatedPdfBuffer)
  console.log(`  ✓ Generated PDF written to ${OUT_PDF} (${generatedPdfBuffer.length} bytes)`)

  const pdfVerifyParser = new PDFParse({ data: generatedPdfBuffer })
  const verifyResult = await pdfVerifyParser.getText()
  await pdfVerifyParser.destroy()

  console.log(`  ✓ Generated PDF Total Pages: ${verifyResult.total}`)
  console.log(`  ✓ Generated PDF Text Length: ${verifyResult.text.length} chars`)
  console.log(`  ✓ Generated PDF Selectable Text Sample: "${verifyResult.text.slice(0, 140).replace(/\n/g, ' ')}..."`)

  if (verifyResult.total !== 1) {
    console.warn(`  Notice: PDF rendered across ${verifyResult.total} pages.`)
  }
  if (!verifyResult.text.toLowerCase().includes('prakhar jaiswal')) {
    throw new Error('Assertion failed: Generated PDF does not contain selectable candidate name "Prakhar Jaiswal"')
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 5: Semantic Round-Trip Equivalence Check
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[5/5] Validating semantic preservation across round-trip transformations...')
  const checks = [
    { name: 'Candidate Name', val1: docFromPdf.contact.name.toLowerCase(), val2: docFromDocx.contact.name.toLowerCase() },
    { name: 'Candidate Email', val1: docFromPdf.contact.email.toLowerCase(), val2: docFromDocx.contact.email.toLowerCase() },
    { name: 'Candidate Phone', val1: docFromPdf.contact.phone.replace(/\D/g, ''), val2: docFromDocx.contact.phone.replace(/\D/g, '') },
    { name: 'Degree Match', val1: docFromPdf.education[0]?.degree, val2: docFromDocx.education[0]?.degree },
    { name: 'School Match', val1: docFromPdf.education[0]?.school, val2: docFromDocx.education[0]?.school },
    { name: 'Experience Entry Count', val1: docFromPdf.experience.length, val2: docFromDocx.experience.length },
    { name: 'Project Entry Count', val1: docFromPdf.projects.length, val2: docFromDocx.projects.length },
    { name: 'Achievements Count', val1: docFromPdf.achievements.length, val2: docFromDocx.achievements.length },
  ]

  let allPassed = true
  for (const c of checks) {
    const passed = String(c.val1).trim() === String(c.val2).trim()
    console.log(`  ${passed ? '✓' : '✗'} ${c.name}: [${c.val1}] vs [${c.val2}]`)
    if (!passed) allPassed = false
  }

  if (!allPassed) {
    throw new Error('Assertion failed: One or more semantic round-trip equivalence checks failed.')
  }

  console.log('\n===============================================================')
  console.log('   ✓ PHASE 1 BENCHMARK VALIDATION PASSED 100% SUCCESSFULLY!   ')
  console.log('===============================================================\n')
}

run().catch((err) => {
  console.error('\n❌ BENCHMARK TEST RUNNER ERROR:', err)
  process.exit(1)
})
