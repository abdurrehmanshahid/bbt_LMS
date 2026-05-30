import type { Metadata } from 'next';

import { AccountActions } from '@/components/AccountActions';

export const metadata: Metadata = {
  title: 'Account',
  description: 'Manage your BBT LearnOS account preferences and active session.',
};

export default function AccountPage(): React.JSX.Element {
  return (
    <div className="bbt-screen min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <AccountActions />
      </div>
    </div>
  );
}
