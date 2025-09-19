"use client"

import React, { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { Phone, Mail, DollarSign, Calendar, User, Search, Plus, Trash2, Settings2, ChevronLeft, ChevronRight, TrendingUp, Target, BarChart3 } from "lucide-react"
// Ahora el estado se obtiene del PipelineContext global
import { calculateColumnTotal, canonicalStageOrder } from "@/hooks/use-pipeline-dnd"
import { usePipeline } from '@/contexts/PipelineContext'
import { fetchStages, createStage, deleteStage, updateStage } from "@/lib/pipelineStages"
import { formatCurrency } from "@/lib/currency"
import { EmailDialog } from "@/components/forms/EmailDialog"
import { CallDialog } from "@/components/forms/CallDialog"
import { useToast } from "@/hooks/use-toast"
import { createOpportunity, listOpportunities, updateOpportunity, deleteOpportunity } from "@/lib/opportunities" // añadimos updateOpportunity para persistir movimientos

/**
 * Componente de tablero de pipeline de ventas.
 *
 * Renderiza las columnas con sus oportunidades y permite arrastrar y soltar
 * entre etapas. Incluye barra de búsqueda y totales por columna.
 */

export function PipelineBoard() {
  const { columns, addOpportunity, addColumn, removeColumn, updateColumn, reorderColumns, setColumns, removeOpportunityLocal } = usePipeline() as any
  const [searchTerm, setSearchTerm] = React.useState("")
  const scrollRef = React.useRef<HTMLDivElement | null>(null)
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(false)
  // Filtrado local (equivalente al hook anterior)
  const filteredColumns = React.useMemo(() => {
    if (!searchTerm) return columns
    return columns.map((c:any) => ({ ...c, opportunities: c.opportunities.filter((o:any) => o.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || o.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) || o.agent.toLowerCase().includes(searchTerm.toLowerCase())) }))
  }, [columns, searchTerm])
  const { toast } = useToast()

  // Estado de diálogos
  const [openEmail, setOpenEmail] = React.useState(false)
  const [openCall, setOpenCall] = React.useState(false)
  const [manageOpen, setManageOpen] = React.useState(false)
  const [emailDefaults, setEmailDefaults] = React.useState<{ to?: string; subject?: string; body?: string }>({})
  const [callDefaults, setCallDefaults] = React.useState<{ phone?: string; outcome?: any; notes?: string }>({})

  // Formulario de nueva etapa
  const [stageTitle, setStageTitle] = React.useState("")
  const [stageColor, setStageColor] = React.useState("#6366F1")

  function resetStageForm() {
    setStageTitle("")
    setStageColor("#6366F1")
  }

  // Hidratación eliminada: ahora la hace PipelineProvider global
  // Esto evita que se sobrescriba el estado cuando se añaden oportunidades desde Contactos.

  async function handleAddStage(e: React.FormEvent) {
    e.preventDefault()
    if (!stageTitle.trim()) {
      toast({ title: "Datos incompletos", description: "Título es requerido", variant: "destructive" })
      return
    }
    try {
  const created = await createStage({ title: stageTitle.trim(), color: stageColor })
      addColumn({ id: created.id, title: created.title, color: created.color })
      toast({ title: "Etapa agregada", description: `${stageTitle}` })
      resetStageForm()
    } catch (err: any) {
      toast({ title: "Error", description: err.message || 'No se pudo crear', variant: 'destructive' })
    }
  }

  async function handleRemoveStage(id: string, title: string) {
  const col = columns.find((c: any) => c.id === id)
    if (!col) return
    if (col.opportunities.length > 0) {
      const proceed = window.confirm(`La etapa "${title}" contiene ${col.opportunities.length} oportunidades. ¿Eliminar igualmente? Esta acción no elimina oportunidades, solo las dejará huérfanas hasta que agreguemos re-asignación.`)
      if (!proceed) return
    }
    try {
      await deleteStage(id)
      const ok = removeColumn(id, { force: true })
      toast({ title: ok ? 'Etapa eliminada' : 'Etapa eliminada en servidor', description: title })
    } catch (err: any) {
      toast({ title: 'Error eliminando', description: err.message || 'No se pudo eliminar', variant: 'destructive' })
    }
  }

  async function handleUpdateStage(id: string, patch: { title?: string; color?: string }) {
    try {
      const updated = await updateStage(id, patch)
      updateColumn(id, { title: updated.title, color: updated.color })
      toast({ title: 'Etapa actualizada', description: updated.title })
    } catch (e:any) {
      toast({ title: 'Error actualizando', description: e.message || 'No se pudo actualizar', variant: 'destructive' })
    }
  }

  function moveStage(id: string, dir: -1 | 1) {
  const idx = columns.findIndex((c: any) => c.id === id)
    if (idx < 0) return
    const target = idx + dir
    if (target < 0 || target >= columns.length) return
    const newOrder = [...columns]
    const [item] = newOrder.splice(idx,1)
    newOrder.splice(target,0,item)
    reorderColumns(newOrder.map(c=>c.id))
  }

  function handleSendEmail(values: import("@/components/forms/EmailDialog").EmailFormValues) {
    // Aquí podrías integrar tu API de email
    toast({ title: "Email enviado", description: `Para: ${values.to}` })
  }

  function handleSaveCall(values: import("@/components/forms/CallDialog").CallFormValues) {
    // Aquí podrías integrar tu API/registro de llamadas
    toast({ title: "Llamada registrada", description: `${values.outcome}` })
  }



  // Control de navegación horizontal (flechas habilitadas/deshabilitadas)
  const checkScrollButtons = React.useCallback(() => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1)
  }, [])

  // Calcula el paso de scroll como el ancho de una columna + gap
  const getScrollStep = React.useCallback(() => {
    const el = scrollRef.current
    if (!el) return 320
    const columnsWrapper = el.querySelector('.pipeline-columns') as HTMLElement | null
    const firstColumn = columnsWrapper?.children?.[0] as HTMLElement | null
    if (!columnsWrapper || !firstColumn) return 320
    const rect = firstColumn.getBoundingClientRect()
    const style = window.getComputedStyle(columnsWrapper)
    // Intentar leer gap; fallback a 16px si no se puede parsear
    const gapStr = (style as any).gap || (style as any).columnGap || '16px'
    const gap = typeof gapStr === 'string' && gapStr.endsWith('px') ? parseFloat(gapStr) : 16
    const step = Math.max(240, Math.round(rect.width + gap))
    return step
  }, [])

  const scrollByAmount = (delta: number) => {
    if (!scrollRef.current) return
    const step = getScrollStep()
    const signed = delta < 0 ? -step : step
    scrollRef.current.scrollBy({ left: signed, behavior: 'smooth' })
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScrollButtons()

    // Wheel horizontal (convertir vertical a horizontal)
    const onWheel = (ev: WheelEvent) => {
      // Si el usuario hace scroll vertical, lo convertimos a horizontal
      if (Math.abs(ev.deltaY) > Math.abs(ev.deltaX)) {
        ev.preventDefault()
        el.scrollLeft += ev.deltaY
        checkScrollButtons()
      }
    }

    // Drag to scroll
    let isDown = false
    let startX = 0
    let startLeft = 0
    const onPointerDown = (e: PointerEvent) => {
      // Evitar conflicto con DnD en tarjetas: solo activar si se pulsa en el rail vacío
      if ((e.target as HTMLElement).closest('[data-rbd-draggable-context-id]')) return
      isDown = true
      startX = e.clientX
      startLeft = el.scrollLeft
      el.setPointerCapture(e.pointerId)
      el.style.cursor = 'grabbing'
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!isDown) return
      const dist = e.clientX - startX
      el.scrollLeft = startLeft - dist
      checkScrollButtons()
    }
    const onPointerUp = (e: PointerEvent) => {
      if (!isDown) return
      isDown = false
      el.releasePointerCapture(e.pointerId)
      el.style.cursor = ''
    }

    el.addEventListener('scroll', checkScrollButtons)
    window.addEventListener('resize', checkScrollButtons)
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)

    return () => {
      el.removeEventListener('scroll', checkScrollButtons)
      window.removeEventListener('resize', checkScrollButtons)
      el.removeEventListener('wheel', onWheel as any)
      el.removeEventListener('pointerdown', onPointerDown as any)
      el.removeEventListener('pointermove', onPointerMove as any)
      el.removeEventListener('pointerup', onPointerUp as any)
    }
  }, [checkScrollButtons, filteredColumns.length, getScrollStep])

  return (
    <div className="pipeline-container space-y-1 sm:space-y-2 w-full p-1">
      {/* Header principal con título */}
      <div className="pipeline-header flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gradient-to-r from-gray-50 to-white rounded border border-gray-200">
        <div className="min-w-0">
          <h2 className="pipeline-title text-gray-900 truncate">Pipeline de Ventas</h2>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <Dialog open={manageOpen} onOpenChange={setManageOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1 text-xs h-6 sm:h-7 px-2">
                <Settings2 className="h-3 w-3" /> 
                <span className="hidden sm:inline">Etapas</span>
                <span className="sm:hidden">E</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold text-gray-900">Gestionar Etapas del Pipeline</DialogTitle>
                <DialogDescription className="text-gray-600">
                  Configura las etapas de tu proceso de ventas. Puedes añadir, editar, reordenar y eliminar etapas.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-8">
                {/* Formulario de nueva etapa mejorado */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Agregar Nueva Etapa</h4>
                  <form onSubmit={handleAddStage} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Título de la Etapa</label>
                        <Input 
                          value={stageTitle} 
                          onChange={(e) => setStageTitle(e.target.value)} 
                          placeholder="ej. Negociación, Propuesta..." 
                          className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Color de la Etapa</label>
                        <div className="flex items-center gap-3">
                          <Input 
                            type="color" 
                            className="w-16 h-10 p-1 cursor-pointer rounded border border-gray-300" 
                            value={stageColor} 
                            onChange={(e) => setStageColor(e.target.value)} 
                          />
                          <span className="text-xs text-gray-500 font-mono">{stageColor}</span>
                        </div>
                      </div>
                    </div>
                    <Button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                      <Plus className="h-4 w-4" /> 
                      Agregar Etapa
                    </Button>
                  </form>
                </div>

                {/* Lista de etapas actuales mejorada */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">Etapas Actuales</h4>
                  <div className="space-y-3">
                    {columns.map((c: any, index: number) => (
                      <div key={c.id} className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 flex-1">
                          <div 
                            className="w-6 h-6 rounded-full shadow-sm border-2 border-white" 
                            style={{ backgroundColor: c.color }}
                          />
                          <input
                            className="bg-transparent border-b border-dashed border-gray-300 focus:outline-none focus:border-blue-500 text-sm font-medium text-gray-900 flex-1"
                            defaultValue={c.title}
                            onBlur={(e) => e.target.value !== c.title && handleUpdateStage(c.id, { title: e.target.value })}
                          />
                          <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700">
                            {c.opportunities.length} oportunidad{c.opportunities.length !== 1 ? 'es' : ''}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="color" 
                            value={c.color} 
                            className="w-8 h-8 cursor-pointer rounded border border-gray-300" 
                            onChange={(e) => handleUpdateStage(c.id, { color: e.target.value })} 
                          />
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 w-8 p-0" 
                            onClick={() => moveStage(c.id, -1)} 
                            disabled={index === 0}
                            title="Mover arriba"
                          >
                            ↑
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 w-8 p-0" 
                            onClick={() => moveStage(c.id, 1)} 
                            disabled={index === columns.length - 1}
                            title="Mover abajo"
                          >
                            ↓
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-200" 
                            onClick={() => handleRemoveStage(c.id, c.title)}
                            title="Eliminar etapa"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {columns.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Settings2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">No hay etapas configuradas</p>
                        <p className="text-xs text-gray-400">Agrega tu primera etapa arriba</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Métricas del Pipeline - Completamente responsive */}
      <div className="pipeline-metrics flex text-xs scrollbar-hide">
        <div className="pipeline-metric bg-blue-50 border border-blue-200 rounded flex items-center gap-0.5 sm:gap-1 min-w-0 flex-shrink-0">
          <Target className="pipeline-icon-xs text-blue-700" />
          <span className="text-blue-700 font-medium">{columns.reduce((total: number, col: any) => total + col.opportunities.length, 0)}</span>
        </div>
        <div className="pipeline-metric bg-green-50 border border-green-200 rounded flex items-center gap-0.5 sm:gap-1 min-w-0 flex-shrink-0">
          <DollarSign className="pipeline-icon-xs text-green-700" />
          <span className="text-green-700 font-medium">
            {formatCurrency(columns.reduce((total: number, col: any) => total + calculateColumnTotal(col.opportunities), 0))
              .replace('.00', '')
              .replace('$', '')
              .substring(0, 6)}k
          </span>
        </div>
        <div className="pipeline-metric bg-purple-50 border border-purple-200 rounded flex items-center gap-0.5 sm:gap-1 min-w-0 flex-shrink-0">
          <BarChart3 className="pipeline-icon-xs text-purple-700" />
          <span className="text-purple-700 font-medium">
            {formatCurrency(
              columns.reduce((total: number, col: any) => total + col.opportunities.length, 0) > 0
                ? columns.reduce((total: number, col: any) => total + calculateColumnTotal(col.opportunities), 0) / 
                  columns.reduce((total: number, col: any) => total + col.opportunities.length, 0)
                : 0
            ).replace('.00', '').replace('$', '').substring(0, 4)}k
          </span>
        </div>
        <div className="pipeline-metric bg-orange-50 border border-orange-200 rounded flex items-center gap-0.5 sm:gap-1 min-w-0 flex-shrink-0">
          <TrendingUp className="pipeline-icon-xs text-orange-700" />
          <span className="text-orange-700 font-medium">
            {columns.length > 0 && columns[columns.length - 1]?.opportunities.length > 0
              ? Math.round((columns[columns.length - 1].opportunities.length / 
                  columns.reduce((total: number, col: any) => total + col.opportunities.length, 0)) * 100)
              : 0}%
          </span>
        </div>
      </div>

      {/* Barra de búsqueda ultra compacta */}
      <div className="pipeline-search flex items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-1.5 sm:left-2 top-1/2 transform -translate-y-1/2 pipeline-icon-xs text-gray-400" />
          <Input 
            placeholder="Buscar..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="pipeline-search-input border-gray-300 min-w-0" 
          />
        </div>
        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="pipeline-nav-button"
            onClick={() => scrollByAmount(-1)}
            disabled={!canScrollLeft}
          >
            <ChevronLeft className="pipeline-icon-xs" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="pipeline-nav-button"
            onClick={() => scrollByAmount(1)}
            disabled={!canScrollRight}
          >
            <ChevronRight className="pipeline-icon-xs" />
          </Button>
        </div>
      </div>

  <DragDropContext onDragEnd={async (result) => {
        const { destination, source, draggableId } = result
        const from = source?.droppableId
        const to = destination?.droppableId
        if (!destination || !from || !to) return
        if (from === to && source.index === destination.index) return
        // Reordenar en la misma columna
        setColumns((prev:any) => {
          const draft = [...prev]
          const srcCol = draft.find(c => c.id === from)
          const dstCol = draft.find(c => c.id === to)
          if (!srcCol || !dstCol) return prev
          if (srcCol === dstCol) {
            const list = [...srcCol.opportunities]
            const [item] = list.splice(source.index,1)
            if (!item) return prev
            list.splice(destination.index,0,item)
            return draft.map(c => c.id === srcCol.id ? { ...c, opportunities: list } : c)
          } else {
            const srcList = [...srcCol.opportunities]
            const [item] = srcList.splice(source.index,1)
            if (!item) return prev
            const dstList = [...dstCol.opportunities]
            dstList.splice(destination.index,0,item)
            return draft.map(c => {
              if (c.id === srcCol.id) return { ...c, opportunities: srcList }
              if (c.id === dstCol.id) return { ...c, opportunities: dstList }
              return c
            })
          }
        })
        // Persistencia etapa
        if (from !== to) {
          const numericId = Number(draggableId)
          if (!Number.isNaN(numericId)) {
            try { await updateOpportunity(numericId, { etapaId: to }) }
            catch(e:any){ toast({ title:'No se pudo guardar movimiento', description: e.message || 'Error persistiendo etapa', variant:'destructive' }) }
          }
        }
      }}>
        {/* Viewport mejorado con mejor diseño responsive */}
        <div
          ref={scrollRef}
          className="pipeline-viewport scrollbar-hide"
        >
          <div className="pipeline-columns">
            {filteredColumns.map((column: any) => (
              <div key={column.id} className="pipeline-column">
                <Card className="shadow-md border-0 hover:shadow-lg transition-all duration-300 bg-white/90 backdrop-blur-sm h-full">
                  <CardHeader 
                    className="pipeline-card-header rounded-t-lg relative overflow-hidden" 
                    style={{ 
                      background: `linear-gradient(135deg, ${column.color}15 0%, ${column.color}08 100%)`,
                      borderBottom: `2px solid ${column.color}20`
                    }}
                  >
                    {/* Efecto de brillo sutil */}
                    <div 
                      className="absolute inset-0 opacity-30"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, ${column.color}20 0%, transparent 60%)`
                      }}
                    />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-1 sm:mb-2">
                        <CardTitle className="pipeline-card-title flex items-center space-x-1">
                          <div 
                            className="w-2 h-2 sm:w-3 sm:h-3 rounded-full shadow-md border border-white" 
                            style={{ backgroundColor: column.color }} 
                          />
                          <span className="text-gray-800 truncate">{column.title}</span>
                        </CardTitle>
                        <Badge
                          variant="secondary"
                          className="pipeline-card-badge font-bold shadow-sm"
                          style={{ 
                            backgroundColor: column.color, 
                            color: "white",
                            boxShadow: `0 2px 4px ${column.color}40`
                          }}
                        >
                          {column.opportunities.length}
                        </Badge>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="pipeline-opportunity-value text-gray-800">
                          <span className="text-green-600">{formatCurrency(calculateColumnTotal(column.opportunities))}</span>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="pipeline-search-button font-medium hover:bg-white/60 transition-colors border border-white/20" 
                          style={{ color: column.color }}
                          onClick={async ()=>{
                            const nombre = prompt(`Nombre del nuevo contacto / oportunidad para etapa ${column.title}`)
                            if(!nombre) return
                            try {
                              const opp = await createOpportunity({ servicioId:1, etapaId: column.id, nombreCliente: nombre, valorUsd:0, probabilidad:0 })
                              addOpportunity(column.id, { id: String(opp.id), clientName: opp.nombreCliente, serviceName: 'Servicio', agent: 'Sin asignar', value: opp.valorUsd || 0, probability: opp.probabilidad || 0, closeDate: opp.fechaCierre || new Date().toISOString().slice(0,10), phone:'', email:'' })
                            } catch(e:any){ toast({ title:'Error', description:e.message, variant:'destructive' }) }
                          }}
                        >
                          <Plus className="pipeline-icon-xxs mr-0.5 sm:mr-1" />
                          <span className="hidden sm:inline">Agregar</span>
                          <span className="sm:hidden">+</span>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pipeline-card-content pt-0 pb-1 sm:pb-2">
                    <Droppable droppableId={column.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`pipeline-opportunities-list space-y-1 sm:space-y-2 rounded-lg transition-all duration-300 ${
                            snapshot.isDraggingOver
                              ? `bg-gradient-to-br from-${column.color}/10 to-${column.color}/5 border-2 border-dashed scale-[1.02] shadow-inner`
                              : "bg-gray-50/40 hover:bg-gray-50/60"
                          }`}
                          style={{
                            borderColor: snapshot.isDraggingOver ? column.color : 'transparent',
                            transform: snapshot.isDraggingOver ? 'scale(1.02)' : 'scale(1)',
                          }}
                        >
                          {column.opportunities.map((opportunity: any, index: number) => (
                            <Draggable key={opportunity.id} draggableId={opportunity.id} index={index}>
                              {(provided, snapshot) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`cursor-grab active:cursor-grabbing transition-all duration-300 border-0 ${
                                    snapshot.isDragging
                                      ? "shadow-2xl rotate-2 scale-105 z-50"
                                      : "hover:shadow-md hover:-translate-y-1 shadow-sm"
                                  }`}
                                  style={{
                                    ...provided.draggableProps.style,
                                    background: snapshot.isDragging 
                                      ? `linear-gradient(135deg, white 0%, ${column.color}05 100%)` 
                                      : 'white',
                                    borderLeft: snapshot.isDragging ? `4px solid ${column.color}` : '4px solid transparent',
                                    transform: `${provided.draggableProps.style?.transform || ''} ${
                                      snapshot.isDragging ? 'rotate(2deg) scale(1.05)' : ''
                                    }`,
                                  }}
                                >
                                  <CardContent className="pipeline-opportunity-item space-y-1">
                                    {/* Header de la tarjeta - Más compacto */}
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1 min-w-0">
                                        <h4 className="pipeline-opportunity-title text-gray-900 truncate mb-1">
                                          {opportunity.clientName}
                                        </h4>
                                        <p className="pipeline-opportunity-service text-gray-600 line-clamp-1 sm:line-clamp-2 leading-relaxed">
                                          {opportunity.serviceName}
                                        </p>
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className="pipeline-card-badge font-bold ml-2 flex-shrink-0"
                                        style={{
                                          borderColor: column.color,
                                          color: column.color,
                                          backgroundColor: `${column.color}10`,
                                          boxShadow: `0 1px 3px ${column.color}20`
                                        }}
                                      >
                                        {opportunity.probability}%
                                      </Badge>
                                    </div>

                                    {/* Información financiera destacada - Más compacta */}
                                    <div className="space-y-1">
                                      <div 
                                        className="flex items-center space-x-1 sm:space-x-2 pipeline-card-content rounded-lg"
                                        style={{ backgroundColor: `${column.color}08` }}
                                      >
                                        <div 
                                          className="p-0.5 sm:p-1 rounded-lg shadow-sm"
                                          style={{ backgroundColor: column.color }}
                                        >
                                          <DollarSign className="pipeline-icon-xxs text-white" />
                                        </div>
                                        <span className="pipeline-opportunity-value text-gray-900 truncate">
                                          {formatCurrency(opportunity.value)}
                                        </span>
                                      </div>

                                      <div className="pipeline-opportunity-meta flex justify-between text-gray-600">
                                        <div className="flex items-center space-x-0.5 sm:space-x-1">
                                          <Calendar className="pipeline-icon-xxs text-gray-400" />
                                          <span className="truncate">{opportunity.closeDate}</span>
                                        </div>
                                        <div className="flex items-center space-x-0.5 sm:space-x-1">
                                          <User className="pipeline-icon-xxs text-gray-400" />
                                          <span className="truncate">{opportunity.agent}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Acciones de la tarjeta - Más compactas */}
                                    <div className="flex items-center justify-between pt-1 sm:pt-1.5 border-t border-gray-100">
                                      <div className="pipeline-opportunity-actions flex items-center">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="pipeline-opportunity-action-button hover:bg-blue-50 transition-colors"
                                          onClick={() => {
                                            setCallDefaults({ phone: opportunity.phone })
                                            setOpenCall(true)
                                          }}
                                          title="Llamar"
                                        >
                                          <Phone className="pipeline-icon-xxs text-blue-600" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="pipeline-opportunity-action-button hover:bg-green-50 transition-colors"
                                          onClick={() => {
                                            setEmailDefaults({ to: opportunity.email })
                                            setOpenEmail(true)
                                          }}
                                          title="Enviar email"
                                        >
                                          <Mail className="pipeline-icon-xxs text-green-600" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="pipeline-opportunity-action-button hover:bg-red-50 transition-colors"
                                          onClick={async () => {
                                            const confirmed = window.confirm('¿Eliminar esta oportunidad? Esta acción no se puede deshacer.')
                                            if (!confirmed) return
                                            const numId = Number(opportunity.id)
                                            try {
                                              if (!Number.isNaN(numId)) {
                                                await deleteOpportunity(numId)
                                              }
                                              removeOpportunityLocal(String(opportunity.id))
                                              toast({ title: 'Oportunidad eliminada', description: opportunity.clientName })
                                            } catch (e:any) {
                                              toast({ title: 'Error eliminando', description: e.message || 'No se pudo eliminar', variant: 'destructive' })
                                            }
                                          }}
                                          title="Eliminar"
                                        >
                                          <Trash2 className="pipeline-icon-xxs text-red-500" />
                                        </Button>
                                      </div>
                                      <Avatar className="pipeline-opportunity-avatar shadow-sm border border-white">
                                        <AvatarFallback
                                          className="font-bold"
                                          style={{ 
                                            backgroundColor: `${column.color}15`, 
                                            color: column.color,
                                            border: `1px solid ${column.color}30`,
                                            fontSize: 'clamp(0.5rem, 1vw, 0.625rem)'
                                          }}
                                        >
                                          {opportunity.agent
                                            .split(" ")
                                            .map((n: string) => n[0])
                                            .join("")}
                                        </AvatarFallback>
                                      </Avatar>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          
                          {/* Estado vacío mejorado */}
                          {column.opportunities.length === 0 && (
                            <div className="text-center py-2 sm:py-3 text-gray-400">
                              <div 
                                className="pipeline-opportunity-avatar mx-auto mb-1 sm:mb-2 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: `${column.color}10` }}
                              >
                                <Plus className="pipeline-icon-xs" style={{ color: column.color }} />
                              </div>
                              <p className="pipeline-opportunity-meta font-medium">Sin oportunidades</p>
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </DragDropContext>

      {/* Diálogos */}
      <EmailDialog open={openEmail} onOpenChange={setOpenEmail} defaults={emailDefaults} onSubmit={handleSendEmail} />
      <CallDialog open={openCall} onOpenChange={setOpenCall} defaults={callDefaults} onSubmit={handleSaveCall} />
    </div>
  )
}
