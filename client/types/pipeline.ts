/**
 * Tipos del pipeline de ventas.
 * @module types/pipeline
 */

/** Representa una oportunidad dentro del pipeline. */
export interface Opportunity {
  /** Identificador único de la oportunidad */
  id: string
  /** Nombre del cliente asociado a la oportunidad */
  clientName: string
  /** Nombre del servicio de interés (p. ej. Compra, Venta, Crédito MiVivienda) */
  serviceName: string
  /** Nombre del agente asignado */
  agent: string
  /** Valor estimado de la oportunidad en USD */
  value: number
  /** Probabilidad de cierre (0-100) */
  probability: number
  /** Fecha estimada de cierre en formato ISO (YYYY-MM-DD) */
  closeDate: string
  /** Teléfono de contacto del cliente */
  phone: string
  /** Correo electrónico del cliente */
  email: string
}

/** Representa una columna/etapa del pipeline. */
export interface Column {
  /** Identificador único de la columna */
  id: string
  /** Título o nombre de la etapa */
  title: string
  /** Color representativo de la etapa (hex) */
  color: string
  /** Listado de oportunidades asignadas a la etapa */
  opportunities: Opportunity[]
}
