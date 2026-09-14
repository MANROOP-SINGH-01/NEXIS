/**
 * FILE: server/routes/programs.js
 * PURPOSE: Recommends real courses/programs for skill gaps, including Indian Government programs (SWAYAM, NPTEL, Skill India Digital Hub).
 * DEPENDENCIES: services/gemini, services/serper, config
 * USED BY: server/index.js
 */

import { Router } from 'express'
import { GEMINI_API_KEY, SERPER_API_KEY } from '../config.js'
import { callGeminiTextWithRetry } from '../services/gemini.js'
import { serperSearchJobs } from '../services/serper.js'
import { tryParseJsonLoose } from '../utils/helpers.js'

const router = Router()

/**
 * Curated high-reputation Indian Government portals for vocational, tech, and digital upskilling.
 */
function getGovtFallback(skill) {
  const enc = encodeURIComponent(skill)
  return [
    {
      title: `${skill} Certification & Applied Modules`,
      provider: 'SWAYAM (Govt. of India / MHRD)',
      isFree: true,
      isGovt: true,
      badge: 'Govt. of India',
      url: `https://swayam.gov.in/explorer?searchText=${enc}`,
    },
    {
      title: `${skill} Professional Course (IIT / IISc)`,
      provider: 'NPTEL (Ministry of Education)',
      isFree: true,
      isGovt: true,
      badge: 'NPTEL / MoE',
      url: `https://onlinecourses.nptel.ac.in/explorer?q=${enc}`,
    },
    {
      title: `${skill} Qualification & Practical Skill Training`,
      provider: 'Skill India Digital Hub (MSDE)',
      isFree: true,
      isGovt: true,
      badge: 'Skill India',
      url: `https://www.skillindiadigital.gov.in/courses?search=${enc}`,
    },
  ]
}

function getGlobalFallback(skill) {
  const enc = encodeURIComponent(skill)
  return [
    {
      title: `${skill} Interactive Full Curriculum`,
      provider: 'freeCodeCamp',
      isFree: true,
      isGovt: false,
      badge: 'Free Curriculum',
      url: `https://www.freecodecamp.org/news/search/?query=${enc}`,
    },
    {
      title: `${skill} Professional Specialization`,
      provider: 'Coursera',
      isFree: false,
      isGovt: false,
      badge: 'Industry Cert',
      url: `https://www.coursera.org/search?query=${enc}`,
    },
  ]
}

router.post('/programs/recommend', async (req, res) => {
  const gaps = req.body?.gaps
  const geminiKey = String(req.body?.key || GEMINI_API_KEY).trim()
  const serperKey = String(req.body?.serperKey || SERPER_API_KEY || '').trim()

  if (!Array.isArray(gaps) || gaps.length === 0) {
    return res.status(400).json({ error: 'Gaps array is required.' })
  }

  const targetGaps = gaps.slice(0, 5).map(g => String(g).trim()).filter(Boolean)

  if (!targetGaps.length) {
    return res.status(400).json({ error: 'No valid gaps provided.' })
  }

  const resultsBySkill = {}

  try {
    await Promise.all(targetGaps.map(async (skill) => {
      try {
        // Query both Indian Government platforms and verified global platforms
        const govtQuery = `"${skill}" course (site:swayam.gov.in OR site:nptel.ac.in OR site:skillindiadigital.gov.in OR site:futureskillsprime.in)`
        const globalQuery = `learn "${skill}" course (site:coursera.org OR site:freecodecamp.org OR site:edx.org)`

        let govtResults = []
        let globalResults = []

        if (serperKey) {
          [govtResults, globalResults] = await Promise.all([
            serperSearchJobs({ query: govtQuery, apiKey: serperKey }).catch(() => []),
            serperSearchJobs({ query: globalQuery, apiKey: serperKey }).catch(() => []),
          ])
        }

        const combinedRaw = [
          ...(Array.isArray(govtResults) ? govtResults.slice(0, 4) : []),
          ...(Array.isArray(globalResults) ? globalResults.slice(0, 4) : []),
        ]

        if (!combinedRaw.length || !geminiKey) {
          resultsBySkill[skill] = [
            ...getGovtFallback(skill).slice(0, 2),
            ...getGlobalFallback(skill).slice(0, 2),
          ]
          return
        }

        const prompt = [
          `You are an expert career counselor specialized in Indian technical education and global skill upskilling.`,
          `Task: Select 3 to 4 best distinct, accredited courses/programs to learn the skill: "${skill}".`,
          `IMPORTANT: Prioritize official Indian Government platforms (SWAYAM, NPTEL, Skill India Digital Hub, FutureSkills Prime) where available, alongside verified free/global programs.`,
          `Only extract real courses mentioned in the results. If a link points to a government domain (.gov.in or .ac.in or swayam), mark "isGovt": true and "isFree": true.`,
          `Return a strict JSON array of objects with the following fields:`,
          `[`,
          `  {`,
          `    "title": string (Course title),`,
          `    "provider": string (e.g. "SWAYAM (Govt. of India)", "NPTEL / IIT", "Skill India Digital", "freeCodeCamp", "Coursera"),`,
          `    "isFree": boolean,`,
          `    "isGovt": boolean,`,
          `    "badge": string (e.g. "Govt. of India", "NPTEL", "Free", "Industry"),`,
          `    "url": string (The exact link from the search results)`,
          `  }`,
          `]`,
          `RAW SEARCH RESULTS:\n${JSON.stringify(combinedRaw, null, 2)}`
        ].join('\n\n')

        let parsed = null
        try {
          const llmRaw = await callGeminiTextWithRetry({
            apiKey: geminiKey,
            prompt,
            systemInstruction: 'You are a precise educational JSON extractor. Return valid JSON array only. Always identify Indian Government programs.',
            attempts: 2,
          })

          parsed = tryParseJsonLoose(llmRaw)
          if (!Array.isArray(parsed)) {
            const arrMatch = String(llmRaw || '').match(/\[[\s\S]*\]/)
            parsed = arrMatch ? JSON.parse(arrMatch[0]) : null
          }
        } catch (llmErr) {
          console.warn(`[programs/recommend] LLM extraction fallback for ${skill}:`, llmErr.message)
        }

        if (Array.isArray(parsed) && parsed.length > 0) {
          // Guarantee at least 1 Indian government course is present
          const hasGovt = parsed.some(p => p.isGovt || (p.provider && /swayam|nptel|skill india|govt/i.test(p.provider)))
          if (!hasGovt) {
            parsed.unshift(getGovtFallback(skill)[0])
          }
          resultsBySkill[skill] = parsed.slice(0, 4)
        } else {
          resultsBySkill[skill] = [
            ...getGovtFallback(skill).slice(0, 2),
            ...getGlobalFallback(skill).slice(0, 2),
          ]
        }
      } catch (err) {
        console.error(`Error processing skill ${skill}:`, err)
        resultsBySkill[skill] = [
          ...getGovtFallback(skill).slice(0, 2),
          ...getGlobalFallback(skill).slice(0, 1),
        ]
      }
    }))

    res.json({ programs: resultsBySkill })
  } catch (err) {
    console.error('Programs recommend error:', err)
    res.status(500).json({ error: 'Failed to fetch recommended programs.' })
  }
})

export default router
