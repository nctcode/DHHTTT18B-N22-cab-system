const app = require('./app');
require('dotenv').config();

const PORT = process.env.PORT || 3009;

app.listen(PORT, () => {
  console.log(`Notification Service đang chạy trên cổng ${PORT}`);
  console.log(`Môi trường: ${process.env.NODE_ENV}`);
});