# NEXIS — Warm PulseAI Design System Specification

## 1. Design Vision & Philosophy

The NEXIS Design System transitions the application away from generic dark cyberpunk clichés toward a **warm, intelligent, editorial aesthetic** directly inspired by the reference PulseAI analytics interface:
- **Warm Editorial Ivory Canvas**: Deeply pleasant to human eyes over extended 8-hour career search sessions.
- **Elevated Crisp White Surfaces**: Delicately bordered cards floating on subtle warm drops.
- **High-Contrast Dark Graphite Typography**: Pin-sharp legibility without harsh absolute black.
- **Vivid Energetic Orange Primary Accent (`#F47B20`)**: Driving intentional user attention to high-value actions (Applying, Tailoring, Exporting).
- **Pill Navigation & Tactile Micro-Interactions**: Rounded pill containers, textured status tags, and smooth cubic bezier transitions.

---

## 2. Color Palette & Tokens

### 2.1 Surfaces & Backgrounds
```css
--nx-canvas-bg: #F8F3EC;        /* Main application page background */
--nx-canvas-tint: #F3ECE2;      /* Secondary shell frame / gutter tint */
--nx-surface: #FFFFFF;          /* Elevated card surface */
--nx-surface-warm: #FFFDF9;     /* Soft ivory surface */
--nx-surface-alt: #F7F2EA;      /* Nested item background / table header */
--nx-surface-hover: #F2ECE2;    /* Interactive item hover state */
```

### 2.2 Borders & Dividers
```css
--nx-border: #EADFCF;           /* Standard card and container border */
--nx-border-subtle: #F2EAE0;    /* Internal item dividers */
--nx-border-focus: #F47B20;     /* Active input focus ring */
```

### 2.3 Typography Colors
```css
--nx-text-primary: #181512;     /* Headings, metrics, active labels */
--nx-text-secondary: #6A6359;   /* Descriptions, subheaders, neutral tags */
--nx-text-muted: #999084;       /* Timestamps, metadata, inactive indicators */
--nx-text-inverse: #FFFFFF;     /* Text on dark buttons & primary orange */
```

### 2.4 Brand & Semantic Accents
```css
/* Primary Brand: PulseAI Vivid Orange */
--nx-primary: #F47B20;
--nx-primary-hover: #E36D13;
--nx-primary-active: #CC5D08;
--nx-primary-soft: #FFF0E4;
--nx-primary-border: #FDCBA7;

/* Dark Contrast Neutral */
--nx-dark-btn: #181512;
--nx-dark-btn-hover: #2B2621;

/* Semantic Feedback */
--nx-success: #2E8555;
--nx-success-soft: #E8F6EE;
--nx-warning: #C98218;
--nx-warning-soft: #FEF6E9;
--nx-danger: #D9453B;
--nx-danger-soft: #FDEEED;
--nx-info: #3A7BD5;
--nx-info-soft: #EDF4FC;
```

---

## 3. Typography Scale & Hierarchy

| Role | Font Size | Line Height | Weight | Tracking | Example Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | 32px (`2rem`) | 38px | 700 (Bold) | -0.025em | Main Page Titles ("Analytics Overview", "Job Matches") |
| **Heading 1** | 24px (`1.5rem`) | 30px | 700 (Bold) | -0.02em | Section Titles ("Total Requests", "Model Performance") |
| **Heading 2** | 18px (`1.125rem`) | 24px | 600 (Semibold) | -0.015em | Card Titles, Modal Headers |
| **Heading 3** | 15px (`0.9375rem`)| 20px | 600 (Semibold) | -0.01em | Table Headers, Stat Labels |
| **Body Primary**| 14px (`0.875rem`)| 20px | 500 (Medium) | normal | Job descriptions, STAR bullets, form inputs |
| **Body Muted** | 13px (`0.8125rem`)| 18px | 400 (Regular) | normal | Secondary descriptions, timestamps, help text |
| **Caption / Pill**| 11px (`0.6875rem`)| 14px | 600 (Semibold) | 0.02em | Status badges, category pills, trend indicators |

Font stack: `'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.

---

## 4. Radii, Spacing & Elevation

### 4.1 Border Radii
- **Pill**: `9999px` (`rounded-full`) — Navigation capsules, status badges, search bars.
- **Card**: `16px` (`rounded-2xl`) — Primary metric and content panels.
- **Input / Button**: `10px - 12px` (`rounded-xl`) — Standard interactives.
- **Small Chip**: `6px` (`rounded-md`) — Inline code, keyboard shortcuts (`Cmd+K`).

### 4.2 Elevation & Shadows
- **Card Drop Shadow**: `0 4px 20px -2px rgba(180, 150, 120, 0.08), 0 1px 4px rgba(160, 130, 100, 0.04)`
- **Modal / Floating Drawer**: `0 20px 40px -8px rgba(130, 100, 70, 0.16), 0 4px 12px rgba(100, 80, 60, 0.06)`
- **Pill Active Tab**: `0 2px 8px rgba(0, 0, 0, 0.06)`

---

## 5. Standard Component Specifications

### 5.1 NexusTopbar (PulseAI Pill Header)
- Height: `72px`
- Brand mark on left: Vivid orange rounded box with logo icon + "NEXIS" in bold tracking.
- Navigation Center: Pill capsule container `#EFE7DC` housing active white pill tab with subtle shadow.
- Action Right:
  - Search pill with icon (`Q Search jobs, skills, agents...`).
  - Notification bell with unread dot.
  - Settings button.
  - 3D Agent Office toggle (expand/collapse simulation stage).

### 5.2 NexusMetric Card
- White surface, `rounded-2xl`, subtle warm border `#EADFCF`.
- Header: Label (`Total Cost`, `Fit Rating`, `Career Velocity`) + upward trend icon `↗`.
- Primary stat: Giant bold metric (`+12.5%`, `94/100`, `28 Matches`).
- Secondary: Split indicators (`Current` vs `Previous`) with textured micro-pattern chips.
- Footer: Bottom-line value (`$4,285.50`, `High Confidence`).

### 5.3 NexusButton Variants
- **Primary**: Solid orange (`#F47B20`), white text, shadow `0 2px 8px rgba(244, 123, 32, 0.25)`.
- **Dark Neutral**: Rich near-black (`#181512`), white text, sleek tactile feel.
- **Secondary White**: White surface, `#EADFCF` border, `#181512` text.
- **Ghost**: Transparent, hover surface `#F2ECE2`, `#6A6359` text.
