import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store';
import { learnerApi, type FeedItem } from '@/lib/learner';

function FeedCard({ item }: { item: FeedItem }): React.JSX.Element {
  const router = useRouter();
  const mins = Math.round(item.durationSeconds / 60);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(learner)/module/${item.id}`)}
      activeOpacity={0.85}
    >
      {item.thumbnailUrl ? (
        <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]} />
      )}
      {item.watched && (
        <View style={styles.watchedBadge}>
          <Text style={styles.watchedText}>✓</Text>
        </View>
      )}
      {item.completionRate > 0 && item.completionRate < 1 && (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${item.completionRate * 100}%` as unknown as number }]} />
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardTrack}>{item.track}</Text>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardMetaText}>{item.creatorName}</Text>
          <Text style={styles.cardMetaDot}>·</Text>
          <Text style={styles.cardMetaText}>{mins} min</Text>
          <Text style={styles.cardMetaDot}>·</Text>
          <Text style={styles.cardType}>{item.type}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function FeedScreen(): React.JSX.Element {
  const { accessToken, user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } =
    useInfiniteQuery({
      queryKey: ['mobile-feed'],
      queryFn: ({ pageParam }) =>
        learnerApi.getFeed(accessToken!, typeof pageParam === 'string' ? pageParam : undefined),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last) => last.nextCursor ?? undefined,
      enabled: !!accessToken,
    });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const allItems = data?.pages.flatMap((p) => p.items) ?? [];

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#F7941D" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.greeting}>Hey, {user?.name.split(' ')[0]} 👋</Text>
        <Text style={styles.subGreet}>Keep going — consistency is the edge.</Text>
      </View>

      <FlatList
        data={allItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <FeedCard item={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor="#F7941D" />}
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) void fetchNextPage(); }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color="#F7941D" style={styles.footerSpinner} /> : null}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No content yet. Enroll in a track to get started.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d2e' },
  center: { flex: 1, backgroundColor: '#0d0d2e', alignItems: 'center', justifyContent: 'center' },
  topBar: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#fff' },
  subGreet: { fontSize: 13, color: '#8888bb', marginTop: 2 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { backgroundColor: '#1a1a3e', borderRadius: 16, marginBottom: 14, overflow: 'hidden' },
  thumb: { width: '100%', height: 160 },
  thumbPlaceholder: { backgroundColor: '#2a2a5e' },
  watchedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#22c55e',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchedText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  progressBar: { height: 3, backgroundColor: '#2a2a5e' },
  progressFill: { height: '100%', backgroundColor: '#F7941D' },
  cardBody: { padding: 14 },
  cardTrack: { fontSize: 11, fontWeight: '700', color: '#F7941D', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#fff', lineHeight: 21, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMetaText: { fontSize: 12, color: '#8888bb' },
  cardMetaDot: { color: '#3a3a6e', fontSize: 12 },
  cardType: { fontSize: 11, color: '#6666aa', textTransform: 'uppercase' },
  footerSpinner: { paddingVertical: 20 },
  empty: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { color: '#5555aa', fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
});
