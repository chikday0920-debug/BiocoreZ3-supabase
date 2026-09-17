// Reemplaza la Cloud Function HTTP analyzePlant (backend/functions/index.js).
// Invocada desde el cliente con sb.functions.invoke('analyze-plant', {body:{storagePath, modo}})
// — supabase-js adjunta el JWT del usuario automáticamente.
import { createClient } from "npm:@supabase/supabase-js@2";
import { identifyPlant } from "../_shared/plantid.ts";
import { identifyAnimal } from "../_shared/insectid.ts";
import { calcularRareza } from "../_shared/rareza.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Método no permitido" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Cliente "como el usuario": respeta RLS. Se usa para verificar el JWT
  // (equivalente a admin.auth().verifyIdToken) y para descargar la imagen —
  // la política scans_select_own ya limita la lectura a su propia carpeta.
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await supabaseUser.auth.getUser();
  if (userError || !userData?.user) {
    return json({ error: "Token inválido" }, 401);
  }
  const uid = userData.user.id;

  let body: { storagePath?: string; modo?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body inválido" }, 400);
  }

  const { storagePath, modo } = body;
  if (!storagePath || !storagePath.startsWith(`${uid}/`)) {
    return json({ error: "storagePath inválido" }, 400);
  }
  if (modo !== "planta" && modo !== "animal") {
    return json({ error: "modo debe ser 'planta' o 'animal'" }, 400);
  }

  try {
    const { data: fileData, error: downloadError } = await supabaseUser.storage
      .from("scans")
      .download(storagePath);
    if (downloadError || !fileData) {
      throw new Error(downloadError?.message || "No se pudo descargar la imagen");
    }
    const imageBuffer = new Uint8Array(await fileData.arrayBuffer());

    const resultado = modo === "planta"
      ? await identifyPlant(imageBuffer, Deno.env.get("PLANT_ID_API_KEY") ?? "")
      : await identifyAnimal(imageBuffer, Deno.env.get("INSECT_ID_API_KEY") ?? "");

    if (!resultado) {
      return json({ error: "No se pudo identificar la especie en la imagen" }, 422);
    }

    const rareza = calcularRareza(resultado.nombreCientifico);
    const especieId = resultado.nombreCientifico.toLowerCase().replace(/\s+/g, "-");

    // Cliente con privilegios de servicio: única forma de llamar
    // registrar_analisis, que no está concedida a "authenticated".
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: rpcData, error: rpcError } = await supabaseAdmin
      .rpc("registrar_analisis", {
        p_usuario_id: uid,
        p_especie_id: especieId,
        p_nombre_comun: resultado.nombreComun,
        p_nombre_cientifico: resultado.nombreCientifico,
        p_tipo: resultado.tipo,
        p_rareza: rareza,
        p_confianza: resultado.confianza,
        p_imagen_path: storagePath,
      })
      .single();

    if (rpcError || !rpcData) {
      throw new Error(rpcError?.message || "No se pudo registrar el análisis");
    }

    return json({
      ...resultado,
      rareza,
      especieId,
      analisisId: rpcData.analisis_id,
      esNueva: rpcData.es_nueva,
      xpGanada: rpcData.xp_ganada,
      nivelFinal: rpcData.nivel_final,
    });
  } catch (err) {
    console.error("analyze-plant falló", err);
    return json({ error: "Error identificando la especie", detalle: (err as Error).message }, 500);
  }
});
