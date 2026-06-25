import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',            // เปลี่ยนเป็น 'jsdom' เฉพาะไฟล์ที่ test component
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    // tsconfig.json paths = "@/*": ["./src/*"] → alias ต้องชี้ไป src (ไม่ใช่ root)
    alias: { '@': path.join(root, 'src') },
  },
});
