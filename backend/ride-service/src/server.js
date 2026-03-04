require("dotenv").config();
const app = require("./app");
const connectMongo = require("./config/mongo");
const roleMiddleware = require("./middleware/role.middleware");

const PORT = process.env.PORT || 3005;

const rabbitmq = require("./messaging/rabbitmq");
const { startConsumers } = require("./messaging/consumers");

// Use role middleware for all routes
app.use(roleMiddleware);

async function start() {
  await connectMongo();
  await rabbitmq.connect();
  await startConsumers();
  
  app.listen(PORT, () => {
    console.log(`🚗 Ride Service running on port ${PORT}`);
  });
}

start();
