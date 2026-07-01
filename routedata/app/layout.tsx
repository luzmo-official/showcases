import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { APP_NAME, APP_SUBTITLE } from '@/lib/domain/routedata';

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_SUBTITLE,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="antialiased">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              function isBenignBrowserNoise(message) {
                if (!message || typeof message !== 'string') return false;
                if (message.indexOf('ResizeObserver loop') !== -1) return true;
                return false;
              }
              function isLuzmoEmbedScript(filename) {
                if (!filename || typeof filename !== 'string') return false;
                return /luzmo\\.com|cumul\\.io/i.test(filename);
              }
              function serializeWindowError(e) {
                var msg = e.message || '';
                var fn = e.filename || '';
                if (isLuzmoEmbedScript(fn)) {
                  return 'Luzmo dashboard-app: ' + (msg || 'error in embed bundle') + (fn ? ' (' + fn + ')' : '');
                }
                if (msg === 'Script error.' || (!msg && !e.lineno && !e.colno)) {
                  return 'Cross-origin script error (browser hides details)' + (fn ? ' @ ' + fn : '');
                }
                var err = e.error;
                if (err instanceof Error) return err.stack || err.message || String(err);
                if (err && typeof err === 'object') {
                  try {
                    var keys = Object.keys(err);
                    if (keys.length === 0) return msg || 'Third-party embed reported an empty error object {}';
                    return JSON.stringify(err);
                  } catch (x) {
                    return msg || String(err);
                  }
                }
                return msg || String(err) || 'Unknown error';
              }
              function serializeRejectionReason(reason) {
                if (reason instanceof Error) return reason.stack || reason.message || String(reason);
                if (reason && typeof reason === 'object') {
                  try {
                    if (Object.keys(reason).length === 0) return 'Empty rejection {} (often from a minified dependency)';
                    return JSON.stringify(reason);
                  } catch (x) {
                    return String(reason);
                  }
                }
                return String(reason);
              }
              window.addEventListener('error', function(e) {
                var msg = e.message || (e.error && e.error.message) || '';
                if (isBenignBrowserNoise(msg)) return;
                var text = serializeWindowError(e);
                var fn = e.filename || '';
                // Luzmo Flex runs in remote chunks; log as warn so Next dev overlay does not treat as app fatal.
                if (isLuzmoEmbedScript(fn)) {
                  console.warn('[Luzmo embed]', text);
                  return;
                }
                console.error('[GLOBAL ERROR] ' + text);
                var d = document.createElement('div');
                d.style.cssText = 'position:fixed;bottom:0;left:0;right:0;padding:12px 16px;background:#fef2f2;border-top:2px solid #dc2626;font:12px/1.5 monospace;color:#991b1b;z-index:99999;max-height:40vh;overflow:auto';
                d.textContent = '[ERROR] ' + text;
                document.body.appendChild(d);
              });
              window.addEventListener('unhandledrejection', function(e) {
                var reason = e.reason;
                var rmsg = reason && (reason.message || (typeof reason === 'string' ? reason : ''));
                if (isBenignBrowserNoise(rmsg)) return;
                var text = serializeRejectionReason(reason);
                console.error('[UNHANDLED REJECTION] ' + text);
                var d = document.createElement('div');
                d.style.cssText = 'position:fixed;bottom:0;left:0;right:0;padding:12px 16px;background:#fef2f2;border-top:2px solid #dc2626;font:12px/1.5 monospace;color:#991b1b;z-index:99999;max-height:40vh;overflow:auto';
                d.textContent = '[REJECTION] ' + text;
                document.body.appendChild(d);
              });
            `,
          }}
        />
      </body>
    </html>
  );
}
