import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { creatorApi } from '@/lib/creator';
import { useAuthStore } from '@/lib/store';

type Phase = 'pick' | 'uploading' | 'metadata' | 'success';

const TRACKS = [
  'GenAI + Agentic AI',
  'Cloud + MLOps',
  'Odoo ERP Development',
  'AI-Integrated Full Stack',
  'Cybersecurity',
  'UI/UX + Brand Design',
  'AI Marketing + Sales',
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadScreen(): React.JSX.Element {
  const { accessToken } = useAuthStore();
  const [phase, setPhase] = useState<Phase>('pick');
  const [progress, setProgress] = useState(0);
  const [contentId, setContentId] = useState('');
  const [title, setTitle] = useState('');
  const [track, setTrack] = useState(TRACKS[0] ?? '');
  const [description, setDescription] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const pickAndUpload = async (): Promise<void> => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'video/*',
      copyToCacheDirectory: false,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setFileName(asset.name);
    setFileSize(asset.size ?? 0);
    setPhase('uploading');
    setProgress(0);

    try {
      const { uploadUrl, contentId: cid } = await creatorApi.initUpload(accessToken!);
      setContentId(cid);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        });
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        });
        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', asset.mimeType ?? 'video/mp4');
        xhr.send({ uri: asset.uri } as unknown as Document);
      });

      setPhase('metadata');
    } catch {
      Alert.alert('Upload failed', 'Please try again.');
      setPhase('pick');
    }
  };

  const submitMeta = async (): Promise<void> => {
    if (!title.trim()) { Alert.alert('Title required', 'Enter a title for your video.'); return; }
    setSubmitting(true);
    try {
      await creatorApi.submitMetadata(accessToken!, contentId, { title, track, description });
      setPhase('success');
    } catch {
      Alert.alert('Error', 'Failed to submit metadata. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = (): void => {
    setPhase('pick');
    setProgress(0);
    setContentId('');
    setTitle('');
    setDescription('');
    setFileName('');
    setFileSize(0);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.roleTag}>Creator</Text>
        <Text style={styles.title}>Upload Content</Text>
      </View>

      {phase === 'pick' && (
        <View style={styles.body}>
          <TouchableOpacity style={styles.dropZone} onPress={() => void pickAndUpload()} activeOpacity={0.8}>
            <Text style={styles.dropIcon}>🎬</Text>
            <Text style={styles.dropTitle}>Select video</Text>
            <Text style={styles.dropSub}>MP4, MOV — up to 4GB</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === 'uploading' && (
        <View style={styles.body}>
          <View style={styles.uploadCard}>
            <Text style={styles.uploadFileName} numberOfLines={1}>{fileName}</Text>
            <Text style={styles.uploadFileSize}>{formatBytes(fileSize)}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` as unknown as number }]} />
            </View>
            <Text style={styles.progressPct}>{progress}%</Text>
            <ActivityIndicator color="#F7941D" style={styles.spinner} />
          </View>
        </View>
      )}

      {phase === 'metadata' && (
        <View style={styles.body}>
          <View style={styles.successFile}>
            <Text style={styles.successCheck}>✓</Text>
            <Text style={styles.successFileName} numberOfLines={1}>{fileName}</Text>
          </View>

          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Introduction to Transformers"
            placeholderTextColor="#5555aa"
          />

          <Text style={[styles.label, styles.mt16]}>Track</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.trackScroll}>
            {TRACKS.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.trackPill, track === t && styles.trackPillActive]}
                onPress={() => setTrack(t)}
                activeOpacity={0.8}
              >
                <Text style={[styles.trackPillText, track === t && styles.trackPillTextActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.label, styles.mt16]}>Description</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={description}
            onChangeText={setDescription}
            placeholder="What will learners gain from this content?"
            placeholderTextColor="#5555aa"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={() => void submitMeta()}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitBtnText}>Submit for review</Text>}
          </TouchableOpacity>
        </View>
      )}

      {phase === 'success' && (
        <View style={[styles.body, styles.successWrap]}>
          <Text style={styles.successBig}>🎉</Text>
          <Text style={styles.successTitle}>Submitted!</Text>
          <Text style={styles.successSub}>Your content is queued for moderation review. We'll notify you when it's approved.</Text>
          <TouchableOpacity style={styles.submitBtn} onPress={reset} activeOpacity={0.8}>
            <Text style={styles.submitBtnText}>Upload another</Text>
          </TouchableOpacity>
        </View>
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
  body: { paddingHorizontal: 16 },
  dropZone: {
    borderWidth: 2,
    borderColor: '#2a2a5e',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 60,
    alignItems: 'center',
    gap: 8,
  },
  dropIcon: { fontSize: 40, marginBottom: 8 },
  dropTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  dropSub: { fontSize: 13, color: '#5555aa' },
  uploadCard: { backgroundColor: '#1a1a3e', borderRadius: 16, padding: 20, alignItems: 'center', gap: 8 },
  uploadFileName: { fontSize: 14, fontWeight: '600', color: '#fff', maxWidth: '80%' },
  uploadFileSize: { fontSize: 12, color: '#5555aa' },
  progressBar: { width: '100%', height: 4, backgroundColor: '#2a2a5e', borderRadius: 2, overflow: 'hidden', marginTop: 8 },
  progressFill: { height: '100%', backgroundColor: '#F7941D', borderRadius: 2 },
  progressPct: { fontSize: 20, fontWeight: '700', color: '#F7941D' },
  spinner: { marginTop: 8 },
  successFile: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24, backgroundColor: '#14532d33', borderRadius: 10, padding: 12 },
  successCheck: { fontSize: 16, color: '#22c55e' },
  successFileName: { flex: 1, fontSize: 13, color: '#22c55e' },
  label: { fontSize: 12, fontWeight: '600', color: '#8888bb', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  mt16: { marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#2a2a5e', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#fff', backgroundColor: '#1a1a3e' },
  inputMulti: { minHeight: 100, paddingTop: 12 },
  trackScroll: { marginBottom: 4 },
  trackPill: { borderWidth: 1, borderColor: '#2a2a5e', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  trackPillActive: { borderColor: '#F7941D', backgroundColor: '#F7941D18' },
  trackPillText: { fontSize: 12, color: '#8888bb' },
  trackPillTextActive: { color: '#F7941D', fontWeight: '600' },
  submitBtn: { backgroundColor: '#F7941D', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  successWrap: { alignItems: 'center', paddingTop: 40 },
  successBig: { fontSize: 64, marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 10 },
  successSub: { fontSize: 14, color: '#8888bb', textAlign: 'center', lineHeight: 22, paddingHorizontal: 20, marginBottom: 8 },
  bottomPad: { height: 40 },
});
