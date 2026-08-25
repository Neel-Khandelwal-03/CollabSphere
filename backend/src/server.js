const app = require('./app');
const env = require('./config/env');
const { pool } = require('./config/db');
const { initSocket } = require('./utils/socket');

async function start() {
  // Fail fast if the database isn't reachable rather than starting a
  // server that will 500 on every request.
  await pool.query('SELECT 1');

  const server = app.listen(env.port, () => {
    console.log(`CollabSphere API listening on port ${env.port} [${env.nodeEnv}]`);
  });

  // app.listen() already returns the underlying http.Server — Socket.IO
  // attaches to that same server rather than opening a second one, so
  // REST and WebSocket traffic share one port exactly like the rest of
  // this app's single-process design.
  initSocket(server);

  const shutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
