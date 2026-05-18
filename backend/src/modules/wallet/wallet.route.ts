import { Router } from "express";
import { WalletController } from "./wallet.controller";
import { authenticate } from "../../middlewares/auth.middleware"; // 1. Import middleware

const router = Router();

router.post("/", authenticate, WalletController.create);
router.get("/", authenticate, WalletController.getMyWallets);
router.delete("/:id", authenticate, WalletController.delete);
router.post("/transfer", authenticate, WalletController.transfer);

export default router;
