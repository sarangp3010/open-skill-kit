import { assertReleaseLicenseEvidence } from '../../scripts/release-license-gate';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import { readFile } from 'node:fs/promises';
import {
  thirdPartyNotices,
  type DependencyNoticeRecord,
} from '../../scripts/third-party-notices';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'distribution-licenses',
      async generateBundle() {
        const dependencies: DependencyNoticeRecord[] = [];
        const locations = new Map<string, string>();
        this.emitFile({
          type: 'asset',
          fileName: 'THIRD_PARTY_NOTICES.txt',
          source: await thirdPartyNotices(
            [
              ...this.getModuleIds(),
              fileURLToPath(
                new URL(
                  './node_modules/tailwindcss/package.json',
                  import.meta.url,
                ),
              ),
            ],
            fileURLToPath(new URL('../../third-party', import.meta.url)),
            (record, directory) => {
              dependencies.push(record);
              locations.set(`${record.name}@${record.version}`, directory);
            },
          ),
        });
        if (process.env.OPEN_SKILL_KIT_RELEASE_BUILD === '1')
          await assertReleaseLicenseEvidence(
            fileURLToPath(new URL('../../', import.meta.url)),
            dependencies,
            locations,
          );
        this.emitFile({
          type: 'asset',
          fileName: 'DEPENDENCY_MANIFEST.json',
          source:
            JSON.stringify(
              {
                schemaVersion: 1,
                dependencies: dependencies.sort((a, b) =>
                  (a.name + '@' + a.version).localeCompare(
                    b.name + '@' + b.version,
                    'en',
                  ),
                ),
              },
              null,
              2,
            ) + '\n',
        });
        this.emitFile({
          type: 'asset',
          fileName: 'LICENSE.txt',
          source: await readFile(
            fileURLToPath(new URL('../../LICENSE', import.meta.url)),
            'utf8',
          ),
        });
      },
    },
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          markdown: ['react-markdown', 'remark-gfm', 'rehype-sanitize'],
        },
      },
    },
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
