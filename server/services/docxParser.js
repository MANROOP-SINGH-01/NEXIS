/**
 * FILE: server/services/docxParser.js
 * PURPOSE: Extract text, headings, and bullet points from .docx files and normalize to ResumeDocument.
 * SPEC: Phase 1D DOCX Ingestion.
 */

import mammoth from 'mammoth'
import { normalizeTextToResumeDocument } from './documentNormalizer.js'

export async function parseDocxBuffer(buffer, metadata = {}) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Invalid DOCX buffer supplied.')
  }

  // 1. Extract HTML to preserve semantic headings and bullet lists
  const htmlResult = await mammoth.convertToHtml({ buffer })
  const html = htmlResult.value || ''

  // 2. Convert HTML tags to structured text with bullet markers and section linebreaks
  const structuredText = html
    .replace(/<h1>(.*?)<\/h1>/gi, '\n$1\n')
    .replace(/<h2>(.*?)<\/h2>/gi, '\n$1\n')
    .replace(/<h3>(.*?)<\/h3>/gi, '\n$1\n')
    .replace(/<h4>(.*?)<\/h4>/gi, '\n$1\n')
    .replace(/<li>(.*?)<\/li>/gi, '• $1\n')
    .replace(/<p>(.*?)<\/p>/gi, '$1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&bull;/gi, '•')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/<[^>]+>/g, '') // strip remaining tags
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  // Fallback to raw text if HTML was empty
  let text = structuredText
  if (!text) {
    const rawResult = await mammoth.extractRawText({ buffer })
    text = (rawResult.value || '').trim()
  }

  const resumeDoc = normalizeTextToResumeDocument(text, {
    sourceFormat: 'docx',
    extractedAt: new Date().toISOString(),
    fileName: metadata.fileName || 'resume.docx',
    ...metadata,
  })

  return {
    text,
    document: resumeDoc,
    messages: htmlResult.messages || [],
  }
}
