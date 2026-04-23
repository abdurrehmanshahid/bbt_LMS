import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store';
import { creatorApi, type ModerationItem } from '@/lib/creator';

const STATUS_CONFIG: Record<ModerationItem['status'], { label: string; color: string; bg: string }> = {
  REJECTED: { label: 'Rejected', color: '#f87171', bg: '#450a0a44' },
  HELD: { label: 'Held for review', color: '#f59e0b', bg: '#451a0344' },
};

function InboxCard({ item, token }: { item: ModerationItem; token: string }): React.JSX.Element {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[item.status];

  const resubmitMut = useMutation({
    mutationFn: () => creatorApi.resubmit(token, item.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['mobile-creator-inbox'] });
      Alert.alert('Resubmitted', 'Your content has been resubmitted for review.');
    },
    onError: () => Alert.alert('Error', 'Resubmit failed. Please try again.'),
  });

  const appealMut = useMutation({
    mutationFn: () => creatorApi.appeal(token, item.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['mobile-creator-inbox'] });
      Alert.alert('Appeal submitted', 'Our team will review your appeal.');
    },
    onError: () => Alert.alert('Error', 'Appeal failed. Please try again.'),
  });

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => setExpanded((v) => !v)} activeOpacity={0.85} style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.cardTrack}>{item.track}</Text>
          <Text style={styles.cardReason} numberOfLines={1}>
            <Text style={styles.cardReasonLabel}>Reason: </Text>
            {item.rejectionReason}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.cardExpanded}>
          <View style={styles.feedbackBox}>
            <Text style={styles.feedbackLabel}>Moderator feedback</Text>
            <Text style={styles.feedbackText}>{item.feedback}</Text>
          </View>
          <Text style={styles.receivedDate}>Received {new Date(item.createdAt).toLocaleDateString()}</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary, resubmitMut.isPending && styles.actionBtnDisabled]}
              onPress={() => resubmitMut.mutate()}
              disabled={resubmitMut.isPending}
              activeOpacity={0.8}
            >
              {resubmitMut.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.actionBtnText}>Resubmit</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSecondary, (appealMut.isPending || appealMut.isSuccess) && styles.actionBtnDisabled]}
              onPress={() => appealMut.mutate()}
              disabled={appealMut.isPending || appealMut.isSuccess}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionBtnText, styles.actionBtnSecondaryText]}>
                {appealMut.isSuccess ? 'Appealed' : 'Appeal'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

export default function InboxScreen(): React.JSX.Element {
  const { accessToken } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['mobile-creator-inbox'],
    queryFn: () => creatorApi.getModerationInbox(accessToken!),
    enabled: !!accessToken,
  });

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color="#F7941D" size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.roleTag}>Creator</Text>
        <Text style={styles.title}>Moderation Inbox</Text>
        <Text style={styles.sub}>Content that needs your attention.</Text>
      </View>

      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <InboxCard item={item} token={accessToken!} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyTitle}>All clear!</Text>
            <Text style={styles.emptySub}>No content currently needs attention.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d2e' },
  center: { flex: 1, backgroundColor: '#0d0d2e', alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20 },
  roleTag: { fontSize: 11, fontWeight: '700', color: '#F7941D', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: '#fff', marginBottom: 4 },
  sub: { fontSize: 13, color: '#8888bb' },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  card: { backgroundColor: '#1a1a3e', borderRadius: 16, marginBottom: 12, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 10 },
  cardLeft: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 3 },
  cardTrack: { fontSize: 11, color: '#F7941D', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  cardReason: { fontSize: 12, color: '#8888bb' },
  cardReasonLabel: { fontWeight: '700', color: '#aaaacc' },
  statusPill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, flexShrink: 0 },
  statusText: { fontSize: 10, fontWeight: '700' },
  cardExpanded: { borderTopWidth: 1, borderTopColor: '#2a2a5e', padding: 16, gap: 12 },
  feedbackBox: { backgroundColor: '#0d0d2e', borderRadius: 10, padding: 12 },
  feedbackLabel: { fontSize: 10, fontWeight: '700', color: '#5555aa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  feedbackText: { fontSize: 13, color: '#aaaacc', lineHeight: 20 },
  receivedDate: { fontSize: 11, color: '#5555aa' },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnPrimary: { backgroundColor: '#F7941D' },
  actionBtnSecondary: { borderWidth: 1, borderColor: '#3a3a6e' },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  actionBtnSecondaryText: { color: '#ccccee' },
  empty: { paddingTop: 80, alignItems: 'center' },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#5555aa', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#3a3a6e', textAlign: 'center' },
});
