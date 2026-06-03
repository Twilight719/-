import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ImageBackground, Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { ArkHeader, HexAvatar, ChatBubble } from '@/components/ArkUI';
import { ModelIndicator, ProBanner } from '@/components/chat/ModelIndicator';
import { useChatStore } from '@/stores/chatStore';
import { COLORS, FONTS, SPACING } from '@/constants/theme';

const CHAT_BG_IMAGE = require('../../assets/characters/amiya_bg.png');

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const didInitialScroll = useRef(false);

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

  // 打字指示器闪烁
  useEffect(() => {
    if (isTyping) {
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]));
      loop.start();
      return () => loop.stop();
    } else {
      blinkAnim.setValue(1);
    }
  }, [isTyping, blinkAnim]);

  // 智能滚动：新消息时滚到底部
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, messages[messages.length - 1]?.content.length]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim()) return;
    setInputText('');
    await sendMessage(id, inputText.trim());
  }, [inputText, id, sendMessage]);

  return (
    <View style={styles.container}>
      {/* 背景 */}
      <ImageBackground source={CHAT_BG_IMAGE} style={styles.bg} imageStyle={styles.bgStyle} blurRadius={40}>
        <View style={styles.bgOverlay} />
      </ImageBackground>

      <ArkHeader
        title={chat?.characterName || '通讯中'}
        subtitle={chat?.online ? 'ONLINE' : 'OFFLINE'}
        onBack={() => router.back()}
        rightAction={
          <View style={styles.headerRight}>
            <ModelIndicator />
            <TouchableOpacity style={styles.moreBtn}>
              <Ionicons name="ellipsis-horizontal" size={22} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kv}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <ChatBubble
              sender={item.sender}
              content={item.content}
              avatar={chat?.avatar}
              animateTyping={isTyping && item.sender === 'ai' && index === messages.length - 1}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }}
        />

        {isTyping && (
          <Animated.View style={[styles.typingBox, { opacity: blinkAnim }]}>
            <Text style={styles.typingText}>{chat?.characterName || '干员'}正在整理思绪...</Text>
          </Animated.View>
        )}

        <ProBanner />

        <BlurView intensity={30} tint="dark" style={styles.bar}>
          <View style={styles.barLine} />
          <View style={styles.barRow}>
            <TextInput
              value={inputText} onChangeText={setInputText}
              placeholder="输入消息..." placeholderTextColor={COLORS.low}
              style={styles.input} multiline maxLength={500}
            />
            <TouchableOpacity
              style={[styles.send, !inputText.trim() && { opacity: 0.4 }]}
              onPress={handleSend} disabled={!inputText.trim()}
            >
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
  bg: { ...StyleSheet.absoluteFillObject, opacity: 0.15 },
  bgStyle: { resizeMode: 'cover', opacity: 0.3 },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(18,18,18,0.85)' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  moreBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  kv: { flex: 1 },
  list: { paddingVertical: SPACING.md },
  typingBox: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs },
  typingText: { fontFamily: FONTS.mono, fontSize: 11, color: COLORS.textSecondary },
  bar: { paddingBottom: Platform.OS === 'ios' ? 24 : 8 },
  barLine: { height: 1, backgroundColor: COLORS.divider, marginHorizontal: SPACING.md, marginBottom: SPACING.sm },
  barRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: SPACING.md },
  input: { flex: 1, fontFamily: FONTS.sans, fontSize: 14, color: COLORS.text, maxHeight: 100, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, borderWidth: 1, borderColor: COLORS.cardBorder },
  send: { width: 40, height: 40, backgroundColor: COLORS.primary, borderRadius: 2, justifyContent: 'center', alignItems: 'center', marginLeft: SPACING.sm },
});
