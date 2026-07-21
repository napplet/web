import { main } from './index.js';

main().then(
  (exitCode) => {
    process.exitCode = exitCode;
  },
  (error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Unexpected error: ${message}\n`);
    process.exitCode = 1;
  },
);
