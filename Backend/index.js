import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';

import databaseConnection from './config/databaseConnection.js';
import router from './routes/route.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/";
const DATABASE_NAME = process.env.DATABASE_NAME || "thinkspace";

// Ensure uploads directories exist
const uploadDir = process.env.UPLOAD_DIRECTORY || "uploads";
['productimage', 'avatar', 'general', 'image'].forEach(sub => {
    const dir = path.join(uploadDir, sub);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        credentials: true,
    })
);

databaseConnection(DATABASE_URL, DATABASE_NAME);

app.use(express.json());
app.use(cookieParser());

// Serve static uploaded files across multiple route aliases for frontend robustness
app.use('/api', express.static(uploadDir));
app.use('/api/uploads', express.static(uploadDir));
app.use('/uploads', express.static(uploadDir));

app.use("/api", router);

app.get("/", (req, res) => {
    res.send("Server Running Successfully");
});

app.listen(PORT, () => { 
    console.log(`Server Listening at http://localhost:${PORT}`);
});