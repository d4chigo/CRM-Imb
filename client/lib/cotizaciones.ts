const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export interface CotizacionDTO {
  id?: number;
  nombre: string;
  descripcion?: string | null;
  precioBase?: number | null;
  moneda?: string;
  incluyeIgv?: boolean;
  igvPorcentaje?: number;
  descuentoPorcentaje?: number;
  vigenciaDias?: number;
  condicionesPago?: string | null;
  notas?: string | null;
  itemsJson?: any;
  propiedadTipo?: string | null;
  propiedadUbicacion?: string | null;
  areaM2?: number | null;
  dormitorios?: number | null;
  banos?: number | null;
  estacionamientos?: number | null;
  estado?: string | null;
  mantenimientoMensual?: number | null;
  fechaEntrega?: string | null; // ISO date
  amoblado?: boolean | null;
}

export async function listCotizaciones(): Promise<CotizacionDTO[]> {
  const res = await fetch(`${API_BASE_URL}/api/cotizaciones`, { headers: authHeaders(), credentials: 'include' });
  if (!res.ok) throw new Error('Error listando cotizaciones');
  const data = await res.json();
  return data.data || [];
}

export async function createCotizacion(input: CotizacionDTO): Promise<CotizacionDTO> {
  const payload: any = { ...input };
  if (!payload.descripcion) delete payload.descripcion;
  const res = await fetch(`${API_BASE_URL}/api/cotizaciones`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload), credentials: 'include' });
  if (!res.ok) {
    let detail = '';
    try { const j = await res.json(); detail = j?.message || ''; } catch {}
    throw new Error(detail || 'Error creando cotización');
  }
  const data = await res.json();
  return data.data;
}

export async function updateCotizacion(id: number, patch: Partial<CotizacionDTO>): Promise<CotizacionDTO> {
  const res = await fetch(`${API_BASE_URL}/api/cotizaciones/${id}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(patch), credentials: 'include' });
  if (!res.ok) {
    let detail = '';
    try { const j = await res.json(); detail = j?.message || ''; } catch {}
    throw new Error(detail || 'Error actualizando cotización');
  }
  const data = await res.json();
  return data.data;
}

export async function deleteCotizacion(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/cotizaciones/${id}`, { method: 'DELETE', headers: authHeaders(), credentials: 'include' });
  if (!res.ok) {
    let detail = '';
    try { const j = await res.json(); detail = j?.message || ''; } catch {}
    throw new Error(detail || 'Error eliminando cotización');
  }
}
