import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface VideoThumbnailProps {
  title: string;
  track: string;
  creatorName?: string;
  durationLabel?: string;
  compact?: boolean;
}

interface Palette {
  bg: string;
  surface: string;
  accent: string;
  accentSoft: string;
}

const PALETTES: Palette[] = [
  { bg: '#101538', surface: '#1D266D', accent: '#F7941D', accentSoft: '#F7941D22' },
  { bg: '#0F1837', surface: '#2E3192', accent: '#38BDF8', accentSoft: '#38BDF822' },
  { bg: '#151433', surface: '#5B21B6', accent: '#F59E0B', accentSoft: '#F59E0B22' },
  { bg: '#101928', surface: '#155E75', accent: '#FB7185', accentSoft: '#FB718522' },
];

function pickPalette(seed: string): Palette {
  const value = seed.split('').reduce((total, char) => total + char.charCodeAt(0), 0);
  return PALETTES[value % PALETTES.length] ?? PALETTES[0];
}

export function VideoThumbnail({
  title,
  track,
  creatorName,
  durationLabel,
  compact = false,
}: VideoThumbnailProps): React.JSX.Element {
  const palette = useMemo(() => pickPalette(`${track}:${title}`), [title, track]);

  return (
    <View style={[styles.root, { backgroundColor: palette.bg }, compact && styles.rootCompact]}>
      <View style={[styles.panelLarge, { backgroundColor: palette.surface }]} />
      <View style={[styles.panelAccent, { backgroundColor: palette.accentSoft, borderColor: `${palette.accent}55` }]} />
      <View style={[styles.panelStripe, { backgroundColor: palette.accent }]} />

      <View style={styles.overlay}>
        <View style={styles.topRow}>
          <View style={[styles.trackChip, { backgroundColor: palette.accentSoft, borderColor: `${palette.accent}44` }]}>
            <Text style={[styles.trackText, { color: palette.accent }]} numberOfLines={1}>
              {track}
            </Text>
          </View>
          {durationLabel ? (
            <View style={styles.durationChip}>
              <Text style={styles.durationText}>{durationLabel}</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.playWrap, compact && styles.playWrapCompact]}>
          <View style={styles.playButton}>
            <Text style={styles.playIcon}>▶</Text>
          </View>
        </View>

        <View style={styles.bottomBlock}>
          <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={2}>
            {title}
          </Text>
          {creatorName ? (
            <Text style={styles.creator} numberOfLines={1}>
              {creatorName}
            </Text>
          ) : (
            <Text style={styles.creator}>BBT LearnOS Preview</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  rootCompact: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  panelLarge: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 28,
    right: -36,
    top: -28,
    transform: [{ rotate: '18deg' }],
    opacity: 0.95,
  },
  panelAccent: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 24,
    left: -26,
    bottom: -54,
    transform: [{ rotate: '-14deg' }],
    borderWidth: 1,
  },
  panelStripe: {
    position: 'absolute',
    width: 140,
    height: 10,
    borderRadius: 999,
    left: 20,
    top: 24,
    opacity: 0.9,
  },
  overlay: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  trackChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    maxWidth: '68%',
  },
  trackText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  durationChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#0d0d2ecc',
  },
  durationText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  playWrap: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    flex: 1,
  },
  playWrapCompact: {
    justifyContent: 'flex-end',
    paddingBottom: 6,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffffee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    fontSize: 18,
    color: '#0d0d2e',
    marginLeft: 3,
    fontWeight: '700',
  },
  bottomBlock: {
    gap: 6,
  },
  title: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    color: '#fff',
    maxWidth: '82%',
  },
  titleCompact: {
    fontSize: 15,
    lineHeight: 20,
  },
  creator: {
    fontSize: 11,
    color: '#d5d7ff',
    fontWeight: '600',
  },
});
