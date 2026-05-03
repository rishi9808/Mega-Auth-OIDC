import { Router } from "express";
import { authorize } from "../controllers/oidc.controller.js";

const router = Router();

router.get("/authorize", authorize);

export default router;
