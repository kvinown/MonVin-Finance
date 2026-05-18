import { Router } from "express";
import { UserController } from "./user.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

router.post("/register", UserController.register);
router.post("/login", UserController.login);
router.post("/check-username", UserController.checkUsername);

// Endpoint baru untuk profil internal
router.get("/me", authenticate, UserController.getMe);

export default router;
