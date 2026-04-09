// src/screens/ChatScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTrips } from '../context/TripContext';
import { tripsAPI } from '../services/api';
import { COLORS, SIZES } from '../theme';

const SUGGESTIONS = [
  'Move the art gallery to Day 2',
  'Add a 2-hour lunch break on Day 1',
  'Swap outdoor stops for indoor on rainy days',
  'Find a restaurant near the last stop',
];

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubbleWrapper, isUser ? styles.bubbleWrapperUser : styles.bubbleWrapperAI]}>
      {!isUser && (
        <View style={styles.aiAvatar}>
          <Text style={styles.aiAvatarText}>✨</Text>
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAI]}>
          {message.content}
        </Text>
        <Text style={[styles.bubbleTime, isUser && styles.bubbleTimeUser]}>
          {message.time}
        </Text>
      </View>
    </View>
  );
}

function TypingIndicator() {
  return (
    <View style={[styles.bubbleWrapper, styles.bubbleWrapperAI]}>
      <View style={styles.aiAvatar}>
        <Text style={styles.aiAvatarText}>✨</Text>
      </View>
      <View style={[styles.bubble, styles.bubbleAI, styles.typingBubble]}>
        <Text style={styles.typingDots}>• • •</Text>
      </View>
    </View>
  );
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' });
}

function nowTime() {
  return new Date().toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen({ route, navigation }) {
  const { tripId } = route.params;
  const { getTripById, updateTripPlan } = useTrips();
  const trip = getTripById(tripId);

  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [isTyping, setIsTyping]   = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const listRef = useRef(null);

  // Load chat history on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const { messages: history } = await tripsAPI.getChatHistory(tripId);

        const formatted = history.map((m) => ({
          id:      m._id,
          role:    m.role,
          content: m.content,
          time:    formatTime(m.createdAt),
        }));

        // Prepend the static greeting
        const greeting = {
          id:      'greeting',
          role:    'assistant',
          content: `Hi! I'm your Wayfarer AI. Ask me to change anything about your "${trip?.name}" itinerary — move stops, swap days, find restaurants, and more.`,
          time:    nowTime(),
        };

        setMessages([greeting, ...formatted]);
      } catch {
        // If history fails, just show the greeting
        setMessages([{
          id:      'greeting',
          role:    'assistant',
          content: `Hi! I'm your Wayfarer AI. Ask me to change anything about your "${trip?.name}" itinerary.`,
          time:    nowTime(),
        }]);
      } finally {
        setHistoryLoading(false);
      }
    }
    loadHistory();
  }, [tripId]);

  async function sendMessage(text) {
    const trimmed = (text || input).trim();
    if (!trimmed || isTyping) return;

    const userMsg = {
      id:      Date.now().toString(),
      role:    'user',
      content: trimmed,
      time:    nowTime(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const { reply, plan } = await tripsAPI.sendChat(tripId, trimmed);

      const aiMsg = {
        id:      (Date.now() + 1).toString(),
        role:    'assistant',
        content: reply,
        time:    nowTime(),
      };
      setMessages((prev) => [...prev, aiMsg]);

      // Update the trip in context so TripDetail reflects the new plan
      if (plan) updateTripPlan(tripId, plan);
    } catch (err) {
      const errMsg = {
        id:      (Date.now() + 1).toString(),
        role:    'assistant',
        content: `Sorry, something went wrong: ${err.message}`,
        time:    nowTime(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
    }
  }

  const showSuggestions = !historyLoading && messages.length <= 1;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.aiDot} />
          <View>
            <Text style={styles.headerTitle}>AI Planner</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{trip?.name}</Text>
          </View>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        {historyLoading ? (
          <View style={styles.loadingHistory}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => <MessageBubble message={item} />}
            ListFooterComponent={isTyping ? <TypingIndicator /> : null}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Quick suggestions — only shown before first user message */}
        {showSuggestions && (
          <View style={styles.suggestions}>
            <Text style={styles.suggestionsLabel}>Try asking…</Text>
            <View style={styles.suggestionChips}>
              {SUGGESTIONS.map((s, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.suggestionChip}
                  onPress={() => sendMessage(s)}
                  disabled={isTyping}
                >
                  <Text style={styles.suggestionChipText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask the AI to change your plan…"
            placeholderTextColor={COLORS.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || isTyping) && styles.sendBtnDisabled]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || isTyping}
          >
            {isTyping
              ? <ActivityIndicator size="small" color={COLORS.white} />
              : <Ionicons name="send" size={17} color={COLORS.white} />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding, paddingVertical: 12,
    backgroundColor: COLORS.card,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  backBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter:   { flexDirection: 'row', alignItems: 'center' },
  aiDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: COLORS.accent, marginRight: 10,
  },
  headerTitle:    { fontSize: 16, fontWeight: '800', color: COLORS.text },
  headerSubtitle: { fontSize: 12, color: COLORS.textSecondary },

  loadingHistory: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messageList:    { padding: SIZES.padding, paddingBottom: 8 },

  bubbleWrapper:     { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 },
  bubbleWrapperUser: { justifyContent: 'flex-end' },
  bubbleWrapperAI:   { justifyContent: 'flex-start' },

  aiAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.primaryBg,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 8, flexShrink: 0,
  },
  aiAvatarText: { fontSize: 16 },

  bubble:     { maxWidth: '78%', borderRadius: SIZES.radius, padding: 12 },
  bubbleUser: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleAI: {
    backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.border,
    borderBottomLeftRadius: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  bubbleText:     { fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: COLORS.white },
  bubbleTextAI:   { color: COLORS.text },
  bubbleTime:     { fontSize: 10, color: COLORS.textMuted, marginTop: 4, alignSelf: 'flex-end' },
  bubbleTimeUser: { color: 'rgba(255,255,255,0.65)' },

  typingBubble: { paddingVertical: 14 },
  typingDots:   { fontSize: 18, color: COLORS.textMuted, letterSpacing: 4 },

  suggestions:      { paddingHorizontal: SIZES.padding, paddingBottom: 8 },
  suggestionsLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '700', marginBottom: 8 },
  suggestionChips:  { flexDirection: 'row', flexWrap: 'wrap' },
  suggestionChip: {
    backgroundColor: COLORS.card,
    borderWidth: 1.5, borderColor: COLORS.primary + '60',
    borderRadius: SIZES.radiusFull,
    paddingHorizontal: 12, paddingVertical: 6,
    marginRight: 8, marginBottom: 6,
  },
  suggestionChipText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: SIZES.padding, paddingVertical: 10,
    backgroundColor: COLORS.card,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: SIZES.radius,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: COLORS.text,
    maxHeight: 100, marginRight: 10,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.textMuted },
});
