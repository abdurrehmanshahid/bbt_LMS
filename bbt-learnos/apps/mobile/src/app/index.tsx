import { Redirect } from 'expo-router';
import React from 'react';

import { useAuthStore } from '@/lib/store';

export default function IndexScreen(): React.JSX.Element {
  const { user } = useAuthStore();

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href={user.role === 'CREATOR' ? '/(creator)' : '/(learner)'} />;
}
