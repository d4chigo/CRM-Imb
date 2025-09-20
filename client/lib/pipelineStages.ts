// Cliente ligero para API de etapas del pipeline
export interface PipelineStageDTO { id: string; title: string; color: string; }

import { authService } from '@/lib/auth';

export async function fetchStages(): Promise<PipelineStageDTO[]> {
  const res = await authService.authenticatedFetch(`/api/pipeline/stages`, { method:'GET' });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  const data = await res.json();
  return data.data || [];
}

export async function createStage(stage: Partial<PipelineStageDTO> & { title: string; color: string }): Promise<PipelineStageDTO> {
  const payload: any = { title: stage.title, color: stage.color };
  if (stage.id) payload.id = stage.id; // solo incluir si se proporciona
  const res = await authService.authenticatedFetch(`/api/pipeline/stages`, { method: 'POST', body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  const data = await res.json();
  return data.data;
}

export async function deleteStage(id: string): Promise<void> {
  const res = await authService.authenticatedFetch(`/api/pipeline/stages/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Error ${res.status}`);
}

export async function updateStage(id: string, data: Partial<PipelineStageDTO> & { order?: number }): Promise<PipelineStageDTO & { order?: number }> {
  const res = await authService.authenticatedFetch(`/api/pipeline/stages/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  const j = await res.json();
  return j.data;
}