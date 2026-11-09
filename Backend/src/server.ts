import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { prisma } from "./config/database";
import { initSocket } from "./realtime/socket";
import healthRoutes from "./routes/health.routes";
import authRoutes from "./routes/auth.routes";
import businessRoutes from "./routes/business.routes";
import businessCatalogRoutes from "./routes/business-catalog.routes";
import businessOrderRoutes from "./routes/business-order.routes";
import catalogRoutes from "./routes/catalog.routes";
import orderRoutes from "./routes/order.routes";
import deliveryRoutes from "./routes/delivery.routes";
import deliveryOrderRoutes from "./routes/delivery-order.routes";
import adminRoutes from "./routes/admin.routes";
import profileRoutes from "./routes/profile.routes";
import ratingRoutes from "./routes/rating.routes";

dotenv.config();

const app = express();

app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
}));

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/businesses/me/orders", businessOrderRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/businesses/me", businessCatalogRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/deliveries/me", deliveryOrderRoutes);
app.use("/api/admin", adminRoutes);

app.use("/api/health", healthRoutes);

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
    try {
        await prisma.$connect();

        const httpServer = http.createServer(app);

        initSocket(
            httpServer,
            process.env.CLIENT_URL || "http://localhost:5173"
        );

        httpServer.listen(PORT, () => {
            console.log(`FastDelivery API: http://localhost:${PORT}`);
            console.log("MySQL conectado correctamente");
            console.log("Tiempo real (Socket.IO) activo");
        });
    } catch (error) {
        console.error("Error iniciando FastDelivery:", error);
        process.exit(1);
    }
}

startServer();