const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema(
  {
    userA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    requestA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransferRequest',
      required: true,
    },
    requestB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransferRequest',
      required: true,
    },
    // Array of userIds who have clicked "Reveal Contact"
    contactRevealed: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
    },
  },
  { timestamps: true }
);

// Prevent duplicate matches
matchSchema.index({ requestA: 1, requestB: 1 }, { unique: true });
matchSchema.index({ userA: 1, userB: 1 });

module.exports = mongoose.model('Match', matchSchema);
