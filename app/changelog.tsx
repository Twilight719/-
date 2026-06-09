import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { ArkHeader } from '@/components/ArkUI';
import { UPDATE_LOG } from '@/constants/updates';
import { COLORS, FONTS, SPACING } from '@/constants/theme';

export default function ChangelogScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ArkHeader title="更新日志" subtitle="CHANGELOG" onBack={() => router.back()} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {UPDATE_LOG.map((entry, index) => (
          <BlurView key={entry.id} intensity={30} tint="dark" style={styles.card}>
            <View style={[styles.accent, { backgroundColor: index === 0 ? COLORS.accent : COLORS.primary }]} />
            <View style={styles.body}>
              <View style={styles.topRow}>
                <View style={styles.dot} />
                <Text style={styles.version}>v{entry.version}</Text>
                <Text style={styles.date}>{entry.date}</Text>
              </View>
              <Text style={styles.message}>{entry.message}</Text>
            </View>
          </BlurView>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.md, paddingBottom: SPACING.xl * 2 },
  card: { borderRadius: 4, borderWidth: 1, borderColor: COLORS.cardBorder, overflow: 'hidden', marginBottom: SPACING.md },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  body: { padding: SPACING.md, paddingLeft: SPACING.md + 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary, marginRight: SPACING.sm },
  version: { fontFamily: FONTS.serif, fontSize: 15, color: COLORS.text, flex: 1 },
  date: { fontFamily: FONTS.mono, fontSize: 11, color: COLORS.low },
  message: { fontFamily: FONTS.sans, fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
});
