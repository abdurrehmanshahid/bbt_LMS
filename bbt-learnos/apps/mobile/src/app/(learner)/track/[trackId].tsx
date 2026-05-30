import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';

import { learnerApi, type Module } from '@/lib/learner';
import { useAuthStore } from '@/lib/store';

const STATUS_CONFIG: Record<Module['status'], { color: string; bg: string; label: string }> = {
  COMPLETED: { color: '#22c55e', bg: '#14532d33', label: 'Done' },
  AVAILABLE: { color: '#F7941D', bg: '#F7941D22', label: 'Start' },
  ASSESSMENT_PENDING: { color: '#a78bfa', bg: '#4c1d9533', label: 'Assess' },
  LOCKED: { color: '#3a3a6e', bg: '#1a1a3e', label: 'Locked' },
};

function ModuleRow({ mod, onPress }: { mod: Module; onPress: () => void }): React.JSX.Element {
  const cfg = STATUS_CONFIG[mod.status];
  const locked = mod.status === 'LOCKED';

  return (
    <Pressable
      onPress={locked ? undefined : onPress}
      style={({ pressed }) => [styles.moduleRow, pressed && !locked && styles.moduleRowPressed]}
    >
      <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
      <View style={styles.moduleInfo}>
        <Text style={[styles.moduleTitle, locked && styles.moduleTitleLocked]} numberOfLines={1}>
          {mod.order}. {mod.title}
        </Text>
        <Text style={styles.moduleMeta}>{mod.durationMinutes} min · {mod.conceptCount} concepts</Text>
      </View>
      <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
        <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
    </Pressable>
  );
}

export default function TrackScreen(): React.JSX.Element {
  const { trackId } = useLocalSearchParams<{ trackId: string }>();
  const { accessToken } = useAuthStore();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['mobile-track', trackId],
    queryFn: () => learnerApi.getTrack(accessToken!, trackId),
    enabled: !!accessToken && !!trackId,
  });

  const pct = data ? Math.round((data.completedModules / (data.totalModules || 1)) * 100) : 0;

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#F7941D" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.trackTitle} numberOfLines={2}>{data?.title ?? 'Track'}</Text>

        {/* Progress */}
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>{data?.completedModules ?? 0} / {data?.totalModules ?? 0} modules</Text>
          <Text style={styles.progressPct}>{pct}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${pct}%` as unknown as number }]} />
        </View>
      </View>

      {/* Modules */}
      <FlatList
        data={data?.modules ?? []}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <ModuleRow
            mod={item}
            onPress={() => router.push(`/(learner)/module/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d2e' },
  center: { flex: 1, backgroundColor: '#0d0d2e', alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#1e1e4e' },
  backBtn: { marginBottom: 12 },
  backArrow: { fontSize: 22, color: '#F7941D' },
  trackTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 16 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 12, color: '#8888bb' },
  progressPct: { fontSize: 12, fontWeight: '700', color: '#F7941D' },
  progressBar: { height: 4, borderRadius: 2, backgroundColor: '#1e1e4e', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: '#F7941D' },
  list: { paddingVertical: 8 },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  moduleRowPressed: { backgroundColor: '#1a1a3e' },
  statusDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  moduleInfo: { flex: 1 },
  moduleTitle: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 3 },
  moduleTitleLocked: { color: '#3a3a6e' },
  moduleMeta: { fontSize: 11, color: '#555588' },
  statusPill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  separator: { height: 1, backgroundColor: '#1e1e4e', marginLeft: 40 },
});
