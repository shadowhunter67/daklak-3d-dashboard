#!/usr/bin/env node
// Cross-platform check for the Python/GIS toolchain used by validate:data and the build:gis
// family of scripts. Frontend-only work does not need this; it exists so `quality:full` (or a
// developer running validate:data directly) gets a clear message instead of a raw traceback
// when geopandas/shapely/pyproj/fiona/Pillow are missing.
import { spawnSync } from 'node:child_process';

const PYTHON_CANDIDATES =
  process.platform === 'win32' ? ['python', 'python3'] : ['python3', 'python'];
const REQUIRED_MODULES = ['geopandas', 'shapely', 'pyproj', 'fiona', 'PIL'];

function findPython() {
  for (const candidate of PYTHON_CANDIDATES) {
    const result = spawnSync(candidate, ['--version'], { stdio: 'ignore' });
    if (result.status === 0) return candidate;
  }
  return null;
}

const python = findPython();
if (!python) {
  console.error(
    'Không tìm thấy Python 3.12 trên PATH. Cần cài Python để chạy validate:data/build:gis — xem docs/operations.md.',
  );
  process.exit(1);
}

const check = spawnSync(python, ['-c', `import ${REQUIRED_MODULES.join(', ')}`], {
  stdio: 'pipe',
  encoding: 'utf8',
});

if (check.status !== 0) {
  console.error(
    `Thiếu GIS Python dependency (geopandas/shapely/pyproj/fiona/Pillow). Chạy: python -m pip install -r scripts/requirements.txt\n${check.stderr ?? ''}`,
  );
  process.exit(1);
}

console.log(`GIS Python dependencies OK (${python}).`);
