// src/context/TripContext.js
import React, { createContext, useContext, useState, useCallback } from 'react';
import { MOCK_TRIPS } from '../data/mockData';

const TripContext = createContext(null);

export function TripProvider({ children }) {
  const [trips, setTrips] = useState(MOCK_TRIPS);

  // Return all trips (sorted newest start date first)
  const getTrips = useCallback(() => {
    return [...trips].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  }, [trips]);

  // Return a single trip by id
  const getTripById = useCallback((id) => {
    return trips.find((t) => t.id === id) || null;
  }, [trips]);

  // Add a new trip (status: pending until AI generates the plan)
  const addTrip = useCallback((tripData) => {
    const newTrip = {
      id: Date.now().toString(),
      status: 'pending',
      totalBudget: null,
      days: [],
      coverEmoji: '✈️',
      ...tripData,
    };
    setTrips((prev) => [newTrip, ...prev]);
    return newTrip;
  }, []);

  // Delete a trip
  const deleteTrip = useCallback((id) => {
    setTrips((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <TripContext.Provider value={{ getTrips, getTripById, addTrip, deleteTrip }}>
      {children}
    </TripContext.Provider>
  );
}

export function useTrips() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTrips must be used inside TripProvider');
  return ctx;
}
