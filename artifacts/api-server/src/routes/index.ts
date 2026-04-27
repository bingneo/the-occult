import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import experimentsRouter from "./experiments";
import statsRouter from "./stats";
import usersRouter from "./users";
import aiRouter from "./ai";
import papersRouter from "./papers";
import notificationsRouter from "./notifications";
import storageRouter from "./storage";
import tagsRouter from "./tags";
import dashboardRouter from "./dashboard";
import failuresRouter from "./failures";
import adminRouter from "./admin";
import rantsRouter from "./rants";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(experimentsRouter);
router.use(statsRouter);
router.use(usersRouter);
router.use(aiRouter);
router.use(papersRouter);
router.use(notificationsRouter);
router.use(storageRouter);
router.use(tagsRouter);
router.use(dashboardRouter);
router.use(failuresRouter);
router.use(adminRouter);
router.use(rantsRouter);

export default router;
