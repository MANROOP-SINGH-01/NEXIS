// ═══════════════════════════════════════════════════════════════
// NEXIS — Bauhaus / Modernist Editorial Design Token System
// ═══════════════════════════════════════════════════════════════
// Source of truth for the entire visual language.
// Every color, font, spacing, and radius decision lives here.
// Components import tokens — they never hard-code visual values.
// ═══════════════════════════════════════════════════════════════

// ── COLORS ───────────────────────────────────────────────────

export const colors = {
  // Core palette
  black: '#111111',
  paper: '#F5F0E6',
  cream: '#EFE7D8',
  white: '#FFFFFF',

  // Bauhaus primaries
  red: '#E53935',
  deepRed: '#C92C2C',
  yellow: '#F4C430',
  blue: '#2457A6',
  deepBlue: '#173F7A',

  // Text hierarchy
  textPrimary: '#111111',
  textSecondary: '#4A4A4A',
  textMuted: '#7A7A7A',
  textInverse: '#F5F0E6',

  // Surfaces
  surface: '#F5F0E6',
  surfaceAlt: '#EFE7D8',
  surfaceWhite: '#FFFFFF',
  surfaceDark: '#111111',

  // Borders
  border: '#111111',
  borderMedium: '#3A3A3A',
  borderLight: '#C8C0B4',
  borderSubtle: '#DDD6C8',

  // Semantic status
  success: '#2E7D32',
  warning: '#F4C430',
  danger: '#E53935',
  info: '#2457A6',

  // Agent specialization (Bauhaus-mapped with unique, non-colliding hues)
  agents: {
    director: '#111111',   // Obsidian Black — Executive Orchestrator
    vision: '#2457A6',     // Cobalt Blue — ATS Deep Scanner & Analysis
    strategist: '#7C3AED', // Royal Purple — Market Gap Synthesizer
    writer: '#10B981',     // Emerald Green — Precision Tailoring & Synthesis
    hunter: '#F59E0B',     // Golden Amber — Opportunity Radar
    mirror: '#06B6D4',     // Cyan / Cerulean — Interview Simulator
  } as const,
} as const;

// ── TYPOGRAPHY ───────────────────────────────────────────────

export const fonts = {
  heading: "'Space Grotesk', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
} as const;

export const typeScale = {
  displayXL: { size: '72px', weight: 700, tracking: '-0.03em', leading: '1.0' },
  displayL:  { size: '56px', weight: 700, tracking: '-0.025em', leading: '1.05' },
  headingXL: { size: '40px', weight: 700, tracking: '-0.02em', leading: '1.1' },
  headingL:  { size: '32px', weight: 700, tracking: '-0.015em', leading: '1.15' },
  headingM:  { size: '24px', weight: 600, tracking: '-0.01em', leading: '1.2' },
  headingS:  { size: '20px', weight: 600, tracking: '-0.005em', leading: '1.25' },
  bodyL:     { size: '18px', weight: 400, tracking: '0em', leading: '1.6' },
  bodyM:     { size: '16px', weight: 400, tracking: '0em', leading: '1.5' },
  bodyS:     { size: '14px', weight: 400, tracking: '0.005em', leading: '1.5' },
  label:     { size: '12px', weight: 600, tracking: '0.08em', leading: '1.4' },
  micro:     { size: '10px', weight: 500, tracking: '0.1em', leading: '1.3' },
} as const;

// ── SPACING ──────────────────────────────────────────────────

export const spacing = {
  '1': '4px',
  '2': '8px',
  '3': '12px',
  '4': '16px',
  '5': '20px',
  '6': '24px',
  '8': '32px',
  '10': '40px',
  '12': '48px',
  '16': '64px',
  '20': '80px',
  '24': '96px',
  '32': '128px',
} as const;

// ── RADII ────────────────────────────────────────────────────

export const radii = {
  none: '0px',
  xs: '2px',
  sm: '4px',
  md: '8px',
  full: '9999px',
} as const;

// ── SHADOWS ──────────────────────────────────────────────────
// Bauhaus: no shadow or hard/offset shadows only.

export const shadows = {
  none: 'none',
  hardSm: '2px 2px 0px #111111',
  hardMd: '4px 4px 0px #111111',
  hardLg: '6px 6px 0px #111111',
  subtle: '0 1px 3px rgba(17, 17, 17, 0.08)',
} as const;

// ── BORDERS ──────────────────────────────────────────────────

export const borders = {
  thin: '1px solid #111111',
  medium: '2px solid #111111',
  thick: '3px solid #111111',
  light: '1px solid #C8C0B4',
  subtle: '1px solid #DDD6C8',
  red: '2px solid #E53935',
  blue: '2px solid #2457A6',
  yellow: '2px solid #F4C430',
} as const;

// ── MOTION ───────────────────────────────────────────────────
// Editorial motion: subtle, intentional, geometric.

export const motion = {
  fast: '120ms cubic-bezier(0.25, 0.1, 0.25, 1)',
  normal: '200ms cubic-bezier(0.25, 0.1, 0.25, 1)',
  slow: '400ms cubic-bezier(0.25, 0.1, 0.25, 1)',
  spring: '300ms cubic-bezier(0.175, 0.885, 0.32, 1.075)',
  easeOut: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
} as const;

// ── GRID ─────────────────────────────────────────────────────

export const grid = {
  columns: 12,
  gutter: '24px',
  margin: '32px',
  maxWidth: '1440px',
} as const;

// ── BREAKPOINTS ──────────────────────────────────────────────

export const breakpoints = {
  mobile: '480px',
  tablet: '768px',
  laptop: '1024px',
  desktop: '1280px',
  wide: '1440px',
} as const;

// ── Z-INDEX ──────────────────────────────────────────────────

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  overlay: 40,
  modal: 50,
  popover: 60,
  toast: 70,
  tooltip: 80,
  admin: 100,
} as const;

// ── AGENT METADATA ───────────────────────────────────────────

export const agentMeta = [
  { key: 'director',   code: '01', name: 'DIRECTOR',   role: 'Executive Orchestrator', color: colors.agents.director },
  { key: 'vision',     code: '02', name: 'VISION',     role: 'ATS Deep Scanner',       color: colors.agents.vision },
  { key: 'strategist', code: '03', name: 'STRATEGIST', role: 'Market Gap Synthesizer', color: colors.agents.strategist },
  { key: 'writer',     code: '04', name: 'WRITER',     role: 'Precision Tailoring',    color: colors.agents.writer },
  { key: 'hunter',     code: '05', name: 'HUNTER',     role: 'Opportunity Radar',      color: colors.agents.hunter },
  { key: 'mirror',     code: '06', name: 'MIRROR',     role: 'Interview Simulator',    color: colors.agents.mirror },
] as const;

// ── NAV SECTIONS ─────────────────────────────────────────────

export const navSections = {
  command:  { code: '01', label: 'COMMAND' },
  discover: { code: '02', label: 'DISCOVER' },
  build:    { code: '03', label: 'BUILD' },
  track:    { code: '04', label: 'TRACK' },
  verify:   { code: '05', label: 'VERIFY' },
  system:   { code: '06', label: 'SYSTEM' },
} as const;

// ── BACKWARD COMPATIBILITY ───────────────────────────────────
// Legacy exports so existing deep imports don't break at compile time.

export const FONT_FAMILY = fonts.body;
export const HEADING_FONT_FAMILY = fonts.heading;
export const NEXIS_PRIMARY = colors.red;
export const NEXIS_PRIMARY_HOVER = colors.deepRed;
export const NEXIS_PRIMARY_LIGHT = colors.cream;
export const NEXIS_PRIMARY_GLOW = 'rgba(229, 57, 53, 0.25)';
export const NEXIS_DARK_BG = colors.paper;
export const NEXIS_DARK_CARD = colors.cream;
export const NEXIS_DARK_ELEVATED = colors.white;
export const NEXIS_DARK_BORDER = colors.borderLight;
export const NEXIS_DARK_TEXT = colors.textPrimary;
export const NEXIS_DARK_MUTED = colors.textMuted;
export const NEXIS_LIGHT_BG = colors.paper;
export const NEXIS_LIGHT_CARD = colors.white;
export const NEXIS_LIGHT_BORDER = colors.borderLight;
export const NEXIS_LIGHT_TEXT = colors.textPrimary;
export const NEXIS_LIGHT_MUTED = colors.textMuted;
export const ACCENT_CORAL = colors.red;
export const ACCENT_AMBER = colors.yellow;
export const ACCENT_MINT = colors.success;
export const ACCENT_CYAN = colors.blue;
export const ACCENT_PURPLE = colors.deepBlue;
export const AGENT_PALETTE = {
  resume: colors.agents.vision,
  jobs: colors.agents.hunter,
  skills: colors.agents.strategist,
  learning: colors.agents.writer,
  interview: colors.agents.mirror,
  governance: colors.agents.director,
};
export const USER_COLOR = colors.red;
export const USER_COLOR_LIGHT = colors.cream;
export const USER_COLOR_SOFT = colors.surfaceAlt;
export const USER_COLOR_MEDIUM = colors.deepRed;
export const GOV_NAVY = colors.deepBlue;
export const GOV_BLUE = colors.blue;
export const GOV_SURFACE = colors.paper;
export const GOV_BORDER = colors.borderLight;
