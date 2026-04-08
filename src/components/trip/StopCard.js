// src/components/trip/StopCard.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, CATEGORY_META, TRANSPORT_ICONS } from '../../theme';

function CrowdBadge({ level }) {
  const colors = {
    low: { bg: COLORS.accentLight, text: COLORS.accent },
    moderate: { bg: COLORS.warningLight, text: COLORS.warning },
    high: { bg: COLORS.dangerLight, text: COLORS.danger },
  };
  const c = colors[level] || colors.low;
  const label = level.charAt(0).toUpperCase() + level.slice(1);
  return (
    <View style={[styles.crowdBadge, { backgroundColor: c.bg }]}>
      <Text style={[styles.crowdText, { color: c.text }]}>{label} crowd</Text>
    </View>
  );
}

function TransitLeg({ leg }) {
  return (
    <View style={styles.leg}>
      <View style={styles.legDot} />
      <Text style={styles.legText}>{leg.instruction}</Text>
      <Text style={styles.legDuration}>{leg.durationMinutes}m</Text>
    </View>
  );
}

export default function StopCard({ stop, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const meta = CATEGORY_META[stop.category] || CATEGORY_META.culture;
  const transportIcon = stop.transportFromPrevious ? TRANSPORT_ICONS[stop.transportFromPrevious.mode] : null;

  return (
    <View style={styles.wrapper}>
      {/* Transport connector (between stops) */}
      {stop.transportFromPrevious && (
        <View style={styles.connector}>
          <View style={styles.connectorLine} />
          <View style={styles.connectorBubble}>
            <Text style={styles.connectorIcon}>{transportIcon}</Text>
            <Text style={styles.connectorText}>
              {stop.transportFromPrevious.durationMinutes}m
              {stop.transportFromPrevious.costUSD > 0 && ` · $${stop.transportFromPrevious.costUSD}`}
            </Text>
          </View>
          <View style={styles.connectorLine} />
        </View>
      )}

      {/* Card */}
      <TouchableOpacity
        style={[styles.card, stop.isOptional && styles.cardOptional]}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.85}
      >
        {/* Left accent bar */}
        <View style={[styles.accentBar, { backgroundColor: meta.color }]} />

        <View style={styles.cardBody}>
          {/* Top row */}
          <View style={styles.topRow}>
            <View style={[styles.iconCircle, { backgroundColor: meta.bg }]}>
              <Text style={styles.categoryIcon}>{meta.icon}</Text>
            </View>
            <View style={styles.topText}>
              <Text style={styles.stopName} numberOfLines={1}>{stop.name}</Text>
              <Text style={styles.timeText}>
                {stop.arrivalTime} – {stop.departureTime}
                {stop.entranceFeeUSD > 0 && ` · $${stop.entranceFeeUSD}`}
              </Text>
            </View>
            <View style={styles.topRight}>
              {stop.stopType === 'ai_suggested' && (
                <Text style={styles.surpriseTag}>✨</Text>
              )}
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={COLORS.textMuted}
              />
            </View>
          </View>

          {/* Crowd badge */}
          <View style={styles.badgeRow}>
            <CrowdBadge level={stop.crowdLevel} />
            {stop.isOptional && (
              <View style={styles.optionalBadge}>
                <Text style={styles.optionalText}>Optional</Text>
              </View>
            )}
            {stop.optimalVisitWindow && (
              <View style={styles.windowBadge}>
                <Ionicons name="time-outline" size={11} color={COLORS.textSecondary} />
                <Text style={styles.windowText}>{stop.optimalVisitWindow}</Text>
              </View>
            )}
          </View>

          {/* Expanded details */}
          {expanded && (
            <View style={styles.details}>
              {stop.notes ? (
                <Text style={styles.notes}>{stop.notes}</Text>
              ) : null}

              {stop.surpriseMeReason ? (
                <View style={styles.surpriseReason}>
                  <Text style={styles.surpriseReasonIcon}>✨</Text>
                  <Text style={styles.surpriseReasonText}>{stop.surpriseMeReason}</Text>
                </View>
              ) : null}

              {/* Transit legs */}
              {stop.transportFromPrevious?.legs?.length > 0 && (
                <View style={styles.legsSection}>
                  <Text style={styles.legsSectionTitle}>Getting here</Text>
                  {stop.transportFromPrevious.legs.map((leg, i) => (
                    <TransitLeg key={i} leg={leg} />
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Bottom line (unless last stop) */}
      {!isLast && <View style={styles.bottomLine} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {},
  connector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 32,
    gap: 6,
  },
  connectorLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  connectorBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusFull,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  connectorIcon: { fontSize: 12 },
  connectorText: { fontSize: 11, color: COLORS.textSecondary },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 8,
  },
  cardOptional: { borderColor: COLORS.textMuted, opacity: 0.8 },
  accentBar: { width: 4 },
  cardBody: { flex: 1, padding: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIcon: { fontSize: 18 },
  topText: { flex: 1 },
  stopName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  timeText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  surpriseTag: { fontSize: 14 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  crowdBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: SIZES.radiusFull },
  crowdText: { fontSize: 11, fontWeight: '600' },
  optionalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: SIZES.radiusFull,
    backgroundColor: COLORS.border,
  },
  optionalText: { fontSize: 11, color: COLORS.textSecondary },
  windowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: SIZES.radiusFull,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  windowText: { fontSize: 11, color: COLORS.textSecondary },
  details: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  notes: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 8 },
  surpriseReason: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: COLORS.primary + '10',
    borderRadius: SIZES.radiusSm,
    padding: 10,
    marginBottom: 8,
  },
  surpriseReasonIcon: { fontSize: 14 },
  surpriseReasonText: { flex: 1, fontSize: 12, color: COLORS.primaryDark, lineHeight: 16 },
  legsSection: { marginTop: 4 },
  legsSectionTitle: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  leg: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  legDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },
  legText: { flex: 1, fontSize: 12, color: COLORS.text },
  legDuration: { fontSize: 12, color: COLORS.textSecondary },
  bottomLine: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 16, marginBottom: 8 },
});
