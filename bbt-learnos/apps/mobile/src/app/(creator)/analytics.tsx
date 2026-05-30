import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';

import { creatorApi } from '@/lib/creator';
import { useAuthStore } from '@/lib/store';

type Period = '7d' | '30d' | '90d';
const PERIODS: Period[] = ['7d', '30d', '90d'];
const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - 64;
const CHART_H = 100;

function MiniLineChart({ series }: { series: Array<{ date: string; views: number }> }): React.JSX.Element {
  if (series.length < 2) {
    return <View style={{ height: CHART_H, alignItems: 'center', justifyContent: 'center' }}><Text style={styles.noData}>No data</Text></View>;
  }

  const max = Math.max(...series.map((s) => s.views), 1);
  const W = CHART_W;
  const H = CHART_H;
  const PAD = 8;

  const points = series.map((s, i) => ({
    x: PAD + (i / (series.length - 1)) * (W - PAD * 2),
    y: H - PAD - ((s.views / max) * (H - PAD * 2)),
  }));

  const polylineStr = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View style={{ width: W, height: H }}>
      {/* Render as a row of bars since SVG isn't available in RN */}
      <View style={styles.barChartRow}>
        {series.map((s, i) => {
          const pct = (s.views / max) * 100;
          return (
            <View key={i} style={styles.barSlot}>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: `${Math.max(2, pct)}%` as unknown as number }]} />
              </View>
            </View>
          );
        })}
      </View>
      {/* suppress unused vars from SVG approach */}
      {polylineStr && null}
      {points && null}
    </View>
  );
}

export default function AnalyticsScreen(): React.JSX.Element {
  const { accessToken } = useAuthStore();
  const [period, setPeriod] = useState<Period>('30d');

  const { data, isLoading } = useQuery({
    queryKey: ['mobile-creator-analytics', period],
    queryFn: () => creatorApi.getAnalytics(accessToken!, period),
    enabled: !!accessToken,
  });

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.roleTag}>Creator</Text>
        <Text style={styles.title}>Analytics</Text>
      </View>

      {/* Period selector */}
      <View style={styles.periodRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            onPress={() => setPeriod(p)}
            activeOpacity={0.8}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadWrap}><ActivityIndicator color="#F7941D" size="large" /></View>
      ) : data ? (
        <View style={styles.body}>
          {/* Summary KPIs */}
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Views</Text>
              <Text style={styles.kpiValue}>{data.totalViews.toLocaleString()}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Watch min</Text>
              <Text style={styles.kpiValue}>{data.totalWatchMinutes.toLocaleString()}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Completion</Text>
              <Text style={styles.kpiValue}>{Math.round(data.avgCompletionRate * 100)}%</Text>
            </View>
          </View>

          {/* Views chart */}
          <View style={styles.chartCard}>
            <Text style={styles.cardTitle}>Views over time</Text>
            <MiniLineChart series={data.viewSeries} />
            {/* Date labels */}
            {data.viewSeries.length > 1 && (
              <View style={styles.dateLabels}>
                <Text style={styles.dateLabel}>{new Date(data.viewSeries[0]?.date ?? '').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>
                <Text style={styles.dateLabel}>{new Date(data.viewSeries[data.viewSeries.length - 1]?.date ?? '').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>
              </View>
            )}
          </View>
        </View>
      ) : null}

      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d2e' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20 },
  roleTag: { fontSize: 11, fontWeight: '700', color: '#F7941D', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: '#fff' },
  periodRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 20 },
  periodBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#2a2a5e' },
  periodBtnActive: { backgroundColor: '#F7941D', borderColor: '#F7941D' },
  periodText: { fontSize: 13, fontWeight: '700', color: '#5555aa' },
  periodTextActive: { color: '#fff' },
  loadWrap: { paddingTop: 60, alignItems: 'center' },
  body: { paddingHorizontal: 16 },
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  kpiCard: { flex: 1, backgroundColor: '#1a1a3e', borderRadius: 12, padding: 14, alignItems: 'center' },
  kpiLabel: { fontSize: 10, fontWeight: '600', color: '#8888bb', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  kpiValue: { fontSize: 18, fontWeight: '700', color: '#fff' },
  chartCard: { backgroundColor: '#1a1a3e', borderRadius: 16, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 12 },
  barChartRow: { flexDirection: 'row', height: CHART_H, alignItems: 'flex-end', gap: 2 },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  barTrack: { width: '100%', height: '100%', backgroundColor: '#2a2a5e', borderRadius: 2, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', backgroundColor: '#F7941D', borderRadius: 2 },
  dateLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  dateLabel: { fontSize: 10, color: '#5555aa' },
  noData: { color: '#5555aa', fontSize: 13 },
  bottomPad: { height: 40 },
});
