-- Datos de referencia opcionales. La app funciona sin ellos (cae a los datos
-- crudos que devuelve la IA), pero mejoran la experiencia.
-- Reemplaza backend/functions/seed/seedEspecies.js y seedTienda.js.
-- Se reaplica automáticamente con `supabase db reset` y con `supabase db push`.

insert into public.especies (id, nombre_comun, nombre_cientifico, tipo, imagen_url, descripcion) values
('nephrolepis-exaltata', 'Helecho Tropical', 'Nephrolepis exaltata', 'planta', 'https://commons.wikimedia.org/wiki/Special:FilePath/Boston_Fern_(Nephrolepis_exaltata).jpg?width=900', 'El helecho tropical es un fósil viviente con más de 300 millones de años de existencia en la Tierra, apareciendo mucho antes que los dinosaurios. Al pertenecer al grupo de las pteridofitas, destaca en el reino vegetal por ser una planta vascular que no produce flores, frutos ni semillas para su reproducción.'),
('danaus-plexippus', 'Mariposa Monarca', 'Danaus plexippus', 'animal', 'https://commons.wikimedia.org/wiki/Special:FilePath/Monarch_Butterfly_Pink_Zinnia_1800px.jpg?width=900', 'La mariposa monarca es conocida por su increíble migración desde América del Norte hasta los bosques de oyamel de México. Su ciclo de vida es un ejemplo fascinante de adaptación y supervivencia.'),
('morpho-menelaus', 'Morpho azul', 'Morpho menelaus', 'animal', 'https://commons.wikimedia.org/wiki/Special:FilePath/Blue_Morpho_butterfly_(Morpho_peleides)_wings_open.jpg?width=900', 'El azul iridiscente de sus alas no proviene de un pigmento, sino de la estructura microscópica de sus escamas, que refractan la luz. Su vuelo errático e impredecible es una estrategia de defensa frente a los depredadores.'),
('agalychnis-callidryas', 'Rana arborícola neón', 'Agalychnis callidryas', 'animal', 'https://commons.wikimedia.org/wiki/Special:FilePath/Red-eyed_Tree_Frog_(Agalychnis_callidryas)_3.jpg?width=900', 'Sus llamativos ojos rojos funcionan como mecanismo de "sobresalto" para confundir a los depredadores. Es una especie nocturna que habita en el dosel de los bosques nubosos de Centroamérica, donde pasa el día camuflada entre las hojas.'),
('crassula-ovata', 'Suculenta de jade', 'Crassula ovata', 'planta', 'https://commons.wikimedia.org/wiki/Special:FilePath/A_40_year_old_jade_plant_(Crassula_ovata).jpg?width=900', 'Conocida como "planta del dinero", la suculenta de jade almacena agua en sus hojas carnosas, lo que le permite sobrevivir largos periodos de sequía. Es una de las suculentas más longevas y resistentes que existen como planta de interior.'),
('amorphophallus-titanum', 'Titán Arum', 'Amorphophallus titanum', 'planta', 'https://commons.wikimedia.org/wiki/Special:FilePath/Corpse_Flower_(Amorphophallus_Titanum)_4_of_5.jpg?width=900', 'Considerada la inflorescencia no ramificada más grande del mundo, el Titán Arum emite un intenso olor a carne en descomposición para atraer a escarabajos y moscas carroñeras, sus principales polinizadores. Florece solo cada varios años.')
on conflict (id) do update set
  nombre_comun = excluded.nombre_comun,
  nombre_cientifico = excluded.nombre_cientifico,
  tipo = excluded.tipo,
  imagen_url = excluded.imagen_url,
  descripcion = excluded.descripcion;

insert into public.tienda (id, nombre, categoria, precio, emoji, descripcion) values
('sincronizador-neuronal', 'Sincronizador neuronal', 'skin', 1200, '🌱', 'Accesorio digital avanzado que mejora la precisión del escáner.'),
('piel-espectro-bosque', 'Piel espectro del bosque', 'skin', 4500, '🧅', 'Un atuendo digital inspirado en las cebollas silvestres.'),
('nucleo-biolectrico', 'Núcleo biolectrico', 'mejora', 500, '🧑‍🌾', 'Recarga instantánea para las baterías y especies de tu escáner.'),
('socio-co-rbit', 'Socio CO-RBIT', 'companion', 8500, '🥔', 'Una mascota robótica que marca automáticamente las especies cercanas.'),
('enlace-verde', 'Enlace verde', 'accesorio', 2500, '🥬', 'Conéctate con otros escáneres en un radio de 5 km para compartir datos.'),
('escudo-flora-cuantica', 'Escudo de flora cuántica', 'mejora', 800, '🥕', 'Protege las muestras escaneadas de la corrupción digital.')
on conflict (id) do update set
  nombre = excluded.nombre,
  categoria = excluded.categoria,
  precio = excluded.precio,
  emoji = excluded.emoji,
  descripcion = excluded.descripcion;
