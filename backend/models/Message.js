const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const messageSchema = new Schema({
  room: String,
  username: String,
  displayName: String,
  avatar: String,
  text: String,
  serverId: { type: Schema.Types.ObjectId, ref: "Server", required: true },
  mentions: [String], // Array of usernames mentioned in the message
  replyTo: { type: Schema.Types.ObjectId, ref: "Message", default: null }, // Reference to parent message
  // File attachments
  attachments: [
    {
      url: String,
      filename: String,
      mimetype: String,
      size: Number,
    },
  ],
  createdAt: { type: Date, default: Date.now },
  reactions: { type: Schema.Types.Mixed, default: {} }, // { emoji: [usernames] }
  pinned: { type: Boolean, default: false },
});
module.exports = mongoose.model("Message", messageSchema);
