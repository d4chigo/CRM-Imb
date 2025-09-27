"use client"

/**
 * Diálogo para registrar una llamada al contacto.
 * @module components/forms/CallDialog
 */

import * as React from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"

const schema = z.object({
  phone: z.string().min(6, "Teléfono inválido"),
  outcome: z.enum(["conectado", "buzon", "ocupado", "sin_respuesta"]).default("conectado"),
  notes: z.string().min(1, "Notas requeridas"),
})

export type CallFormValues = z.infer<typeof schema>

export interface CallDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaults?: Partial<CallFormValues>
  onSubmit: (values: CallFormValues) => void
}

/**
 * Diálogo con formulario para registrar resultado y notas de una llamada.
 */
export function CallDialog({ open, onOpenChange, defaults, onSubmit }: CallDialogProps) {
  const form = useForm<CallFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      phone: defaults?.phone ?? "",
      outcome: defaults?.outcome ?? "conectado",
      notes: defaults?.notes ?? "",
    },
  })

  function handleSubmit(values: CallFormValues) {
    onSubmit(values)
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border border-gray-200 text-gray-900 shadow-xl">
        <DialogHeader>
          <DialogTitle>Registrar Llamada</DialogTitle>
          <DialogDescription>Guarda el resultado de la llamada y notas relevantes.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4">
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
              name="outcome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resultado</FormLabel>
                  <FormControl>
                    <select className="border rounded h-9 px-3" {...field}>
                      <option value="conectado">Conectado</option>
                      <option value="buzon">Buzón</option>
                      <option value="ocupado">Ocupado</option>
                      <option value="sin_respuesta">Sin respuesta</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea rows={5} placeholder="Detalles de la llamada..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">Guardar</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
