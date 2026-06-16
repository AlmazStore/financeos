import { defineConfig } from 'vitest/config';

// Config dedicada de testes — não carrega o plugin do Tailwind,
// já que os testes do motor financeiro são puros (sem DOM/CSS).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
