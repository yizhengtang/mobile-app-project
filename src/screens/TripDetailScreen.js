// src/screens/TripDetailScreen.js
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTrips } from '../context/TripContext';
import { COLORS, SIZES, TRIP_THEMES, formatDateRange, tripDuration, countryFlag } from '../theme';
import DayCard from '../components/trip/DayCard';

// ── Hero illustration (full-width, no safe area at top) ───────────────────────
function HeroIllustration({ trip, onBack, onFavourite }) {
  const city  = trip.destination?.city || '';
  const theme = TRIP_THEMES[city] || TRIP_THEMES.default;

  return (
    <View style={[styles.hero, { backgroundColor: theme.bg }]}>
      {/* Blobs */}
      <View style={[styles.heroBlob1, { backgroundColor: theme.accentBg }]} />
      <View style={[styles.heroBlob2, { backgroundColor: theme.accentBg }]} />

      {/* Main emoji */}
      <Text style={styles.heroEmoji}>{theme.emoji}</Text>
      <Text style={styles.heroScene}>{theme.scene}</Text>

      {/* Overlay buttons */}
      <TouchableOpacity style={styles.heroBack} onPress={onBack}>
        <Ionicons name="chevron-back" size={20} color={COLORS.text} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.heroHeart} onPress={onFavourite}>
        <Ionicons name="heart-outline" size={18} color={COLORS.text} />
      </TouchableOpacity>
    </View>
  );
}

// ── Quick-action button (Itinerary / Budget / Chat) ───────────────────────────
function QuickAction({ icon, label, onPress, accent }) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.quickActionIcon, { backgroundColor: accent + '20' }]}>
        <Text style={styles.quickActionEmoji}>{icon}</Text>
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function TripDetailScreen({ route, navigation }) {
  const { tripId } = route.params;
  const { getTripById, deleteTrip } = useTrips();
  const trip = getTripById(tripId);
  const [selectedDay, setSelectedDay] = useState(null);

  if (!trip) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Trip not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function handleDelete() {
    Alert.alert('Delete Trip', `Delete "${trip.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteTrip(trip.id); navigation.goBack(); } },
    ]);
  }

  const displayedDays = selectedDay !== null
    ? trip.days.filter((d) => d.dayNumber === selectedDay)
    : trip.days;

  const isPending = trip.status === 'pending';
  const flag = countryFlag(trip.destination?.country);

  return (
    <View style={styles.container}>
      {/* Hero — sits behind the status bar on purpose */}
      <HeroIllustration
        trip={trip}
        onBack={() => navigation.goBack()}
        onFavourite={() => {}}
      />

      <ScrollView
        style={styles.sheet}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── Trip header card ── */}
        <View style={styles.headerCard}>
          <Text style={styles.tripTitle}>{trip.name}</Text>

          <View style={styles.destinationRow}>
            <Text style={styles.flagText}>{flag}</Text>
            <Text style={styles.destinationText}>
              {trip.destination.city}
              {trip.destination.country ? `, ${trip.destination.country}` : ''}
            </Text>
          </View>

          {/* Meta pills */}
          <View style={styles.metaPills}>
            <View style={styles.metaPill}>
              <Ionicons name="calendar-outline" size={13} color={COLORS.primary} />
              <Text style={styles.metaPillText}>{formatDateRange(trip.startDate, trip.endDate)}</Text>
            </View>
            <View style={styles.metaPill}>
              <Ionicons name="time-outline" size={13} color={COLORS.primary} />
              <Text style={styles.metaPillText}>{tripDuration(trip.startDate, trip.endDate)}</Text>
            </View>
            {trip.totalBudget && (
              <View style={styles.metaPill}>
                <Ionicons name="wallet-outline" size={13} color={COLORS.primary} />
                <Text style={styles.metaPillText}>${trip.totalBudget}</Text>
              </View>
            )}
          </View>

          {/* Quick actions */}
          <View style={styles.quickActions}>
            <QuickAction icon="📅" label="Itinerary"  accent={COLORS.primary}  onPress={() => {}} />
            <QuickAction icon="💰" label="Budget"     accent="#2DC653"          onPress={() => {}} />
            <QuickAction icon="💬" label="Refine"     accent="#8B5CF6"
              onPress={() => navigation.navigate('Chat', { tripId: trip.id })}
            />
            <QuickAction icon="🗑️" label="Delete"    accent={COLORS.danger}   onPress={handleDelete} />
          </View>
        </View>

        {/* ── Pending banner ── */}
        {isPending && (
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingEmoji}>✨</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.pendingTitle}>Generating your itinerary…</Text>
              <Text style={styles.pendingSubtitle}>
                The AI is building your personalised day-by-day plan.
              </Text>
            </View>
          </View>
        )}

        {/* ── Day selector ── */}
        {!isPending && trip.days.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginVertical: 12 }}
            contentContainerStyle={styles.daySelectorContent}
          >
            <TouchableOpacity
              style={[styles.dayPill, selectedDay === null && styles.dayPillActive]}
              onPress={() => setSelectedDay(null)}
            >
              <Text style={[styles.dayPillText, selectedDay === null && styles.dayPillTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {trip.days.map((d) => (
              <TouchableOpacity
                key={d.dayNumber}
                style={[styles.dayPill, selectedDay === d.dayNumber && styles.dayPillActive]}
                onPress={() => setSelectedDay(d.dayNumber === selectedDay ? null : d.dayNumber)}
              >
                <Text style={[styles.dayPillText, selectedDay === d.dayNumber && styles.dayPillTextActive]}>
                  Day {d.dayNumber}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ── Day cards ── */}
        {!isPending && trip.days.length > 0 && (
          <View style={styles.daysContainer}>
            {displayedDays.map((day) => (
              <DayCard key={day.date} day={day} />
            ))}
          </View>
        )}

        {/* ── No days yet ── */}
        {!isPending && trip.days.length === 0 && (
          <View style={styles.noDays}>
            <Text style={styles.noDaysIcon}>📋</Text>
            <Text style={styles.noDaysTitle}>No itinerary yet</Text>
            <Text style={styles.noDaysSub}>Connect the backend to generate your AI-powered plan.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Hero
  hero: {
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroBlob1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    top: -60, left: -50, opacity: 0.5,
  },
  heroBlob2: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    bottom: -40, right: -30, opacity: 0.4,
  },
  heroEmoji: { fontSize: 80, zIndex: 1 },
  heroScene: { fontSize: 28, position: 'absolute', bottom: 24, right: 32, zIndex: 1 },
  heroBack: {
    position: 'absolute', top: 48, left: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  heroHeart: {
    position: 'absolute', top: 48, right: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },

  // White sheet below hero
  sheet: { flex: 1 },

  // Header card
  headerCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: SIZES.padding,
    marginTop: -20,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.padding,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 4,
  },
  tripTitle:       { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  destinationRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  flagText:        { fontSize: 18, marginRight: 6 },
  destinationText: { fontSize: 15, color: COLORS.textSecondary },

  metaPills:  { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  metaPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.primaryBg,
    borderRadius: SIZES.radiusFull,
    paddingHorizontal: 10, paddingVertical: 5,
    marginRight: 8, marginBottom: 6,
  },
  metaPillText: { fontSize: 12, color: COLORS.primary, fontWeight: '600', marginLeft: 4 },

  quickActions: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 4 },
  quickAction:  { alignItems: 'center' },
  quickActionIcon: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 5,
  },
  quickActionEmoji: { fontSize: 20 },
  quickActionLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },

  // Pending
  pendingBanner: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: COLORS.primaryBg,
    marginHorizontal: SIZES.padding, borderRadius: SIZES.radius,
    padding: SIZES.padding, marginTop: 16,
  },
  pendingEmoji:    { fontSize: 24, marginRight: 12 },
  pendingTitle:    { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  pendingSubtitle: { fontSize: 13, color: COLORS.textSecondary },

  // Day selector
  daySelectorContent: { paddingHorizontal: SIZES.padding, alignItems: 'center' },
  dayPill: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: SIZES.radiusFull,
    backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.border,
    marginRight: 8,
  },
  dayPillActive:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dayPillText:       { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  dayPillTextActive: { color: COLORS.white },

  daysContainer: { paddingHorizontal: SIZES.padding, paddingTop: 4 },

  // No days
  noDays:    { alignItems: 'center', padding: 48 },
  noDaysIcon:  { fontSize: 40, marginBottom: 12 },
  noDaysTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  noDaysSub:   { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },

  // Not found
  notFound:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, color: COLORS.textSecondary },
  backLink:     { fontSize: 15, color: COLORS.primary, fontWeight: '600', marginTop: 12 },
});
