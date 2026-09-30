import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config";
import { authRouter } from "./routes/auth.routes";
import { healthRouter } from "./routes/health.routes";
import { workerRouter } from "./routes/worker.routes";
import { adminRouter } from "./routes/admin.routes";
import { skillsRouter } from "./routes/skills.routes";
import { servicesRouter } from "./routes/services.routes";
import { customersRouter } from "./routes/customers.routes";
import { searchRouter } from "./routes/search.routes";
import { bookingRouter } from "./routes/booking.routes";
import { matchingRouter } from "./routes/matching.routes";
import { notificationRouter } from "./routes/notification.routes";
import { paymentRouter } from "./routes/payment.routes";
import { invoiceRouter } from "./routes/invoice.routes";
import { ratingRouter } from "./routes/rating.routes";
import { forecastRouter } from "./routes/forecast.routes";
import { errorHandler, notFoundHandler, logRequest } from "./middleware/errorHandler";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigins.includes("*") ? true : config.corsOrigins
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(logRequest);
if (!config.isProduction) {
  app.use(morgan("dev"));
}

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/workers", workerRouter);
app.use("/api/admin", adminRouter);
app.use("/api/skills", skillsRouter);
app.use("/api/services", servicesRouter);
app.use("/api/customers", customersRouter);
app.use("/api/search", searchRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/matching", matchingRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/invoices", invoiceRouter);
app.use("/api/ratings", ratingRouter);
app.use("/api/forecast", forecastRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;