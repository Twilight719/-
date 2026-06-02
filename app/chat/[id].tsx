import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Platform,
  ImageBackground,
  Animated,
  Keyboard,
  KeyboardEvent,
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
  const inputRef = useRef<TextInput>(null);

  // 手动管理键盘高度（避免 Android behavior="height" 与中文输入法的兼容问题）
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const isKeyboardShown = useRef(false);

  const messages = useChatStore((s) => s.messages[id] || []);
  const isTyping = useChatStore((s) => s.isTyping);
  const chat = useChatStore((s) => s.chats.find((c) => c.id === id));
  const sendMessage = useChatStore((s) => s.sendMessage);

  useEffect(() => {
    if (id) {
      useChatStore.getState().setActiveChat(id);
      useChatStore.getState().clearUnread(id);
    }
    return () => {
      useChatStore.getState().setActiveChat(null);
    };
  }, [id]);

  // 键盘事件监听
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e: KeyboardEvent) => {
        // 只在第一次显示时记录，避免输入法切换候选栏高度变化时抖动
        if (!isKeyboardShown.current) {
          setKeyboardHeight(e.endCoordinates.height);
          isKeyboardShown.current = true;
        }
        // 键盘弹出后滚动到底部
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        isKeyboardShown.current = false;
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
        />
      </View>
    );
  };

  // iOS 状态栏高度约 44，加上 ArkHeader 高度约 56 = 100
  const headerHeight = Platform.OS === 'ios' ? 100 : 56;

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

      {/* 消息列表 */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.messageList,
          // 底部留出输入栏的空间
          { paddingBottom: SPACING.lg + 60 + keyboardHeight },
        ]}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        onLayout={() =>
          flatListRef.current?.scrollToEnd({ animated: false })
        }
        // 点击消息区域收起键盘
        keyboardShouldPersistTaps="handled"
      />

      {/* 打字指示器 */}
      {isTyping && (
        <Animated.View style={[styles.typingBox, { opacity: blinkAnim }]}>
          <Text style={styles.typingText}>阿米娅正在整理思绪...</Text>
        </Animated.View>
      )}

      <ProBanner />

      {/* 输入栏 - 使用绝对定位确保始终在底部 */}
      <View
        style={[
          styles.inputBarContainer,
          { bottom: keyboardHeight },
        ]}
      >
        <BlurView intensity={30} tint="dark" style={styles.inputBar}>
          <View style={styles.inputBarLine} />
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
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
      </View>
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
  moreBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    paddingHorizontal: 0,
    paddingTop: SPACING.sm,
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
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 70, // 输入栏上方
  },
  typingText: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  inputBarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // 过渡动画的关键：动态 bottom 值
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
    marginBottom: 0,
  },
});
