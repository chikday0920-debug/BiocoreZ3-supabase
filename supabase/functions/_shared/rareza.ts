// Portado de backend/functions/rareza.js. Único cambio real frente al
// original: Web Crypto (SubtleCrypto) no soporta MD5, así que se usa el
// import de compatibilidad node:crypto que sí trae el runtime de Edge Functions.
import { createHash } from "node:crypto";

export type Rareza = "legendary" | "rare" | "common";

/**
 * Ninguno de los proveedores de identificación (Pl@ntNet / iNaturalist) devuelve
 * un dato real de "rareza". Como simplificación de diseño para el mecanismo de
 * juego del Gaiadex, se deriva una rareza determinística a partir del nombre
 * científico: la misma especie siempre cae en la misma categoría.
 */
export function calcularRareza(nombreCientifico: string): Rareza {
  const hash = createHash("md5").update(nombreCientifico).digest();
  const n = hash[0]; // 0-255
  if (n < 26) return "legendary"; // ~10%
  if (n < 90) return "rare"; // ~25%
  return "common"; // ~65%
}
