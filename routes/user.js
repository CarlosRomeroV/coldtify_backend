const express = require("express");
const supabase = require("../utils/supabaseClient");
const router = express.Router();

/**
 * POST /update-score
 * Body: { spotify_id: string, score: number }
 */
router.post("/update-score", async (req, res) => {
  const { spotify_id, score } = req.body;

  if (!spotify_id || typeof score !== "number") {
    return res.status(400).json({ error: "Faltan datos o score inválido" });
  }

  try {
    // Obtener score actual
    const { data: user, error } = await supabase
      .from("users")
      .select("score_game_1")
      .eq("spotify_id", spotify_id)
      .single();

    if (error) throw error;

    const currentScore = user.score_game_1 || 0;

    // Actualizar solo si es mayor
    if (score > currentScore) {
      const { error: updateError } = await supabase
        .from("users")
        .update({ score_game_1: score })
        .eq("spotify_id", spotify_id);

      if (updateError) throw updateError;
    }

    res.status(200).json({ updated: score > currentScore });
  } catch (err) {
    console.error("Error al actualizar el score:", err.message);
    res.status(500).json({ error: "No se pudo actualizar el score" });
  }
});

module.exports = router;
