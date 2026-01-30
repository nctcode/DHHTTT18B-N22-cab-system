require('dotenv').config();
const app = require('./app');
// Start the authentication service server
app.listen(process.env.PORT, () =>
  console.log('Auth service running on port', process.env.PORT)
);
