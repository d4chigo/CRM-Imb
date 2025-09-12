"use client";
import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ContactDTO } from '@/lib/contacts';

// Dialog de edición de contacto.
// Nota: separado del de creación para mantener lógica clara y evitar condicionales complejos.
// Podría unificarse en el futuro con un componente ContactForm reutilizable.

export interface EditContactFormValues {
  nombre: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  dni?: string;
  tipo?: string; // lead | prospecto | cliente
  origen?: string; // (UI: medio_contacto)
  notas?: string; // (UI: observaciones)
  departamento?: string;
  sexo?: 'M' | 'F' | 'O';
  fecha_nacimiento?: string; // YYYY-MM-DD
  etiquetas?: string[];
  etiqueta_otro?: string;
}

interface Props {
  open: boolean;
  contact: ContactDTO | null;
  onOpenChange: (v: boolean) => void;
  onSubmit: (id: number, data: EditContactFormValues) => Promise<void> | void;
}

export function EditContactDialog({ open, contact, onOpenChange, onSubmit }: Props) {
  const { toast } = useToast();
  const [form, setForm] = React.useState<EditContactFormValues>({ nombre: '', apellido: '', email: '', telefono: '', dni: '', tipo: 'lead', origen: 'web', notas: '', departamento: '', sexo: undefined, fecha_nacimiento: '', etiquetas: [], etiqueta_otro: '' });
  const [loading, setLoading] = React.useState(false);
  const [showOther, setShowOther] = React.useState(false);

  // Sincronizar al abrir con el contacto seleccionado
  React.useEffect(() => {
    if (contact) {
      setForm({
        nombre: contact.nombre || '',
        apellido: (contact as any).apellido || '',
        email: contact.email || '',
        telefono: contact.telefono || '',
        dni: (contact as any).dni || '',
        tipo: contact.tipo || 'lead',
        origen: contact.origen || 'web',
        notas: contact.notas || '',
        departamento: (contact as any).departamento || '',
        sexo: (contact as any).sexo || undefined,
        fecha_nacimiento: contact && (contact as any).fecha_nacimiento ? String((contact as any).fecha_nacimiento).slice(0,10) : '',
        etiquetas: Array.isArray((contact as any).etiquetas) ? (contact as any).etiquetas : [],
        etiqueta_otro: (contact as any).etiqueta_otro || ''
      });
      setShowOther(!!(contact as any).etiqueta_otro);
    }
  }, [contact]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contact?.id) return;
    if (!form.nombre.trim()) {
      toast({ title: 'Nombre requerido', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await Promise.resolve(onSubmit(contact.id!, form));
      toast({ title: 'Contacto actualizado', description: form.nombre });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-xl p-4 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Editar Contacto</DialogTitle>
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
                    name="etiqueta_unica"
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
              <label className="text-[11px] font-medium text-gray-600">Fecha de nacimiento</label>
              <Input type="date" name="fecha_nacimiento" value={form.fecha_nacimiento || ''} onChange={handleChange} className="h-9" />
            </div>
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
              <label className="text-[11px] font-medium text-gray-600">DNI</label>
              <Input name="dni" value={form.dni || ''} onChange={handleChange} placeholder="Ej. 12345678" className="h-9" />
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
          <div>
            <label className="text-[11px] font-medium text-gray-600">Observaciones</label>
            <Textarea name="notas" value={form.notas} onChange={handleChange} placeholder="Observaciones, contexto, necesidades..." className="resize-y text-[13px] min-h-[72px]" rows={3} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading} style={{ backgroundColor: '#FCBA00' }} className="text-white h-9">
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
