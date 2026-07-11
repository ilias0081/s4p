import { createServer } from 'node:http';

import { createApp } from './app.js';
import { env } from './config/env.js';
import { closeDatabase } from './db/database.js';

const app = createApp();
const server = createServer(app);

server.listen(env.port, '0.0.0.0', () => {
  console.log(`Backend listening on port ${env.port}`);
});

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`Received ${signal}. Starting graceful shutdown.`);

  server.close(async (error) => {
    try {
      await closeDatabase();
    } finally {
      process.exit(error ? 1 : 0);
    }
  });

  setTimeout(() => {
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});