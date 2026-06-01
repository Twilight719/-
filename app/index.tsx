import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING } from '@/constants/theme';

export default function SplashScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const blinkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    const timer = setTimeout(() => {
      router.replace('/chat-list');
    }, 2500);

    return () => clearTimeout(timer);
  }, [fadeAnim, blinkAnim, router]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#121212', '#1a1a2e', '#121212']}
        style={styles.gradient}
      />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.logoBox}>
          <View style={styles.logoGlow} />
          <Text style={styles.logoText}>罗德岛通讯终端</Text>
          <View style={styles.logoLine} />
        </View>

        <Animated.View style={{ opacity: blinkAnim }}>
          <Text style={styles.statusText}>正在接入PRTS系统...</Text>
        </Animated.View>

        <View style={styles.decorBox}>
          <Text style={styles.decorText}>RHODES ISLAND™</Text>
          <Text style={styles.decorSub}>SECURE CHANNEL V.7.2</Text>
        </View>
      </Animated.View>

      {/* 噪点纹理模拟 */}
      <View style={styles.noiseOverlay} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    alignItems: 'center',
    zIndex: 1,
  },
  logoBox: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoGlow: {
    position: 'absolute',
    top: -20,
    width: 200,
    height: 60,
    backgroundColor: COLORS.primary,
    opacity: 0.08,
    borderRadius: 30,
  },
  logoText: {
    fontFamily: FONTS.serif,
    fontSize: 28,
    color: COLORS.primary,
    letterSpacing: 2,
    textShadowColor: 'rgba(74,171,234,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  logoLine: {
    width: 120,
    height: 1,
    backgroundColor: COLORS.primary,
    opacity: 0.4,
    marginTop: SPACING.sm,
  },
  statusText: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },
  decorBox: {
    position: 'absolute',
    bottom: -200,
    alignItems: 'center',
  },
  decorText: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.low,
    letterSpacing: 2,
  },
  decorSub: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: 'rgba(255,255,255,0.15)',
    letterSpacing: 1,
    marginTop: SPACING.xs,
  },
  noiseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.015)',
  },
});
