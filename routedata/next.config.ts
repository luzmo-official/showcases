import type { NextConfig } from 'next';

/** When bundled into the Luzmo showcases site, the app is served under a sub-path. */
const isShowcaseBuild = process.env.STATIC_EXPORT === '1';

const nextConfig: NextConfig = {
  /** Ship as a fully static site: `next build` -> `out/` folder, no Node runtime. */
  output: 'export',
  /** Served from https://examples.luzmo.com/routedata/ in the showcases deployment. */
  basePath: isShowcaseBuild ? '/routedata' : '',
  assetPrefix: isShowcaseBuild ? '/routedata/' : '',
  /**
   * The embed credentials are namespaced with a `ROUTEDATA_` prefix rather than
   * Next's `NEXT_PUBLIC_`. Non-`NEXT_PUBLIC_` vars are not auto-inlined into the
   * client bundle, so map them explicitly here. Only the derived *embed*
   * credentials belong here — never the Luzmo API key/token.
   */
  env: {
    ROUTEDATA_LUZMO_EMBED_KEY: process.env.ROUTEDATA_LUZMO_EMBED_KEY,
    ROUTEDATA_LUZMO_EMBED_TOKEN: process.env.ROUTEDATA_LUZMO_EMBED_TOKEN,
    ROUTEDATA_LUZMO_EMBED_EXPIRY: process.env.ROUTEDATA_LUZMO_EMBED_EXPIRY,
    ROUTEDATA_LUZMO_DATASET_ID: process.env.ROUTEDATA_LUZMO_DATASET_ID,
    ROUTEDATA_LUZMO_API_HOST: process.env.ROUTEDATA_LUZMO_API_HOST,
    ROUTEDATA_LUZMO_APP_SERVER: process.env.ROUTEDATA_LUZMO_APP_SERVER,
  },
  /** Static export requires images to be unoptimized. */
  images: { unoptimized: true },
  /** ACK / Lucero / React-Embed ship untranspiled modern ESM and need bundler-time transpile. */
  transpilePackages: [
    '@luzmo/analytics-components-kit',
    '@luzmo/react-embed',
    '@luzmo/lucero',
  ],
};

export default nextConfig;
