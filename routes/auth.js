const express = require("express");
const axios = require("axios");
const querystring = require("querystring");
const supabase = require("../utils/supabaseClient");

const router = express.Router();

// Spotify app credentials
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
  console.log("📥 Callback recibido");

  if (!code) {
    console.error("❗ No se recibió el parámetro 'code'");
    return res.status(400).send("Falta el parámetro 'code'");
  }

  console.log("🔑 Código recibido:", code);

  try {
    // Intercambiar el código por tokens
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

    console.log("🔐 Tokens recibidos correctamente");

    const { access_token, refresh_token } = tokenRes.data;

    // Obtener datos del usuario en Spotify
    const userRes = await axios.get("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    console.log("👤 Datos del usuario obtenidos de Spotify");

    const spotifyId = userRes.data.id;
    const displayName = userRes.data.display_name || "Desconocido";
    console.log(`🆔 Spotify ID: ${spotifyId}, 🧑 Nombre: ${displayName}`);

    // Buscar usuario en Supabase
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("spotify_id", spotifyId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("❗ Error al consultar Supabase:", fetchError.message);
      return res.status(500).send("Error al consultar usuario en Supabase");
    }

    if (!user) {
      console.log("🆕 Insertando nuevo usuario en Supabase...");
      const { error: insertError } = await supabase
        .from("users")
        .insert({
          spotify_id: spotifyId,
          display_name: displayName,
          created_at: new Date().toISOString(),
          score_game_1: 0, // Si quieres inicializar el score
        });

      if (insertError) {
        console.error("❗ Error al insertar usuario nuevo:", insertError.message);
        return res.status(500).send("Error al insertar usuario nuevo");
      }
    } else {
      console.log("📦 Usuario ya existente");
    }

    // Redirigir al frontend
    const redirectUrl = `${frontend_url}/callback?access_token=${access_token}&refresh_token=${refresh_token}&display_name=${encodeURIComponent(displayName)}`;
    console.log("🚀 Redirigiendo a frontend:", redirectUrl);

    res.redirect(redirectUrl);

  } catch (error) {
    console.error("❌ Error durante el callback:");
    if (error.response) {
      console.error("📡 Response status:", error.response.status);
      console.error("📡 Response data:", error.response.data);
    } else {
      console.error("❗ Error sin respuesta:", error.message);
    }
    res.status(500).send("Error al procesar autenticación");
  }
});

/**
 * GET /refresh_token
 * Recibe un refresh_token y devuelve un nuevo access_token
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
    console.error("❌ Error al refrescar token:", error.response?.data || error.message);
    res.status(500).json({ error: "No se pudo refrescar el token" });
  }
});

module.exports = router;
