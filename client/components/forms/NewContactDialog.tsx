"use client";
import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export interface NewContactFormValues {
  nombre: string;
  apellido?: string;
  email?: string;
  telefono?: string;
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
  const [form, setForm] = React.useState<NewContactFormValues>({ nombre: '', apellido: '', email: '', telefono: '', tipo: 'lead', origen: 'web', notas: '', departamento: '', sexo: undefined, fecha_nacimiento: '', etiquetas: [], etiqueta_otro: '' });

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
    // Validar etiqueta única u 'otros' (solo si showOther está activo o no hay selección)
    if (!(form.etiquetas && form.etiquetas.length === 1) && !((showOther) && (form.etiqueta_otro && form.etiqueta_otro.trim()))) {
      toast({ title: 'Selecciona una etiqueta o especifica "Otros"', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await Promise.resolve(onSubmit(form));
      toast({ title: 'Contacto creado', description: form.nombre });
      setForm({ nombre: '', apellido: '', email: '', telefono: '', tipo: 'lead', origen: 'web', notas: '', departamento: '', sexo: undefined, fecha_nacimiento: '', etiquetas: [], etiqueta_otro: '' });
      setShowOther(false);

      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-xl p-4">
        <DialogHeader>
          <DialogTitle className="text-base">Nuevo Contacto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-gray-600">Nombre</label>
              <Input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre" className="h-9" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-600">Apellido (opcional)</label>
              <Input name="apellido" value={form.apellido || ''} onChange={handleChange} placeholder="Apellido" className="h-9" />
            </div>
          </div>
          {/* Etiqueta (única) */}
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-gray-600">Etiqueta (elige solo una)</label>
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
                <label className="text-[11px] font-medium text-gray-600">Especificar</label>
                <Input name="etiqueta_otro" value={form.etiqueta_otro || ''} onChange={handleChange} placeholder="Ej. Programa especial" className="h-9" />
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-gray-600">Email</label>
              <Input type="email" name="email" value={form.email} onChange={handleChange} placeholder="correo@ejemplo.com" className="h-9" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-600">Teléfono</label>
              <Input name="telefono" value={form.telefono} onChange={handleChange} placeholder="999999999" className="h-9" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-gray-600">Tipo</label>
              <select name="tipo" value={form.tipo} onChange={handleChange} className="mt-1 w-full border rounded-md h-9 px-2 bg-white text-[13px]">
                <option value="lead">Lead</option>
                <option value="prospecto">Prospecto</option>
                <option value="cliente">Cliente</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-600">Medio de contacto</label>
              <select name="origen" value={form.origen} onChange={handleChange} className="mt-1 w-full border rounded-md h-9 px-2 bg-white text-[13px]">
                <option value="web">Web</option>
                <option value="referido">Referido</option>
                <option value="llamada">Llamada</option>
                <option value="evento">Evento</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-medium text-gray-600">Departamento</label>
              <Input name="departamento" value={form.departamento || ''} onChange={handleChange} placeholder="Ej. Lima" className="h-9" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-600">Sexo</label>
              <select name="sexo" value={form.sexo || ''} onChange={handleChange} className="mt-1 w-full border rounded-md h-9 px-2 bg-white text-[13px]">
                <option value="">Sin dato</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="O">Otro</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-600">Fecha Nacimiento</label>
              <Input type="date" name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={handleChange} className="h-9" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium text-gray-600">Observaciones</label>
            <Textarea name="notas" value={form.notas} onChange={handleChange} placeholder="Observaciones" className="min-h-[72px] text-[13px]" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9">Cancelar</Button>
            <Button disabled={loading} type="submit" style={{ backgroundColor: "#FCBA00" }} className="text-white h-9">{loading? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}