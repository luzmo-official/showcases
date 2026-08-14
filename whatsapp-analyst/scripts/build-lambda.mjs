import * as esbuild from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';

mkdirSync('dist-lambda', { recursive: true });

await esbuild.build({
  entryPoints: ['lambda/entry.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  outfile: 'dist-lambda/index.js',
  sourcemap: true,
  // Keep node:sqlite external so DynamoDB Lambda never needs the built-in module.
  external: ['node:sqlite'],
  logLevel: 'info',
});

// Parent package.json is "type": "module"; Lambda zip must force CommonJS.
writeFileSync(
  'dist-lambda/package.json',
  `${JSON.stringify({ type: 'commonjs' }, null, 2)}\n`
);

console.log('Lambda bundle written to dist-lambda/index.js (exports.handler)');
