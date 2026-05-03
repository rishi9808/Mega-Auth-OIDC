import express from "express";

export function createApp() {
  const baseUrl = process.env.ISSUER || "http://localhost:3000";
  const app = express();
  app.use(express.json());

  app.get("/.well-known/openid-configuration", (req, res, next) => {
    res.json({
      issuer: `${baseUrl}/`,
      authorization_endpoint: `${baseUrl}/api/v1/authorize`,
      token_endpoint: `${baseUrl}/api/v1/token`,
      userinfo_endpoint: `${baseUrl}/api/v1/userinfo`,
      jwks_uri: `${baseUrl}/api/v1/jwks`,
    });
  });

  return app;
}
