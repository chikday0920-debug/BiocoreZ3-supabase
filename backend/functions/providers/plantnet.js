const PLANTNET_PROJECT = "all";
const PLANTNET_URL = `https://my-api.plantnet.org/v2/identify/${PLANTNET_PROJECT}`;

/**
 * Identifica una planta a partir de un Buffer de imagen usando la API de Pl@ntNet.
 * Requiere la variable de entorno/secret PLANTNET_API_KEY.
 * Docs: https://my.plantnet.org/doc
 */
async function identifyPlant(imageBuffer, apiKey) {
  const form = new FormData();
  form.append("images", new Blob([imageBuffer]), "scan.jpg");
  form.append("organs", "auto");

  const res = await fetch(`${PLANTNET_URL}?api-key=${apiKey}`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Pl@ntNet respondió ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const best = data.results && data.results[0];
  if (!best) {
    return null;
  }

  return {
    nombreComun: (best.species.commonNames && best.species.commonNames[0]) || best.species.scientificNameWithoutAuthor,
    nombreCientifico: best.species.scientificNameWithoutAuthor,
    confianza: Math.round(best.score * 100),
    tipo: "planta",
  };
}

module.exports = { identifyPlant };
