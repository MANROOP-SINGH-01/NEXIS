// NEXIS Design System — Bauhaus Edition
// Structured theme object for programmatic access.
// All values derived from the centralized bauhaus.ts tokens.

import { colors, fonts, shadows, radii, motion } from './bauhaus';

export const theme = {
  colors: {
    primary: colors.red,
    primaryHover: colors.deepRed,
    primaryLight: colors.cream,
    primaryGlow: 'rgba(229, 57, 53, 0.2)',

    dark: {
      bg: colors.surfaceDark,
      card: colors.black,
      elevated: colors.black,
      border: colors.border,
      text: colors.textInverse,
      muted: colors.borderLight,
    },

    light: {
      bg: colors.paper,
      card: colors.white,
      border: colors.borderLight,
      text: colors.textPrimary,
      muted: colors.textMuted,
    },

    accents: {
      coral: colors.red,
      amber: colors.yellow,
      mint: colors.success,
      cyan: colors.blue,
      purple: colors.deepBlue,
    },

    agents: colors.agents,

    // Backward compatibility aliases
    primaryDark: colors.surfaceDark,
    accent: colors.red,
    accentDark: colors.deepRed,
    surface: colors.paper,
    surfaceHighlight: colors.cream,
    text: colors.textPrimary,
    textMuted: colors.textMuted,
  },
  typography: {
    sans: fonts.body,
    display: fonts.heading,
    mono: fonts.mono,
  },
  shadows: {
    subtle: shadows.subtle,
    elevation: shadows.hardMd,
    glass: shadows.none,
    glow: shadows.none,
    glowCyan: shadows.none,
  },
  radii: {
    xs: radii.xs,
    sm: radii.sm,
    md: radii.md,
    lg: radii.md,
    xl: radii.md,
    '2xl': radii.md,
    '3xl': radii.md,
    full: radii.full,
  },
  transitions: {
    fast: `all ${motion.fast}`,
    normal: `all ${motion.normal}`,
    spring: `all ${motion.spring}`,
  }
};
