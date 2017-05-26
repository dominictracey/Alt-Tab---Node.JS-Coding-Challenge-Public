var mongoose = require('mongoose');

function getSchema() {
  return mongoose.Schema({
    name: String,
    email: String,
    passwordHash: String,
    currToken: String,
    tokenGenerated: String,
  });
}

module.exports.getSchema = getSchema
