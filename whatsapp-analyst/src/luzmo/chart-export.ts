import Luzmo from '@luzmo/nodejs-sdk';
import type { ItemConfig } from './types.js';
import { logger } from '../logger.js';

const CHART_WIDTH = 800;
const CHART_HEIGHT = 450;
const MAX_PNG_BYTES = 5 * 1024 * 1024;

/**
 * Export a chart PNG using the SAME embed credentials used for /AIPrompt.
 * Never pass owner API credentials here.
 *
 * Theme is optional: omit `theme` for Luzmo defaults (showcase-friendly).
 */
export async function renderChartToPng(
  item: ItemConfig,
  credentials: {
    luzmoKey: string;
    luzmoToken: string;
    luzmoHost: string;
    /** Optional `{ id }` for a saved / built-in theme; omit for Luzmo defaults */
    theme?: { id: string };
  }
): Promise<Buffer | null> {
  try {
    const client = new Luzmo({
      api_key: credentials.luzmoKey,
      api_token: credentials.luzmoToken,
      host: credentials.luzmoHost,
    });

    const options: Record<string, unknown> = {
      ...(item.options || {}),
    };
    if (credentials.theme) {
      options.theme = credentials.theme;
    }

    const response = await client.create('export', {
      type: 'png',
      item: {
        type: item.type || 'bar-chart',
        slots: item.slots || [],
        options,
        ...(item.filters?.length ? { filters: item.filters } : {}),
      },
      dimensions: {
        width: CHART_WIDTH,
        height: CHART_HEIGHT,
      },
    });

    if (!response) {
      logger.warn('Chart export returned no data');
      return null;
    }

    let buffer: Buffer | null = null;
    if (Buffer.isBuffer(response)) {
      buffer = response;
    } else if (typeof response === 'string') {
      buffer = Buffer.from(response, 'base64');
    } else if (
      typeof response === 'object' &&
      response !== null &&
      'data' in response &&
      typeof (response as { data?: unknown }).data === 'string'
    ) {
      buffer = Buffer.from((response as { data: string }).data, 'base64');
    }

    if (!buffer) {
      logger.warn('Chart export unexpected response type', {
        type: typeof response,
      });
      return null;
    }

    if (buffer.length > MAX_PNG_BYTES) {
      logger.warn('Chart PNG exceeds WhatsApp 5MB limit', {
        size: buffer.length,
      });
      return null;
    }

    logger.info('Chart export succeeded', { size: buffer.length });
    return buffer;
  } catch (error) {
    logger.error('Chart export failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
