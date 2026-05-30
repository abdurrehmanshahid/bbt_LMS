import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import { learnerApi, type Notification } from '@/lib/learner';
import { useAuthStore } from '@/lib/store';

const CATEGORY_COLOR: Record<string, string> = {
  STREAK: '#f59e0b',
  BADGE: '#22c55e',
  COHORT: '#6366f1',
  MODERATION: '#f87171',
  SYSTEM: '#8888bb',
};

function NotifCard({ item, onRead }: { item: Notification; onRead: () => void }): React.JSX.Element {
  const accent = CATEGORY_COLOR[item.category] ?? '#8888bb';
  return (
    <TouchableOpacity
      onPress={onRead}
      style={[styles.card, !item.read && styles.cardUnread]}
      activeOpacity={0.8}
    >
      <View style={[styles.dot, { backgroundColor: item.read ? 'transparent' : accent }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.cardTime}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
        <Text style={styles.cardBody} numberOfLines={2}>{item.body}</Text>
        <View style={[styles.categoryPill, { backgroundColor: `${accent}22` }]}>
          <Text style={[styles.categoryText, { color: accent }]}>{item.category}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen(): React.JSX.Element {
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['mobile-notifications'],
    queryFn: () => learnerApi.getNotifications(accessToken!),
    enabled: !!accessToken,
  });

  const readMut = useMutation({
    mutationFn: (id: string) => learnerApi.markRead(accessToken!, id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['mobile-notifications'] }),
  });

  const unreadCount = data?.filter((n) => !n.read).length ?? 0;

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color="#F7941D" size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={data ?? []}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => (
          <NotifCard
            item={item}
            onRead={() => { if (!item.read) readMut.mutate(item.id); }}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>All clear</Text>
            <Text style={styles.emptySub}>No notifications yet.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d2e' },
  center: { flex: 1, backgroundColor: '#0d0d2e', alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 26, fontWeight: '700', color: '#fff' },
  badge: { backgroundColor: '#F7941D', borderRadius: 10, minWidth: 20, paddingHorizontal: 6, height: 20, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  card: { flexDirection: 'row', gap: 10, paddingVertical: 14 },
  cardUnread: {},
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  cardContent: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#fff', flex: 1, marginRight: 8 },
  cardTime: { fontSize: 11, color: '#5555aa', flexShrink: 0 },
  cardBody: { fontSize: 13, color: '#8888bb', lineHeight: 19, marginBottom: 8 },
  categoryPill: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  categoryText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  separator: { height: 1, backgroundColor: '#1e1e4e', marginLeft: 18 },
  empty: { paddingTop: 80, alignItems: 'center' },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#5555aa', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#3a3a6e' },
});
