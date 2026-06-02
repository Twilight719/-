import { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { ArkHeader } from '@/components/ArkUI';
import { useChatStore } from '@/stores/chatStore';
import { COLORS, FONTS, SPACING } from '@/constants/theme';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const messages = useChatStore((s) => s.messages[id] || []);
  const chat = useChatStore((s) => s.chats.find((c) => c.id === id));
  const sendMessage = useChatStore((s) => s.sendMessage);

  const handleSend = useCallback(async () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');
    await sendMessage(id, text);
  }, [inputText, id, sendMessage]);

  if (!chat) {
    return (
      <View style={styles.container}>
        <ArkHeader title="加载中" onBack={() => router.back()} />
        <Text style={styles.loading}>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ArkHeader title={chat.characterName} subtitle="ONLINE" onBack={() => router.back()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.msg, item.sender === 'user' ? styles.msgR : styles.msgL]}>
              <Text style={styles.msgText}>{item.content}</Text>
            </View>
          )}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        />
        <BlurView intensity={30} tint="dark" style={styles.bar}>
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
  flex: { flex: 1 },
  loading: { color: COLORS.low, textAlign: 'center', marginTop: 40, fontFamily: FONTS.sans },
  list: { padding: SPACING.md },
  msg: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: 4, maxWidth: '80%', marginVertical: 4 },
  msgL: { backgroundColor: 'rgba(255,255,255,0.05)', alignSelf: 'flex-start', borderWidth: 1, borderColor: COLORS.cardBorder },
  msgR: { backgroundColor: COLORS.userBubble, alignSelf: 'flex-end', borderWidth: 1, borderColor: COLORS.userBubbleBorder },
  msgText: { fontFamily: FONTS.sans, fontSize: 14, color: COLORS.text, lineHeight: 20 },
  bar: { paddingBottom: Platform.OS === 'ios' ? 24 : 8 },
  barRow: { flexDirection: 'row', alignItems: 'flex-end', padding: SPACING.md, paddingTop: SPACING.sm },
  input: { flex: 1, fontFamily: FONTS.sans, fontSize: 14, color: COLORS.text, maxHeight: 100, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, borderWidth: 1, borderColor: COLORS.cardBorder },
  send: { width: 40, height: 40, backgroundColor: COLORS.primary, borderRadius: 2, justifyContent: 'center', alignItems: 'center', marginLeft: SPACING.sm },
});
