"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = __importDefault(require("http"));
const database_1 = require("./config/database");
const socket_1 = require("./realtime/socket");
const health_routes_1 = __importDefault(require("./routes/health.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const business_routes_1 = __importDefault(require("./routes/business.routes"));
const business_catalog_routes_1 = __importDefault(require("./routes/business-catalog.routes"));
const business_order_routes_1 = __importDefault(require("./routes/business-order.routes"));
const catalog_routes_1 = __importDefault(require("./routes/catalog.routes"));
const order_routes_1 = __importDefault(require("./routes/order.routes"));
const delivery_routes_1 = __importDefault(require("./routes/delivery.routes"));
const delivery_order_routes_1 = __importDefault(require("./routes/delivery-order.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const profile_routes_1 = __importDefault(require("./routes/profile.routes"));
const rating_routes_1 = __importDefault(require("./routes/rating.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
}));
app.use(express_1.default.json());
app.use("/api/auth", auth_routes_1.default);
app.use("/api/profile", profile_routes_1.default);
app.use("/api/ratings", rating_routes_1.default);
app.use("/api/businesses/me/orders", business_order_routes_1.default);
app.use("/api/businesses", business_routes_1.default);
app.use("/api/businesses/me", business_catalog_routes_1.default);
app.use("/api/catalog", catalog_routes_1.default);
app.use("/api/orders", order_routes_1.default);
app.use("/api/deliveries", delivery_routes_1.default);
app.use("/api/deliveries/me", delivery_order_routes_1.default);
app.use("/api/admin", admin_routes_1.default);
app.use("/api/health", health_routes_1.default);
const PORT = Number(process.env.PORT) || 3000;
async function startServer() {
    try {
        await database_1.prisma.$connect();
        const httpServer = http_1.default.createServer(app);
        (0, socket_1.initSocket)(httpServer, process.env.CLIENT_URL || "http://localhost:5173");
        httpServer.listen(PORT, () => {
            console.log(`FastDelivery API: http://localhost:${PORT}`);
            console.log("MySQL conectado correctamente");
            console.log("Tiempo real (Socket.IO) activo");
        });
    }
    catch (error) {
        console.error("Error iniciando FastDelivery:", error);
        process.exit(1);
    }
}
startServer();
