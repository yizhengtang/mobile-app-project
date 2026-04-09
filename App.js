// App.js
import 'react-native-gesture-handler';
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { TripProvider } from './src/context/TripContext';
import { COLORS } from './src/theme';

import AuthScreen       from './src/screens/AuthScreen';
import HomeScreen       from './src/screens/HomeScreen';
import CreateTripScreen from './src/screens/CreateTripScreen';
import TripDetailScreen from './src/screens/TripDetailScreen';
import ChatScreen       from './src/screens/ChatScreen';
import ProfileScreen    from './src/screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function TabIcon({ name, focused, color }) {
  return (
    <View style={styles.iconWrapper}>
      <Ionicons name={name} size={22} color={color} />
      {focused && <View style={styles.activeDot} />}
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:   COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 0 },
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 0,
          height: 64,
          paddingBottom: 10,
          paddingTop: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 12,
        },
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            Home:    focused ? 'compass'       : 'compass-outline',
            Plan:    focused ? 'add-circle'    : 'add-circle-outline',
            Profile: focused ? 'person-circle' : 'person-circle-outline',
          };
          return <TabIcon name={icons[route.name]} focused={focused} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"    component={HomeScreen}       options={{ title: 'Explore' }} />
      <Tab.Screen name="Plan"    component={CreateTripScreen} options={{ title: 'Plan Trip' }} />
      <Tab.Screen name="Profile" component={ProfileScreen}    options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

// Renders the correct navigator based on auth state
function RootNavigator() {
  const { user, loading } = useAuth();

  // Show a spinner while restoring the session from storage
  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <Ionicons name="compass" size={48} color={COLORS.primary} />
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 16 }} />
      </View>
    );
  }

  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={AuthScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <TripProvider>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs"   component={MainTabs} />
        <Stack.Screen name="TripDetail" component={TripDetailScreen} />
        <Stack.Screen name="Chat"       component={ChatScreen} />
      </Stack.Navigator>
    </TripProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NavigationContainer>
            <StatusBar style="dark" />
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
  },
  activeDot: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginTop: 3,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
