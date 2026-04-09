// src/screens/CreateTripScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTrips } from '../context/TripContext';
import { COLORS, SIZES } from '../theme';

const TRANSPORT_OPTIONS = [
  { id: 'walk',    label: 'Walk',    icon: '🚶' },
  { id: 'transit', label: 'Transit', icon: '🚇' },
  { id: 'drive',   label: 'Drive',   icon: '🚗' },
  { id: 'cycle',   label: 'Cycle',   icon: '🚴' },
];

const PACE_OPTIONS = [
  { id: 'relaxed',  label: 'Relaxed',  desc: 'Fewer stops, more downtime' },
  { id: 'moderate', label: 'Moderate', desc: 'Balanced pace' },
  { id: 'packed',   label: 'Packed',   desc: 'Maximise every hour' },
];

const TOTAL_STEPS = 4;

// ── Step indicators ────────────────────────────────────────────────────────────
function StepBar({ current }) {
  return (
    <View style={styles.stepBar}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.stepSegment,
            { backgroundColor: i < current ? COLORS.primary : COLORS.border },
          ]}
        />
      ))}
    </View>
  );
}

// ── Step 1: Destination & Dates ────────────────────────────────────────────────
function Step1({ data, onChange }) {
  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Where are you going?</Text>
      <Text style={styles.stepSubtitle}>Enter your destination and travel dates.</Text>

      <Text style={styles.label}>Trip Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Tokyo Spring 2026"
        placeholderTextColor={COLORS.textMuted}
        value={data.name}
        onChangeText={(v) => onChange('name', v)}
      />

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={styles.label}>City</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Tokyo"
            placeholderTextColor={COLORS.textMuted}
            value={data.city}
            onChangeText={(v) => onChange('city', v)}
          />
        </View>
        <View style={styles.halfField}>
          <Text style={styles.label}>Country</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Japan"
            placeholderTextColor={COLORS.textMuted}
            value={data.country}
            onChangeText={(v) => onChange('country', v)}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={styles.label}>Start Date</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={COLORS.textMuted}
            value={data.startDate}
            onChangeText={(v) => onChange('startDate', v)}
          />
        </View>
        <View style={styles.halfField}>
          <Text style={styles.label}>End Date</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={COLORS.textMuted}
            value={data.endDate}
            onChangeText={(v) => onChange('endDate', v)}
          />
        </View>
      </View>
    </View>
  );
}

// ── Step 2: Attractions ────────────────────────────────────────────────────────
function Step2({ data, onChange }) {
  const [newAttraction, setNewAttraction] = useState('');

  function addAttraction() {
    const trimmed = newAttraction.trim();
    if (!trimmed) return;
    onChange('attractions', [...data.attractions, { name: trimmed, mustDo: false }]);
    setNewAttraction('');
  }

  function toggleMustDo(index) {
    const updated = data.attractions.map((a, i) =>
      i === index ? { ...a, mustDo: !a.mustDo } : a
    );
    onChange('attractions', updated);
  }

  function removeAttraction(index) {
    onChange('attractions', data.attractions.filter((_, i) => i !== index));
  }

  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Places to visit</Text>
      <Text style={styles.stepSubtitle}>
        Add attractions, restaurants, or anything you want to see. Mark must-dos with ⭐.
      </Text>

      <View style={styles.attractionInputRow}>
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          placeholder="Add a place…"
          placeholderTextColor={COLORS.textMuted}
          value={newAttraction}
          onChangeText={setNewAttraction}
          onSubmitEditing={addAttraction}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.addBtn} onPress={addAttraction}>
          <Ionicons name="add" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {data.attractions.length === 0 ? (
        <View style={styles.attractionEmpty}>
          <Text style={styles.attractionEmptyText}>No places added yet.</Text>
        </View>
      ) : (
        data.attractions.map((a, i) => (
          <View key={i} style={styles.attractionItem}>
            <TouchableOpacity onPress={() => toggleMustDo(i)}>
              <Text style={styles.mustDoIcon}>{a.mustDo ? '⭐' : '☆'}</Text>
            </TouchableOpacity>
            <Text style={styles.attractionName} numberOfLines={1}>{a.name}</Text>
            <TouchableOpacity onPress={() => removeAttraction(i)}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
}

// ── Step 3: Preferences ────────────────────────────────────────────────────────
function Step3({ data, onChange }) {
  function toggleTransport(id) {
    const current = data.transportModes;
    const updated = current.includes(id)
      ? current.filter((m) => m !== id)
      : [...current, id];
    onChange('transportModes', updated);
  }

  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Your preferences</Text>
      <Text style={styles.stepSubtitle}>Help the AI tailor the itinerary to you.</Text>

      <Text style={styles.label}>Preferred Transport</Text>
      <View style={styles.chipRow}>
        {TRANSPORT_OPTIONS.map((t) => {
          const active = data.transportModes.includes(t.id);
          return (
            <TouchableOpacity
              key={t.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggleTransport(t.id)}
            >
              <Text style={styles.chipIcon}>{t.icon}</Text>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.label, { marginTop: 20 }]}>Travel Pace</Text>
      {PACE_OPTIONS.map((p) => {
        const active = data.pace === p.id;
        return (
          <TouchableOpacity
            key={p.id}
            style={[styles.paceOption, active && styles.paceOptionActive]}
            onPress={() => onChange('pace', p.id)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.paceLabel, active && styles.paceLabelActive]}>{p.label}</Text>
              <Text style={styles.paceDesc}>{p.desc}</Text>
            </View>
            {active && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
          </TouchableOpacity>
        );
      })}

      <Text style={[styles.label, { marginTop: 20 }]}>Daily Budget (USD)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 150"
        placeholderTextColor={COLORS.textMuted}
        value={data.budgetPerDay}
        onChangeText={(v) => onChange('budgetPerDay', v)}
        keyboardType="numeric"
      />
    </View>
  );
}

// ── Step 4: Review ─────────────────────────────────────────────────────────────
function Step4({ data }) {
  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Review your trip</Text>
      <Text style={styles.stepSubtitle}>Everything look good? Tap Generate to create your AI itinerary.</Text>

      <View style={styles.reviewCard}>
        <ReviewRow icon="location-outline"   label="City"        value={data.city || '—'} />
        <ReviewRow icon="globe-outline"      label="Country"     value={data.country || '—'} />
        <ReviewRow icon="calendar-outline"   label="Dates"       value={`${data.startDate || '—'} → ${data.endDate || '—'}`} />
        <ReviewRow icon="list-outline"       label="Attractions" value={`${data.attractions.length} place${data.attractions.length !== 1 ? 's' : ''}`} />
        <ReviewRow icon="walk-outline"       label="Transport"   value={data.transportModes.join(', ') || '—'} />
        <ReviewRow icon="speedometer-outline" label="Pace"       value={data.pace || '—'} />
        <ReviewRow icon="wallet-outline"     label="Daily Budget" value={data.budgetPerDay ? `$${data.budgetPerDay}` : '—'} />
      </View>

      <View style={styles.aiNotice}>
        <Ionicons name="sparkles" size={16} color={COLORS.primary} />
        <Text style={styles.aiNoticeText}>
          The AI will fetch live data and generate a day-by-day itinerary. This takes 10–20 seconds.
        </Text>
      </View>
    </View>
  );
}

function ReviewRow({ icon, label, value }) {
  return (
    <View style={styles.reviewRow}>
      <Ionicons name={icon} size={16} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

// ── Generating overlay ─────────────────────────────────────────────────────────
function GeneratingOverlay() {
  return (
    <View style={styles.overlay}>
      <View style={styles.overlayCard}>
        <Text style={styles.overlayEmoji}>✨</Text>
        <Text style={styles.overlayTitle}>Generating your itinerary…</Text>
        <Text style={styles.overlaySub}>
          The AI is fetching live weather, opening hours, and travel times. This takes up to 20 seconds.
        </Text>
        <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 20 }} />
      </View>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
const INITIAL_DATA = {
  name:           '',
  city:           '',
  country:        '',
  startDate:      '',
  endDate:        '',
  attractions:    [],
  transportModes: ['walk', 'transit'],
  pace:           'moderate',
  budgetPerDay:   '',
};

export default function CreateTripScreen({ navigation }) {
  const [step, setStep]           = useState(1);
  const [formData, setFormData]   = useState(INITIAL_DATA);
  const [generating, setGenerating] = useState(false);
  const { createAndGenerate }     = useTrips();

  function handleChange(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function validateStep() {
    if (step === 1) {
      if (!formData.name.trim())      return 'Please enter a trip name.';
      if (!formData.city.trim())      return 'Please enter a city.';
      if (!formData.country.trim())   return 'Please enter a country.';
      if (!formData.startDate.match(/^\d{4}-\d{2}-\d{2}$/))
        return 'Start date must be YYYY-MM-DD.';
      if (!formData.endDate.match(/^\d{4}-\d{2}-\d{2}$/))
        return 'End date must be YYYY-MM-DD.';
      if (new Date(formData.endDate) <= new Date(formData.startDate))
        return 'End date must be after start date.';
    }
    if (step === 3) {
      if (formData.transportModes.length === 0)
        return 'Select at least one transport mode.';
    }
    return null;
  }

  function handleNext() {
    const error = validateStep();
    if (error) { Alert.alert('Missing info', error); return; }
    if (step < TOTAL_STEPS) { setStep(step + 1); return; }
    handleSubmit();
  }

  async function handleSubmit() {
    setGenerating(true);
    try {
      const trip = await createAndGenerate({
        name:           formData.name.trim(),
        destination:    { city: formData.city.trim(), country: formData.country.trim() },
        startDate:      formData.startDate,
        endDate:        formData.endDate,
        pace:           formData.pace,
        budgetPerDay:   Number(formData.budgetPerDay) || 0,
        transportModes: formData.transportModes,
        attractions:    formData.attractions.map((a) => a.name),
        surpriseMe:     false,
      });
      setFormData(INITIAL_DATA);
      setStep(1);
      // Navigate immediately — generation is running in background,
      // TripDetail will show the progress banner and poll until ready.
      navigation.navigate('TripDetail', { tripId: trip._id });
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to create trip. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        {step > 1 ? (
          <TouchableOpacity onPress={() => setStep(step - 1)} disabled={generating}>
            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
        <Text style={styles.headerTitle}>Step {step} of {TOTAL_STEPS}</Text>
        <TouchableOpacity
          onPress={() => { setFormData(INITIAL_DATA); setStep(1); }}
          disabled={generating}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <StepBar current={step} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 && <Step1 data={formData} onChange={handleChange} />}
          {step === 2 && <Step2 data={formData} onChange={handleChange} />}
          {step === 3 && <Step3 data={formData} onChange={handleChange} />}
          {step === 4 && <Step4 data={formData} />}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextBtn, generating && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={generating}
        >
          <Text style={styles.nextBtnText}>
            {step === TOTAL_STEPS ? '✨ Generate Itinerary' : 'Continue'}
          </Text>
          {step < TOTAL_STEPS && <Ionicons name="arrow-forward" size={18} color={COLORS.white} />}
        </TouchableOpacity>
      </View>

      {/* Full-screen generating overlay */}
      {generating && <GeneratingOverlay />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 14,
    backgroundColor: COLORS.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  cancelText:  { fontSize: 14, color: COLORS.textSecondary },
  stepBar: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: SIZES.padding,
    paddingVertical: 10,
    backgroundColor: COLORS.card,
  },
  stepSegment: { flex: 1, height: 4, borderRadius: 2 },
  scroll:      { padding: SIZES.padding, paddingBottom: 32 },
  stepContent: {},
  stepTitle:    { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  stepSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 24, lineHeight: 20 },
  label: {
    fontSize: 12, fontWeight: '700', color: COLORS.textSecondary,
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 16,
  },
  row:       { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },

  // Attractions
  attractionInputRow: { flexDirection: 'row', gap: 8, marginBottom: 16, alignItems: 'center' },
  addBtn: {
    width: 40, height: 40, borderRadius: SIZES.radiusSm,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  attractionItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 8, gap: 8,
  },
  mustDoIcon:      { fontSize: 16 },
  attractionName:  { flex: 1, fontSize: 14, color: COLORS.text },
  attractionEmpty: {
    padding: 20, alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1, borderColor: COLORS.textMuted,
  },
  attractionEmptyText: { color: COLORS.textMuted, fontSize: 14 },

  // Chips
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  chipActive:     { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
  chipIcon:       { fontSize: 15 },
  chipText:       { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  chipTextActive: { color: COLORS.primary },

  // Pace
  paceOption: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
    padding: 14, marginBottom: 8,
  },
  paceOptionActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryBg },
  paceLabel:        { fontSize: 15, fontWeight: '700', color: COLORS.text },
  paceLabelActive:  { color: COLORS.primary },
  paceDesc:         { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  // Review
  reviewCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.padding,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  reviewRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  reviewLabel: { fontSize: 13, color: COLORS.textSecondary, width: 110 },
  reviewValue: { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: '500' },
  aiNotice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: COLORS.primary + '12',
    borderRadius: SIZES.radiusSm,
    padding: 12,
  },
  aiNoticeText: { flex: 1, fontSize: 13, color: COLORS.primaryDark, lineHeight: 18 },

  // Footer
  footer: {
    padding: SIZES.padding,
    backgroundColor: COLORS.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusFull,
    paddingVertical: 15,
  },
  nextBtnDisabled: { opacity: 0.6 },
  nextBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 16, marginRight: 6 },

  // Generating overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
  },
  overlayCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusLg,
    padding: 32,
    marginHorizontal: 32,
    alignItems: 'center',
  },
  overlayEmoji: { fontSize: 40, marginBottom: 12 },
  overlayTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  overlaySub:   { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
});
