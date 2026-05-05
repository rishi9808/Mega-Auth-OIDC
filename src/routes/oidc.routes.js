import { Router } from "express";
import { authorize, tokenGenerate } from "../controllers/oidc.controller.js";

const router = Router();

router.get("/authorize", authorize);
router.post("/token", tokenGenerate);

export default router;
