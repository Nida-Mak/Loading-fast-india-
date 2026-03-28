import { Router, type IRouter } from "express";
import healthRouter from "./health";
import locationRouter from "./location";
import whatsappRouter from "./whatsapp";

const router: IRouter = Router();

router.use(healthRouter);
router.use(locationRouter);
router.use(whatsappRouter);

export default router;
