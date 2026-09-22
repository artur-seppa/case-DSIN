import tsconfigPaths from 'vite-tsconfig-paths';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    setupFiles: ['reflect-metadata'],
    root: './',
    include: ['**/*.spec.ts'],
    exclude: [...configDefaults.exclude, '**/*.integration.spec.ts'],
  },
});
