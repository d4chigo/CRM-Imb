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
  email?: string;
  telefono?: string;
  tipo?: string; // lead | prospecto | cliente
  origen?: string; // web | referido | llamada | evento | otro
  notas?: string;
}

interface Props {
  open: boolean;
  contact: ContactDTO | null;
  onOpenChange: (v: boolean) => void;
  onSubmit: (id: number, data: EditContactFormValues) => Promise<void> | void;
}

export function EditContactDialog({ open, contact, onOpenChange, onSubmit }: Props) {
  const { toast } = useToast();
  const [form, setForm] = React.useState<EditContactFormValues>({ nombre: '', email: '', telefono: '', tipo: 'lead', origen: 'web', notas: '' });
  const [loading, setLoading] = React.useState(false);

  // Sincronizar al abrir con el contacto seleccionado
  React.useEffect(() => {
    if (contact) {
      setForm({
        nombre: contact.nombre || '',
        email: contact.email || '',
        telefono: contact.telefono || '',
        tipo: contact.tipo || 'lead',
        origen: contact.origen || 'web',
        notas: contact.notas || ''
      });
    }
  }, [contact]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Contacto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600">Nombre</label>
            <Input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre completo" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Email</label>
            <Input type="email" name="email" value={form.email} onChange={handleChange} placeholder="correo@ejemplo.com" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Teléfono</label>
            <Input name="telefono" value={form.telefono} onChange={handleChange} placeholder="999999999" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600">Tipo</label>
              <select name="tipo" value={form.tipo} onChange={handleChange} className="mt-1 w-full border rounded-md h-9 px-2 bg-white">
                <option value="lead">Lead</option>
                <option value="prospecto">Prospecto</option>
                <option value="cliente">Cliente</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Origen</label>
              <select name="origen" value={form.origen} onChange={handleChange} className="mt-1 w-full border rounded-md h-9 px-2 bg-white">
                <option value="web">Web</option>
                <option value="referido">Referido</option>
                <option value="llamada">Llamada</option>
                <option value="evento">Evento</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Notas</label>
            <Textarea name="notas" value={form.notas} onChange={(e) => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Observaciones, contexto, necesidades..." className="resize-y" rows={3} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading} style={{ backgroundColor: '#FCBA00' }} className="text-white">
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
