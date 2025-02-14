/**
 * src/models/nd3Model.js
 *
 *  Mongoose schema for storing metadata about processed nd3 files.
 */

const mongoose = require('mongoose');

const nd3Schema = new mongoose.Schema({
  originalFileName: { type: String, required: true },
  status: { type: String, default: 'pending' }, 
  meta: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

nd3Schema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Nd3 = mongoose.model('Nd3', nd3Schema);

module.exports = Nd3;
