'use client';

import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { apiPost } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

type PaymentMethod = 'stripe' | 'jazzcash' | 'easypaisa-ma' | 'easypaisa-otc';

interface LocalCheckoutResponse {
  gateway: 'JAZZCASH' | 'EASYPAISA';
  paymentId: string;
  transactionRef: string;
  amount: number;
  currency: 'PKR';
  redirect?: {
    method: 'POST';
    url: string;
    fields: Record<string, string>;
  };
  instructions?: {
    method: 'MA' | 'OTC';
    orderRef: string;
    amount: number;
    message: string;
    expiresAt: string;
  };
}

interface PaymentMethodSelectorProps {
  trackId: string;
  trackSlug: string;
  compact?: boolean;
}

function submitGatewayForm(url: string, fields: Record<string, string>): void {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = url;
  form.style.display = 'none';

  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}

export function PaymentMethodSelector({
  trackId,
  trackSlug,
  compact = false,
}: PaymentMethodSelectorProps): React.JSX.Element {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [method, setMethod] = useState<PaymentMethod>('stripe');
  const [mobileNumber, setMobileNumber] = useState('');
  const [instructions, setInstructions] = useState<LocalCheckoutResponse['instructions'] | null>(null);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken) throw new Error('Please sign in before starting checkout.');
      setInstructions(null);

      if (method === 'stripe') {
        const res = await apiPost<{ url: string }>(
          '/learner/enroll/checkout',
          { trackId, plan: 'MONTHLY' },
          accessToken,
        );
        window.location.href = res.url;
        return;
      }

      if (method === 'jazzcash') {
        const res = await apiPost<LocalCheckoutResponse>(
          '/learner/enroll/jazzcash',
          { trackId, plan: 'MONTHLY' },
          accessToken,
        );
        if (res.redirect) submitGatewayForm(res.redirect.url, res.redirect.fields);
        return;
      }

      const res = await apiPost<LocalCheckoutResponse>(
        '/learner/enroll/easypaisa',
        {
          trackId,
          plan: 'MONTHLY',
          method: method === 'easypaisa-ma' ? 'MA' : 'OTC',
          ...(method === 'easypaisa-ma' ? { mobileNumber } : {}),
        },
        accessToken,
      );
      if (res.redirect) submitGatewayForm(res.redirect.url, res.redirect.fields);
      if (res.instructions) setInstructions(res.instructions);
    },
  });

  if (!accessToken) {
    return (
      <Link
        href={`/auth/signup?plan=monthly&track=${trackId}`}
        className="mt-6 block text-center rounded-lg bg-orange-500 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
      >
        Go Full Access
      </Link>
    );
  }

  return (
    <div className={compact ? 'mt-6 space-y-3' : 'space-y-4'}>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Payment method">
        {[
          ['stripe', 'Card'],
          ['jazzcash', 'JazzCash'],
          ['easypaisa-ma', 'EasyPaisa MA'],
          ['easypaisa-otc', 'EasyPaisa OTC'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={method === value}
            onClick={() => setMethod(value as PaymentMethod)}
            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
              method === value
                ? 'border-orange-500 bg-orange-500 text-white'
                : 'border-navy-200 text-navy-700 hover:border-navy-400 dark:border-navy-600 dark:text-navy-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {method === 'easypaisa-ma' && (
        <label className="block">
          <span className="mb-1 block text-xs font-mono text-navy-500 dark:text-navy-400">
            EasyPaisa mobile number
          </span>
          <input
            value={mobileNumber}
            onChange={(event) => setMobileNumber(event.target.value)}
            inputMode="numeric"
            placeholder="03XXXXXXXXX"
            className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-orange-500 dark:border-navy-600 dark:bg-navy-900 dark:text-white"
          />
        </label>
      )}

      {checkoutMutation.error && (
        <p role="alert" className="text-xs text-red-500">
          {checkoutMutation.error instanceof Error ? checkoutMutation.error.message : 'Checkout failed'}
        </p>
      )}

      {instructions && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-navy-800 dark:border-orange-900/50 dark:bg-orange-950/20 dark:text-navy-100">
          <p className="font-semibold">Order ref: {instructions.orderRef}</p>
          <p className="mt-1 text-xs text-navy-600 dark:text-navy-300">
            PKR {instructions.amount.toLocaleString()} expires {new Date(instructions.expiresAt).toLocaleString()}.
          </p>
        </div>
      )}

      <button
        type="button"
        disabled={checkoutMutation.isPending}
        onClick={() => checkoutMutation.mutate()}
        className="block w-full rounded-lg bg-orange-500 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {checkoutMutation.isPending ? 'Starting checkout...' : 'Continue to payment'}
      </button>

      <p className="text-center text-xs text-navy-500 dark:text-navy-400">
        Secure checkout for {trackSlug.replaceAll('-', ' ')}
      </p>
    </div>
  );
}
