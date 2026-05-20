export const designTokens = {
  colors: {
    primary: {
      light: '#0f172a',
      dark: '#020617',
      foreground: '#ffffff',
    },
    accent: {
      emerald: '#047857',
      gold: '#d97706',
    },
    surface: {
      light: '#ffffff',
      muted: '#f8fafc',
      dark: '#111827',
      charcoal: '#0f172a',
    },
    semantic: {
      success: '#059669',
      warning: '#d97706',
      danger: '#dc2626',
    },
  },
  radius: {
    sm: '6px',
    md: '8px',
    lg: '8px',
  },
  shadow: {
    card: '0 1px 2px rgba(15, 23, 42, 0.06)',
    raised: '0 16px 40px rgba(15, 23, 42, 0.12)',
  },
}

export const designPrinciples = [
  'Navigation only exposes enabled modules; locked modules are handled inside Upgrade Plan.',
  'Operational pages prioritize dense but readable business data over decorative layout.',
  'Mobile owner workflows use large touch targets and short forms for fast front-counter use.',
  'Light mode uses clean white surfaces; dark mode uses dark charcoal with high-contrast text.',
  'Emerald is used for primary action and success; gold/amber is used for attention and warnings.',
]
