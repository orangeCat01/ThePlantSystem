import { createServer } from 'vite';

const target = process.argv[2] ?? '/scripts/verify-phase221.ts';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
try {
  const mod = await server.ssrLoadModule(target);
  if (mod && typeof mod.default === 'function') {
    await mod.default();
  }
} finally {
  await server.close();
}
