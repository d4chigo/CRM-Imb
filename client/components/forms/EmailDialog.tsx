"use client"

/**
 * Diálogo para enviar un correo rápido a un contacto de una oportunidad.
 * @module components/forms/EmailDialog
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
  to: z.string().email("Email inválido"),
  subject: z.string().min(1, "Asunto requerido"),
  body: z.string().min(1, "Mensaje requerido"),
})

export type EmailFormValues = z.infer<typeof schema>

export interface EmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaults?: Partial<EmailFormValues>
  onSubmit: (values: EmailFormValues) => void
}

/**
 * Diálogo con formulario para enviar correo.
 */
export function EmailDialog({ open, onOpenChange, defaults, onSubmit }: EmailDialogProps) {
  const form = useForm<EmailFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      to: defaults?.to ?? "",
      subject: defaults?.subject ?? "",
      body: defaults?.body ?? "",
    },
  })

  function handleSubmit(values: EmailFormValues) {
    onSubmit(values)
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar Email</DialogTitle>
          <DialogDescription>Redacta y envía un correo al contacto.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Para</FormLabel>
                  <FormControl>
                    <Input placeholder="correo@ejemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asunto</FormLabel>
                  <FormControl>
                    <Input placeholder="Asunto del correo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mensaje</FormLabel>
                  <FormControl>
                    <Textarea rows={6} placeholder="Escribe tu mensaje..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">Enviar</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
