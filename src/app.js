import express from "express";
import session from "express-session";
import { RedisStore } from "connect-redis";
import redisClient from "./db/redis.js";
import oidcRoutes from "./routes/oidc.routes.js";
import { User } from "./models/user.model.js";
import bcrypt from "bcrypt";

export function createApp() {
  const baseUrl = process.env.ISSUER || "http://localhost:3000";
  const app = express();
  app.use(express.json());
  app.use(express.static("public"));

  app.use(
    session({
      store: new RedisStore({ client: redisClient }),
      secret: process.env.SESSION_SECRET || "super_secret_key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false, // Set to true if using HTTPS
        httpOnly: false,
        maxAge: 1000 * 60 * 60 * 24, // 1 day
      },
    }),
  );

  // Routes
  app.get("/login", (req, res) => {
    res.sendFile("login.html", { root: "public" });
  });

  app.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email }).select("+password");

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      req.session.user = { id: user._id, email: user.email, name: user.name };

      // check if there's an ongoing OIDC flow
      if (req.session.authParams) {
        const { client_id, redirect_uri, scope, state, nonce } =
          req.session.authParams;
        const redirectUrl = `/api/v1/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}&response_type=code&scope=${scope}&state=${state}&nonce=${nonce}`;
        return res.json({
          message: "Login successful",
          redirectTo: redirectUrl,
        });
      }

      res.json({ message: "Login successful", redirectTo: "/" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/.well-known/openid-configuration", (req, res, next) => {
    res.json({
      issuer: `${baseUrl}/`,
      authorization_endpoint: `${baseUrl}/api/v1/authorize`,
      token_endpoint: `${baseUrl}/api/v1/token`,
      userinfo_endpoint: `${baseUrl}/api/v1/userinfo`,
      jwks_uri: `${baseUrl}/api/v1/jwks`,
    });
  });
  app.use("/api/v1", oidcRoutes);

  return app;
}
