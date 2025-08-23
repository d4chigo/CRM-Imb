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

  return {
    columns,
    setColumns,
    searchTerm,
    setSearchTerm,
    filteredColumns,
    onDragEnd,
    addOpportunity,
  }
}
