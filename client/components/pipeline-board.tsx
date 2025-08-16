"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { Phone, Mail, DollarSign, Calendar, User, Search } from "lucide-react"

interface Opportunity {
  id: string
  clientName: string
  propertyTitle: string
  agent: string
  value: number
  probability: number
  closeDate: string
  phone: string
  email: string
}

interface Column {
  id: string
  title: string
  opportunities: Opportunity[]
  color: string
}

const initialData: Column[] = [
  {
    id: "contacto_inicial",
    title: "Contacto Inicial",
    color: "#94A3B8",
    opportunities: [
      {
        id: "1",
        clientName: "Ana Martínez",
        propertyTitle: "Departamento 2 hab - Torre A",
        agent: "Juan Pérez",
        value: 220000,
        probability: 10,
        closeDate: "2024-02-15",
        phone: "+51987654321",
        email: "ana@email.com",
      },
      {
        id: "2",
        clientName: "Carlos Ruiz",
        propertyTitle: "Casa en San Isidro",
        agent: "María García",
        value: 450000,
        probability: 15,
        closeDate: "2024-02-20",
        phone: "+51987654322",
        email: "carlos@email.com",
      },
    ],
  },
  {
    id: "calificacion",
    title: "Calificación",
    color: "#FCBA00",
    opportunities: [
      {
        id: "3",
        clientName: "Luis Torres",
        propertyTitle: "Departamento 3 hab - Torre B",
        agent: "Carlos López",
        value: 280000,
        probability: 25,
        closeDate: "2024-02-10",
        phone: "+51987654323",
        email: "luis@email.com",
      },
    ],
  },
  {
    id: "presentacion",
    title: "Presentación",
    color: "#F59E0B",
    opportunities: [
      {
        id: "4",
        clientName: "Patricia Silva",
        propertyTitle: "Departamento 2 hab - Torre A",
        agent: "Juan Pérez",
        value: 220000,
        probability: 40,
        closeDate: "2024-01-30",
        phone: "+51987654324",
        email: "patricia@email.com",
      },
    ],
  },
  {
    id: "negociacion",
    title: "Negociación",
    color: "#EF4444",
    opportunities: [
      {
        id: "5",
        clientName: "Roberto Díaz",
        propertyTitle: "Casa en San Isidro",
        agent: "María García",
        value: 450000,
        probability: 60,
        closeDate: "2024-01-25",
        phone: "+51987654325",
        email: "roberto@email.com",
      },
    ],
  },
  {
    id: "propuesta",
    title: "Propuesta",
    color: "#8B5CF6",
    opportunities: [
      {
        id: "6",
        clientName: "Elena Vega",
        propertyTitle: "Departamento 3 hab - Torre B",
        agent: "Carlos López",
        value: 280000,
        probability: 80,
        closeDate: "2024-01-20",
        phone: "+51987654326",
        email: "elena@email.com",
      },
    ],
  },
  {
    id: "cierre_ganado",
    title: "Cierre Ganado",
    color: "#10B981",
    opportunities: [
      {
        id: "7",
        clientName: "Miguel Santos",
        propertyTitle: "Departamento 2 hab - Torre A",
        agent: "Juan Pérez",
        value: 220000,
        probability: 100,
        closeDate: "2024-01-15",
        phone: "+51987654327",
        email: "miguel@email.com",
      },
    ],
  },
]

export function PipelineBoard() {
  const [columns, setColumns] = useState<Column[]>(initialData)
  const [searchTerm, setSearchTerm] = useState("")

  const filteredColumns = useMemo(() => {
    if (!searchTerm) return columns

    return columns.map((column) => ({
      ...column,
      opportunities: column.opportunities.filter(
        (opportunity) =>
          opportunity.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          opportunity.propertyTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
          opportunity.agent.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    }))
  }, [columns, searchTerm])

  const calculateColumnTotal = (opportunities: Opportunity[]) => {
    return opportunities.reduce((total, opportunity) => total + opportunity.value, 0)
  }

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) {
      return
    }

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return
    }

    const sourceColumn = columns.find((col) => col.id === source.droppableId)
    const destColumn = columns.find((col) => col.id === destination.droppableId)

    if (!sourceColumn || !destColumn) {
      return
    }

    if (sourceColumn === destColumn) {
      const newOpportunities = Array.from(sourceColumn.opportunities)
      const [removed] = newOpportunities.splice(source.index, 1)
      newOpportunities.splice(destination.index, 0, removed)

      const newColumn = {
        ...sourceColumn,
        opportunities: newOpportunities,
      }

      setColumns(columns.map((col) => (col.id === newColumn.id ? newColumn : col)))
    } else {
      const sourceOpportunities = Array.from(sourceColumn.opportunities)
      const destOpportunities = Array.from(destColumn.opportunities)
      const [removed] = sourceOpportunities.splice(source.index, 1)
      destOpportunities.splice(destination.index, 0, removed)

      const newSourceColumn = {
        ...sourceColumn,
        opportunities: sourceOpportunities,
      }

      const newDestColumn = {
        ...destColumn,
        opportunities: destOpportunities,
      }

      setColumns(
        columns.map((col) => {
          if (col.id === newSourceColumn.id) return newSourceColumn
          if (col.id === newDestColumn.id) return newDestColumn
          return col
        }),
      )
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "USD",
    }).format(amount)
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
        <Button style={{ backgroundColor: "#FCBA00" }} className="text-white hover:opacity-90">
          Nueva Oportunidad
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar por cliente, propiedad o agente..."
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
                                          {opportunity.propertyTitle}
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
                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-gray-100">
                                          <Phone className="h-3 w-3 text-gray-500" />
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-gray-100">
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
    </div>
  )
}
