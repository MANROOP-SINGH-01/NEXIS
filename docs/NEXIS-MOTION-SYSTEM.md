# NEXIS — MOTION SYSTEM & INTERACTION ENGINEERING SPECIFICATION

**Product**: NEXIS — AI Career Intelligence & Career Orchestration OS  
**Design Reference**: Emil Kowalski Design Engineering & Impeccable Guidelines  
**Status**: Production-Ready  
**Motion Intensity Level**: `3 / 10` (Restrained, Productive, Instantaneous)  
**Date**: September 2026  

---

## 1. Core Philosophy: Motion With Purpose

In a daily-use productivity tool like NEXIS, motion must communicate state, spatial continuity, or focus. It must never exist purely as ornamental decoration.

> *"If an animation feels like it's taking time away from the user, it is a bug. Motion should feel like physical responsiveness, not a theatre performance."*

### Starting Targets:
- **`DESIGN_VARIANCE`**: `5 / 10` (Structured, editorial, deliberate visual balance)
- **`MOTION_INTENSITY`**: `3 / 10` (Fast, physics-grounded, unobtrusive)
- **`VISUAL_DENSITY`**: `5 / 10` (High information yield, generous breathing room)

---

## 2. Animation Vocabulary & Spatial Models

| Motion Type | Trigger | Implementation | Duration / Physics | Visual Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Tactile Press** | `active` state on buttons & cards | CSS `transform: scale(0.98)` | `80ms` ease-out | Confirms user touch/click instantly without lag. |
| **Pill Slider** | Nav tab change (`.nx-nav-tab`) | CSS transition on `background` & `box-shadow` | `150ms` cubic-bezier(0.16, 1, 0.3, 1) | Shows active workspace focus smoothly. |
| **Modal / Dialog** | Launching ATS Prep, BYOK, Cover Letter | `scale(0.96) -> scale(1)` + `opacity: 0 -> 1` | `180ms` spring (damping: 28, stiffness: 320) | Anchors modal in screen center without bouncing. |
| **Drawer Slide** | Agent telemetry drawer, mobile menu | `translateX(100%) -> translateX(0)` | `220ms` ease-out | Communicates supplementary context panel. |
| **Chart Hover** | Bar chart tooltip on overview | `opacity: 0 -> 1` + subtle crosshair highlight | `100ms` linear | Instantaneous data readout during rapid mouse scan. |
| **Progress Ring** | Skill gap coverage match ring | SVG `stroke-dashoffset` transition | `400ms` cubic-bezier(0.16, 1, 0.3, 1) | Renders once on role load to communicate benchmark. |
| **Status Pulse** | Active agent working indicator | CSS opacity pulse `0.6 -> 1.0` | `2000ms` infinite ease-in-out | Subtly signals background SSE stream activity. |

---

## 3. Explicitly Banned Motion Anti-Patterns

1. **No Elastic / Jello Bouncing**: Elastic spring overshoot on dropdowns, modals, and tooltips is banned. It feels cartoonish and slows down workflows.
2. **No Ornamental Infinite Motion**: No floating decorative gradient orbs, no rotating border gradients, and no particle effects.
3. **No Slow Entrance Ladders**: Staggered list animations with delays >40ms per item are prohibited. Users should never wait to read a table or job list.
4. **No Scale-from-Zero Popups**: Elements must enter from ~95-97% scale, never from 0%.
5. **No Text Scramble / Typewriter Effects on Production UI**: Text must render instantly. Scrambling characters waste attention and hinder screen readers.

---

## 4. Accessibility & Reduced Motion

NEXIS strictly honors the user's operating system preferences via the `@media (prefers-reduced-motion: reduce)` query:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  .nx-nav-tab,
  .nx-btn,
  .custom-scrollbar {
    transition: none !important;
  }
}
```

When reduced motion is enabled:
- All transforms and position shifts become instant state changes.
- Pulse indicators remain static with high-contrast color badges.
- Screen transitions cross-fade instantaneously.

---

## 5. Implementation in NEXIS Primitives

### Button Press Feedback
```css
.nx-btn-primary {
  transition: all 120ms cubic-bezier(0.16, 1, 0.3, 1);
}

.nx-btn-primary:active:not(:disabled) {
  transform: scale(0.975);
  box-shadow: 0 1px 2px rgba(244, 123, 32, 0.2);
}
```

### Nav Tab Sliding Pill
```css
.nx-nav-capsule {
  display: inline-flex;
  align-items: center;
  padding: 4px;
  background-color: #EFE7DC;
  border: 1px solid #E5DBCF;
  border-radius: 9999px;
  gap: 2px;
}

.nx-nav-tab {
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 9999px;
  color: #6A6359;
  transition: all 150ms cubic-bezier(0.16, 1, 0.3, 1);
}

.nx-nav-tab.active {
  background-color: #FFFFFF;
  color: #181512;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
```

---

## 6. Summary

The NEXIS motion system reinforces the calm, editorial, and professional feeling of an institutional intelligence workstation. Animations feel snappy, tactile, and purposeful, enhancing spatial cognition while respecting user time and hardware efficiency.
