# Phase 17 Verification: Splink Identity-Linkage Service & Fellegi-Sunter Model

**Phase:** Phase 17 — Splink Identity-Linkage Service `SHOULD`  
**Specification References:** Master Plan Section 4.2, Section 9, Section 17.4, Section 22.3, Section 27 Phase 17  
**Date:** September 20, 2026  
**Status:** Complete & Empirically Verified (16/16 tests passing, Python microservice + Node in-process fallback engine)

---

## 1. Executive Summary & Problem Solved

Traditional skilling platforms in India (PMKVY, DDU-GKY, NAPS, Mahaswayam) struggle with **identity fragmentation** caused by changing mobile phone numbers, informal name spellings, missing national identifiers, and cross-scheme duplicate registrations. 

Under DPDP Rules 2025 and Master Specification Section 22.3:
- NEXIS `MUST NOT` treat Aadhaar as a mandatory or default identifier.
- Random pseudonymous `publicId` serves as internal anchor.
- Deduplication and cross-scheme linkage are handled via **probabilistic Fellegi-Sunter record linkage (Splink 4.0.17)** rather than unexplainable black-box LLMs.

---

## 2. Technical Architecture & Components Delivered

### A. Dedicated Python Splink Microservice (`services/splink_service/`)
- **Pinned Version:** `splink==4.0.17` with DuckDB analytical database backend.
- **REST Surface (`app.py`):**
  - `GET /health`: Returns microservice engine status (`splink-identity-linkage v4.0.17` with DuckDB backend).
  - `POST /link-records`: Evaluates multi-candidate datasets with blocking rules, Bayes factors, and connected-component clustering.
  - `POST /compare-pair`: Evaluates single candidate pairs with full comparison level breakdown.
- **Standalone Test Suite:** `services/splink_service/test_splink.py` passes 100%.

### B. High-Reliability In-Process Fellegi-Sunter Fallback (`server/services/splinkService.js`)
- **Zero-Downtime Guarantee (Section 23 Fallback):** If the external Python service is offline, down, or unreachable, NEXIS automatically falls back to an in-process deterministic Fellegi-Sunter statistical model without blocking trainee registration or survey workflows.
- **Comparison Vectors ($\gamma$):**
  1. **Full Name:** Jaro-Winkler ($\ge 0.92, \ge 0.80$) + Soundex surname phonetic encoding.
  2. **Date of Birth:** Exact match ($m=0.94, u=0.001$), 1-off day-month transposition, and birth year agreement.
  3. **Phone:** Exact SHA-256 token match ($m=0.98, u=0.0002$), last-6 digit exact match, and Levenshtein $\le 1$ adjacent contact detection.
  4. **District:** Exact district match ($m=0.88, u=0.05$) and regional sub-division overlap.
  5. **Email:** Exact SHA-256 token hash match ($m=0.99, u=0.0001$).
- **Fellegi-Sunter Formulation:**
  - Weight: $w_i = \log_2(m_i / u_i)$
  - Posterior Probability: $P(M|\gamma) = \frac{1}{1 + \frac{1-p}{p} \prod \frac{u_i}{m_i}}$ (with prior $p = 0.0001$).
  - Decision Tiers:
    - $P \ge 0.92$: `AUTO_LINK` (verified cluster linkage).
    - $0.65 \le P < 0.92$: `REVIEW_REQUIRED` (human operator queue).
    - $P < 0.65$: `UNLINKED`.

### C. Disjoint-Set Graph Clustering (Union-Find)
- Partitions linked pairs into canonical `IdentityCluster` trees with path compression and rank optimization.
- Groups multi-profile trainees into single identity clusters while isolating distinct individuals.

### D. Duplicate Subsidy Disbursal Risk Protection
- Analyzes overlapping scheme enrolments (e.g. concurrent PMKVY + DDU-GKY claims).
- Computes baseline financial exposure of ₹46,000 per cross-scheme double-dip pair.

### E. Endpoints Surface (`server/routes/dedup.js`)
- `GET /api/dedup/health`: Service & engine health check.
- `POST /api/dedup/scan`: Executes database-wide deduplication scan.
- `GET /api/dedup/candidates`: Returns pending review pairs for `DedupReviewPanel.tsx`.
- `POST /api/dedup/candidates/:id/resolve`: Human review gate (`MERGE` with atomic transaction or `REJECT`).
- `GET /api/dedup/clusters`: Disjoint-set identity clusters.
- `GET /api/dedup/stats`: Precision, recall, and cumulative subsidy protection analytics.
- `POST /api/dedup/compare`: Ad-hoc pair comparison.

### F. Frontend & Work Queue Integration (`src/App.tsx`, `DedupReviewPanel.tsx`)
- Direct route `/dedup` and `/admin/dedup` instantly loads the deduplication review console.
- Modal z-index elevated to `z-[125]` to maintain the invariant above consent layers.
- Integrated with `WorkQueueNavigator` (`Q-03: Trainee Deduplication & Identity Linkage`).

---

## 3. Empirical Verification Evidence

```bash
# Unit & Contract Tests
npx playwright test tests/unit/splinkIdentityLinkage.spec.ts tests/contract/splinkIdentityLinkageFlow.spec.ts

Running 16 tests using 1 worker
  16 passed (4.2s)
```

```bash
# Python Splink Microservice Test
python services/splink_service/test_splink.py

Link records test passed successfully! Match probability: 1.0
All python tests passed!
```

---

## 4. Invariants & Acceptance Criteria Preserved

- ✅ **No Third-Party AI PII Leakage:** No plaintext trainee contact details are sent to external LLMs.
- ✅ **Zero Blocking of Writes:** Splink failure falls back to deterministic local model without blocking.
- ✅ **Explainable Evidence:** Every deduplication candidate includes exact Bayes factors and named signals.
- ✅ **Human-in-the-loop Resolution:** Ambiguous matches route to reviewer queue, never silent destructive merge.
