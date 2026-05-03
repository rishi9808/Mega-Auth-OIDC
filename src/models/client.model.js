import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    client_id: {
      type: String,
      required: true,
      minLength: 4,
      maxLength: 100,
    },
    clent_secret: {
      type: String,
      required: true,
      minLength: 4,
      maxLength: 100,
    },
    name: {
      type: String,
      required: true,
      minLength: 4,
      maxLength: 100,
    },
    type: {
      type: String,
      enum: ["public", "confidential"],
      default: "confidential",
    },
    redirect_uri: {
      type: String,
      required: true,
      minLength: 4,
      maxLength: 100,
    },
  },
  {
    timestamps: true,
  },
);

export const Client = mongoose.model("Client", clientSchema);
