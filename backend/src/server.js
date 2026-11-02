import http from 'http';

import app from './app.js';
import env from './config/env.config.js';
import connectToDB from './db/db.js';

import createWebSocketServer from './websocket/websocket.server.js';
import Vehicle from './models/Vehicle.model.js';

connectToDB()
  .then(() => {
    return Vehicle.updateMany(
      { status: 'online' },
      { $set: { status: 'offline' } }
    );
  })
  .then(() => {
    const server = http.createServer(app);

    server.on('error', (error) => {
      console.error('Server Error: ', error);
    });

    createWebSocketServer(server);

    server.listen(env.PORT, env.HOST, () => {
      console.log(`Server is running on ${env.HOST}:${env.PORT}`);
    });
  })
  .catch((error) => {
    console.log('MONGODB CONNECTION ERROR : ', error);
  });
