import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { ArkHeader, ArkButton } from '@/components/ArkUI';
import { useSettingsStore, AIModelConfig } from '@/stores/settingsStore';
import { COLORS, FONTS, SPACING } from '@/constants/theme';

function SettingItem({
  label,
  children,
  desc,
}: {
  label: string;
  children: React.ReactNode;
  desc?: string;
}) {
  return (
    <View style={styles.itemBox}>
      <View style={styles.itemTop}>
        <Text style={styles.itemLabel}>{label}</Text>
        {children}
      </View>
      {desc && <Text style={styles.itemDesc}>{desc}</Text>}
    </View>
  );
}

function ModelConfigCard({
  title,
  color,
  config,
  onChange,
}: {
  title: string;
  color: string;
  config: AIModelConfig;
  onChange: (config: Partial<AIModelConfig>) => void;
}) {
  const [showKey, setShowKey] = useState(false);

  return (
    <BlurView intensity={30} tint="dark" style={styles.card}>
      <View style={[styles.cardAccent, { backgroundColor: color }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardDot, { backgroundColor: color }]} />
          <Text style={styles.cardTitle}>{title}</Text>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: config.apiKey.trim() ? COLORS.online : COLORS.danger },
            ]}
          />
          <Text style={styles.statusText}>
            {config.apiKey.trim() ? '已配置' : '未配置'}
          </Text>
        </View>

        <SettingItem label="API Key" desc="仅本地存储，不会上传">
          <View style={styles.inputRow}>
            <TextInput
              value={config.apiKey}
              onChangeText={(v) => onChange({ apiKey: v })}
              placeholder="sk-xxxxxxxxxxxxxxxx"
              placeholderTextColor={COLORS.low}
              secureTextEntry={!showKey}
              style={styles.input}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowKey(!showKey)}>
              <Ionicons
                name={showKey ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={COLORS.low}
              />
            </TouchableOpacity>
          </View>
        </SettingItem>

        <SettingItem label="模型名称" desc="如 deepseek-v4-flash / deepseek-v4-pro">
          <TextInput
            value={config.model}
            onChangeText={(v) => onChange({ model: v })}
            placeholder="deepseek-v4-flash"
            placeholderTextColor={COLORS.low}
            style={styles.input}
          />
        </SettingItem>

        <SettingItem label="API 基础地址" desc="默认 https://api.deepseek.com">
          <TextInput
            value={config.baseUrl}
            onChangeText={(v) => onChange({ baseUrl: v })}
            placeholder="https://api.deepseek.com"
            placeholderTextColor={COLORS.low}
            style={styles.input}
          />
        </SettingItem>

        <SettingItem label="Temperature" desc="0~2，越大越随机">
          <TextInput
            value={String(config.temperature)}
            onChangeText={(v) => {
              const n = parseFloat(v);
              if (!isNaN(n)) onChange({ temperature: n });
            }}
            placeholder="0.8"
            placeholderTextColor={COLORS.low}
            keyboardType="decimal-pad"
            style={styles.input}
          />
        </SettingItem>
      </View>
    </BlurView>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const settings = useSettingsStore();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    settings.loadSettings().then(() => setLoaded(true));
  }, []);

  const handleReset = () => {
    Alert.alert('确认重置', '确定要恢复默认设置吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '重置',
        style: 'destructive',
        onPress: () => settings.resetSettings(),
      },
    ]);
  };

  if (!loaded) {
    return (
      <View style={styles.container}>
        <ArkHeader title="系统设置" subtitle="SETTINGS" onBack={() => router.back()} />
        <View style={styles.loadingBox}>
          <Text style={styles.loadingText}>正在加载配置...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ArkHeader title="系统设置" subtitle="SETTINGS" onBack={() => router.back()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Flash 模型配置 */}
        <ModelConfigCard
          title="PRTS-FLASH 标准模式"
          color={COLORS.primary}
          config={settings.flash}
          onChange={(c) => settings.setFlashConfig(c)}
        />

        {/* Pro 模型配置 */}
        <ModelConfigCard
          title="PRTS-PRO 深度模式"
          color={COLORS.advanced}
          config={settings.pro}
          onChange={(c) => settings.setProConfig(c)}
        />

        {/* 通用设置 */}
        <BlurView intensity={30} tint="dark" style={styles.card}>
          <View style={[styles.cardAccent, { backgroundColor: COLORS.secondary }]} />
          <View style={styles.cardContent}>
            <SettingItem label="最大历史轮数" desc="携带给模型的上下文轮数">
              <TextInput
                value={String(settings.maxHistory)}
                onChangeText={(v) => {
                  const n = parseInt(v, 10);
                  if (!isNaN(n)) settings.setMaxHistory(n);
                }}
                placeholder="20"
                placeholderTextColor={COLORS.low}
                keyboardType="number-pad"
                style={styles.input}
              />
            </SettingItem>
          </View>
        </BlurView>

        {/* 操作按钮 */}
        <View style={styles.btnRow}>
          <ArkButton title="保存配置" onPress={() => Alert.alert('保存成功', '配置已自动保存')} variant="accent" style={styles.saveBtn} />
          <ArkButton title="恢复默认" onPress={handleReset} variant="ghost" style={styles.resetBtn} />
        </View>

        {/* 说明 */}
        <View style={styles.hintBox}>
          <Text style={styles.hintTitle}>使用说明</Text>
          <Text style={styles.hintText}>
            1. 系统会根据消息内容自动在 Flash（标准）和 Pro（深度）模式间切换{'\n'}
            2. 触发 Pro 模式的关键词：特蕾西娅、过去、记忆、战斗意义等深度话题{'\n'}
            3. 两个模式可配置不同的模型和 API Key，也可使用相同的 Key{'\n'}
            4. 所有配置仅保存在本地设备，不会上传到任何服务器{'\n'}
            5. 未配置 API Key 时，系统会使用本地预设回复
          </Text>
        </View>

        {/* 路由规则说明 */}
        <View style={styles.hintBox}>
          <Text style={styles.hintTitle}>PRTS 智能路由规则</Text>
          <Text style={styles.hintText}>
            • 深度话题命中：+30~40 分{'\n'}
            • 强烈情感词命中：+20~30 分{'\n'}
            • 对话轮数 &gt;10：+10 分，&gt;30：+20 分{'\n'}
            • 连续追问内心：+20 分{'\n'}
            • 破墙测试 / 创伤触发：+10 分{'\n'}
            {'\n'}
            总分 ≥ 60 分 → 自动切换至 PRO 深度模式
          </Text>
        </View>

        {/* 版本信息 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>罗德岛通讯终端 v1.0.0</Text>
          <Text style={styles.footerSub}>POWERED BY PRTS / DeepSeek AI</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl * 2,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    color: COLORS.low,
  },
  card: {
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  cardContent: {
    padding: SPACING.md,
    paddingLeft: SPACING.md + 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  cardDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.sm,
  },
  cardTitle: {
    fontFamily: FONTS.serif,
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
    letterSpacing: -0.5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  statusText: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  itemBox: {
    marginBottom: SPACING.md,
  },
  itemTop: {
    flexDirection: 'column',
  },
  itemLabel: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.low,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: SPACING.xs,
  },
  itemDesc: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: COLORS.low,
    marginTop: SPACING.xs,
    opacity: 0.7,
  },
  input: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    color: COLORS.text,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
  btnRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  saveBtn: {
    flex: 1,
  },
  resetBtn: {
    flex: 1,
  },
  hintBox: {
    backgroundColor: 'rgba(74,171,234,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(74,171,234,0.2)',
    borderRadius: 4,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  hintTitle: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.primary,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  hintText: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  footerText: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.low,
    letterSpacing: 1,
  },
  footerSub: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: 1,
    marginTop: SPACING.xs,
  },
});
