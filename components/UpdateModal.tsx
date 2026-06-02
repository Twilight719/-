import React, { useEffect, useState } from 'react';
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
import { UPDATE_LOG, LATEST_UPDATE } from '@/constants/updates';

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
}

export default function UpdateModal({ visible, onClose }: UpdateModalProps) {
  const fadeAnim = useState(() => new Animated.Value(0))[0];
  const slideAnim = useState(() => new Animated.Value(50))[0];

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  const handleUpdate = async () => {
    await markUpdateSeen(LATEST_UPDATE.id);
    onClose();
    try {
      await Updates.reloadAsync();
    } catch {
      // reload failed, user can manually restart
    }
  };

  const handleLater = async () => {
    await markUpdateSeen(LATEST_UPDATE.id);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <BlurView intensity={40} tint="dark" style={styles.blur} />

        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* 装饰线 */}
          <View style={styles.accentLine} />

          {/* 头部 */}
          <View style={styles.header}>
            <View style={styles.iconBox}>
              <Ionicons name="cloud-download" size={28} color={COLORS.accent} />
            </View>
            <Text style={styles.title}>检测到新版本</Text>
            <Text style={styles.version}>
              v{LATEST_UPDATE.version} — {LATEST_UPDATE.date}
            </Text>
          </View>

          {/* 更新内容 */}
          <View style={styles.body}>
            <Text style={styles.bodyLabel}>更新内容</Text>
            <Text style={styles.bodyText}>{LATEST_UPDATE.message}</Text>
          </View>

          {/* 按钮 */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnLater]}
              onPress={handleLater}
              activeOpacity={0.7}
            >
              <Text style={styles.btnLaterText}>稍后</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnUpdate]}
              onPress={handleUpdate}
              activeOpacity={0.7}
            >
              <Ionicons
                name="refresh"
                size={16}
                color="#121212"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.btnUpdateText}>立即更新</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '85%',
    maxWidth: 360,
    backgroundColor: COLORS.bgSecondary,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
  },
  accentLine: {
    height: 3,
    backgroundColor: COLORS.accent,
  },
  header: {
    alignItems: 'center',
    paddingTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(216,221,90,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(216,221,90,0.3)',
  },
  title: {
    fontFamily: FONTS.serif,
    fontSize: 20,
    color: COLORS.text,
    letterSpacing: -0.5,
    marginBottom: SPACING.xs,
  },
  version: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.low,
    letterSpacing: 1,
  },
  body: {
    padding: SPACING.lg,
  },
  bodyLabel: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.primary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
  },
  bodyText: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  btnRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  btn: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  btnLater: {
    borderRightWidth: 1,
    borderRightColor: COLORS.cardBorder,
  },
  btnLaterText: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    color: COLORS.low,
  },
  btnUpdate: {
    backgroundColor: COLORS.accent,
  },
  btnUpdateText: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    color: '#121212',
    fontWeight: '700',
  },
});

// 检查是否需要显示更新弹窗
export async function checkAndShowUpdate(): Promise<boolean> {
  try {
    const lastSeen = await getLastSeenUpdate();
    const latestId = LATEST_UPDATE.id;

    // 首次安装或新版本
    if (!lastSeen || lastSeen !== latestId) {
      return true;
    }

    // 检查 expo-updates 是否有待应用的更新
    const updateCheck = await Updates.checkForUpdateAsync();
    if (updateCheck.isAvailable) {
      await Updates.fetchUpdateAsync();
      return true;
    }
  } catch {
    // 静默处理
  }
  return false;
}
