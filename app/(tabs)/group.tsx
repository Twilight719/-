import { useState, useEffect} from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  TextInput, ScrollView, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ArkHeader, ArkListItem } from '@/components/ArkUI';
import GroupAvatar from '@/components/GroupAvatar';
import { useGroupStore, Group, MEMBER_NAMES } from '@/stores/groupStore';
import { COLORS, FONTS, SPACING } from '@/constants/theme';

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return new Date(timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

const ALL_MEMBERS = [
  { id: 'amiya', name: '阿米娅' }, { id: 'kaltsit', name: '凯尔希' },
  { id: 'mon3tr', name: 'Mon3tr' }, { id: 'closure', name: '可露希尔' },
  { id: 'texas', name: '德克萨斯' }, { id: 'texas_alter', name: '缄默德克萨斯' },
  { id: 'lappland', name: '拉普兰德' }, { id: 'lappland_alter', name: '荒芜拉普兰德' },
  { id: 'silence', name: '赫默' }, { id: 'silence_alter', name: '淬羽赫默' },
  { id: 'eyja', name: '艾雅法拉' }, { id: 'eyja_alter', name: '纯烬艾雅法拉' },
  { id: 'chen', name: '陈' }, { id: 'chen_alter', name: '假日威龙陈' },
  { id: 'nearl', name: '临光' }, { id: 'nearl_alter', name: '耀骑士临光' },
  { id: 'siege', name: '推进之王' }, { id: 'siege_alter', name: '维娜·维多利亚' },
  { id: 'exusiai', name: '新约能天使' }, { id: 'wisadel', name: '维什戴尔' },
];

export default function GroupListScreen() {
  const router = useRouter();
  const groups = useGroupStore((s) => s.groups);
  const initGroups = useGroupStore((s) => s.initGroups);
  const createGroup = useGroupStore((s) => s.createGroup);
  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selected, setSelected] = useState<string[]>(['amiya', 'kaltsit']);

  useEffect(() => { initGroups(); }, [initGroups]);

  const handleCreate = async () => {
    if (selected.length < 2) {
      Alert.alert('提示', '请至少选择 2 名干员');
      return;
    }
    const name = groupName.trim();
    await createGroup(name, selected);
    setShowCreate(false);
    setGroupName('');
    setSelected(['amiya', 'kaltsit']);
  };

  const toggleMember = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleGroupPress = (group: Group) => {
    useGroupStore.getState().clearUnread(group.id);
    router.push(`/group-chat/${group.id}` as any);
  };

  const renderGroup = ({ item }: { item: Group }) => (
    <ArkListItem onPress={() => handleGroupPress(item)}>
      <View style={styles.groupRow}>
        <GroupAvatar memberIds={item.memberIds} size={52} />
        <View style={styles.groupInfo}>
          <View style={styles.topRow}>
            <Text style={styles.groupName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.groupTime}>{formatTime(item.lastMessageTime)}</Text>
          </View>
          <View style={styles.bottomRow}>
            <Text style={styles.memberPreview} numberOfLines={1}>
              {item.memberIds.map((id) => MEMBER_NAMES[id] || id).join('、')}
            </Text>
            {item.unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </ArkListItem>
  );

  return (
    <View style={styles.container}>
      <ArkHeader
        title="群聊"
        subtitle={`${groups.length} 个群组`}
        rightAction={
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
            <Ionicons name="create-outline" size={20} color={COLORS.text} />
          </TouchableOpacity>
        }
      />
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={renderGroup}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>暂无群聊，点击右上角创建</Text>
          </View>
        }
      />

      {/* 创建群聊弹窗 */}
      <Modal visible={showCreate} transparent animationType="slide" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>创建群聊</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.label}>群聊名称</Text>
              <TextInput
                value={groupName}
                onChangeText={setGroupName}
                placeholder={selected.map((id) => MEMBER_NAMES[id] || id).join('、') + '的群聊'}
                placeholderTextColor={COLORS.low}
                style={styles.nameInput}
                maxLength={20}
              />

              <Text style={styles.label}>选择干员（至少 2 名）</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.memberList}>
                {ALL_MEMBERS.map((m) => {
                  const isSel = selected.includes(m.id);
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.memberChip, isSel && styles.memberChipActive]}
                      onPress={() => toggleMember(m.id)}
                    >
                      <Text style={[styles.memberChipText, isSel && styles.memberChipTextActive]}>
                        {m.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* 预览 */}
              <View style={styles.previewBox}>
                <GroupAvatar memberIds={selected} size={48} />
                <Text style={styles.previewName}>
                  {groupName || selected.map((id) => MEMBER_NAMES[id] || id).join('、') + '的群聊'}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.createBtn} onPress={handleCreate} activeOpacity={0.7}>
              <Text style={styles.createBtnText}>创建群聊</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  addBtn: {
    width: 36, height: 36, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2, justifyContent: 'center', alignItems: 'center',
  },
  listContent: { paddingTop: SPACING.sm, paddingBottom: SPACING.lg },
  groupRow: { flexDirection: 'row', alignItems: 'center' },
  groupInfo: { flex: 1, marginLeft: SPACING.md, justifyContent: 'center' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  groupName: { fontFamily: FONTS.serif, fontSize: 15, color: COLORS.text, flex: 1, marginRight: SPACING.sm },
  groupTime: { fontFamily: FONTS.mono, fontSize: 11, color: COLORS.low },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  memberPreview: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.textSecondary, flex: 1 },
  badge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { fontFamily: FONTS.mono, fontSize: 10, color: '#121212', fontWeight: '700' },
  emptyBox: { paddingTop: SPACING.xl * 2, alignItems: 'center' },
  emptyText: { fontFamily: FONTS.sans, fontSize: 14, color: COLORS.low },
  // 创建弹窗
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalCard: { backgroundColor: COLORS.bgSecondary, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderWidth: 1, borderColor: COLORS.cardBorder },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  modalTitle: { fontFamily: FONTS.serif, fontSize: 18, color: COLORS.text },
  modalBody: { padding: SPACING.lg },
  label: { fontFamily: FONTS.mono, fontSize: 11, color: COLORS.low, letterSpacing: 1, textTransform: 'uppercase', marginBottom: SPACING.sm, marginTop: SPACING.md },
  nameInput: { fontFamily: FONTS.sans, fontSize: 15, color: COLORS.text, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, borderWidth: 1, borderColor: COLORS.cardBorder },
  memberList: { marginBottom: SPACING.md },
  memberChip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, borderWidth: 1, borderColor: COLORS.cardBorder, marginRight: SPACING.sm },
  memberChipActive: { backgroundColor: 'rgba(74,171,234,0.2)', borderColor: COLORS.primary },
  memberChipText: { fontFamily: FONTS.sans, fontSize: 13, color: COLORS.low },
  memberChipTextActive: { color: COLORS.primary },
  previewBox: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.lg, padding: SPACING.md, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 4 },
  previewName: { fontFamily: FONTS.sans, fontSize: 14, color: COLORS.textSecondary, marginLeft: SPACING.md },
  createBtn: { backgroundColor: COLORS.accent, margin: SPACING.lg, paddingVertical: SPACING.md, borderRadius: 2, alignItems: 'center' },
  createBtnText: { fontFamily: FONTS.sans, fontSize: 15, color: '#121212', fontWeight: '700' },
});
