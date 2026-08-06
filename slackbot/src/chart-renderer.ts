import Luzmo from '@luzmo/nodejs-sdk';
import type { ItemConfig } from './types.js';

const CHART_WIDTH = 800;
const CHART_HEIGHT = 450;

/**
 * Exports a Luzmo chart config to a PNG buffer using the Luzmo Export API.
 * Returns null if the export fails.
 */
export async function renderChartToPng(
  item: ItemConfig,
  credentials: { luzmoKey: string; luzmoToken: string; luzmoHost: string }
): Promise<Buffer | null> {
  try {
    console.log('[ChartExport] Starting export, type:', item.type);

    const client = new Luzmo({
      api_key: credentials.luzmoKey,
      api_token: credentials.luzmoToken,
      host: credentials.luzmoHost,
    });

    const response = await client.create('export', {
      type: 'png',
      item: {
        type: item.type || 'bar-chart',
        slots: item.slots || [],
        options: item.options || {},
        ...(item.filters?.length && { filters: item.filters }),
      },
      dimensions: {
        width: CHART_WIDTH,
        height: CHART_HEIGHT,
      },
    });

    if (!response) {
      console.warn('[ChartExport] Export returned no data');
      return null;
    }

    if (Buffer.isBuffer(response)) {
      console.log('[ChartExport] Export succeeded, size:', response.length);
      return response;
    }

    if (typeof response === 'string') {
      const buffer = Buffer.from(response, 'base64');
      console.log('[ChartExport] Export succeeded (base64), size:', buffer.length);
      return buffer;
    }

    console.warn('[ChartExport] Unexpected response type:', typeof response);
    return null;
  } catch (error) {
    console.error('[ChartExport] Failed to export chart:', error);
    return null;
  }
}
