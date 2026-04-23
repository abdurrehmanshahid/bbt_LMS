import React from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout(): React.JSX.Element {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0d0d2e' },
        animation: 'fade',
      }}
    />
  );
}
