
# Theme Color Change Plan
## Switching to Indigo/Purple Palette

---

## Overview

This plan updates the entire application's color theme from teal to a modern **Indigo/Purple** palette while preserving all functionality, layouts, and features. This is a CSS-only change affecting the design system variables.

---

## New Color Palette

### Primary Colors (Indigo)
- **Primary**: `245 75% 60%` - Vibrant indigo (#6366F1)
- **Primary Foreground**: `0 0% 100%` - White text

### Accent Colors (Purple tint)
- **Accent**: `245 60% 97%` - Very light indigo wash
- **Accent Foreground**: `245 75% 45%` - Darker indigo for text

### Ring/Focus
- **Ring**: `245 75% 60%` - Matches primary for consistency

### Sidebar (Dark Theme with Indigo)
- **Sidebar Background**: `245 47% 11%` - Dark indigo-tinted gray
- **Sidebar Primary**: `245 75% 65%` - Brighter indigo for dark bg
- **Sidebar Accent**: `245 47% 16%` - Subtle hover states
- **Sidebar Ring**: `245 75% 65%`

### Dark Mode (Indigo-based)
- **Primary**: `245 70% 65%` - Slightly brighter for dark mode
- **Accent**: `245 50% 15%` - Dark indigo tint
- **Accent Foreground**: `245 70% 75%` - Light indigo text

---

## File Changes

### File: `src/index.css`

Update CSS custom properties in `:root` and `.dark`:

**Light Mode Changes:**
```css
:root {
  /* Primary - Modern Indigo */
  --primary: 245 75% 60%;
  --primary-foreground: 0 0% 100%;

  /* Accent - subtle indigo tint */
  --accent: 245 60% 97%;
  --accent-foreground: 245 75% 45%;

  /* Ring matches primary */
  --ring: 245 75% 60%;

  /* Sidebar - dark indigo theme */
  --sidebar-background: 245 47% 11%;
  --sidebar-foreground: 240 14% 96%;
  --sidebar-primary: 245 75% 65%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 245 47% 16%;
  --sidebar-accent-foreground: 240 14% 96%;
  --sidebar-border: 245 47% 18%;
  --sidebar-ring: 245 75% 65%;
}
```

**Dark Mode Changes:**
```css
.dark {
  --primary: 245 70% 65%;
  --primary-foreground: 0 0% 100%;

  --accent: 245 50% 15%;
  --accent-foreground: 245 70% 75%;

  --ring: 245 70% 65%;

  --sidebar-background: 245 47% 4%;
  --sidebar-primary: 245 70% 65%;
  --sidebar-accent: 245 47% 10%;
  --sidebar-border: 245 47% 12%;
  --sidebar-ring: 245 70% 65%;
}
```

**Gradient Utility Update:**
```css
.gradient-hero {
  background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(245 75% 50%) 100%);
}
```

---

## What Changes Visually

| Element | Before (Teal) | After (Indigo) |
|---------|---------------|----------------|
| Primary buttons | Teal (#14B8A6) | Indigo (#6366F1) |
| Focus rings | Teal glow | Indigo glow |
| Active nav items | Teal highlight | Indigo highlight |
| Links/CTAs | Teal accents | Indigo accents |
| Hero gradients | Teal gradient | Indigo gradient |
| Sidebar accents | Teal highlights | Indigo highlights |
| Badges (primary) | Teal background | Indigo background |
| Progress bars | Teal fill | Indigo fill |

---

## What Stays the Same

- All background colors (white/gray neutrals)
- All text colors (dark grays)
- All border colors (light grays)
- Success color (green)
- Warning color (orange)
- Destructive color (red)
- All layouts, spacing, typography
- All features and functionality
- All animations and transitions
- Border radius and shadows

---

## Files Modified

1. **`src/index.css`** - Update CSS custom properties for primary, accent, ring, and sidebar colors in both light and dark modes

---

## Result

The application will have a modern, trustworthy Indigo/Purple aesthetic similar to Linear, Stripe, and Notion - conveying professionalism and innovation while maintaining excellent readability and accessibility.
