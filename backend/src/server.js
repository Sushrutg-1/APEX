import app from './app.js';
import env from './config/env.config.js';
import connectToDB from './db/db.js';

connectToDB()
  .then(() => {
    app.on('error', (error) => {
      console.error('Server Error: ', error);
    });
  })
  .then(() => {
    // Express Server
    app.listen(env.PORT, () => {
      console.log(`Server is running on port ${env.PORT}`);
    });
  })
  .catch((error) => {
    console.log('MONGODB CONNECTION ERROR : ', error);
  });
