// src/screens/HomeScreen.js
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTrips } from '../context/TripContext';
import { COLORS, SIZES, TRIP_THEMES, formatDateRange, tripDuration, countryFlag } from '../theme';

// ── Illustrated card top area ─────────────────────────────────────────────────
function TripIllustration({ trip }) {
  const city = trip.destination?.city || '';
  const theme = TRIP_THEMES[city] || TRIP_THEMES.default;

  return (
    <View style={[styles.illustration, { backgroundColor: theme.bg }]}>
      {/* Decorative blobs */}
      <View style={[styles.blob1, { backgroundColor: theme.accentBg }]} />
      <View style={[styles.blob2, { backgroundColor: theme.accentBg }]} />

      {/* Rating badge */}
      <View style={styles.ratingBadge}>
        <Text style={styles.ratingStar}>⭐</Text>
        <Text style={styles.ratingNum}>4.9</Text>
      </View>

      {/* Heart */}
      <TouchableOpacity style={styles.heartBtn} activeOpacity={0.8}>
        <Ionicons name="heart-outline" size={15} color={COLORS.textSecondary} />
      </TouchableOpacity>

      {/* Main emoji */}
      <Text style={styles.mainEmoji}>{theme.emoji}</Text>
      <Text style={styles.sceneEmoji}>{theme.scene}</Text>
    </View>
  );
}

// ── Trip card ─────────────────────────────────────────────────────────────────
function TripCard({ trip, onPress }) {
  const flag = countryFlag(trip.destination?.country);
  const isPending = trip.status === 'pending';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <TripIllustration trip={trip} />

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{trip.name}</Text>

        <View style={styles.cardCountryRow}>
          <Text style={styles.cardFlag}>{flag}</Text>
          <Text style={styles.cardCountry}>
            {trip.destination.city}{trip.destination.country ? `, ${trip.destination.country}` : ''}
          </Text>
        </View>

        <View style={styles.cardMeta}>
          <Ionicons name="calendar-outline" size={12} color={COLORS.textMuted} />
          <Text style={styles.cardDates}>{formatDateRange(trip.startDate, trip.endDate)}</Text>
          <Text style={styles.cardDot}>·</Text>
          <Text style={styles.cardDates}>{tripDuration(trip.startDate, trip.endDate)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.detailsBtn, isPending && styles.detailsBtnGray]}
          onPress={onPress}
          activeOpacity={0.85}
        >
          <Text style={[styles.detailsBtnText, isPending && styles.detailsBtnTextGray]}>
            {isPending ? 'Generating…' : 'Show details'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ── Filter chip ───────────────────────────────────────────────────────────────
function FilterChip({ label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
const FILTERS = ['All', '🇯🇵 Japan', '🇫🇷 France', '🇪🇸 Spain'];

export default function HomeScreen({ navigation }) {
  const { getTrips } = useTrips();
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');
  const trips = getTrips();

  const filtered = trips.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.destination.city.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = activeFilter === 'All' ||
      activeFilter.includes(t.destination.country);
    return matchesSearch && matchesFilter;
  });

  const upcoming = filtered.filter((t) => new Date(t.startDate) >= new Date());
  const past     = filtered.filter((t) => new Date(t.startDate) <  new Date());

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.locationLabel}>Location</Text>
            <View style={styles.locationRow}>
              <Text style={styles.locationCity}>Wayfarer</Text>
              <Ionicons name="chevron-down" size={16} color={COLORS.text} />
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="notifications-outline" size={20} color={COLORS.text} />
            </TouchableOpacity>
            <View style={styles.avatar}>
              <Text style={styles.avatarEmoji}>👤</Text>
            </View>
          </View>
        </View>

        {/* ── Search ── */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search destinations…"
              placeholderTextColor={COLORS.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity style={styles.filterBtn}>
            <Ionicons name="options-outline" size={18} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* ── Filter chips ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsContent}
        >
          {FILTERS.map((f) => (
            <FilterChip
              key={f}
              label={f}
              active={activeFilter === f}
              onPress={() => setActiveFilter(f)}
            />
          ))}
        </ScrollView>

        {/* ── Upcoming trips ── */}
        {upcoming.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Trips</Text>
              <TouchableOpacity>
                <Text style={styles.viewAll}>View all  ›</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardsRow}
            >
              {upcoming.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onPress={() => navigation.navigate('TripDetail', { tripId: trip.id })}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Past trips ── */}
        {past.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Past Trips</Text>
              <TouchableOpacity>
                <Text style={styles.viewAll}>View all  ›</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardsRow}
            >
              {past.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onPress={() => navigation.navigate('TripDetail', { tripId: trip.id })}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Empty state ── */}
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🗺️</Text>
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap Plan Trip below to start your first adventure.
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('Plan')}
            >
              <Text style={styles.emptyBtnText}>Plan a Trip</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const CARD_WIDTH = 260;
const ILLUSTRATION_HEIGHT = 160;

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 32 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingTop: 16,
    paddingBottom: 8,
  },
  locationLabel: { fontSize: 12, color: COLORS.textSecondary },
  locationRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  locationCity:  { fontSize: 20, fontWeight: '800', color: COLORS.text, marginRight: 4 },
  headerRight:   { flexDirection: 'row', alignItems: 'center' },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.card,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 20 },

  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    marginTop: 12,
    marginBottom: 16,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusFull,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: COLORS.text },
  filterBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: COLORS.dark,
    alignItems: 'center', justifyContent: 'center',
  },

  // Chips
  chipsScroll:   { maxHeight: 42 },
  chipsContent:  { paddingHorizontal: SIZES.padding, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: SIZES.radiusFull,
    backgroundColor: COLORS.card,
    marginRight: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  chipActive:     { backgroundColor: COLORS.dark },
  chipText:       { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.white },

  // Section
  section:       { marginTop: 24 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SIZES.padding, marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  viewAll:      { fontSize: 13, fontWeight: '600', color: COLORS.primary },

  // Cards row (horizontal)
  cardsRow: { paddingHorizontal: SIZES.padding, paddingBottom: 4 },

  // Card
  card: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusLg,
    marginRight: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  // Illustration
  illustration: {
    height: ILLUSTRATION_HEIGHT,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute',
    width: 140, height: 140, borderRadius: 70,
    top: -40, left: -30,
    opacity: 0.6,
  },
  blob2: {
    position: 'absolute',
    width: 100, height: 100, borderRadius: 50,
    bottom: -30, right: -20,
    opacity: 0.5,
  },
  ratingBadge: {
    position: 'absolute', top: 12, left: 12,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: SIZES.radiusFull,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
  },
  ratingStar: { fontSize: 11, marginRight: 3 },
  ratingNum:  { fontSize: 12, fontWeight: '700', color: COLORS.text },
  heartBtn: {
    position: 'absolute', top: 10, right: 10,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
  },
  mainEmoji:  { fontSize: 56, zIndex: 1 },
  sceneEmoji: { fontSize: 20, position: 'absolute', bottom: 14, right: 20, zIndex: 1 },

  // Card body
  cardBody:       { padding: 14 },
  cardTitle:      { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  cardCountryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardFlag:       { fontSize: 14, marginRight: 5 },
  cardCountry:    { fontSize: 13, color: COLORS.textSecondary },
  cardMeta:       { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardDates:      { fontSize: 12, color: COLORS.textMuted, marginLeft: 4 },
  cardDot:        { fontSize: 12, color: COLORS.textMuted, marginHorizontal: 4 },
  detailsBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusFull,
    paddingVertical: 10,
    alignItems: 'center',
  },
  detailsBtnGray:     { backgroundColor: COLORS.border },
  detailsBtnText:     { fontSize: 14, fontWeight: '700', color: COLORS.white },
  detailsBtnTextGray: { color: COLORS.textSecondary },

  // Empty
  empty:         { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIcon:     { fontSize: 52, marginBottom: 16 },
  emptyTitle:    { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28, paddingVertical: 13,
    borderRadius: SIZES.radiusFull,
  },
  emptyBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
});
