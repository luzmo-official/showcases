import type { LuzmoEmbedVizItem } from '@luzmo/embed';
import type { VizItemExportType } from '@luzmo/dashboard-contents-types';

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function sanitizeBaseName(name: string): string {
  return name.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '').slice(0, 80) || 'chart';
}

/**
 * Download data / image from an embedded Flex item (`LuzmoVizItemComponent` ref).
 */
export async function downloadFromViz(
  viz: LuzmoEmbedVizItem | null,
  type: VizItemExportType,
  title: string
): Promise<void> {
  if (!viz) {
    window.alert('Chart is still loading — try again in a moment.');
    return;
  }
  if (typeof viz.export !== 'function') {
    window.alert('Export is not available for this chart yet.');
    return;
  }
  const base = sanitizeBaseName(title);
  let result: string | void;
  try {
    result = await viz.export(type);
  } catch (e) {
    console.warn('[RouteData] export failed', type, e);
    window.alert(`Export failed (${type}). Check the browser console for details.`);
    return;
  }
  if (result == null || result === '') {
    window.alert('Export returned no data. The chart may still be loading.');
    return;
  }

  if (type === 'png') {
    const href = result.startsWith('data:') ? result : `data:image/png;base64,${result}`;
    const a = document.createElement('a');
    a.href = href;
    a.download = `${base}.png`;
    a.click();
    return;
  }

  if (type === 'csv' || type === 'csv-raw') {
    const blob = new Blob([result], { type: 'text/csv;charset=utf-8' });
    triggerBlobDownload(blob, `${base}.csv`);
    return;
  }

  if (type === 'xlsx' || type === 'xlsx-raw') {
    try {
      const binary = atob(result);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      triggerBlobDownload(blob, `${base}.xlsx`);
    } catch {
      const blob = new Blob([result], { type: 'application/octet-stream' });
      triggerBlobDownload(blob, `${base}.xlsx`);
    }
  }
}
