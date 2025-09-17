"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Pencil, Trash2 } from "lucide-react"
import { listCotizaciones, createCotizacion, updateCotizacion, deleteCotizacion, CotizacionDTO } from "@/lib/cotizaciones"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function CotizacionesList() {
  const [items, setItems] = useState<CotizacionDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [openCreate, setOpenCreate] = useState(false)
  const [openEdit, setOpenEdit] = useState<null | CotizacionDTO>(null)
  const { toast } = useToast()

  async function reload() {
    setLoading(true)
    try {
      const rows = await listCotizaciones()
      setItems(rows)
    } catch (e:any) {
      toast({ title: "Error cargando cotizaciones", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [])

  const filtered = useMemo(() => {
    if (!search) return items
    const q = search.toLowerCase()
    return items.filter(i => i.nombre.toLowerCase().includes(q) || (i.descripcion || '').toLowerCase().includes(q))
  }, [items, search])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
              <Button variant="brand">
              <Plus className="h-4 w-4 mr-2" /> Nueva cotización
            </Button>
          </DialogTrigger>
          <CreateCotizacionDialog onCreated={(item)=>{ setItems(prev=>[...prev, item]); setOpenCreate(false); }} />
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Buscar por nombre o descripción" value={search} onChange={(e)=> setSearch(e.target.value)} className="pl-10" />
            </div>
            <Button variant="outline" onClick={reload} disabled={loading}>{loading? 'Actualizando...' : 'Actualizar'}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>Administra los servicios/cotizaciones disponibles</CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No hay cotizaciones.</div>
          ) : (
            <div className="divide-y">
              {filtered.map(item => (
                <div key={item.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold" style={{ color: "#303030" }}>{item.nombre}</span>
                      <Badge variant="secondary">ID {item.id}</Badge>
                    </div>
                    {item.descripcion && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.descripcion}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={()=> setOpenEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-red-50" onClick={async()=>{
                      if (!item.id) return
                      const ok = window.confirm('¿Eliminar cotización? Si hay oportunidades vinculadas no se podrá borrar.')
                      if (!ok) return
                      try {
                        await deleteCotizacion(item.id)
                        setItems(prev => prev.filter(x => x.id !== item.id))
                        toast({ title: 'Eliminada', description: item.nombre })
                      } catch(e:any) {
                        toast({ title: 'No se pudo eliminar', description: e.message, variant: 'destructive' })
                      }
                    }}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!openEdit} onOpenChange={(v)=> !v && setOpenEdit(null)}>
        <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar cotización</DialogTitle>
            <DialogDescription>Actualiza el nombre o la descripción</DialogDescription>
          </DialogHeader>
          {openEdit && (
            <EditCotizacionForm
              item={openEdit}
              onSaved={(u)=>{
                setItems(prev => prev.map(x => x.id === u.id ? u : x))
                setOpenEdit(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CreateCotizacionDialog({ onCreated }:{ onCreated: (c: CotizacionDTO)=> void }) {
  const { toast } = useToast()
  const [nombre, setNombre] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [precioBase, setPrecioBase] = useState<string>("")
  const [moneda, setMoneda] = useState<string>("USD")
  const [incluyeIgv, setIncluyeIgv] = useState<boolean>(false)
  const [igvPorcentaje, setIgvPorcentaje] = useState<string>("18")
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState<string>("0")
  const [vigenciaDias, setVigenciaDias] = useState<string>("30")
  const [condicionesPago, setCondicionesPago] = useState("")
  const [notas, setNotas] = useState("")
  // Propiedad
  const [propiedadTipo, setPropiedadTipo] = useState("")
  const [propiedadUbicacion, setPropiedadUbicacion] = useState("")
  const [areaM2, setAreaM2] = useState<string>("")
  const [dormitorios, setDormitorios] = useState<string>("")
  const [banos, setBanos] = useState<string>("")
  const [estacionamientos, setEstacionamientos] = useState<string>("")
  const [estado, setEstado] = useState("")
  const [mantenimientoMensual, setMantenimientoMensual] = useState<string>("")
  const [fechaEntrega, setFechaEntrega] = useState<string>("")
  const [amoblado, setAmoblado] = useState<boolean>(false)
  const [saving, setSaving] = useState(false)
  // Totals helpers
  const currencySymbol = moneda === 'PEN' ? 'S/' : '$'
  const parsedPrecio = Number(precioBase || 0)
  const parsedDesc = Math.min(100, Math.max(0, Number(descuentoPorcentaje || 0)))
  const parsedIgv = Math.min(100, Math.max(0, Number(igvPorcentaje || 0)))
  const subtotal = isNaN(parsedPrecio) ? 0 : parsedPrecio
  const descAmt = subtotal * (parsedDesc / 100)
  const baseAfterDesc = Math.max(0, subtotal - descAmt)
  const igvAmt = incluyeIgv ? 0 : baseAfterDesc * (parsedIgv / 100)
  const total = incluyeIgv ? baseAfterDesc : baseAfterDesc + igvAmt

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) { toast({ title:'Falta nombre', description:'El nombre es obligatorio', variant:'destructive' }); return }
    setSaving(true)
    try {
      const created = await createCotizacion({
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        precioBase: precioBase ? Number(precioBase) : undefined,
        moneda,
        incluyeIgv,
        igvPorcentaje: igvPorcentaje ? Number(igvPorcentaje) : undefined,
        descuentoPorcentaje: descuentoPorcentaje ? Number(descuentoPorcentaje) : undefined,
        vigenciaDias: vigenciaDias ? Number(vigenciaDias) : undefined,
        condicionesPago: condicionesPago.trim() || undefined,
        notas: notas.trim() || undefined,
        propiedadTipo: propiedadTipo.trim() || undefined,
        propiedadUbicacion: propiedadUbicacion.trim() || undefined,
        areaM2: areaM2 ? Number(areaM2) : undefined,
        dormitorios: dormitorios ? Number(dormitorios) : undefined,
        banos: banos ? Number(banos) : undefined,
        estacionamientos: estacionamientos ? Number(estacionamientos) : undefined,
        estado: estado.trim() || undefined,
        mantenimientoMensual: mantenimientoMensual ? Number(mantenimientoMensual) : undefined,
        fechaEntrega: fechaEntrega || undefined,
        amoblado
      })
      toast({ title:'Guardado', description: created.nombre })
      onCreated(created)
      setNombre("")
  setDescripcion("")
  setPrecioBase("")
  setMoneda("USD")
  setIncluyeIgv(false)
  setIgvPorcentaje("18")
  setDescuentoPorcentaje("0")
  setVigenciaDias("30")
  setCondicionesPago("")
  setNotas("")
  setPropiedadTipo("")
  setPropiedadUbicacion("")
  setAreaM2("")
  setDormitorios("")
  setBanos("")
  setEstacionamientos("")
  setEstado("")
  setMantenimientoMensual("")
  setFechaEntrega("")
  setAmoblado(false)
    } catch(e:any) {
      toast({ title:'Error', description: e.message, variant:'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Nueva cotización</DialogTitle>
        <DialogDescription>Define un servicio del catálogo</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Nombre</label>
            <Input value={nombre} onChange={(e)=> setNombre(e.target.value)} placeholder="Ej. Compra/Venta" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Moneda</label>
            <Select value={moneda} onValueChange={setMoneda}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona moneda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD (Dólar)</SelectItem>
                <SelectItem value="PEN">PEN (Sol peruano)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Precio base</label>
            <Input type="number" step="0.01" value={precioBase} onChange={(e)=> setPrecioBase(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">IGV %</label>
            <Input type="number" step="0.01" value={igvPorcentaje} onChange={(e)=> setIgvPorcentaje(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Descuento %</label>
            <Input type="number" step="0.01" value={descuentoPorcentaje} onChange={(e)=> setDescuentoPorcentaje(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Vigencia (días)</label>
            <Input type="number" value={vigenciaDias} onChange={(e)=> setVigenciaDias(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-gray-600">Descripción</label>
            <Input value={descripcion} onChange={(e)=> setDescripcion(e.target.value)} placeholder="Opcional" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Condiciones de pago</label>
            <Input value={condicionesPago} onChange={(e)=> setCondicionesPago(e.target.value)} placeholder="Ej. 30% inicial, saldo contra entrega" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Notas</label>
            <Input value={notas} onChange={(e)=> setNotas(e.target.value)} placeholder="Cláusulas, observaciones, etc." />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Tipo de propiedad</label>
            <Input value={propiedadTipo} onChange={(e)=> setPropiedadTipo(e.target.value)} placeholder="Departamento, Casa..." />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-gray-600">Ubicación</label>
            <Input value={propiedadUbicacion} onChange={(e)=> setPropiedadUbicacion(e.target.value)} placeholder="Dirección o zona" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Área (m²)</label>
            <Input type="number" step="0.01" value={areaM2} onChange={(e)=> setAreaM2(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Dormitorios</label>
            <Input type="number" value={dormitorios} onChange={(e)=> setDormitorios(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Baños</label>
            <Input type="number" value={banos} onChange={(e)=> setBanos(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Estacionamientos</label>
            <Input type="number" value={estacionamientos} onChange={(e)=> setEstacionamientos(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Estado</label>
            <Input value={estado} onChange={(e)=> setEstado(e.target.value)} placeholder="Disponible, Reservada..." />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Mantenimiento mensual</label>
            <Input type="number" step="0.01" value={mantenimientoMensual} onChange={(e)=> setMantenimientoMensual(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Fecha de entrega</label>
            <Input type="date" value={fechaEntrega} onChange={(e)=> setFechaEntrega(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <input id="amoblado" type="checkbox" checked={amoblado} onChange={(e)=> setAmoblado(e.target.checked)} />
            <label htmlFor="amoblado" className="text-xs font-medium text-gray-600">Amoblado</label>
          </div>
          <div className="flex items-center gap-3">
            <input id="incluyeIgv" type="checkbox" checked={incluyeIgv} onChange={(e)=> setIncluyeIgv(e.target.checked)} />
            <label htmlFor="incluyeIgv" className="text-xs font-medium text-gray-600">Precios incluyen IGV</label>
          </div>
        </div>
        {/* Totals */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded border bg-white">
            <div className="text-[10px] text-gray-500">Subtotal</div>
            <div className="text-sm font-semibold">{currencySymbol} {subtotal.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</div>
          </div>
          <div className="p-3 rounded border bg-white">
            <div className="text-[10px] text-gray-500">Descuento ({parsedDesc}%)</div>
            <div className="text-sm font-semibold">- {currencySymbol} {descAmt.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</div>
          </div>
          <div className="p-3 rounded border bg-white">
            <div className="text-[10px] text-gray-500">IGV {incluyeIgv ? '(incluido)' : `(${parsedIgv}%)`}</div>
            <div className="text-sm font-semibold">{incluyeIgv ? '—' : `${currencySymbol} ${igvAmt.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`}</div>
          </div>
          <div className="p-3 rounded border bg-white">
            <div className="text-[10px] text-gray-500">Total</div>
            <div className="text-base font-bold">{currencySymbol} {total.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</div>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving} variant="brand">{saving? 'Guardando...' : 'Guardar'}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

function EditCotizacionForm({ item, onSaved }:{ item: CotizacionDTO, onSaved: (c: CotizacionDTO)=> void }) {
  const { toast } = useToast()
  const [nombre, setNombre] = useState(item.nombre)
  const [descripcion, setDescripcion] = useState(item.descripcion || "")
  const [precioBase, setPrecioBase] = useState<string>(item.precioBase != null ? String(item.precioBase) : "")
  const [moneda, setMoneda] = useState<string>(item.moneda || 'USD')
  const [incluyeIgv, setIncluyeIgv] = useState<boolean>(!!item.incluyeIgv)
  const [igvPorcentaje, setIgvPorcentaje] = useState<string>(item.igvPorcentaje != null ? String(item.igvPorcentaje) : "18")
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState<string>(item.descuentoPorcentaje != null ? String(item.descuentoPorcentaje) : "0")
  const [vigenciaDias, setVigenciaDias] = useState<string>(item.vigenciaDias != null ? String(item.vigenciaDias) : "30")
  const [condicionesPago, setCondicionesPago] = useState(item.condicionesPago || "")
  const [notas, setNotas] = useState(item.notas || "")
  const [propiedadTipo, setPropiedadTipo] = useState(item.propiedadTipo || "")
  const [propiedadUbicacion, setPropiedadUbicacion] = useState(item.propiedadUbicacion || "")
  const [areaM2, setAreaM2] = useState<string>(item.areaM2 != null ? String(item.areaM2) : "")
  const [dormitorios, setDormitorios] = useState<string>(item.dormitorios != null ? String(item.dormitorios) : "")
  const [banos, setBanos] = useState<string>(item.banos != null ? String(item.banos) : "")
  const [estacionamientos, setEstacionamientos] = useState<string>(item.estacionamientos != null ? String(item.estacionamientos) : "")
  const [estado, setEstado] = useState(item.estado || "")
  const [mantenimientoMensual, setMantenimientoMensual] = useState<string>(item.mantenimientoMensual != null ? String(item.mantenimientoMensual) : "")
  const [fechaEntrega, setFechaEntrega] = useState<string>(item.fechaEntrega || "")
  const [amoblado, setAmoblado] = useState<boolean>(!!item.amoblado)
  const [saving, setSaving] = useState(false)
  const currencySymbol = moneda === 'PEN' ? 'S/' : '$'
  const parsedPrecio = Number(precioBase || 0)
  const parsedDesc = Math.min(100, Math.max(0, Number(descuentoPorcentaje || 0)))
  const parsedIgv = Math.min(100, Math.max(0, Number(igvPorcentaje || 0)))
  const subtotal = isNaN(parsedPrecio) ? 0 : parsedPrecio
  const descAmt = subtotal * (parsedDesc / 100)
  const baseAfterDesc = Math.max(0, subtotal - descAmt)
  const igvAmt = incluyeIgv ? 0 : baseAfterDesc * (parsedIgv / 100)
  const total = incluyeIgv ? baseAfterDesc : baseAfterDesc + igvAmt

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!item.id) return
    if (!nombre.trim()) { toast({ title:'Falta nombre', description:'El nombre es obligatorio', variant:'destructive' }); return }
    setSaving(true)
    try {
      const updated = await updateCotizacion(item.id, {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        precioBase: precioBase ? Number(precioBase) : undefined,
        moneda,
        incluyeIgv,
        igvPorcentaje: igvPorcentaje ? Number(igvPorcentaje) : undefined,
        descuentoPorcentaje: descuentoPorcentaje ? Number(descuentoPorcentaje) : undefined,
        vigenciaDias: vigenciaDias ? Number(vigenciaDias) : undefined,
        condicionesPago: condicionesPago.trim() || undefined,
        notas: notas.trim() || undefined,
        propiedadTipo: propiedadTipo.trim() || undefined,
        propiedadUbicacion: propiedadUbicacion.trim() || undefined,
        areaM2: areaM2 ? Number(areaM2) : undefined,
        dormitorios: dormitorios ? Number(dormitorios) : undefined,
        banos: banos ? Number(banos) : undefined,
        estacionamientos: estacionamientos ? Number(estacionamientos) : undefined,
        estado: estado.trim() || undefined,
        mantenimientoMensual: mantenimientoMensual ? Number(mantenimientoMensual) : undefined,
        fechaEntrega: fechaEntrega || undefined,
        amoblado
      })
      toast({ title:'Actualizado', description: updated.nombre })
      onSaved(updated)
    } catch(e:any) {
      toast({ title:'Error', description: e.message, variant:'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600">Nombre</label>
          <Input value={nombre} onChange={(e)=> setNombre(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Moneda</label>
          <Select value={moneda} onValueChange={setMoneda}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona moneda" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD (Dólar)</SelectItem>
              <SelectItem value="PEN">PEN (Sol peruano)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Precio base</label>
          <Input type="number" step="0.01" value={precioBase} onChange={(e)=> setPrecioBase(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">IGV %</label>
          <Input type="number" step="0.01" value={igvPorcentaje} onChange={(e)=> setIgvPorcentaje(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Descuento %</label>
          <Input type="number" step="0.01" value={descuentoPorcentaje} onChange={(e)=> setDescuentoPorcentaje(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Vigencia (días)</label>
          <Input type="number" value={vigenciaDias} onChange={(e)=> setVigenciaDias(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-gray-600">Descripción</label>
          <Input value={descripcion} onChange={(e)=> setDescripcion(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600">Condiciones de pago</label>
          <Input value={condicionesPago} onChange={(e)=> setCondicionesPago(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Notas</label>
          <Input value={notas} onChange={(e)=> setNotas(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600">Tipo de propiedad</label>
          <Input value={propiedadTipo} onChange={(e)=> setPropiedadTipo(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-gray-600">Ubicación</label>
          <Input value={propiedadUbicacion} onChange={(e)=> setPropiedadUbicacion(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Área (m²)</label>
          <Input type="number" step="0.01" value={areaM2} onChange={(e)=> setAreaM2(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Dormitorios</label>
          <Input type="number" value={dormitorios} onChange={(e)=> setDormitorios(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Baños</label>
          <Input type="number" value={banos} onChange={(e)=> setBanos(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Estacionamientos</label>
          <Input type="number" value={estacionamientos} onChange={(e)=> setEstacionamientos(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Estado</label>
          <Input value={estado} onChange={(e)=> setEstado(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Mantenimiento mensual</label>
          <Input type="number" step="0.01" value={mantenimientoMensual} onChange={(e)=> setMantenimientoMensual(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Fecha de entrega</label>
          <Input type="date" value={fechaEntrega} onChange={(e)=> setFechaEntrega(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <input id="amoblado_edit" type="checkbox" checked={amoblado} onChange={(e)=> setAmoblado(e.target.checked)} />
          <label htmlFor="amoblado_edit" className="text-xs font-medium text-gray-600">Amoblado</label>
        </div>
        <div className="flex items-center gap-3">
          <input id="incluyeIgv_edit" type="checkbox" checked={incluyeIgv} onChange={(e)=> setIncluyeIgv(e.target.checked)} />
          <label htmlFor="incluyeIgv_edit" className="text-xs font-medium text-gray-600">Precios incluyen IGV</label>
        </div>
      </div>
      {/* Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded border bg-white">
          <div className="text-[10px] text-gray-500">Subtotal</div>
          <div className="text-sm font-semibold">{currencySymbol} {subtotal.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</div>
        </div>
        <div className="p-3 rounded border bg-white">
          <div className="text-[10px] text-gray-500">Descuento ({parsedDesc}%)</div>
          <div className="text-sm font-semibold">- {currencySymbol} {descAmt.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</div>
        </div>
        <div className="p-3 rounded border bg-white">
          <div className="text-[10px] text-gray-500">IGV {incluyeIgv ? '(incluido)' : `(${parsedIgv}%)`}</div>
          <div className="text-sm font-semibold">{incluyeIgv ? '—' : `${currencySymbol} ${igvAmt.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`}</div>
        </div>
        <div className="p-3 rounded border bg-white">
          <div className="text-[10px] text-gray-500">Total</div>
          <div className="text-base font-bold">{currencySymbol} {total.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</div>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={saving} variant="brand">{saving? 'Guardando...' : 'Guardar'}</Button>
      </DialogFooter>
    </form>
  )
}
