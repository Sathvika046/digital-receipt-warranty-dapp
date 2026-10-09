const mongoose = require("mongoose");

const warrantySchema = new mongoose.Schema(
  {
    warrantyId: {
      type: Number,
      required: true,
      unique: true,
    },

    productName: {
      type: String,
      required: true,
    },

    productSerialNumber: {
      type: String,
      required: true,
      unique: true,
    },

    receiptNumber: {
      type: String,
      required: true,
    },

    customer: {
      type: String,
      required: true,
      lowercase: true,
    },

    seller: {
      type: String,
      required: true,
      lowercase: true,
    },

    purchaseDate: {
      type: Date,
      required: true,
    },

    warrantyExpiry: {
      type: Date,
      required: true,
    },

    transactionHash: {
      type: String,
      default: "",
    },

    blockNumber: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Warranty", warrantySchema);