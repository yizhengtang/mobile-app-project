// src/screens/ProfileScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../theme';
import { useTrips } from '../context/TripContext';
import { useAuth } from '../context/AuthContext';

function StatCard({ icon, label, value }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SettingRow({ icon, label, onPress, value, danger }) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.settingIconBox, danger && styles.settingIconBoxDanger]}>
        <Ionicons name={icon} size={17} color={danger ? COLORS.danger : COLORS.primary} />
      </View>
      <Text style={[styles.settingLabel, danger && styles.settingLabelDanger]}>{label}</Text>
      {value ? <Text style={styles.settingValue}>{value}</Text> : null}
      {!danger && <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { getTrips } = useTrips();
  const { user, logout } = useAuth();

  const trips      = getTrips();
  const readyTrips = trips.filter((t) => t.status === 'ready');
  const totalDays  = readyTrips.reduce((sum, t) => sum + (t.days?.length || 0), 0);
  const totalStops = readyTrips.reduce(
    (sum, t) => sum + (t.days || []).reduce((dSum, d) => dSum + (d.stops?.length || 0), 0),
    0
  );

  // Derive initials for the avatar from the user's name
  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Avatar + user info ── */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <Text style={styles.name}>{user?.name || 'Traveller'}</Text>
          <Text style={styles.email}>{user?.email || ''}</Text>
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          <StatCard icon="✈️" label="Trips"        value={trips.length} />
          <StatCard icon="📅" label="Days Planned" value={totalDays} />
          <StatCard icon="📍" label="Stops"        value={totalStops} />
        </View>

        {/* ── App ── */}
        <Text style={styles.sectionTitle}>App</Text>
        <View style={styles.settingsCard}>
          <SettingRow icon="notifications-outline"      label="Push Notifications" value="On" />
          <SettingRow
            icon="information-circle-outline"
            label="About Wayfarer"
            onPress={() =>
              Alert.alert(
                'About Wayfarer',
                'Wayfarer is an AI-powered travel planner that builds personalised day-by-day itineraries based on your destination, pace, budget, and transport preferences.\n\nPowered by OpenAI, Google Places, and live weather data.\n\nVersion 1.0.0',
                [{ text: 'Close', style: 'cancel' }]
              )
            }
          />
        </View>

        {/* ── Account ── */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.settingsCard}>
          <SettingRow icon="log-out-outline" label="Sign Out" onPress={handleSignOut} danger />
        </View>

        <Text style={styles.version}>Wayfarer v1.0.0 · Built with ✈️ and ☕</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  avatarSection: {
    alignItems: 'center',
    paddingVertical: 28,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  avatarInitials: { fontSize: 26, fontWeight: '800', color: COLORS.white },
  name:           { fontSize: 20, fontWeight: '700', color: COLORS.text },
  email:          { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },

  statsRow: { flexDirection: 'row', gap: 10, padding: SIZES.padding },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 14, alignItems: 'center', gap: 4,
  },
  statIcon:  { fontSize: 22 },
  statValue: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },

  sectionTitle: {
    fontSize: 12, fontWeight: '600', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: SIZES.padding, marginBottom: 8, marginTop: 8,
  },
  settingsCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: COLORS.border,
    marginHorizontal: SIZES.padding,
    marginBottom: 8, overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SIZES.padding, paddingVertical: 13,
    gap: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  settingIconBox: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  settingIconBoxDanger: { backgroundColor: COLORS.danger + '15' },
  settingLabel:         { flex: 1, fontSize: 15, color: COLORS.text },
  settingLabelDanger:   { color: COLORS.danger },
  settingValue:         { fontSize: 13, color: COLORS.textSecondary, marginRight: 4 },

  version: { textAlign: 'center', fontSize: 12, color: COLORS.textMuted, marginTop: 16 },
});
