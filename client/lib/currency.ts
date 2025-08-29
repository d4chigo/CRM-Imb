/**
 * Utilidades de formato de moneda.
 * @module lib/currency
 */

/**
 * Formatea un monto numérico a una cadena de moneda en SOL (Soles Peruanos) usando la
 * localización de Perú (es-PE).
 *
 * @param amount - Monto numérico a formatear.
 * @returns Cadena con el monto formateado como moneda peruana (SOL).
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN", // Cambiado de USD a PEN (Nuevo Sol Peruano)
  }).format(amount)
}
