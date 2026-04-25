require('dotenv').config();
const app = require('./app');
const { initRedis } = require('./config/redis');

// Initialize Redis, then start the server
initRedis().then(() => {
  app.listen(process.env.PORT, () =>
    console.log('Auth service running on port', process.env.PORT)
  );
}).catch(err => {
  console.error('Failed to initialize Redis', err);
  process.exit(1);
});
