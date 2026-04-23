import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store';
import { learnerApi, type CohortMember } from '@/lib/learner';

function MemberRow({ member, rank }: { member: CohortMember; rank: number }): React.JSX.Element {
  const isTop = rank <= 3;
  const medalEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

  return (
    <View style={styles.memberRow}>
      <Text style={styles.rank}>{medalEmoji ?? `#${rank}`}</Text>
      {member.avatarUrl ? (
        <Image source={{ uri: member.avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarInitial}>{member.name[0]?.toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.memberInfo}>
        <Text style={[styles.memberName, isTop && styles.memberNameTop]}>{member.name}</Text>
        <Text style={styles.memberMeta}>{member.completedModules} modules · {member.streak}🔥 streak</Text>
      </View>
    </View>
  );
}

function WeeklyChart({ data }: { data: Array<{ date: string; events: number }> }): React.JSX.Element {
  const max = Math.max(...data.map((d) => d.events), 1);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <View style={styles.chartWrap}>
      {data.map((d, i) => {
        const pct = (d.events / max) * 100;
        const day = days[new Date(d.date).getDay()] ?? '';
        return (
          <View key={i} style={styles.chartBar}>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { height: `${Math.max(4, pct)}%` as unknown as number }]} />
            </View>
            <Text style={styles.barLabel}>{day}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function CohortScreen(): React.JSX.Element {
  const { accessToken } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['mobile-cohort'],
    queryFn: () => learnerApi.getCohort(accessToken!),
    enabled: !!accessToken,
  });

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color="#F7941D" size="large" /></View>;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Cohort</Text>
        {data && (
          <>
            <Text style={styles.cohortName}>{data.name}</Text>
            <Text style={styles.cohortTrack}>{data.track}</Text>
          </>
        )}
      </View>

      {data ? (
        <>
          {/* Weekly activity chart */}
          {data.weeklyActivity.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>This week's activity</Text>
              <WeeklyChart data={data.weeklyActivity} />
            </View>
          )}

          {/* Leaderboard */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Leaderboard</Text>
            <View style={styles.leaderboard}>
              {data.members
                .slice()
                .sort((a, b) => b.completedModules - a.completedModules)
                .map((m, i) => (
                  <MemberRow key={m.id} member={m} rank={i + 1} />
                ))}
            </View>
          </View>
        </>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyTitle}>No cohort yet</Text>
          <Text style={styles.emptySub}>Enroll in a track to join a cohort.</Text>
        </View>
      )}

      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d2e' },
  center: { flex: 1, backgroundColor: '#0d0d2e', alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20 },
  title: { fontSize: 26, fontWeight: '700', color: '#fff', marginBottom: 4 },
  cohortName: { fontSize: 16, fontWeight: '600', color: '#ccccee', marginBottom: 2 },
  cohortTrack: { fontSize: 12, color: '#F7941D', textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700' },
  section: { marginHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#8888bb', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  chartWrap: { flexDirection: 'row', gap: 8, height: 100, alignItems: 'flex-end' },
  chartBar: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { flex: 1, width: '100%', backgroundColor: '#1e1e4e', borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', backgroundColor: '#F7941D', borderRadius: 4 },
  barLabel: { fontSize: 10, color: '#5555aa' },
  leaderboard: { backgroundColor: '#1a1a3e', borderRadius: 14, overflow: 'hidden' },
  memberRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: '#2a2a5e' },
  rank: { width: 28, fontSize: 14, color: '#8888bb', textAlign: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: { backgroundColor: '#2a2a5e', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 14, fontWeight: '700', color: '#8888bb' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: '600', color: '#ccccee', marginBottom: 2 },
  memberNameTop: { color: '#fff' },
  memberMeta: { fontSize: 11, color: '#5555aa' },
  empty: { paddingTop: 80, alignItems: 'center' },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#5555aa', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#3a3a6e', textAlign: 'center', paddingHorizontal: 40 },
  bottomPad: { height: 40 },
});
