import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import redis from "../db/redis.js";
import { Client } from "../models/client.model.js";
import jwt from "jsonwebtoken";
import fs from "node:fs";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRIVATE_KEY = fs.readFileSync(
  path.resolve(__dirname, "../../keys/private.pem"),
  "utf-8",
);

const ISSUER = process.env.ISSUER || "http://localhost:3000";
const KEY_ID = "test-key-id";

export const authorize = async (req, res) => {
  // Implementation for authorize endpoint
  const { client_id, redirect_uri, scope, state, response_type, nonce } =
    req.query;

  // Validate client_id and redirect_uri
  if (
    !client_id ||
    !redirect_uri ||
    !scope ||
    !scope.includes("openid") ||
    !state ||
    !nonce ||
    response_type !== "code"
  ) {
    return res.status(400).json({ error: "Invalid request" });
  }

  // TODO: Validate client_id and redirect_uri against the database
  const CLIENT_ID = "test-client-id";
  const REDIRECT_URI = "http://localhost:4000/callback";
  if (client_id !== CLIENT_ID || redirect_uri !== REDIRECT_URI) {
    return res.status(400).json({ error: "Invalid client_id or redirect_uri" });
  }

  if (!req.session.user) {
    req.session.authParams = { client_id, redirect_uri, scope, state, nonce };
    return res.redirect("/login");
  }

  // Generate authorization code
  const authorizationCode = crypto.randomUUID();

  await redis.set(
    `auth_code:${authorizationCode}`,
    JSON.stringify({
      client_id,
      redirect_uri,
      scope,
      user_id: req.session.user.id,
      state,
      nonce,
      expiresAt: Date.now() + 60 * 1000,
    }),
    { EX: 60 },
  );

  // Redirect back to the client with the authorization code
  const url = new URL(redirect_uri);
  url.searchParams.set("code", authorizationCode);
  url.searchParams.set("state", state);
  const redirectUrl = url.toString();

  // Clear authParams from session
  delete req.session.authParams;

  console.log(`Redirecting to: ${redirectUrl}`);

  res.redirect(redirectUrl);
};

export const tokenGenerate = async (req, res) => {
  //validate the req body
  const { code, client_id, client_secret, redirect_uri } = req.body;

  if (!code || !client_id || !client_secret || !redirect_uri) {
    return res.status(400).json({ error: "Missing required parameters" });
  }
  try {
    // check if client is valid
    const client = await Client.findOne({
      client_id,
      clent_secret: client_secret,
      redirect_uri,
    });
    if (!client) {
      return res.status(401).json({ error: "Invalid client credentials" });
    }

    // check if code is valid
    const authData = await redis.get(`auth_code:${code}`);
    if (!authData) {
      return res
        .status(400)
        .json({ error: "Invalid or expired authorization code" });
    }

    const { user_id, scope, nonce, expiresAt } = JSON.parse(authData);
    if (Date.now() > expiresAt) {
      return res.status(400).json({ error: "Expired authorization code" });
    }

    // generate access token and id token
    const accessToken = jwt.sign({ user_id, scope }, process.env.JWT_SECRET, {
      expiresIn: "1m",
    });

    const idToken = jwt.sign(
      {
        sub: user_id,
        aud: client_id,
        iss: ISSUER,
        nonce,
        iat: Math.floor(Date.now() / 1000),
      },
      PRIVATE_KEY,
      { algorithm: "RS256", expiresIn: "5m", keyid: KEY_ID },
    );

    const refreshToken = jwt.sign({ user_id, scope }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // return tokens
    return res.json({
      access_token: accessToken,
      id_token: idToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: 3600,
    });
  } catch (error) {
    console.error("Error in token generation:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
