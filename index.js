const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const authRoutes = require("./routes/auth");
const spotifyRoutes = require("./routes/spotify");
const geniusRoutes = require("./routes/genius");
const userRoutes = require("./routes/user");

const app = express();
const PORT = process.env.PORT || 8888;

// Lista de orígenes permitidos
const allowedOrigins = [
  "http://localhost:5173",
  "https://coldtify.vercel.app"
];

// Headers CORS explícitos para evitar errores con preflight
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200); // Evita errores CORS en preflight
  }
  next();
});

app.use(express.json());

app.use("/user", userRoutes);
app.use("/", authRoutes);
app.use("/spotify", spotifyRoutes);
app.use("/genius", geniusRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});
