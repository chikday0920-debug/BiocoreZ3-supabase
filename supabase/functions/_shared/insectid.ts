// Identificación de fauna vía Insect.id (Kindwise) — reemplaza el endpoint no
// oficial de iNaturalist, que dejó de responder sin autenticación y cuyo
// acceso real requiere aprobación directa del equipo de iNaturalist.
//
// LIMITACIÓN CONOCIDA: Insect.id solo identifica insectos y arañas (~6.387
// clases) — no aves, mamíferos, reptiles ni anfibios. "Modo Fauna" en el
// escáner es, en la práctica, "Modo Insectos" hasta que se sume otro
// proveedor para el resto de la fauna.
//
// Requiere la API key en la variable de entorno INSECT_ID_API_KEY.
// Docs: https://www.kindwise.com/insect-id
import { Buffer } from "node:buffer";
import type { IdentificacionEspecie } from "./tipos.ts";

const INSECT_ID_URL = "https://insect.kindwise.com/api/v1/identification";

export async function identifyAnimal(
  imageBuffer: Uint8Array,
  apiKey: string,
): Promise<IdentificacionEspecie | null> {
  const base64 = Buffer.from(imageBuffer).toString("base64");

  const res = await fetch(`${INSECT_ID_URL}?details=common_names`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Api-Key": apiKey,
    },
    body: JSON.stringify({ images: [base64] }),
  });

  if (!res.ok) {
    throw new Error(`Insect.id respondió ${res.status}: ${await res.text()}`);
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
    tipo: "animal",
  };
}
