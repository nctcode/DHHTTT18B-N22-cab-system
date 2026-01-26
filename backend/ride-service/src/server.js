require("dotenv").config();
const app = require("./app");
const connectMongo = require("./config/mongo");

const PORT = process.env.PORT || 3005;

connectMongo();

app.listen(PORT, () => {
  console.log(`🚗 Ride Service running on port ${PORT}`);
});
