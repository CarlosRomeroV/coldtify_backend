const express = require("express");
const axios = require("axios");
const querystring = require("querystring");
const supabase = require("../utils/supabaseClient");

const router = express.Router();

// Spotify app credentials (desde .env)
const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;
const frontend_url = process.env.FRONTEND_URL;

// Scopes necesarios
const scopes = ["user-top-read"].join(" ");

/**
 * GET /login
 * Redirige al login de Spotify
 */
router.get("/login", (req, res) => {
  const queryParams = querystring.stringify({
    response_type: "code",
    client_id,
    scope: scopes,
    redirect_uri,
  });

  res.redirect(`https://accounts.spotify.com/authorize?${queryParams}`);
 

});

/**
 * GET /callback
 * Spotify redirige aquí con un "code" → intercambiamos por un access_token
 */
router.get("/callback", async (req, res) => {
  const code = req.query.code || null;

  try {
    const tokenRes = await axios.post(
      "https://accounts.spotify.com/api/token",
      querystring.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri,
        client_id,
        client_secret,
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );
    console.log("Código recibido:", code);
    const { access_token, refresh_token } = tokenRes.data;

    // 🔍 Obtener datos del usuario desde Spotify
    const userRes = await axios.get("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const spotifyId = userRes.data.id;
    const displayName = userRes.data.display_name || "Desconocido";

    // 🗃 Insertar o recuperar en Supabase
    const { data: existingUser, error } = await supabase
      .from("users")
      .select("*")
      .eq("spotify_id", spotifyId)
      .single();

    if (!existingUser) {
      await supabase.from("users").insert({
        spotify_id: spotifyId,
        display_name: displayName,
      });
    }

    // ✅ Redirigir al frontend
    console.log("Redirigiendo a:", `${process.env.FRONTEND_URL}/callback?access_token=${access_token}&refresh_token=${refresh_token}&display_name=${encodeURIComponent(displayName)}`);
    res.redirect(`${process.env.FRONTEND_URL}/callback?access_token=${access_token}&refresh_token=${refresh_token}&display_name=${encodeURIComponent(displayName)}`);
  } catch (error) {
    console.error("Error en callback:", error.response?.data || error.message);
    res.status(500).send("Error al procesar autenticación");
  }
});

/**
 * GET /refresh_token
 * Recibe un refresh_token y devuelve un nuevo access_token
 * Ejemplo: /refresh_token?refresh_token=...
 */
router.get("/refresh_token", async (req, res) => {
    const refresh_token = req.query.refresh_token;
  
    if (!refresh_token) {
      return res.status(400).json({ error: "Falta el refresh_token" });
    }
  
    try {
      const response = await axios.post(
        "https://accounts.spotify.com/api/token",
        querystring.stringify({
          grant_type: "refresh_token",
          refresh_token,
          client_id,
          client_secret,
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );
  
      const { access_token, expires_in } = response.data;
  
      res.json({ access_token, expires_in });
    } catch (error) {
      console.error("Error al refrescar token:", error.response?.data || error.message);
      res.status(500).json({ error: "No se pudo refrescar el token" });
    }
  });
  

module.exports = router;
