import { createClient } from "redis";

const redis = createClient({
  url: `redis://${process.env.REDIS_HOST || "127.0.0.1"}:${process.env.REDIS_PORT || 6379}`,
});

redis.on("connect", () => {
  console.log("Successfully connected to Redis/Valkey");
});

redis.on("error", (err) => {
  console.error("Redis/Valkey connection error:", err);
});

await redis.connect();

export default redis;
