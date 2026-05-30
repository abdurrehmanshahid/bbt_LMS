import { useQuery } from '@tanstack/react-query';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';

import { learnerApi, type TrendingTag } from '@/lib/learner';
import { useAuthStore } from '@/lib/store';

function TagRow({ item, index }: { item: TrendingTag; index: number }): React.JSX.Element {
  return (
    <View style={styles.tagRow}>
      <Text style={styles.rank}>{index + 1}</Text>
      <View style={styles.tagCopy}>
        <Text style={styles.tagName}>#{item.name}</Text>
        <Text style={styles.tagMeta}>{item.count.toLocaleString()} reels this week</Text>
      </View>
      {item.isChallenge ? (
        <View style={styles.challengeBadge}>
          <Text style={styles.challengeText}>Challenge</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function TrendingScreen(): React.JSX.Element {
  const { accessToken } = useAuthStore();
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['mobile-trending'],
    queryFn: () => learnerApi.getTrending(accessToken!),
    enabled: !!accessToken,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#F7941D" size="large" />
      </View>
    );
  }

  const tags = data?.tags ?? [];

  return (
    <View style={styles.container}>
      <FlatList
        data={tags}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor="#F7941D" />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Trending</Text>
            <Text style={styles.title}>Hashtags</Text>
            {data?.pinnedChallenge ? (
              <View style={styles.challenge}>
                <Text style={styles.challengeKicker}>Pinned challenge</Text>
                <Text style={styles.challengeTitle}>{data.pinnedChallenge.title}</Text>
                <Text style={styles.challengeHash}>#{data.pinnedChallenge.tag.name}</Text>
                {data.pinnedChallenge.description ? (
                  <Text style={styles.challengeDescription}>{data.pinnedChallenge.description}</Text>
                ) : null}
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item, index }) => <TagRow item={item} index={index} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Trending hashtags will appear after creators post reels.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d2e' },
  center: { flex: 1, backgroundColor: '#0d0d2e', alignItems: 'center', justifyContent: 'center' },
  list: { padding: 20, paddingBottom: 96 },
  header: { marginBottom: 18 },
  eyebrow: { color: '#F7941D', fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: '#fff', fontSize: 34, fontWeight: '900', marginTop: 4 },
  challenge: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: 'rgba(247,148,29,0.45)',
    backgroundColor: '#12153a',
    borderRadius: 8,
    padding: 16,
  },
  challengeKicker: { color: '#F7941D', fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  challengeTitle: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 6 },
  challengeHash: { color: '#F7941D', fontSize: 13, fontWeight: '800', marginTop: 8 },
  challengeDescription: { color: '#c7c7df', fontSize: 13, lineHeight: 19, marginTop: 8 },
  tagRow: {
    minHeight: 72,
    borderBottomWidth: 1,
    borderBottomColor: '#202052',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rank: { width: 28, color: '#555588', fontSize: 16, fontWeight: '900' },
  tagCopy: { flex: 1 },
  tagName: { color: '#fff', fontSize: 17, fontWeight: '800' },
  tagMeta: { color: '#8888bb', fontSize: 12, marginTop: 3 },
  challengeBadge: { borderRadius: 6, backgroundColor: 'rgba(247,148,29,0.14)', paddingHorizontal: 8, paddingVertical: 5 },
  challengeText: { color: '#F7941D', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  empty: { paddingVertical: 40 },
  emptyText: { color: '#8888bb', fontSize: 14, textAlign: 'center' },
});
