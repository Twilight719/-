import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  NotoSansSC_400Regular,
} from '@expo-google-fonts/noto-sans-sc';
import {
  NotoSerifSC_700Bold,
} from '@expo-google-fonts/noto-serif-sc';
import {
  RobotoMono_400Regular,
} from '@expo-google-fonts/roboto-mono';
import { View, StyleSheet } from 'react-native';
import { useChatStore } from '@/stores/chatStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { COLORS } from '@/constants/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    NotoSansSC_400Regular,
    NotoSerifSC_700Bold,
    RobotoMono_400Regular,
  });

  const initChats = useChatStore((s) => s.initChats);
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  useEffect(() => {
    if (fontsLoaded) {
      initChats();
      loadSettings();
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
