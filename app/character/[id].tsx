import { View, Text, StyleSheet, ImageBackground, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { ArkTag, ArkButton } from '@/components/ArkUI';
import { useChatStore } from '@/stores/chatStore';
import { COLORS, FONTS, SPACING } from '@/constants/theme';

export default function CharacterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const character = useChatStore((s) =>
    s.characters.find((c) => c.id === id)
  );

  const handleStartChat = () => {
    const chatId = `chat-${id}`;
    const existingChat = useChatStore
      .getState()
      .chats.find((c) => c.id === chatId);

    if (existingChat) {
      router.push(`/chat/${chatId}`);
    } else {
      // 创建新聊天
      const newChat = {
        id: chatId,
        characterId: id,
        characterName: character?.name || '未知',
        avatar: character?.avatar || '',
        lastMessage: '',
        lastMessageTime: Date.now(),
        unreadCount: 0,
        online: true,
      };
      useChatStore.setState((state) => ({
        chats: [newChat, ...state.chats],
        messages: { ...state.messages, [chatId]: [] },
      }));
      router.push(`/chat/${chatId}`);
    }
  };

  if (!character) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>角色不存在</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 上半部分：角色立绘 */}
      <ImageBackground
        source={character.fullImage as any}
        style={styles.heroImage}
        imageStyle={styles.heroImageStyle}
      >
        <View style={styles.heroOverlay} />
        
        {/* 顶部返回按钮 */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={28} color={COLORS.text} />
        </TouchableOpacity>
      </ImageBackground>

      {/* 下半部分：毛玻璃信息面板 */}
      <BlurView intensity={50} tint="dark" style={styles.infoPanel}>
        <View style={styles.panelLine} />
        
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* 角色名 */}
          <View style={styles.nameBox}>
            <Text style={styles.nameCn}>{character.name}</Text>
            <Text style={styles.nameEn}>{character.codeName}</Text>
          </View>

          {/* 标签 */}
          <View style={styles.tagsBox}>
            {character.tags.map((tag) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagChipText}>{tag}</Text>
              </View>
            ))}
          </View>

          {/* 分割线 */}
          <View style={styles.divider} />

          {/* 信息列表 */}
          <View style={styles.infoList}>
            <ArkTag label="代号" value={character.codeName} />
            <ArkTag label="种族" value={character.race} />
            <ArkTag label="出身地" value={character.origin} />
            <ArkTag label="职业" value={character.class} />
          </View>

          {/* 简介 */}
          <View style={styles.descBox}>
            <Text style={styles.descLabel}>PROFILE</Text>
            <Text style={styles.descText}>{character.description}</Text>
          </View>

          {/* 底部按钮 */}
          <View style={styles.btnBox}>
            <ArkButton
              title="开始对话"
              onPress={handleStartChat}
              variant="accent"
              style={styles.startBtn}
            />
          </View>
        </ScrollView>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  heroImage: {
    height: '50%',
    width: '100%',
  },
  heroImageStyle: {
    resizeMode: 'cover',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18,18,18,0.2)',
  },
  backBtn: {
    position: 'absolute',
    top: 44,
    left: SPACING.md,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 2,
  },
  infoPanel: {
    flex: 1,
    marginTop: -24,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  panelLine: {
    width: 40,
    height: 3,
    backgroundColor: COLORS.primary,
    alignSelf: 'center',
    marginTop: SPACING.sm,
    borderRadius: 2,
    opacity: 0.6,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl * 2,
  },
  nameBox: {
    marginBottom: SPACING.md,
  },
  nameCn: {
    fontFamily: FONTS.serif,
    fontSize: 32,
    color: COLORS.text,
    letterSpacing: -0.5,
    marginBottom: SPACING.xs,
  },
  nameEn: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: COLORS.low,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  tagsBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.md,
  },
  tagChip: {
    backgroundColor: 'rgba(74,171,234,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(74,171,234,0.3)',
    borderRadius: 2,
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: SPACING.xs + 2,
    marginRight: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  tagChipText: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.primary,
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: SPACING.md,
  },
  infoList: {
    marginBottom: SPACING.md,
  },
  descBox: {
    marginBottom: SPACING.lg,
  },
  descLabel: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.low,
    letterSpacing: 2,
    marginBottom: SPACING.sm,
  },
  descText: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  btnBox: {
    marginTop: SPACING.md,
  },
  startBtn: {
    width: '100%',
  },
  errorText: {
    fontFamily: FONTS.sans,
    fontSize: 16,
    color: COLORS.danger,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
});
