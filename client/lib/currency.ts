/**
 * Utilidades de formato de moneda.
 * @module lib/currency
 */

/**
 * Formatea un monto numérico a una cadena de moneda en USD usando la
 * localización de Perú (es-PE).
 *
 * @param amount - Monto numérico a formatear.
 * @returns Cadena con el monto formateado como moneda.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}
