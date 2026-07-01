'use client';

import { useMemo } from 'react';
import type { EmbedAuthResponse, LuzmoConnectionStatus } from '@/lib/types';
import { LUZMO_DATASET_ID, LUZMO_EMBED_KEY, LUZMO_EMBED_TOKEN } from '@/lib/luzmo/config';

interface UseAuthReturn {
  auth: EmbedAuthResponse;
  status: LuzmoConnectionStatus;
  loading: false;
  error: null;
}

const HARDCODED_AUTH: EmbedAuthResponse = {
  authKey: LUZMO_EMBED_KEY,
  authToken: LUZMO_EMBED_TOKEN,
  datasetIdUsed: LUZMO_DATASET_ID,
};

/** Zero-backend auth: returns the compiled-in embed credentials synchronously. */
export function useAuth(): UseAuthReturn {
  const status = useMemo<LuzmoConnectionStatus>(
    () => ({
      connected: true,
      datasetsAvailable: 1,
      lastChecked: new Date().toISOString(),
    }),
    []
  );

  return {
    auth: HARDCODED_AUTH,
    status,
    loading: false,
    error: null,
  };
}
