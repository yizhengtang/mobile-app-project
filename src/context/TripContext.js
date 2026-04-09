// src/context/TripContext.js
import React, { createContext, useContext, useState, useCallback } from 'react';
import { tripsAPI } from '../services/api';

const TripContext = createContext(null);

// Merge the plan's days and totalBudget into the trip object so the rest of
// the UI can access trip.days and trip.totalBudget directly.
function mergeTripAndPlan(trip, plan) {
  return {
    ...trip,
    days:        plan?.days        || [],
    totalBudget: plan?.totalBudget ?? null,
  };
}

export function TripProvider({ children }) {
  const [trips, setTrips] = useState([]);

  // ── Load all trips from the API ───────────────────────────────────────────
  const loadTrips = useCallback(async () => {
    const { trips: fetched } = await tripsAPI.getAll();
    // getAll returns trips without plan data; keep days/totalBudget from any
    // already-fetched full versions we have in state.
    setTrips((prev) => {
      const prevMap = Object.fromEntries(prev.map((t) => [t._id, t]));
      return fetched.map((t) => {
        const existing = prevMap[t._id];
        if (existing && existing.days?.length > 0) {
          return { ...existing, ...t };
        }
        return mergeTripAndPlan(t, null);
      });
    });
  }, []);

  // ── Fetch a single trip (with its plan) and update state ──────────────────
  const fetchTrip = useCallback(async (id) => {
    const { trip, plan } = await tripsAPI.getOne(id);
    const merged = mergeTripAndPlan(trip, plan);
    setTrips((prev) => {
      const exists = prev.find((t) => t._id === id);
      if (exists) return prev.map((t) => (t._id === id ? merged : t));
      return [merged, ...prev];
    });
    return merged;
  }, []);

  // ── Get a trip from local state by id ─────────────────────────────────────
  const getTripById = useCallback(
    (id) => trips.find((t) => t._id === id) || null,
    [trips]
  );

  // ── Return all trips sorted newest-first ──────────────────────────────────
  const getTrips = useCallback(
    () => [...trips].sort((a, b) => new Date(b.startDate) - new Date(a.startDate)),
    [trips]
  );

  // ── Create a trip and kick off generation in the background ─────────────
  // Returns as soon as the trip is created (< 1s).
  // Generation runs in the background; TripDetailScreen polls for the result.
  const createAndGenerate = useCallback(async (tripData) => {
    // 1. Create the trip (fast)
    const { trip: created } = await tripsAPI.create(tripData);
    setTrips((prev) => [mergeTripAndPlan(created, null), ...prev]);

    // 2. Fire generate without awaiting — backend sets status → generating → ready
    tripsAPI.generate(created._id)
      .then(({ plan }) =>
        tripsAPI.getOne(created._id).then(({ trip: ready }) => {
          setTrips((prev) =>
            prev.map((t) =>
              t._id === created._id ? mergeTripAndPlan(ready, plan) : t
            )
          );
        })
      )
      .catch(() => {
        // Mark as failed in local state so TripDetail can show the error banner
        setTrips((prev) =>
          prev.map((t) =>
            t._id === created._id ? { ...t, status: 'failed' } : t
          )
        );
      });

    // 3. Return immediately — TripDetail will poll until ready
    return created;
  }, []);

  // ── Delete a trip ─────────────────────────────────────────────────────────
  const deleteTrip = useCallback(async (id) => {
    await tripsAPI.delete(id);
    setTrips((prev) => prev.filter((t) => t._id !== id));
  }, []);

  // ── Update trip plan in state (used after a chat message) ─────────────────
  const updateTripPlan = useCallback((tripId, plan) => {
    setTrips((prev) =>
      prev.map((t) =>
        t._id === tripId
          ? { ...t, days: plan.days, totalBudget: plan.totalBudget }
          : t
      )
    );
  }, []);

  return (
    <TripContext.Provider
      value={{
        trips,
        getTrips,
        getTripById,
        loadTrips,
        fetchTrip,
        createAndGenerate,
        deleteTrip,
        updateTripPlan,
      }}
    >
      {children}
    </TripContext.Provider>
  );
}

export function useTrips() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTrips must be used inside TripProvider');
  return ctx;
}
