const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const messageSchema = new Schema({
  room: String,
  username: String,
  text: String,
  createdAt: { type: Date, default: Date.now },
  reactions: { type: Schema.Types.Mixed, default: {} },
  pinned: { type: Boolean, default: false },
});
module.exports = mongoose.model("Message", messageSchema);
