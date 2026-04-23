import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Providers } from '@/components/Providers';
import { useAuthStore } from '@/lib/store';

function AuthGuard(): null {
  const { user } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuth = segments[0] === '(auth)';
    if (!user && !inAuth) {
      router.replace('/(auth)/login');
    } else if (user && inAuth) {
      if (user.role === 'CREATOR') {
        router.replace('/(creator)');
      } else {
        router.replace('/(learner)');
      }
    }
  }, [user, segments, router]);

  return null;
}

export default function RootLayout(): React.JSX.Element {
  return (
    <Providers>
      <StatusBar style="light" />
      <AuthGuard />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0d0d2e' } }} />
    </Providers>
  );
}
