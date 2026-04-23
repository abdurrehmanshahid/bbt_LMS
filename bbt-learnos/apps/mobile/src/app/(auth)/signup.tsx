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

interface SignupResponse { accessToken: string; user: AuthUser }

const ROLES = [
  { value: 'LEARNER', label: 'Learner' },
  { value: 'CREATOR', label: 'Creator' },
];

export default function SignupScreen(): React.JSX.Element {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'LEARNER' | 'CREATOR'>('LEARNER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (): Promise<void> => {
    if (!name || !email || !password) { setError('All fields are required.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    setError('');
    try {
      const data = await post<SignupResponse>('/auth/signup', { name, email, password, role });
      setAuth(data.user, data.accessToken);
      if (data.user.role === 'CREATOR') {
        router.replace('/(creator)');
      } else {
        router.replace('/(learner)');
      }
    } catch {
      setError('Signup failed. Email may already be in use.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.brand}>BBT LearnOS</Text>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.sub}>Start your career transformation today.</Text>
        </View>

        <View style={styles.form}>
          {/* Role picker */}
          <Text style={styles.label}>I am a</Text>
          <View style={styles.roleRow}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[styles.roleBtn, role === r.value && styles.roleBtnActive]}
                onPress={() => setRole(r.value as 'LEARNER' | 'CREATOR')}
                activeOpacity={0.8}
              >
                <Text style={[styles.roleBtnText, role === r.value && styles.roleBtnTextActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, styles.mt16]}>Full name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} autoComplete="name" placeholderTextColor="#5555aa" placeholder="Ahmed Khan" />

          <Text style={[styles.label, styles.mt16]}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholderTextColor="#5555aa" placeholder="you@example.com" />

          <Text style={[styles.label, styles.mt16]}>Password</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor="#5555aa" placeholder="Min. 8 characters" />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={() => void handleSignup()} disabled={loading} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>Create account</Text>}
          </TouchableOpacity>

          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.linkRow}>
              <Text style={styles.linkText}>Already have an account? <Text style={styles.linkAccent}>Sign in</Text></Text>
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
  roleRow: { flexDirection: 'row', gap: 10 },
  roleBtn: { flex: 1, borderWidth: 1, borderColor: '#2a2a5e', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  roleBtnActive: { borderColor: '#F7941D', backgroundColor: '#F7941D18' },
  roleBtnText: { fontSize: 14, fontWeight: '600', color: '#8888bb' },
  roleBtnTextActive: { color: '#F7941D' },
  input: { borderWidth: 1, borderColor: '#2a2a5e', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: '#fff', backgroundColor: '#1a1a3e' },
  error: { fontSize: 13, color: '#f87171', marginTop: 12 },
  btn: { backgroundColor: '#F7941D', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  linkRow: { marginTop: 20, alignItems: 'center' },
  linkText: { fontSize: 13, color: '#8888bb' },
  linkAccent: { color: '#F7941D', fontWeight: '600' },
});
