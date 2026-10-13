import { createServer } from 'node:http';
import { app } from './app.js';
import { env } from './config/env.js';
import { db, verifyRuntimeRole } from './config/db.js';
import { setupSocket } from './realtime/socket.js';
import { startJobs } from './jobs/deadlines.js';
await verifyRuntimeRole();
const server = createServer(app);
const io = setupSocket(server);
const jobs = startJobs();
server.listen(env.PORT, () => console.log(`Handoff API ready at http://localhost:${env.PORT}`));
async function shutdown() {
  for (const job of jobs) await job.stop();
  io.close();
  server.close();
  await db.$disconnect();
  process.exit(0);
}
process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());
