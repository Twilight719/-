import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArkHeader, ArkButton } from '@/components/ArkUI';
import { useSettingsStore, AIModelConfig } from '@/stores/settingsStore';
import { useChatStore } from '@/stores/chatStore';
import { useGroupStore } from '@/stores/groupStore';
import { COLORS, FONTS, SPACING } from '@/constants/theme';

const DOCTOR_AVATAR = require('../../assets/characters/doctor_avatar.webp');

function SettingItem({ label, children, desc }: {
  label: string; children: React.ReactNode; desc?: string;
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

// 可折叠的模型配置卡片
function ModelConfigCard({
  title, color, config, onChange,
}: {
  title: string; color: string; config: AIModelConfig;
  onChange: (config: Partial<AIModelConfig>) => void;
}) {
  const [showKey, setShowKey] = useState(false);
  const isConfigured = config.apiKey.trim().length > 0;
  const [expanded, setExpanded] = useState(!isConfigured);

  return (
    <BlurView intensity={30} tint="dark" style={styles.card}>
      <View style={[styles.cardAccent, { backgroundColor: color }]} />
      <View style={styles.cardContent}>
        <TouchableOpacity style={styles.cardHeader} onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
          <View style={[styles.cardDot, { backgroundColor: color }]} />
          <Text style={styles.cardTitle}>{title}</Text>
          <View style={[styles.statusDot, { backgroundColor: isConfigured ? COLORS.online : COLORS.danger }]} />
          <Text style={styles.statusText}>{isConfigured ? '已配置' : '未配置'}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.low} style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        {expanded && (
          <>
            <SettingItem label="API Key" desc="仅本地存储，不会上传">
              <View style={styles.inputRow}>
                <TextInput value={config.apiKey} onChangeText={(v) => onChange({ apiKey: v })}
                  placeholder="sk-xxxxxxxxxxxxxxxx" placeholderTextColor={COLORS.low}
                  secureTextEntry={!showKey} style={styles.input} />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowKey(!showKey)}>
                  <Ionicons name={showKey ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.low} />
                </TouchableOpacity>
              </View>
            </SettingItem>
            <SettingItem label="模型名称">
              <TextInput value={config.model} onChangeText={(v) => onChange({ model: v })}
                placeholder="deepseek-v4-flash" placeholderTextColor={COLORS.low} style={styles.input} />
            </SettingItem>
            <SettingItem label="API 基础地址">
              <TextInput value={config.baseUrl} onChangeText={(v) => onChange({ baseUrl: v })}
                placeholder="https://api.deepseek.com" placeholderTextColor={COLORS.low} style={styles.input} />
            </SettingItem>
            <SettingItem label="Temperature" desc="0~2，越大越随机">
              <TextInput value={String(config.temperature)} onChangeText={(v) => {
                const n = parseFloat(v); if (!isNaN(n)) onChange({ temperature: n });
              }} placeholder="0.8" placeholderTextColor={COLORS.low} keyboardType="decimal-pad" style={styles.input} />
            </SettingItem>
          </>
        )}
      </View>
    </BlurView>
  );
}

export default function SettingsScreen() {
  const settings = useSettingsStore();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { settings.loadSettings().then(() => setLoaded(true)); }, []);

  const handleReset = () => {
    Alert.alert('确认重置', '确定要恢复默认设置吗？', [
      { text: '取消', style: 'cancel' },
      { text: '重置', style: 'destructive', onPress: () => settings.resetSettings() },
    ]);
  };

  const handleClearCache = () => {
    Alert.alert(
      '清除聊天记录',
      '将删除所有聊天记录和群聊消息（API 配置保留）',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认清除', style: 'destructive',
          onPress: async () => {
            const keys = [
              '@rhodes_chats_v2', '@rhodes_messages_v2',
              '@rhodes_groups_v2', '@rhodes_group_msgs_v2',
              '@rhodes_last_proactive', '@rhodes_last_seen_update',
            ];
            await AsyncStorage.multiRemove(keys);
            // 重置聊天和群聊 store
            useChatStore.getState().initChats();
            useGroupStore.getState().initGroups();
            Alert.alert('已清除', '聊天记录已清空');
          },
        },
      ]
    );
  };

  if (!loaded) {
    return (
      <View style={styles.container}>
        <ArkHeader title="系统设置" subtitle="SETTINGS" />
        <View style={styles.loadingBox}><Text style={styles.loadingText}>正在加载配置...</Text></View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ArkHeader title="系统设置" subtitle="SETTINGS" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* 博士个人卡片 */}
        <BlurView intensity={30} tint="dark" style={styles.card}>
          <View style={[styles.cardAccent, { backgroundColor: COLORS.primary }]} />
          <View style={styles.cardContent}>
            <View style={styles.profileRow}>
              <Image source={DOCTOR_AVATAR} style={styles.doctorAvatar} resizeMode="cover" />
              <View style={styles.profileInfo}>
                <Text style={styles.doctorName}>博士</Text>
                <Text style={styles.doctorTitle}>罗德岛战术指挥官</Text>
                <Text style={styles.doctorId}>ID: DR-0001</Text>
              </View>
            </View>
          </View>
        </BlurView>

        {/* Flash 模型配置（折叠） */}
        <ModelConfigCard title="PRTS-FLASH 标准模式" color={COLORS.primary}
          config={settings.flash} onChange={(c) => settings.setFlashConfig(c)} />

        {/* Pro 模型配置（折叠） */}
        <ModelConfigCard title="PRTS-PRO 深度模式" color={COLORS.advanced}
          config={settings.pro} onChange={(c) => settings.setProConfig(c)} />

        {/* 通用设置 */}
        <BlurView intensity={30} tint="dark" style={styles.card}>
          <View style={[styles.cardAccent, { backgroundColor: COLORS.secondary }]} />
          <View style={styles.cardContent}>
            <SettingItem label="最大历史轮数" desc="携带给模型的上下文轮数">
              <TextInput value={String(settings.maxHistory)} onChangeText={(v) => {
                const n = parseInt(v, 10); if (!isNaN(n)) settings.setMaxHistory(n);
              }} placeholder="20" placeholderTextColor={COLORS.low}
                keyboardType="number-pad" style={styles.input} />
            </SettingItem>
          </View>
        </BlurView>

        {/* 操作按钮 */}
        <View style={styles.btnRow}>
          <ArkButton title="清除缓存" onPress={handleClearCache} variant="ghost" style={styles.resetBtn} />
          <ArkButton title="重置配置" onPress={handleReset} variant="ghost" style={styles.resetBtn} />
        </View>

        {/* 说明 */}
        <View style={styles.hintBox}>
          <Text style={styles.hintTitle}>使用说明</Text>
          <Text style={styles.hintText}>
            1. 配置 DeepSeek API Key 后即可使用 AI 聊天{'\n'}
            2. 系统自动在 Flash（标准）和 Pro（深度）间切换{'\n'}
            3. 所有配置仅保存在本地设备{'\n'}
            4. 点击卡片标题可折叠/展开配置项
          </Text>
        </View>

        {/* DeepSeek API Key 获取教程 */}
        <View style={[styles.hintBox, { backgroundColor: 'rgba(216,221,90,0.06)', borderColor: 'rgba(216,221,90,0.2)' }]}>
          <Text style={[styles.hintTitle, { color: COLORS.accent }]}>🔑 如何获取 DeepSeek API Key</Text>
          <Text style={styles.tutorialStep}>第一步</Text>
          <Text style={styles.hintText}>
            打开浏览器访问 https://platform.deepseek.com{'\n'}
            点击右上角「注册/登录」，支持手机号或邮箱注册
          </Text>
          <Text style={styles.tutorialStep}>第二步</Text>
          <Text style={styles.hintText}>
            登录后在左侧菜单找到「API Keys」{'\n'}
            点击「创建 API Key」，输入一个名称（如"干员终端"）
          </Text>
          <Text style={styles.tutorialStep}>第三步</Text>
          <Text style={styles.hintText}>
            复制生成的 Key（格式：sk-xxxxxxxxxxxxxxxx）{'\n'}
            ⚠️ Key 只显示一次，请务必保存好！
          </Text>
          <Text style={styles.tutorialStep}>第四步</Text>
          <Text style={styles.hintText}>
            回到本页面，将 Key 粘贴到上方的「API Key」输入框中{'\n'}
            Flash 和 Pro 可以填写同一个 Key
          </Text>
          <Text style={styles.tutorialNote}>💡 新用户注册赠送 500 万 tokens 免费额度，足够日常使用。用完后按量付费，价格很低。</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>干员终端 v1.4.0</Text>
          <Text style={styles.footerSub}>POWERED BY PRTS / DeepSeek AI</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.md, paddingBottom: SPACING.xl * 2 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontFamily: FONTS.sans, fontSize: 14, color: COLORS.low },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  doctorAvatar: { width: 56, height: 56, borderRadius: 4, borderWidth: 2, borderColor: COLORS.primary },
  profileInfo: { marginLeft: SPACING.md, flex: 1 },
  doctorName: { fontFamily: FONTS.serif, fontSize: 18, color: COLORS.text },
  doctorTitle: { fontFamily: FONTS.mono, fontSize: 10, color: COLORS.primary, letterSpacing: 1, marginTop: 2 },
  doctorId: { fontFamily: FONTS.mono, fontSize: 10, color: COLORS.low, letterSpacing: 1, marginTop: 2 },
  card: { borderRadius: 4, borderWidth: 1, borderColor: COLORS.cardBorder, overflow: 'hidden', marginBottom: SPACING.md },
  cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  cardContent: { padding: SPACING.md, paddingLeft: SPACING.md + 6 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardDot: { width: 8, height: 8, borderRadius: 4, marginRight: SPACING.sm },
  cardTitle: { fontFamily: FONTS.serif, fontSize: 16, color: COLORS.text, flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  statusText: { fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textSecondary, letterSpacing: 1 },
  itemBox: { marginBottom: SPACING.md, marginTop: SPACING.sm },
  itemTop: { flexDirection: 'column' },
  itemLabel: { fontFamily: FONTS.mono, fontSize: 11, color: COLORS.low, letterSpacing: 1, textTransform: 'uppercase', marginBottom: SPACING.xs },
  itemDesc: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.low, marginTop: SPACING.xs, opacity: 0.7 },
  input: { fontFamily: FONTS.sans, fontSize: 14, color: COLORS.text, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.sm, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, borderWidth: 1, borderColor: COLORS.cardBorder, flex: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  eyeBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', marginLeft: SPACING.sm },
  btnRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  resetBtn: { flex: 1 },
  hintBox: { backgroundColor: 'rgba(74,171,234,0.08)', borderWidth: 1, borderColor: 'rgba(74,171,234,0.2)', borderRadius: 4, padding: SPACING.md, marginBottom: SPACING.lg },
  hintTitle: { fontFamily: FONTS.mono, fontSize: 11, color: COLORS.primary, letterSpacing: 1, marginBottom: SPACING.sm },
  hintText: { fontFamily: FONTS.sans, fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  tutorialStep: { fontFamily: FONTS.mono, fontSize: 11, color: COLORS.accent, letterSpacing: 1, marginTop: SPACING.sm, marginBottom: SPACING.xs },
  tutorialNote: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.accent, lineHeight: 18, marginTop: SPACING.md, opacity: 0.8 },
  footer: { alignItems: 'center', paddingVertical: SPACING.lg },
  footerText: { fontFamily: FONTS.mono, fontSize: 11, color: COLORS.low, letterSpacing: 1 },
  footerSub: { fontFamily: FONTS.mono, fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, marginTop: SPACING.xs },
});
