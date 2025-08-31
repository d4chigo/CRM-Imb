"use client"

import React, { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { Phone, Mail, DollarSign, Calendar, User, Search, Plus, Trash2, Settings2 } from "lucide-react"
// Ahora el estado se obtiene del PipelineContext global
import { calculateColumnTotal, canonicalStageOrder } from "@/hooks/use-pipeline-dnd"
import { usePipeline } from '@/contexts/PipelineContext'
import { fetchStages, createStage, deleteStage, updateStage } from "@/lib/pipelineStages"
import { formatCurrency } from "@/lib/currency"
import { EmailDialog } from "@/components/forms/EmailDialog"
import { CallDialog } from "@/components/forms/CallDialog"
import { useToast } from "@/hooks/use-toast"
import { createOpportunity, listOpportunities, updateOpportunity } from "@/lib/opportunities" // añadimos updateOpportunity para persistir movimientos

/**
 * Componente de tablero de pipeline de ventas.
 *
 * Renderiza las columnas con sus oportunidades y permite arrastrar y soltar
 * entre etapas. Incluye barra de búsqueda y totales por columna.
 */

export function PipelineBoard() {
  const { columns, addOpportunity, addColumn, removeColumn, updateColumn, reorderColumns, setColumns } = usePipeline() as any
  const [searchTerm, setSearchTerm] = React.useState("")
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
      const created = await createStage({ id: '', title: stageTitle.trim(), color: stageColor })
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "#303030" }}>
            Pipeline de Ventas
          </h2>
          <p className="text-gray-600">Arrastra las oportunidades entre las etapas</p>
        </div>
        <div className="flex items-center gap-2">
            <Dialog open={manageOpen} onOpenChange={setManageOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" /> Gestionar Etapas
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Gestionar Etapas del Pipeline</DialogTitle>
                  <DialogDescription>Añade nuevas etapas o elimina las vacías. (Pendiente: persistir en BD)</DialogDescription>
                </DialogHeader>
                <div className="grid gap-6">
                  <form onSubmit={handleAddStage} className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-3">
                        <label className="text-xs font-medium text-gray-600">Título</label>
                        <Input value={stageTitle} onChange={(e) => setStageTitle(e.target.value)} placeholder="Título visible" />
                      </div>
                      <div className="col-span-3">
                        <label className="text-xs font-medium text-gray-600">Color</label>
                        <div className="flex items-center gap-2">
                          <Input type="color" className="w-16 p-1 cursor-pointer" value={stageColor} onChange={(e) => setStageColor(e.target.value)} />
                          <div className="text-xs text-gray-500">{stageColor}</div>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="flex items-center gap-2" style={{ backgroundColor: "#FCBA00" }}>
                        <Plus className="h-4 w-4" /> Agregar
                      </Button>
                    </DialogFooter>
                  </form>
                  <div>
                    <h4 className="text-sm font-semibold mb-2" style={{ color: "#303030" }}>Etapas actuales</h4>
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {columns.map((c: any, index: number) => (
                        <div key={c.id} className="flex flex-col gap-1 rounded border bg-white px-3 py-2 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                              <input
                                className="bg-transparent border-b border-dashed focus:outline-none focus:border-gray-400 text-xs"
                                defaultValue={c.title}
                                onBlur={(e)=> e.target.value !== c.title && handleUpdateStage(c.id,{ title: e.target.value })}
                              />
                              <Badge variant="secondary" className="text-[10px]">{c.opportunities.length}</Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              <input type="color" value={c.color} className="w-6 h-6 cursor-pointer" onChange={(e)=> handleUpdateStage(c.id,{ color: e.target.value })} />
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={()=> moveStage(c.id,-1)} disabled={index===0}>↑</Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={()=> moveStage(c.id,1)} disabled={index===columns.length-1}>↓</Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-red-50" onClick={() => handleRemoveStage(c.id, c.title)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {columns.length === 0 && <p className="text-xs text-gray-500">No hay etapas.</p>}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input placeholder="Buscar por cliente, servicio o agente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
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
        <div className="w-full overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {filteredColumns.map((column: any) => (
              <div key={column.id} className="w-80 flex-shrink-0">
                <Card className="h-full shadow-sm border-2 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3" style={{ backgroundColor: `${column.color}10` }}>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold flex items-center space-x-2">
                        <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: column.color }} />
                        <span style={{ color: "#303030" }}>{column.title}</span>
                      </CardTitle>
                      <Badge
                        variant="secondary"
                        className="text-xs font-medium"
                        style={{ backgroundColor: column.color, color: "white" }}
                      >
                        {column.opportunities.length}
                      </Badge>
                    </div>
                    <div className="mt-2 text-xs font-semibold" style={{ color: "#303030" }}>
                      Total: {formatCurrency(calculateColumnTotal(column.opportunities))}
                      <Button size="sm" variant="ghost" className="ml-2 h-6 px-2 text-[10px]" onClick={async ()=>{
                        const nombre = prompt(`Nombre del nuevo contacto / oportunidad para etapa ${column.title}`)
                        if(!nombre) return
                        try {
                          const opp = await createOpportunity({ servicioId:1, etapaId: column.id, nombreCliente: nombre, valorUsd:0, probabilidad:0 })
                          // Usar id real numérico como string para permitir persistencia de DnD
                          addOpportunity(column.id, { id: String(opp.id), clientName: opp.nombreCliente, serviceName: 'Servicio', agent: 'Sin asignar', value: opp.valorUsd || 0, probability: opp.probabilidad || 0, closeDate: opp.fechaCierre || new Date().toISOString().slice(0,10), phone:'', email:'' })
                        } catch(e:any){ toast({ title:'Error', description:e.message, variant:'destructive' }) }
                      }}>+ contacto</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 px-3 pb-3">
                    <Droppable droppableId={column.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`space-y-3 min-h-40 max-h-96 overflow-y-auto p-3 rounded-lg transition-all duration-200 ${
                            snapshot.isDraggingOver
                              ? "bg-gray-100 border-2 border-dashed border-gray-300"
                              : "bg-gray-50/50"
                          }`}
                          style={{
                            scrollbarWidth: "thin",
                            scrollbarColor: `${column.color} transparent`,
                          }}
                        >
                          {column.opportunities.map((opportunity: any, index: number) => (
                            <Draggable key={opportunity.id} draggableId={opportunity.id} index={index}>
                              {(provided, snapshot) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`cursor-grab active:cursor-grabbing transition-all duration-200 border ${
                                    snapshot.isDragging
                                      ? "shadow-xl rotate-2 scale-105 border-2"
                                      : "hover:shadow-lg hover:-translate-y-1 border-gray-200"
                                  }`}
                                  style={{
                                    ...provided.draggableProps.style,
                                    borderColor: snapshot.isDragging ? column.color : undefined,
                                  }}
                                >
                                  <CardContent className="p-4 space-y-3 bg-white">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-sm truncate" style={{ color: "#303030" }}>
                                          {opportunity.clientName}
                                        </h4>
                                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                          {opportunity.serviceName}
                                        </p>
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className="text-xs font-medium ml-2 flex-shrink-0"
                                        style={{
                                          borderColor: column.color,
                                          color: column.color,
                                          backgroundColor: `${column.color}10`,
                                        }}
                                      >
                                        {opportunity.probability}%
                                      </Badge>
                                    </div>

                                    <div className="space-y-2">
                                      <div className="flex items-center space-x-2 text-xs">
                                        <div className="p-1 rounded" style={{ backgroundColor: `${column.color}20` }}>
                                          <DollarSign className="h-3 w-3" style={{ color: column.color }} />
                                        </div>
                                        <span className="font-semibold" style={{ color: "#303030" }}>
                                          {formatCurrency(opportunity.value)}
                                        </span>
                                      </div>

                                      <div className="flex items-center space-x-2 text-xs text-gray-600">
                                        <Calendar className="h-3 w-3" />
                                        <span>{opportunity.closeDate}</span>
                                      </div>

                                      <div className="flex items-center space-x-2 text-xs text-gray-600">
                                        <User className="h-3 w-3" />
                                        <span className="truncate">{opportunity.agent}</span>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                      <div className="flex items-center space-x-1">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 w-7 p-0 hover:bg-gray-100"
                                          onClick={() => {
                                            setCallDefaults({ phone: opportunity.phone })
                                            setOpenCall(true)
                                          }}
                                        >
                                          <Phone className="h-3 w-3 text-gray-500" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 w-7 p-0 hover:bg-gray-100"
                                          onClick={() => {
                                            setEmailDefaults({ to: opportunity.email })
                                            setOpenEmail(true)
                                          }}
                                        >
                                          <Mail className="h-3 w-3 text-gray-500" />
                                        </Button>
                                      </div>
                                      <Avatar className="h-7 w-7">
                                        <AvatarFallback
                                          className="text-xs font-medium"
                                          style={{ backgroundColor: `${column.color}20`, color: column.color }}
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
