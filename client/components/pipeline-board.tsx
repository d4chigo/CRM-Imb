"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { Phone, Mail, DollarSign, Calendar, User, Search } from "lucide-react"
import { usePipelineDnd, calculateColumnTotal } from "@/hooks/use-pipeline-dnd"
import { formatCurrency } from "@/lib/currency"
import { NewOpportunityDialog } from "@/components/forms/NewOpportunityDialog"
import { EmailDialog } from "@/components/forms/EmailDialog"
import { CallDialog } from "@/components/forms/CallDialog"
import { useToast } from "@/hooks/use-toast"

/**
 * Componente de tablero de pipeline de ventas.
 *
 * Renderiza las columnas con sus oportunidades y permite arrastrar y soltar
 * entre etapas. Incluye barra de búsqueda y totales por columna.
 */

export function PipelineBoard() {
  const { searchTerm, setSearchTerm, filteredColumns, onDragEnd, columns, addOpportunity } = usePipelineDnd()
  const { toast } = useToast()

  // Estado de diálogos
  const [openNew, setOpenNew] = React.useState(false)
  const [openEmail, setOpenEmail] = React.useState(false)
  const [openCall, setOpenCall] = React.useState(false)
  const [emailDefaults, setEmailDefaults] = React.useState<{ to?: string; subject?: string; body?: string }>({})
  const [callDefaults, setCallDefaults] = React.useState<{ phone?: string; outcome?: any; notes?: string }>({})

  function handleCreate(values: import("@/components/forms/NewOpportunityDialog").NewOpportunityFormValues) {
    addOpportunity(values.columnId, {
      clientName: values.clientName,
      serviceName: values.serviceName,
      agent: values.agent,
      value: values.value,
      probability: values.probability,
      closeDate: values.closeDate,
      phone: values.phone,
      email: values.email,
    })
    toast({ title: "Oportunidad creada", description: `${values.clientName} • ${values.serviceName}` })
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "#303030" }}>
            Pipeline de Ventas
          </h2>
          <p className="text-gray-600">Arrastra las oportunidades entre las etapas</p>
        </div>
        <Button
          style={{ backgroundColor: "#FCBA00" }}
          className="text-white hover:opacity-90"
          onClick={() => setOpenNew(true)}
        >
          Nueva Oportunidad
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar por cliente, servicio o agente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="w-full overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {filteredColumns.map((column) => (
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
                          {column.opportunities.map((opportunity, index) => (
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
                                            .map((n) => n[0])
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
      <NewOpportunityDialog
        open={openNew}
        onOpenChange={setOpenNew}
        columns={columns}
        onSubmit={handleCreate}
      />
      <EmailDialog open={openEmail} onOpenChange={setOpenEmail} defaults={emailDefaults} onSubmit={handleSendEmail} />
      <CallDialog open={openCall} onOpenChange={setOpenCall} defaults={callDefaults} onSubmit={handleSaveCall} />
    </div>
  )
}
