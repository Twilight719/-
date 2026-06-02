import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { ArkHeader, HexAvatar, ChatBubble } from '@/components/ArkUI';
import { ModelIndicator, ProBanner } from '@/components/chat/ModelIndicator';
import { useChatStore } from '@/stores/chatStore';
import { COLORS, FONTS, SPACING } from '@/constants/theme';

const CHAT_BG_IMAGE = require('../../assets/characters/amiya_bg.png');

function formatMessageTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function shouldShowTime(
  messages: { timestamp: number }[],
  index: number
): boolean {
  if (index === 0) return true;
  const prev = messages[index - 1].timestamp;
  const curr = messages[index].timestamp;
  return curr - prev > 1000 * 60 * 5;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const isInitialMount = useRef(true);

  const messages = useChatStore((s) => s.messages[id] || []);
  const isTyping = useChatStore((s) => s.isTyping);
  const chat = useChatStore((s) => s.chats.find((c) => c.id === id));
  const sendMessage = useChatStore((s) => s.sendMessage);

  // 自动滚动到底部（新消息到达时）
  const scrollToEnd = useCallback((animated = true) => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated });
    }, 80);
  }, []);

  // 监听消息变化 → 自动滚到底部
  useEffect(() => {
    if (messages.length > 0) {
      scrollToEnd(true);
    }
  }, [messages.length, messages[messages.length - 1]?.content.length, scrollToEnd]);

  useEffect(() => {
    if (id) {
      useChatStore.getState().setActiveChat(id);
      useChatStore.getState().clearUnread(id);
    }
    return () => {
      useChatStore.getState().setActiveChat(null);
    };
  }, [id]);

  useEffect(() => {
    if (isTyping) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 0.3,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(blinkAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      blinkAnim.setValue(1);
    }
  }, [isTyping, blinkAnim]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');
    await sendMessage(id, text);
  }, [inputText, id, sendMessage]);

  const renderItem = ({
    item,
    index,
  }: {
    item: (typeof messages)[0];
    index: number;
  }) => {
    const showTime = shouldShowTime(messages, index);
    const isLast = index === messages.length - 1;

    return (
      <View>
        {showTime && (
          <View style={styles.timeBox}>
            <Text style={styles.timeText}>
              {formatMessageTime(item.timestamp)}
            </Text>
          </View>
        )}
        <ChatBubble
          sender={item.sender}
          content={item.content}
          avatar={chat?.avatar}
          animateTyping={isLast && item.sender === 'ai' && isTyping}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 背景 */}
      <ImageBackground
        source={CHAT_BG_IMAGE}
        style={styles.bgImage}
        imageStyle={styles.bgImageStyle}
        blurRadius={40}
      >
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
              <Ionicons
                name="ellipsis-horizontal"
                size={22}
                color={COLORS.text}
              />
            </TouchableOpacity>
          </View>
        }
      />

      {/* 主体：Android 不用 behavior 由系统 adjustResize 处理 */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {/* 打字指示器 */}
        {isTyping && (
          <Animated.View style={[styles.typingBox, { opacity: blinkAnim }]}>
            <Text style={styles.typingText}>{chat?.characterName || '干员'}正在整理思绪...</Text>
          </Animated.View>
        )}

        <ProBanner />

        {/* 输入栏 */}
        <BlurView intensity={30} tint="dark" style={styles.inputBar}>
          <View style={styles.inputBarLine} />
          <View style={styles.inputRow}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="输入消息..."
              placeholderTextColor={COLORS.low}
              style={styles.input}
              multiline
              maxLength={500}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                !inputText.trim() && { opacity: 0.4 },
              ]}
              onPress={handleSend}
              disabled={!inputText.trim()}
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
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
  },
  bgImageStyle: {
    resizeMode: 'cover',
    opacity: 0.3,
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18,18,18,0.85)',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alterBtn: {
    width: 36, height: 36, borderRadius: 2,
    borderWidth: 1, borderColor: 'rgba(216,221,90,0.3)',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(216,221,90,0.08)',
  },
  moreBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  messageList: {
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  timeBox: {
    alignItems: 'center',
    marginVertical: SPACING.sm,
  },
  timeText: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.low,
  },
  typingBox: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  typingText: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  inputBar: {
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
  },
  inputBarLine: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.md,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.sans,
    fontSize: 14,
    color: COLORS.text,
    maxHeight: 100,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  sendBtn: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
});
