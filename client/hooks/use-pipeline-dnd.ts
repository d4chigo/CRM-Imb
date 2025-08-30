/**
 * Hook para manejar el estado y la lógica de DnD del pipeline de ventas.
 * Incluye búsqueda, reordenamiento y movimiento entre columnas.
 * @module hooks/use-pipeline-dnd
 */

import { useMemo, useState } from "react"
import type { Column, Opportunity } from "@/types/pipeline"
import { initialColumns } from "@/data/pipeline"
import type { DropResult } from "@hello-pangea/dnd"

/**
 * Calcula el total de una lista de oportunidades.
 *
 * @param opportunities - Arreglo de oportunidades.
 * @returns Suma de los valores de todas las oportunidades.
 */
export function calculateColumnTotal(opportunities: Opportunity[]): number {
  return opportunities.reduce((total, opportunity) => total + opportunity.value, 0)
}

/**
 * Provee el estado del tablero de pipeline y manejadores para DnD y búsqueda.
 *
 * @returns Objeto con columnas, términos de búsqueda y funciones de actualización.
 */
export function usePipelineDnd() {
  const [columns, setColumns] = useState<Column[]>(initialColumns)
  const [searchTerm, setSearchTerm] = useState("")

  /**
   * Filtra oportunidades por cliente, servicio o agente acorde al término de búsqueda.
   */
  const filteredColumns = useMemo<Column[]>(() => {
    if (!searchTerm) return columns
    return columns.map((column) => ({
      ...column,
      opportunities: column.opportunities.filter(
        (opportunity) =>
          opportunity.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          opportunity.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          opportunity.agent.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    }))
  }, [columns, searchTerm])

  /**
   * Manejador principal de drag and drop para reordenar/mover oportunidades.
   *
   * @param result - Resultado del evento de DnD provisto por @hello-pangea/dnd.
   */
  function onDragEnd(result: DropResult): void {
    const { destination, source } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const sourceColumn = columns.find((col) => col.id === source.droppableId)
    const destColumn = columns.find((col) => col.id === destination.droppableId)
    if (!sourceColumn || !destColumn) return

    if (sourceColumn === destColumn) {
      const newOpportunities = Array.from(sourceColumn.opportunities)
      const [removed] = newOpportunities.splice(source.index, 1)
      newOpportunities.splice(destination.index, 0, removed)

      const newColumn: Column = { ...sourceColumn, opportunities: newOpportunities }
      setColumns(columns.map((col) => (col.id === newColumn.id ? newColumn : col)))
    } else {
      const sourceOpportunities = Array.from(sourceColumn.opportunities)
      const destOpportunities = Array.from(destColumn.opportunities)
      const [removed] = sourceOpportunities.splice(source.index, 1)
      destOpportunities.splice(destination.index, 0, removed)

      const newSourceColumn: Column = { ...sourceColumn, opportunities: sourceOpportunities }
      const newDestColumn: Column = { ...destColumn, opportunities: destOpportunities }

      setColumns(
        columns.map((col) => {
          if (col.id === newSourceColumn.id) return newSourceColumn
          if (col.id === newDestColumn.id) return newDestColumn
          return col
        }),
      )
    }
  }

  /**
   * Agrega una nueva oportunidad a la columna indicada.
   * Si no se provee `id`, se genera uno automáticamente.
   *
   * @param columnId - ID de la columna/etapa destino.
   * @param opportunity - Datos de la oportunidad a agregar.
   */
  function addOpportunity(columnId: string, opportunity: Omit<Opportunity, "id"> & Partial<Pick<Opportunity, "id">>) {
    const id = opportunity.id ?? `${Date.now()}`
    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId
          ? { ...col, opportunities: [{ id, ...opportunity } as Opportunity, ...col.opportunities] }
          : col,
      ),
    )
  }

  /**
   * Añadir una nueva etapa/columna al pipeline.
   * Evita duplicados por id.
   */
  function addColumn(column: { id: string; title: string; color: string }) {
    setColumns((prev) => {
      if (prev.some((c) => c.id === column.id)) return prev
      return [...prev, { ...column, opportunities: [] }]
    })
  }

  /**
   * Eliminar una etapa/columna por id.
   * No elimina si contiene oportunidades (forzar requiere paso adicional UI).
   */
  function removeColumn(id: string, opts?: { force?: boolean }): boolean {
    let removed = false
    setColumns((prev) => {
      const col = prev.find((c) => c.id === id)
      if (!col) return prev
      if (col.opportunities.length > 0 && !opts?.force) return prev // proteger datos
      removed = true
      return prev.filter((c) => c.id !== id)
    })
    return removed
  }

  function updateColumn(id: string, data: Partial<Pick<Column,'title'|'color'>>) {
    setColumns(prev => prev.map(c => c.id === id ? { ...c, ...data } : c))
  }

  function reorderColumns(newOrder: string[]) {
    setColumns(prev => {
      const map = new Map(prev.map(c => [c.id, c]))
      return newOrder.map(id => map.get(id)!).filter(Boolean)
    })
  }

  return { columns, setColumns, searchTerm, setSearchTerm, filteredColumns, onDragEnd, addOpportunity, addColumn, removeColumn, updateColumn, reorderColumns }
}
