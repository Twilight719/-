import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/theme';
import { MEMBER_AVATARS } from '@/stores/groupStore';

interface GroupAvatarProps {
  memberIds: string[];
  size?: number;
}

export default function GroupAvatar({ memberIds, size = 52 }: GroupAvatarProps) {
  const displayMembers = memberIds.slice(0, 4);
  const cellSize = (size - 4) / 2;

  const getSource = (id: string) =>
    (MEMBER_AVATARS[id] || MEMBER_AVATARS['amiya']) as any;

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: 4 }]}>
      {displayMembers.length === 1 ? (
        <Image source={getSource(displayMembers[0])} style={{ width: size, height: size }} resizeMode="cover" />
      ) : (
        <View style={styles.grid}>
          {[0, 1, 2, 3].map((index) => {
            const charId = displayMembers[index];
            if (!charId) {
              return <View key={index} style={[styles.cell, { width: cellSize, height: cellSize, backgroundColor: COLORS.bgTertiary }]} />;
            }
            return (
              <View key={index} style={[styles.cell, { width: cellSize, height: cellSize }]}>
                <Image source={getSource(charId)} style={{ width: cellSize, height: cellSize }} resizeMode="cover" />
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: COLORS.bgTertiary,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    height: '100%',
  },
  cell: {
    overflow: 'hidden',
  },
});
