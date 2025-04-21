const express = require("express");
const axios = require("axios");
const router = express.Router();
const puppeteer = require("puppeteer");

const geniusToken = process.env.GENIUS_ACCESS_TOKEN;

const cheerio = require("cheerio");

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
      return res.status(404).json({ error: "No se encontró la letra" });
    }

    const bestMatch = hits.find(
      (hit) => hit.result.primary_artist.name.toLowerCase().includes(artist.toLowerCase())
    ) || hits[0];

    const lyricsPageUrl = bestMatch.result.url;

    // Scrape la página
    const pageResponse = await axios.get(lyricsPageUrl);
    const $ = cheerio.load(pageResponse.data);

    const lyricsDiv = $('div[class^="Lyrics__Container"]').first();

    const text = lyricsDiv.text().trim();
    const stanza = text.split("\n\n")[0];

    console.log("🎶 Primera estrofa:");
    console.log(stanza);

    res.json({ firstStanza: stanza });
  } catch (error) {
    console.error("Error al obtener la letra:", error.response?.data || error.message);
    res.status(500).json({ error: "Error al extraer la letra" });
  }
});

router.get("/first-verse", async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "Falta el parámetro 'url'" });
  
    let browser;
  
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-blink-features=AutomationControlled",
          "--window-size=1920,1080",
          "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        ]
      });
  
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForSelector('div[class^="Lyrics__Container"]');
  
      const firstVerse = await page.evaluate(() => {
        const containers = Array.from(document.querySelectorAll('div[class^="Lyrics__Container"]'));
        let found = null;
  
        for (const container of containers) {
          const lines = container.innerText
            .split("\n")
            .map(line => line.trim())
            .filter(Boolean);
  
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
                if (cleaned.length > 0) {
                  verseLines.push(cleaned);
                }
                j++;
              }
  
              const valid = verseLines.filter(
                line => line.split(/\s+/).length >= 4
              );
  
              if (valid.length >= 6) {
                found = valid.slice(0, 6).join("\n");
                break;
              }
              
            }
          }
  
          if (found) break;
        }
  
        return found || null;
      });
  
      if (!firstVerse) {
        return res.status(404).json({ error: "No se pudo extraer la letra" });
      }
  
      res.json({ firstVerse });
  
    } catch (error) {
      console.error("Error al usar Puppeteer:", error);
      res.status(500).json({ error: "Error al extraer la letra" });
  
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  });

  router.get("/random-verse", async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "Falta el parámetro 'url'" });
  
    let browser;
  
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-blink-features=AutomationControlled",
          "--window-size=1920,1080",
          "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        ]
      });
  
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  
      await page.waitForSelector('div[class^="Lyrics__Container"]');
  
      const randomVerse = await page.evaluate(() => {
        const containers = Array.from(document.querySelectorAll('div[class^="Lyrics__Container"]'));
        const allVerses = [];
  
        for (const container of containers) {
          const lines = container.innerText
            .split("\n")
            .map(line => line.trim())
            .filter(Boolean);
  
          let block = [];
  
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
  
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
        }
  
        if (allVerses.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * allVerses.length);
        return allVerses[randomIndex];
      });
  
      await browser.close();
  
      if (!randomVerse) {
        return res.status(404).json({ error: "No se pudo encontrar una estrofa válida." });
      }
  
      res.json({ verse: randomVerse });
  
    } catch (error) {
      console.error("Error al obtener estrofa aleatoria:", error);
      if (browser) await browser.close();
      res.status(500).json({ error: "Error al analizar la letra." });
    }
  });
  
  


module.exports = router;
