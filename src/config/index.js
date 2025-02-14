/**
 * src/config/index.js
 *
 * Central place to load and validate environment variables.
 */

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nd3_db';

module.exports = {
  PORT,
  MONGO_URI,
};
