// src/theme.js

export const COLORS = {
  // Primary — orange (CTAs, active states, accents)
  primary:      '#FF6B35',
  primaryDark:  '#E55A25',
  primaryLight: '#FF8F5E',
  primaryBg:    '#FFF4F0',   // very light orange tint

  // Background & surfaces
  background:   '#F5F0E8',   // warm cream
  card:         '#FFFFFF',
  cardAlt:      '#FAF8F5',   // slightly warm card
  border:       '#EDE8DF',

  // Text
  text:          '#1C1C2E',
  textSecondary: '#8E8E93',
  textMuted:     '#C7C7CC',
  white:         '#FFFFFF',
  dark:          '#1C1C2E',  // for filled chips / dark buttons

  // Status
  accent:        '#2DC653',
  accentLight:   '#E8F9ED',
  warning:       '#FF9500',
  warningLight:  '#FFF4E5',
  danger:        '#FF3B30',
  dangerLight:   '#FFF0EE',

  // Crowd levels
  crowdLow:      '#2DC653',
  crowdModerate: '#FF9500',
  crowdHigh:     '#FF3B30',

  // Category
  culture:       '#8B5CF6',
  food:          '#F97316',
  nature:        '#10B981',
  shopping:      '#EC4899',
  transit:       '#6B7280',
  accommodation: '#3B82F6',
  break:         '#D1D5DB',
};

export const SIZES = {
  padding:    16,
  paddingSm:  8,
  paddingLg:  24,
  radius:     16,
  radiusSm:   10,
  radiusLg:   20,
  radiusFull: 999,
};

// Per-destination illustration themes used in trip cards
export const TRIP_THEMES = {
  Tokyo:     { emoji: '🗼', bg: '#FFE4DE', scene: '🌸', accentBg: '#FFCEC5' },
  Paris:     { emoji: '🗼', bg: '#EDE8FF', scene: '🥐', accentBg: '#D4C9FF' },
  Barcelona: { emoji: '🏖️', bg: '#DBEAFE', scene: '☀️', accentBg: '#BFDBFE' },
  London:    { emoji: '🎡', bg: '#F0FFF4', scene: '☁️', accentBg: '#BBFFCC' },
  Rome:      { emoji: '🏛️', bg: '#FFF9E6', scene: '🍕', accentBg: '#FFEFC0' },
  Kyoto:     { emoji: '⛩️', bg: '#FFF0F5', scene: '🌸', accentBg: '#FFD6E5' },
  default:   { emoji: '✈️', bg: '#E8F5E9', scene: '🌿', accentBg: '#C8EACB' },
};

export const CATEGORY_META = {
  culture:       { label: 'Culture',      icon: '🏛️', color: '#8B5CF6', bg: '#EDE9FE' },
  food:          { label: 'Food & Drink', icon: '🍽️', color: '#F97316', bg: '#FFEDD5' },
  nature:        { label: 'Nature',       icon: '🌿', color: '#10B981', bg: '#D1FAE5' },
  shopping:      { label: 'Shopping',     icon: '🛍️', color: '#EC4899', bg: '#FCE7F3' },
  transit:       { label: 'Transit',      icon: '🚆', color: '#6B7280', bg: '#F3F4F6' },
  accommodation: { label: 'Hotel',        icon: '🏨', color: '#3B82F6', bg: '#DBEAFE' },
  break:         { label: 'Break',        icon: '☕', color: '#D1D5DB', bg: '#F9FAFB' },
};

export const TRANSPORT_ICONS = {
  walk:    '🚶',
  drive:   '🚗',
  transit: '🚇',
  cycle:   '🚴',
};

// Country flag emoji helper
const COUNTRY_FLAGS = {
  Japan: '🇯🇵', France: '🇫🇷', Spain: '🇪🇸', Germany: '🇩🇪',
  Italy: '🇮🇹', UK: '🇬🇧', USA: '🇺🇸', Ireland: '🇮🇪',
};
export function countryFlag(country) {
  return COUNTRY_FLAGS[country] || '🌍';
}

export function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' });
}

export function formatDateRange(start, end) {
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export function tripDuration(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.round((e - s) / (1000 * 60 * 60 * 24));
  return `${diff} day${diff !== 1 ? 's' : ''}`;
}
