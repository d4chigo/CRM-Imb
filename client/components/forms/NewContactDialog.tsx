"use client";
import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export interface NewContactFormValues {
  nombre: string;
  email: string;
  telefono: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: NewContactFormValues) => void;
}

export function NewContactDialog({ open, onOpenChange, onSubmit }: Props) {
  const { toast } = useToast();
  const [form, setForm] = React.useState<NewContactFormValues>({ nombre: '', email: '', telefono: '' });
  const [loading, setLoading] = React.useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) {
      toast({ title: 'Nombre requerido', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      onSubmit(form);
      toast({ title: 'Contacto creado', description: form.nombre });
      setForm({ nombre: '', email: '', telefono: '' });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo Contacto</DialogTitle>
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
          <DialogFooter>
            <Button type="submit" disabled={loading} style={{ backgroundColor: '#FCBA00' }} className="text-white">
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}