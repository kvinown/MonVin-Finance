import { Router } from "express";
import { TransactionController } from "./transaction.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

router.post("/", authenticate, TransactionController.create);
router.get("/", authenticate, TransactionController.getMyHistory);
router.delete("/:id", authenticate, TransactionController.delete);
// Tambahkan baris PUT ini di file route transaksi kamu
router.put("/:id", authenticate, TransactionController.update);

export default router;
