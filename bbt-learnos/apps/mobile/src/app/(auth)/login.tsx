import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { post } from '@/lib/api';
import { useAuthStore, type AuthUser } from '@/lib/store';

interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

const ERROR_MAP: Record<string, string> = {
  INVALID_CREDENTIALS: 'Email or password is incorrect.',
  ACCOUNT_LOCKED: 'Account locked. Try again in 15 minutes.',
  EMAIL_NOT_VERIFIED: 'Please verify your email first.',
};

const DEV_BYPASS_EMAIL = 'openmeup';
const DEV_BYPASS_PASSWORD = 'fosho';

export default function LoginScreen(): React.JSX.Element {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (): Promise<void> => {
    if (!email || !password) { setError('Enter email and password.'); return; }
    setLoading(true);
    setError('');
    try {
      if (
        email.trim().toLowerCase() === DEV_BYPASS_EMAIL
        && password === DEV_BYPASS_PASSWORD
      ) {
        setAuth(
          {
            id: 'dev-learner-openmeup',
            name: 'Dev Learner',
            email: 'openmeup@local.dev',
            role: 'LEARNER',
            avatarUrl: null,
          },
          'dev-openmeup-token',
        );
        router.replace('/(learner)');
        return;
      }

      const data = await post<LoginResponse>('/auth/login', { email, password });
      setAuth(data.user, data.accessToken);
      if (data.user.role === 'CREATOR') {
        router.replace('/(creator)');
      } else {
        router.replace('/(learner)');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setError(ERROR_MAP[msg] ?? 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.brand}>BBT LearnOS</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.sub}>Sign in to continue your learning journey.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholderTextColor="#5555aa"
            placeholder="you@example.com"
          />

          <Text style={[styles.label, styles.mt16]}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            placeholderTextColor="#5555aa"
            placeholder="••••••••"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={() => void handleLogin()}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnText}>Sign in</Text>
            )}
          </TouchableOpacity>

          <Link href="/(auth)/signup" asChild>
            <TouchableOpacity style={styles.linkRow}>
              <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkAccent}>Sign up</Text></Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0d0d2e' },
  container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 },
  header: { marginBottom: 40 },
  brand: { fontFamily: 'System', fontWeight: '700', fontSize: 13, color: '#F7941D', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 },
  title: { fontSize: 30, fontWeight: '700', color: '#fff', marginBottom: 8 },
  sub: { fontSize: 14, color: '#8888bb' },
  form: {},
  label: { fontSize: 12, fontWeight: '600', color: '#8888bb', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  mt16: { marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#2a2a5e',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: '#fff',
    backgroundColor: '#1a1a3e',
  },
  error: { fontSize: 13, color: '#f87171', marginTop: 12 },
  btn: {
    backgroundColor: '#F7941D',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  linkRow: { marginTop: 20, alignItems: 'center' },
  linkText: { fontSize: 13, color: '#8888bb' },
  linkAccent: { color: '#F7941D', fontWeight: '600' },
});
