import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Providers } from '@/components/Providers';

export default function RootLayout(): React.JSX.Element {
  return (
    <Providers>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0d0d2e' } }} />
    </Providers>
  );
}
