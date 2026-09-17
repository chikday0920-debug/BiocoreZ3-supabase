// Identificación de plantas vía Plant.id (Kindwise) — reemplaza Pl@ntNet.
// Requiere la API key en la variable de entorno PLANT_ID_API_KEY.
// Docs: https://www.kindwise.com/plant-id
import { Buffer } from "node:buffer";
import type { IdentificacionEspecie } from "./tipos.ts";

const PLANT_ID_URL = "https://api.plant.id/v3/identification";

export async function identifyPlant(
  imageBuffer: Uint8Array,
  apiKey: string,
): Promise<IdentificacionEspecie | null> {
  const base64 = Buffer.from(imageBuffer).toString("base64");

  const res = await fetch(`${PLANT_ID_URL}?details=common_names`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Api-Key": apiKey,
    },
    body: JSON.stringify({ images: [base64] }),
  });

  if (!res.ok) {
    throw new Error(`Plant.id respondió ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const best = data.result?.classification?.suggestions?.[0];
  if (!best) {
    return null;
  }

  return {
    nombreComun: best.details?.common_names?.[0] || best.name,
    nombreCientifico: best.name,
    confianza: Math.round((best.probability || 0) * 100),
    tipo: "planta",
  };
}
