const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// ⬇️ Añade esta línea para Puppeteer en Render
process.env.PUPPETEER_EXECUTABLE_PATH = "/usr/bin/google-chrome";

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

// Middleware CORS con validación dinámica
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Origen no permitido por CORS"));
    }
  },
  credentials: true
}));

app.use(express.json());

app.use("/user", userRoutes);
app.use("/", authRoutes);
app.use("/spotify", spotifyRoutes);
app.use("/genius", geniusRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});
