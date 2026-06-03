import { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ArkHeader, HexAvatar, ArkListItem } from '@/components/ArkUI';
import { useChatStore } from '@/stores/chatStore';
import { COLORS, FONTS, SPACING } from '@/constants/theme';

function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  });
}

export default function MessagesScreen() {
  const router = useRouter();
  const rawChats = useChatStore((s) => s.chats);
  const togglePin = useChatStore((s) => s.togglePin);

  // 排序：置顶优先，然后按最近消息时间
  const chats = useMemo(() => {
    return [...rawChats].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.lastMessageTime - a.lastMessageTime;
    });
  }, [rawChats]);

  const handleLongPress = (chatId: string, chatName: string, pinned: boolean) => {
    Alert.alert(chatName, pinned ? '取消置顶？' : '置顶聊天？', [
      { text: '取消', style: 'cancel' },
      { text: pinned ? '取消置顶' : '置顶', onPress: () => togglePin(chatId) },
    ]);
  };

  const handleChatPress = (chatId: string) => {
    useChatStore.getState().clearUnread(chatId);
    useChatStore.getState().setActiveChat(chatId);
    router.push(`/chat/${chatId}`);
  };

  const renderChatItem = ({ item }: { item: (typeof chats)[0] }) => (
    <ArkListItem
      status={item.online ? 'online' : 'offline'}
      onPress={() => handleChatPress(item.id)}
      onLongPress={() => handleLongPress(item.id, item.characterName, item.pinned)}
    >
      <View style={styles.chatRow}>
        <HexAvatar uri={item.avatar} size={52} online={item.online} />
        <View style={styles.chatInfo}>
          <View style={styles.chatTopRow}>
            <View style={styles.nameRow}>
              {item.pinned && <Ionicons name="pin" size={12} color={COLORS.accent} style={{ marginRight: 4 }} />}
              <Text style={styles.chatName}>{item.characterName}</Text>
            </View>
            <Text style={styles.chatTime}>{formatTime(item.lastMessageTime)}</Text>
          </View>
          <View style={styles.chatBottomRow}>
            <Text style={styles.chatPreview} numberOfLines={1}>
              {item.lastMessage}
            </Text>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </ArkListItem>
  );

  return (
    <View style={styles.container}>
      <ArkHeader
        title="通讯终端"
        subtitle="MESSAGES"
        rightAction={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/character/amiya')}
          >
            <Ionicons name="add" size={22} color={COLORS.text} />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={renderChatItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>暂无通讯记录</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatInfo: {
    flex: 1,
    marginLeft: SPACING.md,
    justifyContent: 'center',
  },
  chatTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  chatName: {
    fontFamily: FONTS.serif,
    fontSize: 16,
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  chatTime: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.low,
  },
  chatBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatPreview: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
    marginRight: SPACING.sm,
  },
  unreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadText: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: '#121212',
    fontWeight: '700',
  },
  emptyBox: {
    paddingTop: SPACING.xl * 2,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    color: COLORS.low,
  },
});
