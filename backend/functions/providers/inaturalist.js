const INATURALIST_URL = "https://api.inaturalist.org/v1/computervision/score_image";

/**
 * Identifica un animal a partir de un Buffer de imagen usando el endpoint de
 * Computer Vision de iNaturalist.
 *
 * ADVERTENCIA: este endpoint NO es una API pública oficialmente documentada
 * para terceros — es la que usa la app oficial de iNaturalist internamente y
 * puede cambiar o dejar de responder sin aviso. Si eso ocurre, reemplazar la
 * implementación de este archivo (p. ej. por Google Cloud Vision) sin tocar
 * el resto del sistema, ya que index.js solo depende de `identifyAnimal`.
 */
async function identifyAnimal(imageBuffer) {
  const form = new FormData();
  form.append("image", new Blob([imageBuffer]), "scan.jpg");

  const res = await fetch(INATURALIST_URL, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(`iNaturalist respondió ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const best = data.results && data.results[0];
  if (!best) {
    return null;
  }

  return {
    nombreComun: best.taxon.preferred_common_name || best.taxon.name,
    nombreCientifico: best.taxon.name,
    confianza: Math.round((best.combined_score || 0)),
    tipo: "animal",
  };
}

module.exports = { identifyAnimal };
