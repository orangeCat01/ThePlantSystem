import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
try {
  const mod = await server.ssrLoadModule('/src/repositories/MissionRepository.ts');
  const repo = mod.missionRepository;
  console.log('all:', repo.getAll().length);
  console.log('earth:', repo.getByPlanetId('earth').map((m) => m.id));
  console.log('moon:', repo.getByPlanetId('moon').map((m) => m.id));
} finally { await server.close(); }
