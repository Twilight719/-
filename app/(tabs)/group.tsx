import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ImageBackground, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { ArkHeader, HexAvatar } from '@/components/ArkUI';
import { COLORS, FONTS, SPACING } from '@/constants/theme';
import { useGroupStore, GroupMessage } from '@/stores/groupStore';

const CHAT_BG_IMAGE = require('../../assets/characters/amiya_bg.png');

function formatGroupTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function shouldShowTime(messages: GroupMessage[], index: number): boolean {
  if (index === 0) return true;
  const prev = messages[index - 1].timestamp;
  const curr = messages[index].timestamp;
  return curr - prev > 1000 * 60 * 5;
}

// 不同干员的头像颜色
const OPERATOR_COLORS: Record<string, string> = {
  '阿米娅': COLORS.primary,
  '凯尔希': COLORS.advanced,
  '可露希尔': COLORS.accent,
};

export default function GroupChatScreen() {
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const blinkAnim = useRef(new Animated.Value(1)).current;

  const messages = useGroupStore((s) => s.messages);
  const isTyping = useGroupStore((s) => s.isTyping);
  const sendMessage = useGroupStore((s) => s.sendMessage);
  const initGroup = useGroupStore((s) => s.initGroup);

  useEffect(() => { initGroup(); }, [initGroup]);

  // 自动滚动
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages.length, messages[messages.length - 1]?.content.length]);

  useEffect(() => {
    if (isTyping) {
      Animated.loop(Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])).start();
    } else {
      blinkAnim.setValue(1);
    }
  }, [isTyping, blinkAnim]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');
    await sendMessage(text);
  }, [inputText, sendMessage]);

  const renderItem = ({ item, index }: { item: GroupMessage; index: number }) => {
    const showTime = shouldShowTime(messages, index);
    const color = OPERATOR_COLORS[item.senderName] || COLORS.primary;
    const isUser = item.sender === 'user';

    return (
      <View>
        {showTime && (
          <View style={styles.timeBox}>
            <Text style={styles.timeText}>{formatGroupTime(item.timestamp)}</Text>
          </View>
        )}
        <View style={[styles.msgRow, isUser && styles.msgRowRight]}>
          {!isUser && (
            <View style={styles.avatarCol}>
              <View style={[styles.avatarPlaceholder, { borderColor: color }]}>
                <Text style={[styles.avatarLetter, { color }]}>
                  {item.senderName[0]}
                </Text>
              </View>
              <Text style={[styles.senderLabel, { color }]} numberOfLines={1}>
                {item.senderName}
              </Text>
            </View>
          )}
          <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi, { borderLeftColor: !isUser ? color : 'transparent' }]}>
            <Text style={styles.bubbleText}>{item.content}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ImageBackground source={CHAT_BG_IMAGE} style={styles.bgImage} imageStyle={styles.bgImageStyle} blurRadius={40}>
        <View style={styles.bgOverlay} />
      </ImageBackground>

      <ArkHeader
        title="罗德岛群聊"
        subtitle={`${messages.length} 条消息 · 3 人在线`}
      />

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
          onContentSizeChange={() => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50)}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
        />

        {isTyping && (
          <Animated.View style={[styles.typingBox, { opacity: blinkAnim }]}>
            <Text style={styles.typingText}>干员们正在讨论...</Text>
          </Animated.View>
        )}

        <BlurView intensity={30} tint="dark" style={styles.inputBar}>
          <View style={styles.inputBarLine} />
          <View style={styles.inputRow}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="发送群聊消息..."
              placeholderTextColor={COLORS.low}
              style={styles.input}
              multiline
              maxLength={500}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !inputText.trim() && { opacity: 0.4 }]}
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
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  bgImage: { ...StyleSheet.absoluteFillObject, opacity: 0.15 },
  bgImageStyle: { resizeMode: 'cover', opacity: 0.3 },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(18,18,18,0.85)' },
  keyboardView: { flex: 1 },
  messageList: { paddingVertical: SPACING.md, paddingBottom: SPACING.lg },
  timeBox: { alignItems: 'center', marginVertical: SPACING.sm },
  timeText: { fontFamily: FONTS.mono, fontSize: 11, color: COLORS.low },
  msgRow: { flexDirection: 'row', paddingHorizontal: SPACING.md, marginVertical: 4, maxWidth: '88%' },
  msgRowRight: { alignSelf: 'flex-end', maxWidth: '80%' },
  avatarCol: { alignItems: 'center', marginRight: SPACING.sm, width: 40 },
  avatarPlaceholder: {
    width: 32, height: 32, borderRadius: 4, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  avatarLetter: { fontFamily: FONTS.serif, fontSize: 16 },
  senderLabel: { fontFamily: FONTS.mono, fontSize: 8, marginTop: 2, letterSpacing: 0.5 },
  bubble: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2,
    borderRadius: 4, borderLeftWidth: 2,
  },
  bubbleUser: { backgroundColor: COLORS.userBubble, borderWidth: 1, borderColor: COLORS.userBubbleBorder, borderLeftWidth: 1 },
  bubbleAi: { backgroundColor: COLORS.aiBubble, borderWidth: 1, borderColor: COLORS.aiBubbleBorder },
  bubbleText: { fontFamily: FONTS.sans, fontSize: 14, color: COLORS.text, lineHeight: 20 },
  typingBox: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs },
  typingText: { fontFamily: FONTS.mono, fontSize: 11, color: COLORS.textSecondary },
  inputBar: { paddingBottom: Platform.OS === 'ios' ? 24 : 8 },
  inputBarLine: { height: 1, backgroundColor: COLORS.divider, marginHorizontal: SPACING.md, marginBottom: SPACING.sm },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: SPACING.md },
  input: {
    flex: 1, fontFamily: FONTS.sans, fontSize: 14, color: COLORS.text,
    maxHeight: 100, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2,
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  sendBtn: {
    width: 40, height: 40, backgroundColor: COLORS.primary,
    borderRadius: 2, justifyContent: 'center', alignItems: 'center', marginLeft: SPACING.sm,
  },
});
