import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store';
import { creatorApi, type ContentRow } from '@/lib/creator';

const STATUS_COLOR: Record<string, string> = {
  PUBLISHED: '#22c55e',
  PENDING_MODERATION: '#f59e0b',
  DRAFT: '#8888bb',
  REJECTED: '#f87171',
  FAILED: '#f87171',
};

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }): React.JSX.Element {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      {sub && <Text style={styles.kpiSub}>{sub}</Text>}
    </View>
  );
}

function ContentItem({ row }: { row: ContentRow }): React.JSX.Element {
  const statusColor = STATUS_COLOR[row.status] ?? '#8888bb';
  return (
    <View style={styles.contentRow}>
      <View style={styles.contentInfo}>
        <Text style={styles.contentTitle} numberOfLines={1}>{row.title}</Text>
        <Text style={styles.contentMeta}>
          {row.views.toLocaleString()} views · {Math.round(row.completionRate * 100)}% completion
        </Text>
      </View>
      <View style={[styles.statusPill, { backgroundColor: `${statusColor}22` }]}>
        <Text style={[styles.statusText, { color: statusColor }]}>{row.status.replace(/_/g, ' ')}</Text>
      </View>
    </View>
  );
}

export default function CreatorDashboard(): React.JSX.Element {
  const { accessToken, user } = useAuthStore();
  const router = useRouter();

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['mobile-creator-kpis'],
    queryFn: () => creatorApi.getKpis(accessToken!),
    enabled: !!accessToken,
  });

  const { data: content, isLoading: contentLoading } = useQuery({
    queryKey: ['mobile-creator-content'],
    queryFn: () => creatorApi.getContent(accessToken!),
    enabled: !!accessToken,
  });

  const isLoading = kpisLoading || contentLoading;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.roleTag}>Creator</Text>
        <Text style={styles.title}>Hello, {user?.name.split(' ')[0]}</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadWrap}>
          <ActivityIndicator color="#F7941D" size="large" />
        </View>
      ) : (
        <>
          {/* KPIs */}
          {kpis && (
            <View style={styles.kpiGrid}>
              <KpiCard label="Total views" value={kpis.totalViews.toLocaleString()} />
              <KpiCard label="Revenue" value={`${kpis.currency} ${kpis.totalRevenue.toLocaleString()}`} />
              <KpiCard label="Payout" value={`${kpis.currency} ${kpis.pendingPayout.toLocaleString()}`} sub="pending" />
              <KpiCard label="Published" value={String(kpis.publishedCount)} />
            </View>
          )}

          {/* Quick upload CTA */}
          <TouchableOpacity
            style={styles.uploadCta}
            onPress={() => router.push('/(creator)/upload')}
            activeOpacity={0.85}
          >
            <Text style={styles.uploadCtaText}>+ Upload new content</Text>
          </TouchableOpacity>

          {/* Content list */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your content</Text>
            {content?.length ? (
              <View style={styles.contentList}>
                {content.map((row) => <ContentItem key={row.id} row={row} />)}
              </View>
            ) : (
              <Text style={styles.emptyText}>No content yet. Upload your first video.</Text>
            )}
          </View>
        </>
      )}

      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d2e' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 24 },
  roleTag: { fontSize: 11, fontWeight: '700', color: '#F7941D', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: '#fff' },
  loadWrap: { paddingTop: 60, alignItems: 'center' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, marginBottom: 16 },
  kpiCard: {
    backgroundColor: '#1a1a3e',
    borderRadius: 14,
    padding: 16,
    width: '47%',
    marginHorizontal: '1.5%',
    borderWidth: 1,
    borderColor: '#2a2a5e',
  },
  kpiLabel: { fontSize: 11, fontWeight: '600', color: '#8888bb', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  kpiValue: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 2 },
  kpiSub: { fontSize: 11, color: '#5555aa' },
  uploadCta: {
    marginHorizontal: 16,
    backgroundColor: '#F7941D',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  uploadCtaText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#8888bb', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  contentList: { backgroundColor: '#1a1a3e', borderRadius: 14, overflow: 'hidden' },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a5e',
    gap: 10,
  },
  contentInfo: { flex: 1 },
  contentTitle: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 3 },
  contentMeta: { fontSize: 11, color: '#5555aa' },
  statusPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  emptyText: { fontSize: 13, color: '#5555aa', textAlign: 'center', paddingVertical: 20 },
  bottomPad: { height: 40 },
});
