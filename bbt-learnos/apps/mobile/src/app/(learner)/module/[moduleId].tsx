import { useQuery, useMutation } from '@tanstack/react-query';
import { Video, ResizeMode, type AVPlaybackStatus } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';

import { VideoThumbnail } from '@/components/VideoThumbnail';
import { learnerApi } from '@/lib/learner';
import { useAuthStore } from '@/lib/store';

type Tab = 'overview' | 'assessment';

const { width: SCREEN_W } = Dimensions.get('window');
const VIDEO_H = (SCREEN_W * 9) / 16;

export default function ModuleScreen(): React.JSX.Element {
  const { moduleId } = useLocalSearchParams<{ moduleId: string }>();
  const { accessToken } = useAuthStore();
  const router = useRouter();
  const videoRef = useRef<Video>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [completedFired, setCompletedFired] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['mobile-module', moduleId],
    queryFn: () => learnerApi.getModule(accessToken!, moduleId),
    enabled: !!accessToken && !!moduleId,
  });

  const trackMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      learnerApi.trackEvent(accessToken!, payload),
  });

  const handlePlaybackUpdate = (status: AVPlaybackStatus): void => {
    if (!status.isLoaded || completedFired) return;
    const { durationMillis, positionMillis } = status;
    if (durationMillis && positionMillis / durationMillis >= 0.9) {
      setCompletedFired(true);
      trackMut.mutate({ event: 'MODULE_COMPLETE', moduleId });
    }
  };

  useEffect(() => {
    if (data) {
      trackMut.mutate({ event: 'MODULE_VIEW', moduleId });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#F7941D" size="large" />
      </View>
    );
  }

  if (!data) return <View style={styles.center}><Text style={styles.errorText}>Module not found.</Text></View>;

  return (
    <View style={styles.container}>
      {/* Video player */}
      {data.videoUrl ? (
        <Video
          ref={videoRef}
          source={{ uri: data.videoUrl }}
          style={[styles.video, { height: VIDEO_H }]}
          resizeMode={ResizeMode.CONTAIN}
          useNativeControls
          onPlaybackStatusUpdate={handlePlaybackUpdate}
        />
      ) : (
        <View style={[styles.videoPlaceholder, { height: VIDEO_H }]}>
          <VideoThumbnail
            title={data.title}
            track={data.trackTitle}
          />
        </View>
      )}

      {/* Back button overlay */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>

      {/* Content */}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={styles.trackLabel}>{data.trackTitle}</Text>
          {completedFired && (
            <View style={styles.completedBadge}>
              <Text style={styles.completedText}>✓ Complete</Text>
            </View>
          )}
        </View>
        <Text style={styles.title}>{data.title}</Text>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {(['overview', 'assessment'] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'overview' ? 'Overview' : 'Assessment'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'overview' ? (
          <View style={styles.tabContent}>
            <Text style={styles.description}>{data.description}</Text>

            {/* Resources */}
            {data.resources.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Resources</Text>
                {data.resources.map((r, i) => (
                  <View key={i} style={styles.resourceRow}>
                    <View style={styles.resourceType}>
                      <Text style={styles.resourceTypeText}>{r.type}</Text>
                    </View>
                    <Text style={styles.resourceTitle} numberOfLines={1}>{r.title}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.tabContent}>
            {data.assessmentUnlocked ? (
              <View>
                <Text style={styles.description}>Assessment unlocked. Test your knowledge.</Text>
                <TouchableOpacity
                  style={styles.assessBtn}
                  onPress={() => router.push(`/(learner)/module/${moduleId}/assessment` as never)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.assessBtnText}>Start Assessment</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.lockedBox}>
                <Text style={styles.lockedTitle}>Assessment locked</Text>
                <Text style={styles.lockedSub}>Watch at least 90% of the video to unlock the assessment.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d2e' },
  center: { flex: 1, backgroundColor: '#0d0d2e', alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#f87171', fontSize: 14 },
  video: { width: '100%', backgroundColor: '#000' },
  videoPlaceholder: { width: '100%', backgroundColor: '#111128' },
  backBtn: { position: 'absolute', top: 48, left: 16, backgroundColor: '#0d0d2e99', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  backArrow: { fontSize: 20, color: '#fff' },
  scroll: { flex: 1, paddingHorizontal: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 6 },
  trackLabel: { fontSize: 11, fontWeight: '700', color: '#F7941D', textTransform: 'uppercase', letterSpacing: 1 },
  completedBadge: { backgroundColor: '#14532d44', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  completedText: { fontSize: 11, color: '#22c55e', fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '700', color: '#fff', lineHeight: 28, marginBottom: 18 },
  tabRow: { flexDirection: 'row', gap: 4, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#1e1e4e' },
  tabBtn: { paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -1 },
  tabBtnActive: { borderBottomColor: '#F7941D' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#555588' },
  tabTextActive: { color: '#F7941D' },
  tabContent: { paddingBottom: 40 },
  description: { fontSize: 14, lineHeight: 22, color: '#aaaacc', marginBottom: 20 },
  section: { marginTop: 4 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#8888bb', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  resourceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1e1e4e' },
  resourceType: { backgroundColor: '#2a2a5e', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  resourceTypeText: { fontSize: 10, color: '#8888bb', textTransform: 'uppercase', fontWeight: '700' },
  resourceTitle: { flex: 1, fontSize: 13, color: '#ccccee' },
  lockedBox: { backgroundColor: '#1a1a3e', borderRadius: 14, padding: 20, alignItems: 'center' },
  lockedTitle: { fontSize: 15, fontWeight: '700', color: '#5555aa', marginBottom: 8 },
  lockedSub: { fontSize: 13, color: '#3a3a6e', textAlign: 'center', lineHeight: 20 },
  assessBtn: { backgroundColor: '#F7941D', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  assessBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
