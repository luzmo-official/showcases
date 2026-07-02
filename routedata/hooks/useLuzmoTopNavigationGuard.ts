'use client';

import { useEffect, useRef } from 'react';

/** Hosts the Flex runtime often tries to send the browser to when auth/session fails. */
function isLuzmoHostedUrl(url: string): boolean {
  try {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.href : 'https://local.invalid');
    return /luzmo\.com$/i.test(u.hostname) || /cumul\.io$/i.test(u.hostname);
  } catch {
    return /luzmo\.com/i.test(url) || /cumul\.io/i.test(url);
  }
}

/**
 * While a Luzmo Flex preview is mounted, try to keep the app from being navigated away
 * (invalid embed tokens often trigger a redirect to app.luzmo.com — not a React error).
 *
 * - Chromium: Navigation API `navigate` + preventDefault when possible.
 * - All browsers: capture-phase click on <a href="…luzmo…">.
 *
 * This is best-effort: some programmatic navigations cannot be intercepted in every browser.
 */
export function useLuzmoTopNavigationGuard(
  active: boolean,
  onBlocked: (reason: string, detail?: string) => void
): void {
  const onBlockedRef = useRef(onBlocked);
  useEffect(() => {
    onBlockedRef.current = onBlocked;
  }, [onBlocked]);

  useEffect(() => {
    if (!active || typeof window === 'undefined') return;

    const blocked = (reason: string, detail?: string) => {
      console.warn(`[Luzmo preview] ${reason}`, detail ?? '');
      onBlockedRef.current(reason, detail);
    };

    // --- Navigation API (Chromium; blocks many cross-document top navigations) ---
    const nav = (window as Window & { navigation?: EventTarget }).navigation;
    const onNavigate = (e: Event) => {
      const ne = e as NavigateEvent;
      const url = typeof ne.destination?.url === 'string' ? ne.destination.url : '';
      if (!url || !isLuzmoHostedUrl(url)) return;
      try {
        ne.preventDefault();
        blocked('Blocked redirect to Luzmo (embed auth may be invalid or expired).', url);
      } catch {
        blocked('Could not prevent Luzmo redirect — try another browser or check embed token.', url);
      }
    };

    let removedNav = false;
    if (nav && typeof nav.addEventListener === 'function') {
      nav.addEventListener('navigate', onNavigate);
      removedNav = true;
    }

    // --- Link clicks (any browser) ---
    const onClickCapture = (ev: MouseEvent) => {
      const el = ev.target;
      if (!(el instanceof Element)) return;
      const a = el.closest('a[href]') as HTMLAnchorElement | null;
      if (!a?.href) return;
      if (!isLuzmoHostedUrl(a.href)) return;
      ev.preventDefault();
      ev.stopPropagation();
      blocked('Blocked Luzmo link navigation (likely login or session redirect).', a.href);
    };

    document.addEventListener('click', onClickCapture, true);

    // --- window.open to Luzmo ---
    const origOpen = window.open.bind(window);
    window.open = ((url?: string | URL, target?: string, features?: string) => {
      const s = url === undefined || url === '' ? '' : String(url);
      if (s && isLuzmoHostedUrl(s)) {
        blocked('Blocked window.open to Luzmo.', s);
        return null;
      }
      return origOpen(url, target, features);
    }) as typeof window.open;

    return () => {
      document.removeEventListener('click', onClickCapture, true);
      if (removedNav && nav && typeof nav.removeEventListener === 'function') {
        nav.removeEventListener('navigate', onNavigate);
      }
      window.open = origOpen;
    };
  }, [active]);
}

/** Minimal typing; full NavigateEvent is in newer DOM libs */
interface NavigateEvent extends Event {
  destination: { url: string };
  preventDefault(): void;
}
