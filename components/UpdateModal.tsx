import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '@/constants/theme';
import { LATEST_UPDATE } from '@/constants/updates';

const SEEN_KEY = '@rhodes_last_seen_update';

async function getLastSeenUpdate(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

async function markUpdateSeen(updateId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(SEEN_KEY, updateId);
  } catch {
    // ignore
  }
}

interface UpdateModalProps {
  visible: boolean;
  onClose: () => void;
  mode: UpdateMode;
}

export default function UpdateModal({ visible, onClose, mode }: UpdateModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const barAnim1 = useRef(new Animated.Value(0)).current;
  const barAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      slideAnim.setValue(40);
      glowAnim.setValue(0);
      barAnim1.setValue(0);
      barAnim2.setValue(0);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 70,
          friction: 13,
          useNativeDriver: true,
        }),
        // 光晕脉冲
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0.4,
              duration: 1500,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();

      // 装饰线条逐条出现
      Animated.sequence([
        Animated.timing(barAnim1, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(barAnim2, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim, glowAnim, barAnim1, barAnim2]);

  const handleUpdate = async () => {
    await markUpdateSeen(LATEST_UPDATE.id);
    onClose();
    try {
      await Updates.reloadAsync();
    } catch {
      // reload failed
    }
  };

  const handleLater = async () => {
    await markUpdateSeen(LATEST_UPDATE.id);
    onClose();
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0.4, 1],
    outputRange: [0.15, 0.35],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* 背景毛玻璃 */}
        <BlurView intensity={30} tint="dark" style={styles.blur} />

        {/* 扫描线纹理 */}
        <View style={styles.scanlines} pointerEvents="none" />

        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* 顶部状态栏 - 系统通知风格 */}
          <View style={styles.topBar}>
            <View style={styles.topBarDot} />
            <Text style={styles.topBarText}>PRTS 系统通知</Text>
            <Text style={styles.topBarId}>#{LATEST_UPDATE.id.padStart(4, '0')}</Text>
          </View>

          {/* 内容区 */}
          <View style={styles.content}>
            {/* 图标区 - 脉冲光晕 */}
            <View style={styles.iconSection}>
              <Animated.View
                style={[styles.iconGlow, { opacity: glowOpacity }]}
              />
              <View style={styles.iconHex}>
                <Ionicons name="cloud-download" size={26} color={COLORS.accent} />
              </View>

              {/* 装饰线 */}
              <Animated.View
                style={[
                  styles.decorLine,
                  {
                    width: barAnim1.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 24],
                    }),
                  },
                ]}
              />
            </View>

            {/* 标题 */}
            <Text style={styles.title}>更新可用</Text>
            <Text style={styles.subtitle}>UPDATE AVAILABLE</Text>

            {/* 分割线 */}
            <View style={styles.divider}>
              <View style={styles.dividerDot} />
              <View style={styles.dividerLine} />
              <View style={styles.dividerDot} />
            </View>

            {/* 版本信息 */}
            <View style={styles.infoTag}>
              <Text style={styles.infoLabel}>VERSION</Text>
              <Text style={styles.infoValue}>
                {LATEST_UPDATE.version}
              </Text>
            </View>
            <View style={styles.infoTag}>
              <Text style={styles.infoLabel}>DATE</Text>
              <Text style={styles.infoValue}>{LATEST_UPDATE.date}</Text>
            </View>

            {/* 更新内容 */}
            <View style={styles.logSection}>
              <Text style={styles.logLabel}>CHANGELOG</Text>
              <Animated.View
                style={[
                  styles.logLine,
                  {
                    width: barAnim2.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 60],
                    }),
                  },
                ]}
              />
              <Text style={styles.logText}>{LATEST_UPDATE.message}</Text>
            </View>
          </View>

          {/* 底部操作栏 */}
          {mode === 'pending' ? (
            <View style={styles.actionBar}>
              <TouchableOpacity
                style={styles.btnLater}
                onPress={handleLater}
                activeOpacity={0.7}
              >
                <Text style={styles.btnLaterText}>稍后提醒</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnUpdate}
                onPress={handleUpdate}
                activeOpacity={0.7}
              >
                <View style={styles.btnUpdateAccent} />
                <Ionicons name="refresh" size={15} color="#121212" />
                <Text style={styles.btnUpdateText}>立即更新</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actionBar}>
              <TouchableOpacity
                style={styles.btnUpdate}
                onPress={handleLater}
                activeOpacity={0.7}
              >
                <View style={styles.btnUpdateAccent} />
                <Text style={styles.btnUpdateText}>知道了</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 底部状态栏 */}
          <View style={styles.bottomBar}>
            <View style={styles.bottomBarLine} />
            <Text style={styles.bottomBarText}>RHODES ISLAND TERMINAL</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// 判断显示哪种弹窗：'pending'=待更新 | 'whatsnew'=已更新内容 | null=无需显示
export type UpdateMode = 'pending' | 'whatsnew' | null;

export async function checkUpdateMode(): Promise<UpdateMode> {
  try {
    // 1. 先检查是否有待应用的更新（下载了但未重启）
    const { isUpdatePending } = await Updates.checkForUpdateAsync()
      .then(() => ({ isUpdatePending: false }))
      .catch(() => ({ isUpdatePending: false }));

    // 用 fetchUpdateAsync 检查
    try {
      const updateCheck = await Updates.checkForUpdateAsync();
      if (updateCheck.isAvailable) {
        await Updates.fetchUpdateAsync();
        return 'pending';
      }
    } catch {
      // expo-updates 可能已经自动下载了
    }

    // 2. 检查当前代码版本是否与本地已见版本不同
    const lastSeen = await getLastSeenUpdate();
    const latestId = LATEST_UPDATE.id;

    if (!lastSeen || lastSeen !== latestId) {
      return 'whatsnew';
    }

    return null;
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
  },
  // 扫描线纹理 - 终端感
  scanlines: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.03,
    backgroundColor: 'transparent',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },

  // 主卡片
  card: {
    width: '88%',
    maxWidth: 370,
    backgroundColor: COLORS.bgSecondary,
    borderRadius: BORDER_RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
  },

  // ------------- 顶部状态栏 -------------
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  topBarDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
    marginRight: SPACING.sm,
  },
  topBarText: {
    flex: 1,
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.accent,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  topBarId: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.low,
    letterSpacing: 1,
  },

  // ------------- 内容区 -------------
  content: {
    padding: SPACING.lg,
    alignItems: 'center',
  },

  // 图标区
  iconSection: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  iconGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.accent,
    top: -15,
  },
  iconHex: {
    width: 52,
    height: 52,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: 'rgba(216,221,90,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(216,221,90,0.25)',
    transform: [{ rotate: '0deg' }],
  },
  decorLine: {
    height: 1,
    backgroundColor: COLORS.accent,
    opacity: 0.5,
    marginTop: SPACING.sm,
  },

  // 标题
  title: {
    fontFamily: FONTS.serif,
    fontSize: 22,
    color: COLORS.text,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: COLORS.low,
    letterSpacing: 2.5,
    marginBottom: SPACING.md,
  },

  // 分割线
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: SPACING.md,
  },
  dividerDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.divider,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.divider,
    marginHorizontal: SPACING.sm,
  },

  // 版本信息行
  infoTag: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  infoLabel: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.low,
    letterSpacing: 2,
  },
  infoValue: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },

  // 更新日志区
  logSection: {
    width: '100%',
    marginTop: SPACING.sm,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  logLabel: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.primary,
    letterSpacing: 2,
    marginBottom: SPACING.xs,
  },
  logLine: {
    height: 1,
    backgroundColor: COLORS.primary,
    opacity: 0.3,
    marginBottom: SPACING.sm,
  },
  logText: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },

  // ------------- 操作区 -------------
  actionBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  btnLater: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: COLORS.cardBorder,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  btnLaterText: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: COLORS.low,
    letterSpacing: 1,
  },
  btnUpdate: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: COLORS.accent,
    position: 'relative',
    overflow: 'hidden',
  },
  btnUpdateAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  btnUpdateText: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    color: '#121212',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginLeft: 4,
  },

  // ------------- 底部状态栏 -------------
  bottomBar: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  bottomBarLine: {
    width: 20,
    height: 1,
    backgroundColor: COLORS.primary,
    opacity: 0.4,
    marginBottom: SPACING.xs,
  },
  bottomBarText: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    color: 'rgba(255,255,255,0.15)',
    letterSpacing: 2,
  },
});
