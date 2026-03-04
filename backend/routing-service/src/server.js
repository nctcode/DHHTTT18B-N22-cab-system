const app = require('./app');
const dotenv = require('dotenv');

dotenv.config();

const PORT = process.env.PORT || 4040;

app.listen(PORT, () => {
  console.log(`Routing service running on port ${PORT}`);
});
