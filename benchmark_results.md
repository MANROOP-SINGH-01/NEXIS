# NEXIS Benchmark Suite Results

*Measured on local environment for Section 17 Pitch Deck Prep.*

## API Latency
- **Root Ping**: 45.96ms
- **Job Search (Fallback cache)**: 5.65ms
- **LLM Latency (Gemini)**: ~1200ms (typical)
- **Database Query Latency**: ~5ms (SQLite dev environment)

## Frontend Metrics
- **3D FPS**: 60fps sustained on M-series Mac / modern PC, auto-degrades to 2D HUD if <30fps for 3s (Phase 3 spec).
- **Resume Parsing Accuracy**: Tested manually against standard PDF layouts — 95%+ success rate for basic fields, with graceful fallback.

> **Note**: Do not overclaim these numbers in the pitch. Use these exact baselines.