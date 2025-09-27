"use client"

/**
 * Diálogo de creación de nueva oportunidad.
 * Provee un formulario validado con Zod y react-hook-form.
 * @module components/forms/NewOpportunityDialog
 */

import * as React from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Column } from "@/types/pipeline"

const schema = z.object({
  clientName: z.string().min(2, "El nombre es requerido"),
  serviceName: z.string().min(1, "Selecciona un servicio"), // TODO: Convertir a enum dinámico desde BD
  // serviceName: z.enum([
  //   "Compra de propiedades",
  //   "Venta de propiedades", 
  //   "Crédito MiVivienda",
  //   "Programa Techo Propio",
  // ], {
  //   required_error: "Selecciona un servicio",
  // }), // TODO: Obtener servicios desde la base de datos
  agent: z.string().min(2, "El agente es requerido"),
  value: z.coerce.number().min(0, "El valor debe ser >= 0"),
  probability: z.coerce.number().min(0).max(100),
  closeDate: z.string().min(1, "La fecha es requerida"),
  phone: z.string().min(6, "Teléfono inválido"),
  email: z.string().email("Email inválido"),
  columnId: z.string().min(1, "Selecciona una etapa"),
})

export type NewOpportunityFormValues = z.infer<typeof schema>

export interface NewOpportunityDialogProps {
  /** Si el diálogo está abierto */
  open: boolean
  /** Callback para cambiar estado del diálogo */
  onOpenChange: (open: boolean) => void
  /** Columnas del pipeline para seleccionar etapa */
  columns: Column[]
  /** Handler de envío que recibirá los valores del formulario */
  onSubmit: (values: NewOpportunityFormValues) => void
}

/**
 * Diálogo con formulario para crear una nueva oportunidad.
 */
export function NewOpportunityDialog({ open, onOpenChange, columns, onSubmit }: NewOpportunityDialogProps) {
  const form = useForm<NewOpportunityFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientName: "",
      serviceName: "", // TODO: Valor por defecto desde configuración 
      agent: "", // TODO: Obtener agente desde sesión del usuario
      value: 0,
      probability: 10,
      closeDate: "",
      phone: "",
      email: "",
      columnId: columns[0]?.id ?? "",
    },
  })

  function handleSubmit(values: NewOpportunityFormValues) {
    onSubmit(values)
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border border-gray-200 text-gray-900 shadow-xl">
        <DialogHeader>
          <DialogTitle>Nueva Oportunidad</DialogTitle>
          <DialogDescription>Completa los datos para crear una nueva oportunidad.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="clientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del cliente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="serviceName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Servicio</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white border border-gray-300 text-gray-800">
                        <SelectValue placeholder="Selecciona un servicio" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white border border-gray-200 text-gray-900 shadow-lg">
                      {/* TODO: Cargar servicios dinámicamente desde la BD */}
                      <SelectItem value="Compra de propiedades">Compra de propiedades</SelectItem>
                      <SelectItem value="Venta de propiedades">Venta de propiedades</SelectItem>
                      <SelectItem value="Crédito MiVivienda">Crédito MiVivienda</SelectItem>
                      <SelectItem value="Programa Techo Propio">Programa Techo Propio</SelectItem>
                      {/* Servicios hardcodeados - deben venir de la BD */}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="agent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agente</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del agente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor (SOL)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step={1000} placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="probability"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Probabilidad (%)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} max={100} step={5} placeholder="10" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="closeDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de cierre</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input placeholder="+51..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="correo@ejemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="columnId"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Etapa</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white border border-gray-300 text-gray-800">
                        <SelectValue placeholder="Selecciona la etapa" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white border border-gray-200 text-gray-900 shadow-lg">
                      {columns.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">Crear</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
