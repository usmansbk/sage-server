import express from "express";
import timeout from "connect-timeout";
import AuthController from "../controllers/auth";

const router = express.Router();

router.post("/refresh_token", timeout("15s"), AuthController.refreshToken);

export default router;
