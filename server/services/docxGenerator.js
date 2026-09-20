/**
 * FILE: server/services/docxGenerator.js
 * PURPOSE: Generate ATS-friendly, fully editable .docx documents from ResumeDocument.
 * SPEC: Phase 1G DOCX Export.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from 'docx'

export async function buildResumeDocxFromDocument(resumeDoc) {
  const doc = resumeDoc || {}
  const contact = doc.contact || {}
  const name = contact.name || 'Candidate'
  const title = contact.title || ''
  const email = contact.email || ''
  const phone = contact.phone || ''
  const location = contact.location || ''
  const links = Array.isArray(contact.links) ? contact.links : []

  const children = []

  // 1. HEADER (Candidate Name)
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60 },
      children: [
        new TextRun({
          text: name.toUpperCase(),
          bold: true,
          size: 32, // 16pt
          font: 'Calibri',
          color: '0F172A',
        }),
      ],
    })
  )

  // Title if available
  if (title) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 60 },
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: 22, // 11pt
            font: 'Calibri',
            color: '475569',
          }),
        ],
      })
    )
  }

  // Contact line: Phone | Email | Location | Links
  const contactItems = [phone, email, location, ...links].filter(Boolean)
  if (contactItems.length > 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 180 },
        children: [
          new TextRun({
            text: contactItems.join('  •  '),
            size: 19, // 9.5pt
            font: 'Calibri',
            color: '475569',
          }),
        ],
      })
    )
  }

  // Helper for Section Heading
  const addSectionHeader = (titleText) => {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 180, after: 80 },
        border: {
          bottom: {
            color: 'CBD5E1',
            space: 4,
            style: BorderStyle.SINGLE,
            size: 6,
          },
        },
        children: [
          new TextRun({
            text: titleText.toUpperCase(),
            bold: true,
            size: 22, // 11pt
            font: 'Calibri',
            color: '0F172A',
          }),
        ],
      })
    )
  }

  // 2. PROFESSIONAL SUMMARY
  if (doc.summary && doc.summary.trim()) {
    addSectionHeader('Professional Summary')
    children.push(
      new Paragraph({
        spacing: { before: 40, after: 100 },
        children: [
          new TextRun({
            text: doc.summary.trim(),
            size: 20, // 10pt
            font: 'Calibri',
            color: '1E293B',
          }),
        ],
      })
    )
  }

  // 3. EDUCATION
  const education = Array.isArray(doc.education) ? doc.education : []
  if (education.length > 0) {
    addSectionHeader('Education')
    for (const edu of education) {
      const parts = [edu.degree, edu.school, edu.year, edu.gpa].filter(Boolean)
      children.push(
        new Paragraph({
          spacing: { before: 60, after: 40 },
          children: [
            new TextRun({
              text: edu.school || edu.degree || 'University',
              bold: true,
              size: 20,
              font: 'Calibri',
              color: '0F172A',
            }),
            new TextRun({
              text: edu.location ? ` — ${edu.location}` : '',
              size: 20,
              font: 'Calibri',
              color: '475569',
            }),
          ],
        })
      )

      const subParts = [edu.degree, edu.year, edu.gpa].filter(Boolean)
      if (subParts.length > 0 && edu.school) {
        children.push(
          new Paragraph({
            spacing: { before: 0, after: 60 },
            children: [
              new TextRun({
                text: subParts.join('  |  '),
                italics: true,
                size: 19,
                font: 'Calibri',
                color: '334155',
              }),
            ],
          })
        )
      }
    }
  }

  // 4. EXPERIENCE
  const experience = Array.isArray(doc.experience) ? doc.experience : []
  if (experience.length > 0) {
    addSectionHeader('Experience')
    for (const exp of experience) {
      const expTitle = exp.title || 'Role'
      const expCompany = exp.company || ''
      const expDates = [exp.start, exp.end].filter(Boolean).join(' – ')

      const headingRuns = [
        new TextRun({
          text: expCompany ? `${expCompany} — ` : '',
          bold: true,
          size: 20,
          font: 'Calibri',
          color: '0F172A',
        }),
        new TextRun({
          text: expTitle,
          bold: true,
          size: 20,
          font: 'Calibri',
          color: '334155',
        }),
      ]

      if (expDates) {
        headingRuns.push(
          new TextRun({
            text: `  (${expDates})`,
            italics: true,
            size: 19,
            font: 'Calibri',
            color: '64748B',
          })
        )
      }

      children.push(
        new Paragraph({
          spacing: { before: 80, after: 40 },
          children: headingRuns,
        })
      )

      // Bullet points
      const bullets = Array.isArray(exp.bullets) ? exp.bullets : []
      for (const b of bullets) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { before: 20, after: 20 },
            children: [
              new TextRun({
                text: String(b).trim(),
                size: 20,
                font: 'Calibri',
                color: '1E293B',
              }),
            ],
          })
        )
      }
    }
  }

  // 5. PROJECTS
  const projects = Array.isArray(doc.projects) ? doc.projects : []
  if (projects.length > 0) {
    addSectionHeader('Projects')
    for (const proj of projects) {
      const nameRuns = [
        new TextRun({
          text: proj.name || 'Project',
          bold: true,
          size: 20,
          font: 'Calibri',
          color: '0F172A',
        }),
      ]
      if (proj.role) {
        nameRuns.push(
          new TextRun({
            text: ` | ${proj.role}`,
            italics: true,
            size: 19,
            font: 'Calibri',
            color: '475569',
          })
        )
      }

      children.push(
        new Paragraph({
          spacing: { before: 80, after: 40 },
          children: nameRuns,
        })
      )

      const pBullets = Array.isArray(proj.bullets) ? proj.bullets : []
      for (const b of pBullets) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { before: 20, after: 20 },
            children: [
              new TextRun({
                text: String(b).trim(),
                size: 20,
                font: 'Calibri',
                color: '1E293B',
              }),
            ],
          })
        )
      }
    }
  }

  // 6. TECHNICAL SKILLS
  const skills = doc.skills || {}
  const hasSkills = (skills.core && skills.core.length) || (skills.tools && skills.tools.length) || (skills.cloud && skills.cloud.length)
  if (hasSkills) {
    addSectionHeader('Technical Skills')
    if (skills.core && skills.core.length) {
      children.push(
        new Paragraph({
          spacing: { before: 40, after: 30 },
          children: [
            new TextRun({ text: 'Core Languages: ', bold: true, size: 20, font: 'Calibri', color: '0F172A' }),
            new TextRun({ text: skills.core.join(' • '), size: 20, font: 'Calibri', color: '1E293B' }),
          ],
        })
      )
    }
    if (skills.tools && skills.tools.length) {
      children.push(
        new Paragraph({
          spacing: { before: 30, after: 30 },
          children: [
            new TextRun({ text: 'Frameworks & Tools: ', bold: true, size: 20, font: 'Calibri', color: '0F172A' }),
            new TextRun({ text: skills.tools.join(' • '), size: 20, font: 'Calibri', color: '1E293B' }),
          ],
        })
      )
    }
    if (skills.cloud && skills.cloud.length) {
      children.push(
        new Paragraph({
          spacing: { before: 30, after: 40 },
          children: [
            new TextRun({ text: 'AI/ML & Cloud: ', bold: true, size: 20, font: 'Calibri', color: '0F172A' }),
            new TextRun({ text: skills.cloud.join(' • '), size: 20, font: 'Calibri', color: '1E293B' }),
          ],
        })
      )
    }
  }

  // 7. ACHIEVEMENTS & AWARDS
  const achievements = Array.isArray(doc.achievements) ? doc.achievements : []
  if (achievements.length > 0) {
    addSectionHeader('Achievements & Awards')
    for (const ach of achievements) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { before: 20, after: 20 },
          children: [
            new TextRun({
              text: String(ach).trim(),
              size: 20,
              font: 'Calibri',
              color: '1E293B',
            }),
          ],
        })
      )
    }
  }

  // 8. CERTIFICATIONS
  const certs = Array.isArray(doc.certifications) ? doc.certifications : []
  if (certs.length > 0) {
    addSectionHeader('Certifications')
    for (const c of certs) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { before: 20, after: 20 },
          children: [
            new TextRun({
              text: String(c).trim(),
              size: 20,
              font: 'Calibri',
              color: '1E293B',
            }),
          ],
        })
      )
    }
  }

  // 9. OTHER SECTIONS (Interests, etc.)
  const extraSections = Array.isArray(doc.sections) ? doc.sections : []
  for (const s of extraSections) {
    addSectionHeader(s.title || 'Additional Information')
    const contentLines = Array.isArray(s.content) ? s.content : [String(s.content)]
    for (const line of contentLines) {
      children.push(
        new Paragraph({
          spacing: { before: 20, after: 20 },
          children: [
            new TextRun({
              text: String(line).trim(),
              size: 20,
              font: 'Calibri',
              color: '1E293B',
            }),
          ],
        })
      )
    }
  }

  const document = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,    // 0.5 in
              bottom: 720, // 0.5 in
              left: 720,   // 0.5 in
              right: 720,  // 0.5 in
            },
          },
        },
        children,
      },
    ],
  })

  return await Packer.toBuffer(document)
}
