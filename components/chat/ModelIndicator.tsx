import { View, Text, StyleSheet } from 'react-native';
import { useChatStore } from '@/stores/chatStore';
import { COLORS, FONTS } from '@/constants/theme';

export function ModelIndicator() {
  const currentModel = useChatStore((s) => s.currentModel);
  const reason = useChatStore((s) => s.lastRouterReason);

  if (!currentModel) return null;

  const isPro = currentModel === 'pro';
  const isLocal = currentModel === 'local';

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.dot,
          {
            backgroundColor: isLocal
              ? COLORS.low
              : isPro
              ? COLORS.advanced
              : COLORS.primary,
          },
        ]}
      />
      <Text style={styles.text}>
        {isLocal ? 'PRTS-LOCAL' : isPro ? 'PRTS-PRO' : 'PRTS-FLASH'}
      </Text>
      {isPro && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>深度模式</Text>
        </View>
      )}
    </View>
  );
}

export function ProBanner() {
  const show = useChatStore((s) => s.showProBanner);
  if (!show) return null;

  return (
    <View style={styles.banner}>
      <View style={styles.bannerDot} />
      <Text style={styles.bannerText}>PRTS 深度分析中...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 2,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.primary,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontFamily: FONTS.mono,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9,
    letterSpacing: 1,
  },
  badge: {
    marginLeft: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    backgroundColor: 'rgba(241,198,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(241,198,68,0.3)',
    borderRadius: 2,
  },
  badgeText: {
    fontFamily: FONTS.mono,
    color: COLORS.advanced,
    fontSize: 8,
    letterSpacing: 0.5,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    backgroundColor: 'rgba(241,198,68,0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(241,198,68,0.2)',
  },
  bannerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.advanced,
    marginRight: 8,
    opacity: 0.8,
  },
  bannerText: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.advanced,
    letterSpacing: 1,
  },
});
