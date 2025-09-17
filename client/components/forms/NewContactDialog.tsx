"use client";
import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface NewContactFormValues {
  nombre: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  dni?: string;
  tipo: string; // lead | prospecto | cliente
  origen?: string; // (UI: medio_contacto) web | referido | llamada | evento | otro
  notas?: string; // (UI: observaciones)
  departamento?: string;
  sexo?: 'M' | 'F' | 'O';
  fecha_nacimiento?: string; // YYYY-MM-DD
  etiquetas?: string[];
  etiqueta_otro?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: NewContactFormValues) => Promise<void> | void;
}

export function NewContactDialog({ open, onOpenChange, onSubmit }: Props) {
  const { toast } = useToast();
  const [form, setForm] = React.useState<NewContactFormValues>({ nombre: '', apellido: '', email: '', telefono: '', dni: '', tipo: 'lead', origen: 'web', notas: '', departamento: '', sexo: undefined, fecha_nacimiento: '', etiquetas: [], etiqueta_otro: '' });

  const [loading, setLoading] = React.useState(false);
  const [showOther, setShowOther] = React.useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) {
      toast({ title: 'Nombre requerido', variant: 'destructive' });
      return;
    }
    // Ya no forzamos etiqueta/otros: los campos de etiqueta son opcionales.
    setLoading(true);
    try {
      await Promise.resolve(onSubmit(form));
      toast({ title: 'Contacto creado', description: form.nombre });
      setForm({ nombre: '', apellido: '', email: '', telefono: '', dni: '', tipo: 'lead', origen: 'web', notas: '', departamento: '', sexo: undefined, fecha_nacimiento: '', etiquetas: [], etiqueta_otro: '' });
      setShowOther(false);

      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg">Nuevo Contacto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-medium text-muted-foreground">Nombre</label>
              <Input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre" className="h-9" />
            </div>
            <div>
              <label className="text-[12px] font-medium text-muted-foreground">Apellido (opcional)</label>
              <Input name="apellido" value={form.apellido || ''} onChange={handleChange} placeholder="Apellido" className="h-9" />
            </div>
          </div>
          {/* Etiqueta (única) */}
          <div className="space-y-2">
            <label className="text-[12px] font-medium text-muted-foreground">Etiqueta (elige solo una)</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[12px]">
              {[
                'Techo Propio',
                'Credito Mivivienda',
                'Terreno en Captacion',
                'Tasaciones',
                'Construccion',
                'Levantamiento Topografico',
              ].map(tag => (
                <label key={tag} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="new_etiqueta_unica"
                    checked={form.etiquetas?.[0] === tag}
                    onChange={() => { setForm(f => ({ ...f, etiquetas: [tag], etiqueta_otro: '' })); setShowOther(false); }}
                  />
                  {tag}
                </label>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => { setShowOther(v=>!v); if (!showOther) setForm(f=>({ ...f, etiquetas: [] })); }}>
                Otros
              </Button>
            </div>
            {showOther && (
              <div>
                <label className="text-[12px] font-medium text-muted-foreground">Especificar</label>
                <Input name="etiqueta_otro" value={form.etiqueta_otro || ''} onChange={handleChange} placeholder="Ej. Programa especial" className="h-9" />
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[12px] font-medium text-muted-foreground">Email</label>
              <Input type="email" name="email" value={form.email} onChange={handleChange} placeholder="correo@ejemplo.com" className="h-9" />
            </div>
            <div>
              <label className="text-[12px] font-medium text-muted-foreground">Teléfono</label>
              <Input name="telefono" value={form.telefono} onChange={handleChange} placeholder="999999999" className="h-9" />
            </div>
            <div>
              <label className="text-[12px] font-medium text-muted-foreground">DNI</label>
              <Input name="dni" value={form.dni || ''} onChange={handleChange} placeholder="Ej. 12345678" className="h-9" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-medium text-muted-foreground">Tipo</label>
              <Select value={form.tipo} onValueChange={(v)=> setForm(f=> ({...f, tipo: v}))}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="prospecto">Prospecto</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[12px] font-medium text-muted-foreground">Medio de contacto</label>
              <Select value={form.origen} onValueChange={(v)=> setForm(f=> ({...f, origen: v}))}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="web">Web</SelectItem>
                  <SelectItem value="referido">Referido</SelectItem>
                  <SelectItem value="llamada">Llamada</SelectItem>
                  <SelectItem value="evento">Evento</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[12px] font-medium text-muted-foreground">Departamento</label>
              <Input name="departamento" value={form.departamento || ''} onChange={handleChange} placeholder="Ej. Lima" className="h-9" />
            </div>
            <div>
              <label className="text-[12px] font-medium text-muted-foreground">Sexo</label>
              <Select value={(form.sexo ?? 'none') as any} onValueChange={(v)=> setForm(f=> ({...f, sexo: (v === 'none' ? undefined : (v as any))}))}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Sin dato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin dato</SelectItem>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Femenino</SelectItem>
                  <SelectItem value="O">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[12px] font-medium text-muted-foreground">Fecha Nacimiento</label>
              <Input type="date" name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={handleChange} className="h-9" />
            </div>
          </div>
          <div>
            <label className="text-[12px] font-medium text-muted-foreground">Observaciones</label>
            <Textarea name="notas" value={form.notas} onChange={handleChange} placeholder="Observaciones" className="min-h-[88px] text-[13px]" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9">Cancelar</Button>
            <Button disabled={loading} type="submit" variant="brand" className="h-9">{loading? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}