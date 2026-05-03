import redis from "../db/redis.js";

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
