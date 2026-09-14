import PDFDocument from 'pdfkit'

/**
 * FILE: server/services/pdfGenerator.js
 * PURPOSE: Professional A4 single-page resume PDF generation from structured data.
 * DEPENDENCIES: pdfkit
 * SPEC: ISO A4 (595.28 x 841.89 pt), 48 pt (~17mm) print margins.
 * SECTION ORDER: Header -> Summary -> Experience -> Skills -> Education -> Projects -> Certifications
 */

export function buildResumePdfFromStructured(sr) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 38, bottom: 38, left: 48, right: 48 },
        autoFirstPage: true,
      })

      const chunks = []
      doc.on('data', (chunk) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', (err) => reject(err))

      const leftMargin = doc.page.margins.left
      const rightMargin = doc.page.margins.right
      const contentWidth = doc.page.width - leftMargin - rightMargin // ~499.28 pt

      // Extract and clean sections
      const h = sr?.header || {}
      const name = String(h.name || '').trim()
      const title = String(h.title || '').trim()
      const contactParts = [h.email, h.phone, h.location].filter((x) => x && String(x).trim())
      const links = Array.isArray(h.links) ? h.links.map((x) => String(x).trim()).filter(Boolean) : []
      const summaryText = String(sr?.summary || '').trim()

      const experience = (Array.isArray(sr?.experience) ? sr.experience : []).filter(
        (e) => e && (e.title || e.company || (Array.isArray(e.bullets) && e.bullets.length))
      )

      const skills = sr?.skills || {}
      const skillLines = []
      if (skills.core?.length) skillLines.push({ label: 'Core Skills', value: skills.core.join(' • ') })
      if (skills.tools?.length) skillLines.push({ label: 'Tools & Technologies', value: skills.tools.join(' • ') })
      if (skills.cloud?.length) skillLines.push({ label: 'Cloud & Infrastructure', value: skills.cloud.join(' • ') })

      const education = (Array.isArray(sr?.education) ? sr.education : []).filter(
        (e) => e && (e.degree || e.school)
      )

      const projects = (Array.isArray(sr?.projects) ? sr.projects : []).filter(
        (p) => p && (p.name || (Array.isArray(p.bullets) && p.bullets.length))
      )

      const certifications = (Array.isArray(sr?.certifications) ? sr.certifications : [])
        .map((c) => String(c).trim())
        .filter(Boolean)

      // Estimate total content lines to dynamically select scale for 1-page fit
      let estimatedLines = 4 // Header
      if (summaryText) estimatedLines += 2 + Math.ceil(summaryText.length / 85)
      experience.forEach((exp) => {
        estimatedLines += 2.5
        ;(exp.bullets || []).forEach((b) => {
          estimatedLines += Math.max(1, Math.ceil(String(b).length / 75))
        })
      })
      if (skillLines.length) estimatedLines += 1.5 + skillLines.length
      if (education.length) estimatedLines += 1.5 + education.length * 1.5
      if (projects.length) {
        estimatedLines += 1.5
        projects.forEach((p) => {
          estimatedLines += 1.5 + (p.bullets || []).length
        })
      }
      if (certifications.length) estimatedLines += 1.5 + certifications.length

      // Dynamic adaptive scale
      const isVeryLong = estimatedLines > 46
      const isCompact = estimatedLines > 38

      const bodySize = isVeryLong ? 9.0 : isCompact ? 9.5 : 10.0
      const bodyLineGap = isVeryLong ? 1.0 : isCompact ? 1.5 : 2.0
      const sectionHeaderSize = isVeryLong ? 10.5 : 11.0
      const sectionSpaceBefore = isVeryLong ? 5 : isCompact ? 7 : 9
      const sectionSpaceAfter = isVeryLong ? 2.5 : isCompact ? 3.5 : 4.5
      const entrySpaceAfter = isVeryLong ? 3 : isCompact ? 4 : 5

      // Colors
      const colorDark = '#0F172A'       // Slate 900
      const colorMuted = '#475569'      // Slate 600
      const colorBody = '#1E293B'       // Slate 800
      const colorRule = '#CBD5E1'       // Slate 300

      // Helper to reset text stream to full width at leftMargin
      const resetTextStream = (targetY) => {
        doc.text('', leftMargin, targetY, { width: contentWidth })
        doc.x = leftMargin
        doc.y = targetY
      }

      // --- 1. HEADER ---
      if (name) {
        doc.font('Helvetica-Bold').fontSize(19).fillColor(colorDark).text(name.toUpperCase(), leftMargin, doc.y, {
          characterSpacing: 0.5,
          align: 'center',
          width: contentWidth,
        })
      }

      if (title) {
        doc.moveDown(0.12)
        doc.font('Helvetica-Bold').fontSize(10).fillColor(colorMuted).text(title, leftMargin, doc.y, {
          align: 'center',
          width: contentWidth,
        })
      }

      const allContact = [...contactParts, ...links]
      if (allContact.length) {
        doc.moveDown(0.12)
        doc.font('Helvetica').fontSize(bodySize - 0.5).fillColor(colorMuted).text(allContact.join('  •  '), leftMargin, doc.y, {
          align: 'center',
          width: contentWidth,
        })
      }

      // Section Header Helper
      const renderSectionHeader = (titleText) => {
        const headerStartY = doc.y + sectionSpaceBefore
        resetTextStream(headerStartY)

        doc.font('Helvetica-Bold').fontSize(sectionHeaderSize).fillColor(colorDark).text(titleText.toUpperCase(), leftMargin, headerStartY, {
          characterSpacing: 0.8,
          width: contentWidth,
        })

        const ruleY = doc.y + 1.5
        doc.moveTo(leftMargin, ruleY).lineTo(leftMargin + contentWidth, ruleY).lineWidth(0.75).strokeColor(colorRule).stroke()
        resetTextStream(ruleY + sectionSpaceAfter)
      }

      // Helper for hanging-indent bullets
      const renderBullet = (bulletText) => {
        const bulletWidth = 12
        const startY = doc.y

        doc.font('Helvetica').fontSize(bodySize).fillColor(colorBody)
        doc.text('•', leftMargin, startY, {
          width: bulletWidth,
        })

        doc.text(bulletText, leftMargin + bulletWidth, startY, {
          width: contentWidth - bulletWidth,
          lineGap: bodyLineGap,
        })

        resetTextStream(doc.y)
      }

      // Helper for 2-column header (Title on left, Date/Location on right)
      const renderTwoColEntry = (leftPrimary, leftSecondary, rightText) => {
        const startY = doc.y
        const rightWidth = 140
        const leftWidth = contentWidth - rightWidth

        doc.font('Helvetica-Bold').fontSize(bodySize + 0.5).fillColor(colorDark)
        doc.text(leftPrimary, leftMargin, startY, {
          width: leftWidth,
        })
        const primaryEndY = doc.y

        let rightEndY = startY
        if (rightText) {
          doc.font('Helvetica').fontSize(bodySize - 0.5).fillColor(colorMuted)
          doc.text(rightText, leftMargin + leftWidth, startY, {
            width: rightWidth,
            align: 'right',
          })
          rightEndY = doc.y
        }

        let nextY = Math.max(primaryEndY, rightEndY)

        if (leftSecondary) {
          doc.font('Helvetica-Oblique').fontSize(bodySize).fillColor(colorMuted)
          doc.text(leftSecondary, leftMargin, nextY, {
            width: contentWidth,
          })
          nextY = doc.y
        }

        resetTextStream(nextY + 1.5)
      }

      // --- 2. SUMMARY ---
      if (summaryText) {
        renderSectionHeader('Professional Summary')
        doc.font('Helvetica').fontSize(bodySize).fillColor(colorBody).text(summaryText, leftMargin, doc.y, {
          width: contentWidth,
          lineGap: bodyLineGap,
        })
        resetTextStream(doc.y)
      }

      // --- 3. EXPERIENCE ---
      if (experience.length) {
        renderSectionHeader('Experience')
        experience.forEach((exp, idx) => {
          const titleCompany = [exp.title, exp.company].filter(Boolean).join(' | ')
          const dateLoc = [exp.location, [exp.start, exp.end].filter(Boolean).join(' – ')].filter(Boolean).join('  |  ')
          
          renderTwoColEntry(titleCompany, '', dateLoc)

          const bullets = Array.isArray(exp.bullets) ? exp.bullets : []
          bullets.forEach((b) => {
            renderBullet(String(b).trim())
          })

          if (idx < experience.length - 1) {
            resetTextStream(doc.y + entrySpaceAfter)
          }
        })
      }

      // --- 4. SKILLS ---
      if (skillLines.length) {
        renderSectionHeader('Skills')
        skillLines.forEach((sk) => {
          doc.font('Helvetica-Bold').fontSize(bodySize).fillColor(colorDark).text(`${sk.label}: `, leftMargin, doc.y, {
            continued: true,
          })
          doc.font('Helvetica').fillColor(colorBody).text(sk.value, {
            lineGap: bodyLineGap,
          })
          resetTextStream(doc.y)
        })
      }

      // --- 5. EDUCATION ---
      if (education.length) {
        renderSectionHeader('Education')
        education.forEach((edu, idx) => {
          const degreeSchool = [edu.degree, edu.school].filter(Boolean).join(' | ')
          renderTwoColEntry(degreeSchool, '', String(edu.year || ''))
          if (idx < education.length - 1) {
            resetTextStream(doc.y + entrySpaceAfter)
          }
        })
      }

      // --- 6. PROJECTS ---
      if (projects.length) {
        renderSectionHeader('Projects & Key Initiatives')
        projects.forEach((proj, idx) => {
          doc.font('Helvetica-Bold').fontSize(bodySize + 0.5).fillColor(colorDark).text(String(proj.name || 'Project'), leftMargin, doc.y, {
            width: contentWidth,
          })
          resetTextStream(doc.y + 1)
          const bullets = Array.isArray(proj.bullets) ? proj.bullets : []
          bullets.forEach((b) => {
            renderBullet(String(b).trim())
          })
          if (idx < projects.length - 1) {
            resetTextStream(doc.y + entrySpaceAfter)
          }
        })
      }

      // --- 7. CERTIFICATIONS ---
      if (certifications.length) {
        renderSectionHeader('Certifications')
        certifications.forEach((cert) => {
          renderBullet(cert)
        })
      }

      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}
