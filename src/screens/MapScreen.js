// src/screens/MapScreen.js
import React, { useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform,
} from 'react-native';
import MapView, { Marker, Polyline, Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES, CATEGORY_META } from '../theme';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMarkerColor(category) {
  return CATEGORY_META[category]?.color || COLORS.primary;
}

// Calculate a region that fits all coordinates with padding
function getInitialRegion(coords) {
  if (coords.length === 0) return null;
  if (coords.length === 1) {
    return {
      latitude:       coords[0].latitude,
      longitude:      coords[0].longitude,
      latitudeDelta:  0.01,
      longitudeDelta: 0.01,
    };
  }
  const lats = coords.map((c) => c.latitude);
  const lngs = coords.map((c) => c.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude:       (minLat + maxLat) / 2,
    longitude:      (minLng + maxLng) / 2,
    latitudeDelta:  (maxLat - minLat) * 1.5 || 0.01,
    longitudeDelta: (maxLng - minLng) * 1.5 || 0.01,
  };
}

// ── Numbered marker pin ───────────────────────────────────────────────────────
function MarkerPin({ number, color }) {
  return (
    <View style={[styles.pin, { backgroundColor: color }]}>
      <Text style={styles.pinNumber}>{number}</Text>
    </View>
  );
}

// ── Bottom strip stop card ────────────────────────────────────────────────────
function StopChip({ stop, index, hasCoordsMap, onPress }) {
  const meta       = CATEGORY_META[stop.category] || CATEGORY_META.culture;
  const hasCoords  = hasCoordsMap[stop.id || index];
  const mappableIndex = stop._mapIndex; // position among mappable stops only

  return (
    <TouchableOpacity
      style={[styles.chip, !hasCoords && styles.chipDisabled]}
      onPress={hasCoords ? onPress : undefined}
      activeOpacity={hasCoords ? 0.75 : 1}
    >
      {/* Number badge */}
      <View style={[
        styles.chipBadge,
        { backgroundColor: hasCoords ? meta.color : COLORS.textMuted },
      ]}>
        <Text style={styles.chipBadgeText}>
          {hasCoords ? mappableIndex : '—'}
        </Text>
      </View>

      <View style={styles.chipText}>
        <Text style={styles.chipName} numberOfLines={1}>{stop.name}</Text>
        <Text style={styles.chipTime}>
          {hasCoords
            ? `${stop.arrivalTime || ''}${stop.departureTime ? ` – ${stop.departureTime}` : ''}`
            : 'No location'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function MapScreen({ route, navigation }) {
  const { day, tripName } = route.params;
  const insets  = useSafeAreaInsets();
  const mapRef  = useRef(null);

  const stops = day.stops || [];

  // Separate stops with and without coordinates
  const mappableStops = [];
  const hasCoordsMap  = {};
  let mapIndex = 1;

  stops.forEach((stop, i) => {
    const key = stop.id || i;
    if (stop.coordinates?.lat && stop.coordinates?.lng) {
      hasCoordsMap[key] = true;
      mappableStops.push({
        ...stop,
        _mapIndex: mapIndex++,
        _coord: {
          latitude:  stop.coordinates.lat,
          longitude: stop.coordinates.lng,
        },
      });
    } else {
      hasCoordsMap[key] = false;
    }
  });

  const coordinates   = mappableStops.map((s) => s._coord);
  const initialRegion = getInitialRegion(coordinates);

  // Animate map to a specific stop
  const animateToStop = useCallback((coord) => {
    mapRef.current?.animateToRegion(
      { ...coord, latitudeDelta: 0.008, longitudeDelta: 0.008 },
      400
    );
  }, []);

  // Fit all markers in view once map is ready
  const onMapReady = useCallback(() => {
    if (coordinates.length > 1) {
      mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 50, bottom: 220, left: 50 },
        animated: true,
      });
    }
  }, [coordinates]);

  if (!initialRegion) {
    return (
      <View style={styles.noCoords}>
        <Text style={styles.noCoordsIcon}>📍</Text>
        <Text style={styles.noCoordsTitle}>No locations available</Text>
        <Text style={styles.noCoordsText}>
          This day's stops don't have coordinate data yet.
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Full-screen map ── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider="google"
        initialRegion={initialRegion}
        onMapReady={onMapReady}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {/* Route polyline */}
        {coordinates.length > 1 && (
          <Polyline
            coordinates={coordinates}
            strokeColor={COLORS.primary}
            strokeWidth={2.5}
            lineDashPattern={[6, 4]}
          />
        )}

        {/* Markers */}
        {mappableStops.map((stop) => {
          const color = getMarkerColor(stop.category);
          const meta  = CATEGORY_META[stop.category] || CATEGORY_META.culture;
          return (
            <Marker
              key={stop.id || stop._mapIndex}
              coordinate={stop._coord}
              anchor={{ x: 0.5, y: 1 }}
            >
              <MarkerPin number={stop._mapIndex} color={color} />
              <Callout tooltip={false}>
                <View style={styles.callout}>
                  <View style={[styles.calloutDot, { backgroundColor: color }]} />
                  <View style={styles.calloutBody}>
                    <Text style={styles.calloutName}>{stop.name}</Text>
                    {(stop.arrivalTime || stop.departureTime) && (
                      <Text style={styles.calloutTime}>
                        {stop.arrivalTime}{stop.departureTime ? ` – ${stop.departureTime}` : ''}
                      </Text>
                    )}
                    <Text style={[styles.calloutCategory, { color }]}>
                      {meta.label}
                    </Text>
                  </View>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* ── Overlaid header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.headerBack} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Day {day.dayNumber} — Map</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{tripName}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Bottom stop strip ── */}
      <View style={[styles.strip, { paddingBottom: insets.bottom + 8 }]}>
        <Text style={styles.stripLabel}>
          {mappableStops.length} of {stops.length} stops on map
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stripScroll}
        >
          {stops.map((stop, i) => {
            const key       = stop.id || i;
            const hasCoords = hasCoordsMap[key];
            const mapped    = mappableStops.find(
              (s) => (s.id || s._mapIndex - 1) === (stop.id || i)
            );
            return (
              <StopChip
                key={key}
                stop={{ ...stop, _mapIndex: mapped?._mapIndex }}
                index={i}
                hasCoordsMap={hasCoordsMap}
                onPress={() => mapped && animateToStop(mapped._coord)}
              />
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  // No coords fallback
  noCoords: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.background, padding: 32,
  },
  noCoordsIcon:  { fontSize: 48, marginBottom: 16 },
  noCoordsTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  noCoordsText:  { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24 },
  backBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: SIZES.radiusFull,
  },
  backBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },

  // Header overlay
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  headerBack: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
  },
  headerText: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  headerSub:   { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },

  // Marker pin
  pin: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  pinNumber: { color: COLORS.white, fontWeight: '800', fontSize: 13 },

  // Callout
  callout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusSm,
    padding: 10,
    maxWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  calloutDot: {
    width: 10, height: 10, borderRadius: 5,
    marginTop: 3, marginRight: 8, flexShrink: 0,
  },
  calloutBody:     {},
  calloutName:     { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  calloutTime:     { fontSize: 11, color: COLORS.textSecondary, marginBottom: 2 },
  calloutCategory: { fontSize: 11, fontWeight: '600' },

  // Bottom strip
  strip: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(255,255,255,0.97)',
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  stripLabel: {
    fontSize: 11, fontWeight: '600', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: SIZES.padding, marginBottom: 10,
  },
  stripScroll: { paddingHorizontal: SIZES.padding, paddingBottom: 4 },

  // Stop chip
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 10, paddingVertical: 8,
    marginRight: 10, width: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  chipDisabled: { opacity: 0.45 },
  chipBadge: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 8, flexShrink: 0,
  },
  chipBadgeText: { color: COLORS.white, fontWeight: '800', fontSize: 11 },
  chipText:      { flex: 1 },
  chipName:      { fontSize: 12, fontWeight: '600', color: COLORS.text },
  chipTime:      { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
});
