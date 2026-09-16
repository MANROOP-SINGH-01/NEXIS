# O*NET Database Files

This directory holds O*NET CSV files for the NEXIS Skill Graph taxonomy import.

## Official Files Supported

1. `Occupation Data.csv` — SOC codes, job titles, and job descriptions.
2. `Skills.csv` — Standardized skill names and element IDs.
3. `Technology Skills.csv` — Modern technology skills mapped to SOC occupation codes.

## Download Instructions

1. Visit [O*NET Resource Center](https://www.onetcenter.org/database.html).
2. Download the latest Text/CSV release (e.g., `db_28_0_text.zip`).
3. Extract `Occupation Data.csv`, `Skills.csv`, and `Technology Skills.csv` into this directory:
   `c:\INFINTY\WORK\HOBBIES - HUSTLE\RESUME PORJECTS\NEXIS\data\onet\`
4. Run the import script:
   ```bash
   node server/scripts/importOnet.js
   ```

A baseline set of curated technology and engineering roles is provided automatically so the Skill Graph works immediately offline.
