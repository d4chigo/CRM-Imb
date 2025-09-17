/**
 * Datos del pipeline de ventas.
 * @module data/pipeline
 */

import type { Column } from "@/types/pipeline"

/**
 * Conjunto de columnas iniciales para el tablero de pipeline.
 * TODO: Estas columnas deben cargarse desde la base de datos
 */
export const initialColumns: Column[] = [
  {
    id: "contacto_inicial",
    title: "Contacto Inicial",
    color: "#94A3B8",
    opportunities: [], // Datos de ejemplo eliminados - cargar desde BD
  },
  {
    id: "calificacion",
    title: "Calificación",
    color: "var(--primary)",
    opportunities: [], // Datos de ejemplo eliminados - cargar desde BD
  },
  {
    id: "presentacion",
    title: "Presentación",
    color: "#F59E0B",
    opportunities: [], // Datos de ejemplo eliminados - cargar desde BD
  },
  {
    id: "negociacion",
    title: "Negociación",
    color: "#EF4444",
    opportunities: [], // Datos de ejemplo eliminados - cargar desde BD
  },
  {
    id: "propuesta",
    title: "Propuesta",
    color: "#8B5CF6",
    opportunities: [], // Datos de ejemplo eliminados - cargar desde BD
  },
  {
    id: "cierre_ganado",
    title: "Cierre Ganado",
    color: "#10B981",
    opportunities: [], // Datos de ejemplo eliminados - cargar desde BD
  },
]
