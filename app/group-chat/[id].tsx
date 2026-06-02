import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ImageBackground, Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { ArkHeader } from '@/components/ArkUI';
import { useGroupStore, GroupMessage, MEMBER_NAMES } from '@/stores/groupStore';
import { COLORS, FONTS, SPACING } from '@/constants/theme';

const CHAT_BG = require('../../assets/characters/amiya_bg.png');

const OPERATOR_COLORS: Record<string, string> = {
  '阿米娅': COLORS.primary, '凯尔希': COLORS.advanced,
  'Mon3tr': COLORS.secondary, '可露希尔': COLORS.accent,
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

export default function GroupChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const blinkAnim = useRef(new Animated.Value(1)).current;

  const group = useGroupStore((s) => s.groups.find((g) => g.id === id));
  const messages = useGroupStore((s) => s.messages[id] || []);
  const isTyping = useGroupStore((s) => s.isTyping && s.typingGroupId === id);
  const sendMessage = useGroupStore((s) => s.sendMessage);

  useEffect(() => {
    if (id) useGroupStore.getState().clearUnread(id);
  }, [id]);

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
    } else blinkAnim.setValue(1);
  }, [isTyping, blinkAnim]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');
    await sendMessage(id, text);
  }, [inputText, id, sendMessage]);

  const renderItem = ({ item, index }: { item: GroupMessage; index: number }) => {
    const color = OPERATOR_COLORS[item.senderName] || COLORS.primary;
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.msgRow, isUser && styles.msgRowRight]}>
        {!isUser && (
          <View style={[styles.avatar, { borderColor: color }]}>
            <Text style={[styles.avatarTxt, { color }]}>{item.senderName[0]}</Text>
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bUser : styles.bAi, { borderLeftColor: !isUser ? color : 'transparent' }]}>
          {!isUser && <Text style={[styles.sender, { color }]}>{item.senderName}</Text>}
          <Text style={styles.bText}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ImageBackground source={CHAT_BG} style={styles.bg} imageStyle={styles.bgStyle} blurRadius={40}>
        <View style={styles.bgOverlay} />
      </ImageBackground>
      <ArkHeader
        title={group?.name || '群聊'}
        subtitle={group ? `${group.memberIds.length} 人` : ''}
        onBack={() => router.back()}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kv} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <FlatList ref={flatListRef} data={messages} keyExtractor={(item) => item.id} renderItem={renderItem}
          contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
          onContentSizeChange={() => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50)}
          keyboardShouldPersistTaps="handled"
        />
        {isTyping && (
          <Animated.View style={[styles.typing, { opacity: blinkAnim }]}>
            <Text style={styles.typingText}>干员们正在讨论...</Text>
          </Animated.View>
        )}
        <BlurView intensity={30} tint="dark" style={styles.bar}>
          <View style={styles.barLine} />
          <View style={styles.barRow}>
            <TextInput value={inputText} onChangeText={setInputText} placeholder="发送消息..."
              placeholderTextColor={COLORS.low} style={styles.input} multiline maxLength={500}
              returnKeyType="send" blurOnSubmit={false} onSubmitEditing={handleSend} />
            <TouchableOpacity style={[styles.sendBtn, !inputText.trim() && { opacity: 0.4 }]} onPress={handleSend} disabled={!inputText.trim()}>
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
  kv: { flex: 1 },
  list: { paddingVertical: SPACING.md, paddingBottom: SPACING.lg },
  msgRow: { flexDirection: 'row', paddingHorizontal: SPACING.md, marginVertical: 4, maxWidth: '88%' },
  msgRowRight: { alignSelf: 'flex-end', maxWidth: '80%', flexDirection: 'row-reverse' },
  avatar: { width: 30, height: 30, borderRadius: 4, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', marginRight: SPACING.sm },
  avatarTxt: { fontFamily: FONTS.serif, fontSize: 14 },
  bubble: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2, borderRadius: 4, borderLeftWidth: 2 },
  bUser: { backgroundColor: COLORS.userBubble, borderWidth: 1, borderColor: COLORS.userBubbleBorder, borderLeftWidth: 1 },
  bAi: { backgroundColor: COLORS.aiBubble, borderWidth: 1, borderColor: COLORS.aiBubbleBorder },
  sender: { fontFamily: FONTS.mono, fontSize: 10, marginBottom: 2, letterSpacing: 1 },
  bText: { fontFamily: FONTS.sans, fontSize: 14, color: COLORS.text, lineHeight: 20 },
  typing: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs },
  typingText: { fontFamily: FONTS.mono, fontSize: 11, color: COLORS.textSecondary },
  bar: { paddingBottom: Platform.OS === 'ios' ? 24 : 8 },
  barLine: { height: 1, backgroundColor: COLORS.divider, marginHorizontal: SPACING.md, marginBottom: SPACING.sm },
  barRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: SPACING.md },
  input: { flex: 1, fontFamily: FONTS.sans, fontSize: 14, color: COLORS.text, maxHeight: 100, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, borderWidth: 1, borderColor: COLORS.cardBorder },
  sendBtn: { width: 40, height: 40, backgroundColor: COLORS.primary, borderRadius: 2, justifyContent: 'center', alignItems: 'center', marginLeft: SPACING.sm },
});
