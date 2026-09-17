/**
 * Siembra la colección de referencia `especies` con las fichas que antes
 * vivían en las páginas estáticas especie-*.html. especie.html las usa
 * como contenido curado cuando el id coincide (si no, cae a los datos
 * crudos que devolvió la IA para ese escaneo).
 *
 * Uso (una sola vez, con credenciales de admin del proyecto):
 *   GOOGLE_APPLICATION_CREDENTIALS=ruta/a/service-account.json node seed/seedEspecies.js
 */
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

const especies = [
  {
    id: "nephrolepis-exaltata",
    nombreComun: "Helecho Tropical",
    nombreCientifico: "Nephrolepis exaltata",
    tipo: "planta",
    imagenUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Boston_Fern_(Nephrolepis_exaltata).jpg?width=900",
    descripcion: "El helecho tropical es un fósil viviente con más de 300 millones de años de existencia en la Tierra, apareciendo mucho antes que los dinosaurios. Al pertenecer al grupo de las pteridofitas, destaca en el reino vegetal por ser una planta vascular que no produce flores, frutos ni semillas para su reproducción.",
  },
  {
    id: "danaus-plexippus",
    nombreComun: "Mariposa Monarca",
    nombreCientifico: "Danaus plexippus",
    tipo: "animal",
    imagenUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Monarch_Butterfly_Pink_Zinnia_1800px.jpg?width=900",
    descripcion: "La mariposa monarca es conocida por su increíble migración desde América del Norte hasta los bosques de oyamel de México. Su ciclo de vida es un ejemplo fascinante de adaptación y supervivencia.",
  },
  {
    id: "morpho-menelaus",
    nombreComun: "Morpho azul",
    nombreCientifico: "Morpho menelaus",
    tipo: "animal",
    imagenUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Blue_Morpho_butterfly_(Morpho_peleides)_wings_open.jpg?width=900",
    descripcion: "El azul iridiscente de sus alas no proviene de un pigmento, sino de la estructura microscópica de sus escamas, que refractan la luz. Su vuelo errático e impredecible es una estrategia de defensa frente a los depredadores.",
  },
  {
    id: "agalychnis-callidryas",
    nombreComun: "Rana arborícola neón",
    nombreCientifico: "Agalychnis callidryas",
    tipo: "animal",
    imagenUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Red-eyed_Tree_Frog_(Agalychnis_callidryas)_3.jpg?width=900",
    descripcion: "Sus llamativos ojos rojos funcionan como mecanismo de \"sobresalto\" para confundir a los depredadores. Es una especie nocturna que habita en el dosel de los bosques nubosos de Centroamérica, donde pasa el día camuflada entre las hojas.",
  },
  {
    id: "crassula-ovata",
    nombreComun: "Suculenta de jade",
    nombreCientifico: "Crassula ovata",
    tipo: "planta",
    imagenUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/A_40_year_old_jade_plant_(Crassula_ovata).jpg?width=900",
    descripcion: "Conocida como \"planta del dinero\", la suculenta de jade almacena agua en sus hojas carnosas, lo que le permite sobrevivir largos periodos de sequía. Es una de las suculentas más longevas y resistentes que existen como planta de interior.",
  },
  {
    id: "amorphophallus-titanum",
    nombreComun: "Titán Arum",
    nombreCientifico: "Amorphophallus titanum",
    tipo: "planta",
    imagenUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Corpse_Flower_(Amorphophallus_Titanum)_4_of_5.jpg?width=900",
    descripcion: "Considerada la inflorescencia no ramificada más grande del mundo, el Titán Arum emite un intenso olor a carne en descomposición para atraer a escarabajos y moscas carroñeras, sus principales polinizadores. Florece solo cada varios años.",
  },
];

(async () => {
  const batch = db.batch();
  especies.forEach(e => batch.set(db.collection("especies").doc(e.id), e));
  await batch.commit();
  console.log(`Sembradas ${especies.length} especies de referencia.`);
})();
