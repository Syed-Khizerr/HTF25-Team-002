const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const roomSchema = new Schema({
  name: String,
  createdAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model("Room", roomSchema);
