import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { ArkHeader } from '@/components/ArkUI';
import { useChatStore } from '@/stores/chatStore';
import { COLORS, FONTS, SPACING } from '@/constants/theme';

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const blinkAnim = useRef(new Animated.Value(1)).current;

  const messages = useChatStore((s) => s.messages[id] || []);
  const isTyping = useChatStore((s) => s.isTyping);
  const chat = useChatStore((s) => s.chats.find((c) => c.id === id));
  const sendMessage = useChatStore((s) => s.sendMessage);

  useEffect(() => {
    if (id) {
      useChatStore.getState().setActiveChat(id);
      useChatStore.getState().clearUnread(id);
    }
    return () => { useChatStore.getState().setActiveChat(null); };
  }, [id]);

  useEffect(() => {
    if (isTyping) {
      Animated.loop(Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])).start();
    } else blinkAnim.setValue(1);
  }, [isTyping, blinkAnim]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');
    await sendMessage(id, text);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [inputText, id, sendMessage]);

  const renderItem = useCallback(({ item }: { item: any }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.msgRow, isUser && styles.msgRowR]}>
        {!isUser && <View style={styles.avatar}><Text style={styles.avatarT}>{(chat?.characterName || '?')[0]}</Text></View>}
        <View style={[styles.bubble, isUser ? styles.bU : styles.bA]}>
          <Text style={styles.bText}>{item.content}</Text>
        </View>
        {isUser && <View style={styles.avatar}><Text style={styles.avatarT}>博</Text></View>}
      </View>
    );
  }, [chat?.characterName]);

  return (
    <View style={styles.container}>
      <ArkHeader title={chat?.characterName || '通讯中'} subtitle={chat?.online ? 'ONLINE' : 'OFFLINE'} onBack={() => router.back()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kv} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            if (messages.length > 0) flatListRef.current?.scrollToEnd({ animated: false });
          }}
        />
        {isTyping && (
          <Animated.View style={[styles.typing, { opacity: blinkAnim }]}>
            <Text style={styles.typingText}>{chat?.characterName || '干员'}正在整理思绪...</Text>
          </Animated.View>
        )}
        <BlurView intensity={30} tint="dark" style={styles.bar}>
          <View style={styles.barLine} />
          <View style={styles.barRow}>
            <TextInput value={inputText} onChangeText={setInputText} placeholder="输入消息..." placeholderTextColor={COLORS.low}
              style={styles.input} multiline maxLength={500} />
            <TouchableOpacity style={[styles.send, !inputText.trim() && { opacity: 0.4 }]} onPress={handleSend} disabled={!inputText.trim()}>
              <Ionicons name="send" size={18} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  kv: { flex: 1 },
  list: { paddingVertical: SPACING.md },
  msgRow: { flexDirection: 'row', paddingHorizontal: SPACING.md, marginVertical: 4, maxWidth: '88%' },
  msgRowR: { alignSelf: 'flex-end', maxWidth: '80%' },
  avatar: { width: 32, height: 32, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', marginHorizontal: SPACING.sm },
  avatarT: { fontFamily: FONTS.serif, fontSize: 14, color: COLORS.textSecondary },
  bubble: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: 4 },
  bU: { backgroundColor: COLORS.userBubble, borderWidth: 1, borderColor: COLORS.userBubbleBorder },
  bA: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.cardBorder },
  bText: { fontFamily: FONTS.sans, fontSize: 14, color: COLORS.text, lineHeight: 20 },
  typing: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs },
  typingText: { fontFamily: FONTS.mono, fontSize: 11, color: COLORS.textSecondary },
  bar: { paddingBottom: Platform.OS === 'ios' ? 24 : 8 },
  barLine: { height: 1, backgroundColor: COLORS.divider, marginHorizontal: SPACING.md, marginBottom: SPACING.sm },
  barRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: SPACING.md },
  input: { flex: 1, fontFamily: FONTS.sans, fontSize: 14, color: COLORS.text, maxHeight: 100, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, borderWidth: 1, borderColor: COLORS.cardBorder },
  send: { width: 40, height: 40, backgroundColor: COLORS.primary, borderRadius: 2, justifyContent: 'center', alignItems: 'center', marginLeft: SPACING.sm },
});
