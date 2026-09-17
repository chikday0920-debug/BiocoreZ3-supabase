const crypto = require("crypto");

/**
 * Ninguno de los proveedores de identificación (Pl@ntNet / iNaturalist) devuelve
 * un dato real de "rareza". Como simplificación de diseño para el mecanismo de
 * juego del Gaiadex, se deriva una rareza determinística a partir del nombre
 * científico: la misma especie siempre cae en la misma categoría.
 */
function calcularRareza(nombreCientifico) {
  const hash = crypto.createHash("md5").update(nombreCientifico).digest();
  const n = hash[0]; // 0-255
  if (n < 26) return "legendary"; // ~10%
  if (n < 90) return "rare"; // ~25%
  return "common"; // ~65%
}

module.exports = { calcularRareza };
