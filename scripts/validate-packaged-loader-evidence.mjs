#!/usr/bin/env node

import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseCliArgs, validateEvidence } from './lib/packaged-loader-evidence-core.mjs';
import { productionServices } from './lib/packaged-loader-evidence-services.mjs';

export {
  computeAggregateHash,
  parseCliArgs,
  validateEvidence,
} from './lib/packaged-loader-evidence-core.mjs';

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  const services = await productionServices();
  const result = await validateEvidence({ ...options, services });
  console.log(JSON.stringify(result));
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  main().catch((error) => {
    console.error(
      error instanceof Error
        ? error.message
        : 'packaged loader evidence validation failed',
    );
    process.exitCode = 1;
  });
}
