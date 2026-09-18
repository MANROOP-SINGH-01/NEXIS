import { 
  NEXIS_PRIMARY, 
  NEXIS_PRIMARY_HOVER, 
  NEXIS_PRIMARY_LIGHT, 
  NEXIS_PRIMARY_GLOW,
  NEXIS_DARK_BG, 
  NEXIS_DARK_CARD, 
  NEXIS_DARK_ELEVATED, 
  NEXIS_DARK_BORDER, 
  NEXIS_DARK_TEXT, 
  NEXIS_DARK_MUTED,
  NEXIS_LIGHT_BG,
  NEXIS_LIGHT_CARD,
  NEXIS_LIGHT_BORDER,
  NEXIS_LIGHT_TEXT,
  NEXIS_LIGHT_MUTED,
  ACCENT_CORAL,
  ACCENT_AMBER,
  ACCENT_MINT,
  ACCENT_CYAN,
  ACCENT_PURPLE,
  AGENT_PALETTE
} from './brand';

export const theme = {
  colors: {
    primary: NEXIS_PRIMARY,
    primaryHover: NEXIS_PRIMARY_HOVER,
    primaryLight: NEXIS_PRIMARY_LIGHT,
    primaryGlow: NEXIS_PRIMARY_GLOW,
    
    dark: {
      bg: NEXIS_DARK_BG,
      card: NEXIS_DARK_CARD,
      elevated: NEXIS_DARK_ELEVATED,
      border: NEXIS_DARK_BORDER,
      text: NEXIS_DARK_TEXT,
      muted: NEXIS_DARK_MUTED,
    },

    light: {
      bg: NEXIS_LIGHT_BG,
      card: NEXIS_LIGHT_CARD,
      border: NEXIS_LIGHT_BORDER,
      text: NEXIS_LIGHT_TEXT,
      muted: NEXIS_LIGHT_MUTED,
    },

    accents: {
      coral: ACCENT_CORAL,
      amber: ACCENT_AMBER,
      mint: ACCENT_MINT,
      cyan: ACCENT_CYAN,
      purple: ACCENT_PURPLE,
    },

    agents: AGENT_PALETTE,

    // Backward compatibility aliases
    primaryDark: NEXIS_DARK_BG,
    accent: NEXIS_PRIMARY,
    accentDark: NEXIS_PRIMARY_HOVER,
    surface: NEXIS_DARK_BG,
    surfaceHighlight: NEXIS_DARK_CARD,
    text: NEXIS_DARK_TEXT,
    textMuted: NEXIS_DARK_MUTED,
  },
  typography: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    display: "'Space Grotesk', 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  shadows: {
    subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.25)',
    elevation: '0 8px 24px -4px rgba(0, 0, 0, 0.45), 0 4px 8px -2px rgba(0, 0, 0, 0.3)',
    glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    glow: '0 0 25px -3px rgba(99, 102, 241, 0.45)',
    glowCyan: '0 0 25px -3px rgba(6, 182, 212, 0.45)',
  },
  radii: {
    xs: '0.25rem',
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.25rem',
    '3xl': '1.5rem',
    full: '9999px',
  },
  transitions: {
    fast: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
    normal: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  }
};
