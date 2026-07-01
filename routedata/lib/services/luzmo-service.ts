import { LUZMO_API_HOST, LUZMO_APP_SERVER, LUZMO_DATASET_ID } from '@/lib/luzmo/config';

export function getApiHost(): string {
  return LUZMO_API_HOST;
}

export function getAppServer(): string {
  return LUZMO_APP_SERVER;
}

export function getDefaultDatasetId(): string {
  return LUZMO_DATASET_ID;
}
