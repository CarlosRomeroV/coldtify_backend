const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const router = express.Router();

const geniusToken = process.env.GENIUS_ACCESS_TOKEN;

// 🔹 Ruta 1: Buscar canción por título + artista y devolver primera estrofa
router.get("/lyrics-first-stanza", async (req, res) => {
  const { song, artist } = req.query;

  if (!song || !artist) {
    return res.status(400).json({ error: "Se requieren parámetros 'song' y 'artist'" });
  }

  try {
    const query = encodeURIComponent(`${song} ${artist}`);
    const response = await axios.get(`https://api.genius.com/search?q=${query}`, {
      headers: {
        Authorization: `Bearer ${geniusToken}`,
      },
    });

    const hits = response.data.response.hits;
    if (hits.length === 0) {
      return res.status(404).json({ error: "No se encontró la canción en Genius" });
    }

    const bestMatch = hits.find(
      (hit) => hit.result.primary_artist.name.toLowerCase().includes(artist.toLowerCase())
    ) || hits[0];

    const lyricsPageUrl = bestMatch.result.url;

    const pageResponse = await axios.get(lyricsPageUrl);
    const $ = cheerio.load(pageResponse.data);

    const lyricsDivs = $('div[class^="Lyrics__Container"]');
    const fullText = lyricsDivs
      .map((_, el) => $(el).text())
      .get()
      .join("\n");

    const stanza = fullText.split("\n\n")[0];

    res.json({ firstStanza: stanza });
  } catch (error) {
    console.error("Error al obtener la letra:", error.response?.data || error.message);
    res.status(500).json({ error: "Error al extraer la letra" });
  }
});

// 🔹 Ruta 2: Obtener primer verso desde URL de Genius
router.get("/first-verse", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Falta el parámetro 'url'" });

  try {
    const pageResponse = await axios.get(url);
    const $ = cheerio.load(pageResponse.data);

    const containers = $('div[class^="Lyrics__Container"]');
    const lines = containers
      .map((_, el) => $(el).text().split("\n"))
      .get()
      .flat()
      .map((line) => line.trim())
      .filter(Boolean);

    let foundVerse = null;

    for (let i = 0; i < lines.length; i++) {
      const current = lines[i];

      if (/^\[.*\]$/.test(current)) {
        const next = lines[i + 1];
        if (!next || /^\[.*\]$/.test(next)) continue;

        const verseLines = [];
        let j = i + 1;

        while (
          verseLines.length < 8 &&
          j < lines.length &&
          !/^\[.*\]$/.test(lines[j])
        ) {
          const cleaned = lines[j].replace(/\([^)]*\)/g, "").trim();
          if (cleaned.length > 0) verseLines.push(cleaned);
          j++;
        }

        const valid = verseLines.filter(
          (line) => line.split(/\s+/).length >= 4
        );

        if (valid.length >= 6) {
          foundVerse = valid.slice(0, 6).join("\n");
          break;
        }
      }
    }

    if (!foundVerse) {
      return res.status(404).json({ error: "No se pudo extraer el primer verso" });
    }

    res.json({ firstVerse: foundVerse });
  } catch (error) {
    console.error("Error al analizar la letra:", error.message);
    res.status(500).json({ error: "Error al analizar la letra" });
  }
});

// 🔹 Ruta 3: Obtener una estrofa aleatoria desde una URL de Genius
router.get("/random-verse", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Falta el parámetro 'url'" });

  try {
    const pageResponse = await axios.get(url);
    const $ = cheerio.load(pageResponse.data);

    const containers = $('div[class^="Lyrics__Container"]');
    const lines = containers
      .map((_, el) => $(el).text().split("\n"))
      .get()
      .flat()
      .map((line) => line.trim())
      .filter(Boolean);

    const allVerses = [];
    let block = [];

    for (const line of lines) {
      if (/^\[.*\]$/.test(line)) {
        block = [];
        continue;
      }

      block.push(line);

      if (block.length >= 4) {
        allVerses.push(block.join("\n"));
        block = [];
      }
    }

    if (allVerses.length === 0) {
      return res.status(404).json({ error: "No se pudo encontrar una estrofa válida." });
    }

    const randomIndex = Math.floor(Math.random() * allVerses.length);
    const verse = allVerses[randomIndex];

    res.json({ verse });
  } catch (error) {
    console.error("Error al obtener estrofa aleatoria:", error.message);
    res.status(500).json({ error: "Error al analizar la letra." });
  }
});

module.exports = router;
