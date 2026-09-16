// theme.ts
// CLC CRM Design System - Mobile Tokens

export const colors = {
  cream: '#F4F3E4',
  ink: '#111111',
  white: '#FFFFFF',
  border: '#E5E7EB',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  online: '#22C55E',
  accentEmerald: '#059669',
  // Backgrounds - strictly white/ink for mobile screens per design system
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSubtle: '#F9FAFB',
};

export const radius = {
  panel: 24,
  card: 16,
  button: 12,
  pill: 9999,
};

export const type = {
  display: { fontSize: 34, fontWeight: '800' as const },
  heading: { fontSize: 17, fontWeight: '600' as const },
  cardTitle: { fontSize: 15, fontWeight: '600' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
  subtext: { fontSize: 13, fontWeight: '400' as const },
};
