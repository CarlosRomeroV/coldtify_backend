const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const authRoutes = require("./routes/auth");
const spotifyRoutes = require("./routes/spotify");
const geniusRoutes = require("./routes/genius");
const userRoutes = require("./routes/user");


const app = express();
const PORT = 8888;

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use("/user", userRoutes);
app.use("/", authRoutes);
app.use("/spotify", spotifyRoutes);
app.use("/genius", geniusRoutes);



app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://127.0.0.1:${PORT}`);
});
