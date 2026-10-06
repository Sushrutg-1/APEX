import http from 'http';

import app from './app.js';
import env from './config/env.config.js';
import connectToDB from './db/db.js';

import createWebSocketServer from './websocket/websocket.server.js';

connectToDB()
  .then(() => {
    const server = http.createServer(app);

    server.on('error', (error) => {
      console.error('Server Error: ', error);
    });

    createWebSocketServer(server);

    server.listen(env.PORT, () => {
      console.log(`Server is running on port ${env.PORT}`);
    });
  })
  .catch((error) => {
    console.log('MONGODB CONNECTION ERROR : ', error);
  });
