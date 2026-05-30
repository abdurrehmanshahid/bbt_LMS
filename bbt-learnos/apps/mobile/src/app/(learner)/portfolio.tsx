import { useQuery } from '@tanstack/react-query';
import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from 'react-native';

import { learnerApi, type BadgeSummary } from '@/lib/learner';
import { useAuthStore } from '@/lib/store';

function BadgeCard({ badge }: { badge: BadgeSummary }): React.JSX.Element {
  return (
    <View style={styles.badgeCard}>
      <View style={styles.badgeIcon}>
        <Text style={styles.badgeIconText}>🏅</Text>
      </View>
      <View style={styles.badgeInfo}>
        <Text style={styles.badgeTrack}>{badge.trackTitle}</Text>
        <Text style={styles.badgeModule} numberOfLines={1}>{badge.moduleTitle}</Text>
        <Text style={styles.badgeDate}>Issued {new Date(badge.issuedAt).toLocaleDateString()}</Text>
      </View>
      <TouchableOpacity
        onPress={() => void Linking.openURL(badge.verifyUrl)}
        style={styles.verifyBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.verifyText}>Verify →</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function PortfolioScreen(): React.JSX.Element {
  const { accessToken, user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['mobile-portfolio'],
    queryFn: () => learnerApi.getPortfolio(accessToken!),
    enabled: !!accessToken,
  });

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color="#F7941D" size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Portfolio</Text>
        <Text style={styles.username}>@{user?.name.toLowerCase().replace(/\s+/g, '.')}</Text>
      </View>

      {/* Absorption status */}
      {data && (
        <View style={[styles.absorptionBanner, data.absorptionReady && styles.absorptionReady]}>
          <Text style={styles.absorptionIcon}>{data.absorptionReady ? '🚀' : '📈'}</Text>
          <View>
            <Text style={styles.absorptionTitle}>
              {data.absorptionReady ? 'Absorption Eligible!' : 'Building towards absorption'}
            </Text>
            <Text style={styles.absorptionSub}>
              {data.absorptionReady
                ? 'You qualify for BBT internship or placement.'
                : `${data.badges.length} badge${data.badges.length !== 1 ? 's' : ''} earned so far.`}
            </Text>
          </View>
        </View>
      )}

      <FlatList
        data={data?.badges ?? []}
        keyExtractor={(b) => b.id}
        renderItem={({ item }) => <BadgeCard badge={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyTitle}>No badges yet</Text>
            <Text style={styles.emptySub}>Complete assessments to earn skill badges.</Text>
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
  title: { fontSize: 26, fontWeight: '700', color: '#fff' },
  username: { fontSize: 13, color: '#5555aa', marginTop: 2 },
  absorptionBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#1a1a3e',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#2a2a5e',
  },
  absorptionReady: { borderColor: '#F7941D', backgroundColor: '#F7941D18' },
  absorptionIcon: { fontSize: 28 },
  absorptionTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2 },
  absorptionSub: { fontSize: 12, color: '#8888bb' },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a3e',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  badgeIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F7941D22', alignItems: 'center', justifyContent: 'center' },
  badgeIconText: { fontSize: 22 },
  badgeInfo: { flex: 1 },
  badgeTrack: { fontSize: 11, fontWeight: '700', color: '#F7941D', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  badgeModule: { fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 3 },
  badgeDate: { fontSize: 11, color: '#5555aa' },
  verifyBtn: {},
  verifyText: { fontSize: 12, fontWeight: '700', color: '#F7941D' },
  empty: { paddingTop: 60, alignItems: 'center' },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#5555aa', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#3a3a6e', textAlign: 'center', paddingHorizontal: 40 },
});
