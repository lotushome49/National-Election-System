import express, { Application } from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

// Import modular routes
import authRoutes from "./routes/authRoutes";
// import { setupSockets } from "./infra/socket/socket.handler";

dotenv.config();

const app: Application = express();
app.set("trust proxy", 1);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// 1. Global Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// 2. Modular Routes
app.use("/api/auth", authRoutes);

// 3. Socket Initialization (Moved to infra)
// setupSockets(io);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 NEHS Production API Gateway running on port ${PORT}`);
});