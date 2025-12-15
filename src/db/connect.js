/**
 * src/db/connect.js
 *
 * MongoDB connection using Mongoose
 */

const mongoose = require('mongoose');

async function connectDB(uri) {
  return mongoose.connect(uri);
}

module.exports = connectDB;
