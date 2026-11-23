import mongoose from "mongoose";

declare global {
  var mongooseConnection:
    | { connection: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
    | undefined;
}

const cached = global.mongooseConnection ?? { connection: null, promise: null };
global.mongooseConnection = cached;

export async function connectToDatabase() {
  if (cached.connection) return cached.connection;

  if (!cached.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("Missing MONGODB_URI environment variable.");
    cached.promise = mongoose.connect(uri).catch((error: unknown) => {
      cached.promise = null;
      throw error;
    });
  }

  cached.connection = await cached.promise;
  return cached.connection;
}
