import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { View, StyleSheet } from 'react-native';
import { useChatStore } from '@/stores/chatStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { COLORS } from '@/constants/theme';
import UpdateModal, { checkAndShowUpdate } from '@/components/UpdateModal';

export default function RootLayout() {
  // 从本地加载字体（避免请求 Google CDN 导致国内加载失败）
  const [fontsLoaded] = useFonts({
    NotoSansSC_400Regular: require('../assets/fonts/NotoSansSC_400Regular.ttf'),
    NotoSerifSC_700Bold: require('../assets/fonts/NotoSerifSC_700Bold.ttf'),
    RobotoMono_400Regular: require('../assets/fonts/RobotoMono_400Regular.ttf'),
  });

  const initChats = useChatStore((s) => s.initChats);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    if (fontsLoaded) {
      initChats();
      loadSettings();

      // 启动后检查是否有新更新
      checkAndShowUpdate().then((shouldShow) => {
        if (shouldShow) setShowUpdate(true);
      });
    }
  }, [fontsLoaded, initChats, loadSettings]);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer} />
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.bgPrimary },
          animation: 'fade',
        }}
      />

      {/* 热更新通知弹窗 */}
      <UpdateModal
        visible={showUpdate}
        onClose={() => setShowUpdate(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
});
