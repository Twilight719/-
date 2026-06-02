import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ImageBackground, Animated, Modal, ScrollView, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { ArkHeader } from '@/components/ArkUI';
import { useGroupStore, GroupMessage, MEMBER_NAMES } from '@/stores/groupStore';
import { COLORS, FONTS, SPACING } from '@/constants/theme';

const ALL_MEMBERS = [
  { id: 'amiya', name: '阿米娅' },
  { id: 'kaltsit', name: '凯尔希' },
  { id: 'mon3tr', name: 'Mon3tr' },
  { id: 'closure', name: '可露希尔' },
];

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
  const addMembers = useGroupStore((s) => s.addMembers);
  const removeMember = useGroupStore((s) => s.removeMember);
  const renameGroup = useGroupStore((s) => s.renameGroup);

  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');

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
        rightAction={
          <TouchableOpacity style={styles.editBtn} onPress={() => {
            setEditName(group?.name || '');
            setShowEdit(true);
          }}>
            <Ionicons name="settings-outline" size={20} color={COLORS.text} />
          </TouchableOpacity>
        }
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kv} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <FlatList ref={flatListRef} data={messages} keyExtractor={(item) => item.id} renderItem={renderItem}
          contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled" inverted
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

      {/* 编辑群聊弹窗 */}
      <Modal visible={showEdit} transparent animationType="slide" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>编辑群聊</Text>
              <TouchableOpacity onPress={() => setShowEdit(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalLabel}>群聊名称</Text>
              <TextInput value={editName} onChangeText={setEditName}
                placeholder={group?.name || '群聊名称'} placeholderTextColor={COLORS.low}
                style={styles.modalInput} maxLength={20} />
              <TouchableOpacity style={styles.renameBtn} onPress={() => {
                if (editName.trim()) { renameGroup(id, editName.trim()); Alert.alert('已更新', '群聊名称已修改'); }
              }}>
                <Text style={styles.renameBtnText}>修改名称</Text>
              </TouchableOpacity>

              <Text style={styles.modalLabel}>当前成员</Text>
              {group?.memberIds.map((mid) => (
                <View key={mid} style={styles.memberRow}>
                  <Text style={styles.memberName}>{MEMBER_NAMES[mid] || mid}</Text>
                  {group.memberIds.length > 2 && (
                    <TouchableOpacity onPress={() => removeMember(id, mid)}>
                      <Ionicons name="remove-circle-outline" size={20} color={COLORS.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              <Text style={styles.modalLabel}>添加成员</Text>
              <View style={styles.addList}>
                {ALL_MEMBERS.filter((m) => !group?.memberIds.includes(m.id)).map((m) => (
                  <TouchableOpacity key={m.id} style={styles.addChip} onPress={() => {
                    addMembers(id, [m.id]);
                    Alert.alert('已添加', `${m.name} 已加入群聊`);
                  }}>
                    <Ionicons name="add-circle-outline" size={16} color={COLORS.accent} />
                    <Text style={styles.addChipText}>{m.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {ALL_MEMBERS.filter((m) => !group?.memberIds.includes(m.id)).length === 0 && (
                <Text style={styles.noMoreText}>所有干员已在群聊中</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  editBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  // 编辑弹窗
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalCard: { backgroundColor: COLORS.bgSecondary, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderWidth: 1, borderColor: COLORS.cardBorder, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  modalTitle: { fontFamily: FONTS.serif, fontSize: 18, color: COLORS.text },
  modalBody: { padding: SPACING.lg },
  modalLabel: { fontFamily: FONTS.mono, fontSize: 11, color: COLORS.low, letterSpacing: 1, textTransform: 'uppercase', marginTop: SPACING.md, marginBottom: SPACING.sm },
  modalInput: { fontFamily: FONTS.sans, fontSize: 15, color: COLORS.text, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, borderWidth: 1, borderColor: COLORS.cardBorder },
  renameBtn: { backgroundColor: COLORS.primary, paddingVertical: SPACING.sm, borderRadius: 2, marginTop: SPACING.sm, alignItems: 'center' },
  renameBtnText: { fontFamily: FONTS.sans, fontSize: 13, color: '#fff', fontWeight: '700' },
  memberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.sm, paddingHorizontal: SPACING.sm, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 4, marginBottom: 4 },
  memberName: { fontFamily: FONTS.sans, fontSize: 14, color: COLORS.text },
  addList: { flexDirection: 'row', flexWrap: 'wrap' },
  addChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, backgroundColor: 'rgba(216,221,90,0.08)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(216,221,90,0.2)', marginRight: SPACING.sm, marginBottom: SPACING.sm },
  addChipText: { fontFamily: FONTS.sans, fontSize: 13, color: COLORS.accent, marginLeft: 4 },
  noMoreText: { fontFamily: FONTS.sans, fontSize: 13, color: COLORS.low, textAlign: 'center', marginTop: SPACING.md },
});
