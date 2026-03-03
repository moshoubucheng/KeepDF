import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    resolve: {
        alias: {
            '@components': resolve(__dirname, 'src/components'),
            '@lib': resolve(__dirname, 'src/lib'),
            '@hooks': resolve(__dirname, 'src/hooks'),
            '@layouts': resolve(__dirname, 'src/layouts'),
            '@types': resolve(__dirname, 'src/types'),
            '@': resolve(__dirname, 'src'),
        },
    },
    test: {
        include: ['src/**/*.test.ts'],
    },
});
