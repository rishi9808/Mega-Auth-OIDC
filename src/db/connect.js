import mongoose from "mongoose";

export async function connectDB(uri) {
  if (!uri) {
    throw new Error("MongoDB URI is required");
  }
  const connection = await mongoose
    .connect(uri)
    .then(() => {
      console.log("Db connected");
      return mongoose.connection;
    })
    .catch((err) => console.log("Error connecting db", err));

  return connection;
}
