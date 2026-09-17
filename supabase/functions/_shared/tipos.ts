export interface IdentificacionEspecie {
  nombreComun: string;
  nombreCientifico: string;
  confianza: number;
  tipo: "planta" | "animal";
}
