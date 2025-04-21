const express = require("express");
const axios = require("axios");

const router = express.Router();

const geniusToken = process.env.GENIUS_ACCESS_TOKEN;

router.get("/top-artists", async (req, res) => {
  const access_token = req.headers.authorization?.split(" ")[1];

  if (!access_token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const response = await axios.get("https://api.spotify.com/v1/me/top/artists?limit=50", {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error al obtener top artistas:", error.response?.data || error.message);
    res.status(500).json({ error: "No se pudieron obtener los artistas" });
  }
});

router.get("/top-tracks", async (req, res) => {
  const access_token = req.headers.authorization?.split(" ")[1];

  if (!access_token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const fetchTopTracks = async (offset) => {
      const response = await axios.get(`https://api.spotify.com/v1/me/top/tracks?limit=50&offset=${offset}`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });
      return response.data.items;
    };

    // Realiza 5 peticiones: 0, 50, 100, 150, 200
    const offsets = [0, 50, 100, 150, 200];
    const allRequests = offsets.map(fetchTopTracks);
    const allChunks = await Promise.all(allRequests);
    const allTracks = allChunks.flat();

    // Mostrar en consola
    const formatted = allTracks.map((track) => `${track.name} - ${track.artists[0].name}`);
    console.log("🎵 Top 250 canciones más escuchadas:");
    console.log(formatted.join(", "));

    res.json(allTracks); // también podrías enviar 'formatted' si prefieres
  } catch (error) {
    console.error("Error al obtener top tracks:", error.response?.data || error.message);
    res.status(500).json({ error: "No se pudieron obtener las canciones" });
  }
});

router.get("/random-track", async (req, res) => {
  const access_token = req.headers.authorization?.split(" ")[1];
  if (!access_token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    // Paso 1: Obtener las 250 canciones del usuario
    const fetchTopTracks = async (offset) => {
      const response = await axios.get(`https://api.spotify.com/v1/me/top/tracks?limit=50&offset=${offset}`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });
      return response.data.items;
    };

    const offsets = [0, 50, 100, 150, 200];
    const allRequests = offsets.map(fetchTopTracks);
    const allChunks = await Promise.all(allRequests);
    const allTracks = allChunks.flat();

    // Paso 2: Elegir una canción al azar
    const randomIndex = Math.floor(Math.random() * allTracks.length);
    const track = allTracks[randomIndex];
    const songName = track.name;
    const artistName = track.artists[0].name;

    // Paso 3: Buscar en Genius
    const query = encodeURIComponent(`${songName} ${artistName}`);
    const geniusResponse = await axios.get(`https://api.genius.com/search?q=${query}`, {
      headers: {
        Authorization: `Bearer ${geniusToken}`,
      },
    });

    const hits = geniusResponse.data.response.hits;
    const bestMatch = hits.find(
      (hit) => hit.result.primary_artist.name.toLowerCase().includes(artistName.toLowerCase())
    ) || hits[0];

    const geniusUrl = bestMatch ? bestMatch.result.url : null;

    // Paso 4: Devolver la información completa
    res.json({
      title: songName,
      artist: artistName,
      albumImage: track.album.images[0]?.url || null,
      spotifyUrl: track.external_urls.spotify,
      geniusUrl: geniusUrl,
    });
  } catch (error) {
    console.error("Error en /random-track:", error.response?.data || error.message);
    res.status(500).json({ error: "Error al obtener canción aleatoria" });
  }
});


module.exports = router;
