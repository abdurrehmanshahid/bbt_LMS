import { useInfiniteQuery } from '@tanstack/react-query';
import { Video, ResizeMode } from 'expo-av';
import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  RefreshControl,
  useWindowDimensions,
  type ViewToken,
} from 'react-native';

import { learnerApi, type FeedItem } from '@/lib/learner';
import { useAuthStore } from '@/lib/store';

function muxUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

function ReelItem({
  item,
  height,
  active,
  muted,
  onToggleMuted,
}: {
  item: FeedItem;
  height: number;
  active: boolean;
  muted: boolean;
  onToggleMuted: () => void;
}): React.JSX.Element {
  const minutes = Math.max(1, Math.round(item.durationSeconds / 60));

  return (
    <View style={[styles.reel, { height }]}>
      {item.muxPlaybackId ? (
        <Video
          source={{ uri: muxUrl(item.muxPlaybackId) }}
          style={styles.media}
          resizeMode={ResizeMode.COVER}
          shouldPlay={active}
          isLooping
          isMuted={muted}
        />
      ) : item.thumbnailUrl ? (
        <Image source={{ uri: item.thumbnailUrl }} style={styles.media} resizeMode="cover" />
      ) : (
        <View style={[styles.media, styles.placeholder]}>
          <Text style={styles.placeholderText}>{item.track}</Text>
        </View>
      )}

      <View style={styles.scrim} />

      <View style={styles.copy}>
        <Text style={styles.track}>{item.track}</Text>
        <Text style={styles.title} numberOfLines={3}>{item.title}</Text>
        <Text style={styles.creator}>{item.creatorName}</Text>
        <Text style={styles.meta}>{minutes} min lesson</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={onToggleMuted} accessibilityRole="button" accessibilityLabel={muted ? 'Unmute reel' : 'Mute reel'}>
          <Text style={styles.actionText}>{muted ? 'M' : 'S'}</Text>
        </TouchableOpacity>
        <View style={styles.actionPill}>
          <Text style={styles.actionText}>{item.type.toUpperCase()}</Text>
        </View>
      </View>
    </View>
  );
}

export default function FeedScreen(): React.JSX.Element {
  const { accessToken } = useAuthStore();
  const { height } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 });
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0]?.item as FeedItem | undefined;
    if (first) setActiveId(first.id);
  });

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
      <FlatList
        data={allItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ReelItem
            item={item}
            height={height}
            active={activeId === item.id || (activeId === null && index === 0)}
            muted={muted}
            onToggleMuted={() => setMuted((value) => !value)}
          />
        )}
        pagingEnabled
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor="#F7941D" />}
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) void fetchNextPage(); }}
        onEndReachedThreshold={0.6}
        viewabilityConfig={viewabilityConfig.current}
        onViewableItemsChanged={onViewableItemsChanged.current}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color="#F7941D" style={styles.footerSpinner} /> : null}
        ListEmptyComponent={
          <View style={[styles.empty, { height }]}>
            <Text style={styles.emptyText}>No reels yet. Enroll in a track to get started.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d2e' },
  center: { flex: 1, backgroundColor: '#0d0d2e', alignItems: 'center', justifyContent: 'center' },
  reel: { width: '100%', backgroundColor: '#050516' },
  media: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#12153a' },
  placeholderText: { color: '#F7941D', fontSize: 13, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,5,22,0.28)' },
  copy: { position: 'absolute', left: 20, right: 92, bottom: 92 },
  track: { color: '#F7941D', fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  title: { color: '#fff', fontSize: 30, fontWeight: '800', lineHeight: 34 },
  creator: { color: '#fff', fontSize: 14, fontWeight: '700', marginTop: 12 },
  meta: { color: '#c7c7df', fontSize: 12, marginTop: 4 },
  actions: { position: 'absolute', right: 16, bottom: 96, alignItems: 'center', gap: 12 },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  actionText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  footerSpinner: { paddingVertical: 20, backgroundColor: '#0d0d2e' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  emptyText: { color: '#8888bb', fontSize: 14, textAlign: 'center' },
});
