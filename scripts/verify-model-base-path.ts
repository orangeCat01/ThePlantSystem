import { planetModelPaths } from '../src/data/models/planet-models';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

Object.entries(planetModelPaths).forEach(([id, path]) => {
  assert(
    path.startsWith('/plant/models/'),
    `model path for ${id} should include Vite base path: ${path}`,
  );
});

assert(
  planetModelPaths.venus === '/plant/models/venus/vueus.gltf',
  `venus model path should preserve the deployed filename: ${planetModelPaths.venus}`,
);

const routerSource = readFileSync(resolve(import.meta.dirname, '../src/router/index.ts'), 'utf8');
assert(
  routerSource.includes('createWebHistory(import.meta.env.BASE_URL)'),
  'router history should use Vite base path for subdirectory deployment',
);

console.log('model base path verification passed');
