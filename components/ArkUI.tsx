import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ViewStyle,
  TextStyle,
  Image,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '@/constants/theme';

// 六边形头像组件
export function HexAvatar({
  uri,
  size = 48,
  online = false,
}: {
  uri: string | number;
  size?: number;
  online?: boolean;
}) {
  return (
    <View style={[styles.hexWrapper, { width: size, height: size }]}>
      <View
        style={[
          styles.hexBorder,
          {
            width: size,
            height: size,
            borderRadius: size * 0.25,
            borderColor: COLORS.primary,
          },
        ]}
      >
        <View
          style={[
            styles.hexInner,
            {
              width: size - 4,
              height: size - 4,
              borderRadius: size * 0.22,
              backgroundColor: COLORS.bgTertiary,
              overflow: 'hidden',
            },
          ]}
        >
          {uri ? (
            <Image
              source={typeof uri === 'number' ? uri : { uri }}
              style={{ width: size - 4, height: size - 4 }}
              resizeMode="cover"
            />
          ) : (
            <View style={{
              width: size - 4, height: size - 4,
              justifyContent: 'center', alignItems: 'center',
            }}>
              <Ionicons name="person" size={size * 0.45} color={COLORS.low} />
            </View>
          )}
        </View>
      </View>
      {online && (
        <View
          style={[
            styles.onlineDot,
            {
              width: size * 0.25,
              height: size * 0.25,
              borderRadius: size * 0.125,
              right: -size * 0.05,
              bottom: -size * 0.05,
            },
          ]}
        />
      )}
    </View>
  );
}

// 毛玻璃导航栏
export function ArkHeader({
  title,
  onBack,
  rightAction,
  subtitle,
}: {
  title: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <BlurView intensity={40} tint="dark" style={styles.header}>
      <View style={styles.headerContent}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>{title}</Text>
          {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
        </View>
        <View style={styles.headerBtn}>
          {rightAction}
        </View>
      </View>
      <View style={styles.headerLine} />
    </BlurView>
  );
}

// 底部TabBar
export function ArkTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: string;
  onTabChange: (tab: string) => void;
}) {
  const tabs = [
    { key: 'messages', icon: 'chatbubbles-outline', label: '消息' },
    { key: 'terminal', icon: 'terminal-outline', label: '终端' },
    { key: 'settings', icon: 'settings-outline', label: '设置' },
  ];

  return (
    <BlurView intensity={40} tint="dark" style={styles.tabBar}>
      <View style={styles.tabBarLine} />
      <View style={styles.tabBarContent}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => onTabChange(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={22}
              color={activeTab === tab.key ? COLORS.accent : COLORS.low}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab.key && { color: COLORS.accent },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </BlurView>
  );
}

// Ark按钮
export function ArkButton({
  title,
  onPress,
  variant = 'primary',
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'accent' | 'ghost';
  style?: ViewStyle;
}) {
  const bgColors = {
    primary: COLORS.primary,
    accent: COLORS.accent,
    ghost: 'transparent',
  };

  const textColors = {
    primary: COLORS.text,
    accent: '#121212',
    ghost: COLORS.text,
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor: bgColors[variant],
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: 'rgba(255,255,255,0.2)',
        },
        style,
      ]}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.buttonText,
          { color: textColors[variant], fontFamily: FONTS.sans },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

// Ark输入框
export function ArkInput({
  value,
  onChangeText,
  placeholder,
  style,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.inputWrapper, style]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.low}
        style={styles.input}
      />
      <View style={styles.inputLine} />
    </View>
  );
}

// 状态条列表项
export function ArkListItem({
  children,
  status = 'none',
  onPress,
}: {
  children: React.ReactNode;
  status?: 'online' | 'offline' | 'none';
  onPress?: () => void;
}) {
  const statusColors = {
    online: COLORS.online,
    offline: COLORS.offline,
    none: 'transparent',
  };

  const content = (
    <View style={styles.listItem}>
      <View
        style={[styles.statusBar, { backgroundColor: statusColors[status] }]}
      />
      <View style={styles.listItemContent}>{children}</View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

// 聊天气泡（AI 消息支持打字机动画）
export function ChatBubble({
  sender,
  content,
  avatar,
  animateTyping = false,
}: {
  sender: 'user' | 'ai';
  content: string;
  avatar?: string | number;
  animateTyping?: boolean;
}) {
  const isUser = sender === 'user';
  const [displayed, setDisplayed] = React.useState('');
  const displayedRef = React.useRef('');

  React.useEffect(() => {
    // 用户消息立即显示
    if (isUser) {
      setDisplayed(content);
      displayedRef.current = content;
      return;
    }

    // AI 消息：流式更新时实时显示，非流式时打字机动画
    if (!animateTyping) {
      // 非打字模式（已完成的消息）→ 立即显示
      setDisplayed(content);
      displayedRef.current = content;
      return;
    }

    // 打字模式：逐字显示新增的内容
    if (content.startsWith(displayedRef.current)) {
      // 流式追加中，直接显示
      setDisplayed(content);
      displayedRef.current = content;
    } else if (content.length > displayedRef.current.length) {
      // 新内容到达，逐字动画
      const newContent = content;
      const startLen = displayedRef.current.length;
      let pos = startLen;
      const timer = setInterval(() => {
        pos++;
        if (pos <= newContent.length) {
          const partial = newContent.slice(0, pos);
          setDisplayed(partial);
          displayedRef.current = partial;
        } else {
          clearInterval(timer);
        }
      }, 30); // 每 30ms 一个字符，模拟打字
      return () => clearInterval(timer);
    } else {
      // 内容没变或变短（不应发生，但做保护）
      setDisplayed(content);
      displayedRef.current = content;
    }
  }, [content, isUser, animateTyping]);

  const showCursor = animateTyping && sender === 'ai' && displayed.length > 0;

  return (
    <View
      style={[
        styles.bubbleRow,
        isUser ? styles.bubbleRowRight : styles.bubbleRowLeft,
      ]}
    >
      {!isUser && (
        <View style={styles.bubbleAvatar}>
          <HexAvatar uri={avatar || ''} size={36} online={false} />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAi,
        ]}
      >
        <Text style={[styles.bubbleText, { fontFamily: FONTS.sans }]}>
          {isUser ? content : displayed}
          {showCursor && (
            <Text style={styles.typingCursor}> ▌</Text>
          )}
        </Text>
      </View>
    </View>
  );
}

// 信息标签
export function ArkTag({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagLabel}>{label}</Text>
      <Text style={styles.tagValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hexWrapper: {
    position: 'relative',
  },
  hexBorder: {
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hexInner: {
    overflow: 'hidden',
  },
  onlineDot: {
    position: 'absolute',
    backgroundColor: COLORS.online,
    borderWidth: 2,
    borderColor: COLORS.bgSecondary,
  },
  header: {
    paddingTop: 44,
    borderBottomWidth: 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.serif,
    fontSize: 18,
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.online,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerLine: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginHorizontal: SPACING.md,
  },
  tabBar: {
    paddingBottom: 24,
  },
  tabBarLine: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  tabBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: SPACING.sm,
  },
  tabItem: {
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  tabLabel: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    color: COLORS.low,
    marginTop: 4,
    letterSpacing: 1,
  },
  button: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    width: '100%',
  },
  input: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    color: COLORS.text,
    paddingVertical: SPACING.sm,
    paddingHorizontal: 0,
  },
  inputLine: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: COLORS.card,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  statusBar: {
    width: 3,
    borderTopLeftRadius: BORDER_RADIUS.xs,
    borderBottomLeftRadius: BORDER_RADIUS.xs,
  },
  listItemContent: {
    flex: 1,
    padding: SPACING.md,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  bubbleRowLeft: {
    justifyContent: 'flex-start',
  },
  bubbleRowRight: {
    justifyContent: 'flex-end',
  },
  bubbleAvatar: {
    marginRight: SPACING.sm,
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  bubbleUser: {
    backgroundColor: COLORS.userBubble,
    borderWidth: 1,
    borderColor: COLORS.userBubbleBorder,
  },
  bubbleAi: {
    backgroundColor: COLORS.aiBubble,
    borderWidth: 1,
    borderColor: COLORS.aiBubbleBorder,
  },
  bubbleText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  typingCursor: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xs,
  },
  tagLabel: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.low,
    textTransform: 'uppercase',
    letterSpacing: 1,
    width: 80,
  },
  tagValue: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    color: COLORS.text,
  },
});
