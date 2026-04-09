// src/components/trip/DayCard.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, formatDate } from '../../theme';
import StopCard from './StopCard';

function WeatherIcon({ pop }) {
  if (pop > 0.6) return '🌧️';
  if (pop > 0.3) return '⛅';
  return '☀️';
}

export default function DayCard({ day, onMapPress }) {
  const [collapsed, setCollapsed] = useState(false);
  const isRainyDay = day.precipitationProbability > 0.6;
  const hasMappableStops = (day.stops || []).some(
    (s) => s.coordinates?.lat && s.coordinates?.lng
  );

  return (
    <View style={styles.wrapper}>
      {/* Day header */}
      <TouchableOpacity
        style={[styles.header, isRainyDay && styles.headerRainy]}
        onPress={() => setCollapsed(!collapsed)}
        activeOpacity={0.8}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.dayNumber}>Day {day.dayNumber}</Text>
          <Text style={styles.dateText}>{formatDate(day.date)}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.weather}>
            <WeatherIcon pop={day.precipitationProbability} /> {day.weatherSummary}
          </Text>
          <View style={styles.budgetPill}>
            <Text style={styles.budgetText}>${day.budgetBreakdown?.total ?? 0}</Text>
          </View>
          {hasMappableStops && (
            <TouchableOpacity
              style={styles.mapBtn}
              onPress={(e) => { e.stopPropagation?.(); onMapPress?.(); }}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="map-outline" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          )}
          <Ionicons
            name={collapsed ? 'chevron-down' : 'chevron-up'}
            size={16}
            color={COLORS.textSecondary}
          />
        </View>
      </TouchableOpacity>

      {/* Rain warning */}
      {isRainyDay && !collapsed && (
        <View style={styles.rainBanner}>
          <Ionicons name="rainy-outline" size={14} color={COLORS.primary} />
          <Text style={styles.rainText}>
            Rain forecast — outdoor stops have been swapped for indoor alternatives.
          </Text>
        </View>
      )}

      {/* Narrative */}
      {!collapsed && day.narrative ? (
        <View style={styles.narrativeRow}>
          <Text style={styles.narrative}>{day.narrative}</Text>
        </View>
      ) : null}

      {/* Stops */}
      {!collapsed && (
        <View style={styles.stops}>
          {day.stops.map((stop, index) => (
            <StopCard
              key={stop.id}
              stop={stop}
              isLast={index === day.stops.length - 1}
            />
          ))}
        </View>
      )}

      {/* Budget breakdown (collapsed shows summary) */}
      {!collapsed && day.budgetBreakdown && (
        <View style={styles.budgetRow}>
          <BudgetItem icon="ticket-outline"    label="Entry"     value={day.budgetBreakdown.entranceFees  ?? 0} />
          <BudgetItem icon="train-outline"     label="Transport" value={day.budgetBreakdown.transport     ?? 0} />
          <BudgetItem icon="restaurant-outline" label="Meals"   value={day.budgetBreakdown.meals         ?? 0} />
          <BudgetItem icon="card-outline"      label="Other"     value={day.budgetBreakdown.discretionary ?? 0} />
        </View>
      )}

      {day.budgetBreakdown?.transitPassRecommended && !collapsed && (
        <View style={styles.transitPassTip}>
          <Ionicons name="information-circle-outline" size={14} color={COLORS.primary} />
          <Text style={styles.transitPassText}>
            A day transit pass is recommended — cheaper than buying single tickets today.
          </Text>
        </View>
      )}
    </View>
  );
}

function BudgetItem({ icon, label, value }) {
  return (
    <View style={styles.budgetItem}>
      <Ionicons name={icon} size={13} color={COLORS.textSecondary} />
      <Text style={styles.budgetLabel}>{label}</Text>
      <Text style={styles.budgetValue}>${value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.padding,
    backgroundColor: COLORS.card,
  },
  headerRainy: { backgroundColor: COLORS.primary + '08' },
  headerLeft: {},
  dayNumber: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  dateText: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weather: { fontSize: 12, color: COLORS.textSecondary },
  budgetPill: {
    backgroundColor: COLORS.accent + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: SIZES.radiusFull,
  },
  mapBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: COLORS.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  budgetText: { fontSize: 12, color: COLORS.accent, fontWeight: '600' },
  rainBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 8,
  },
  rainText: { flex: 1, fontSize: 12, color: COLORS.primaryDark, lineHeight: 16 },
  narrativeRow: {
    paddingHorizontal: SIZES.padding,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  narrative: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, fontStyle: 'italic' },
  stops: { padding: SIZES.padding, paddingBottom: 4 },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SIZES.padding,
  },
  budgetItem: { alignItems: 'center', gap: 3 },
  budgetLabel: { fontSize: 11, color: COLORS.textSecondary },
  budgetValue: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  transitPassTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: COLORS.primary + '08',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 8,
  },
  transitPassText: { flex: 1, fontSize: 12, color: COLORS.primaryDark, lineHeight: 16 },
});
