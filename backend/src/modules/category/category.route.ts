import { Router } from "express";
import { CategoryController } from "./category.controller";

const router = Router();

// RESTful style: Jalurnya sama, yang membedakan adalah HTTP Method-nya
router.post("/", CategoryController.create);
router.get("/", CategoryController.getCategories);

export default router;
