import { Router, type IRouter } from "express";
import healthRouter from "./health";
import askRouter from "./ask";
import authRouter from "./auth";
import quizRouter from "./quiz";

const router: IRouter = Router();

router.use(healthRouter);
router.use(askRouter);
router.use(authRouter);
router.use(quizRouter);

export default router;
