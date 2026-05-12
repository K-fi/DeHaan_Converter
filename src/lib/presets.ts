import { getSupabase } from './supabase';
import type { Preset } from '../types';

export async function listPresets(tool: string): Promise<Preset[]> {
  const { data, error } = await getSupabase()
    .from('presets')
    .select('*')
    .eq('tool', tool)
    .order('name');
  if (error) throw error;
  return (data ?? []) as Preset[];
}

export async function createPreset(name: string, tool: string, mappings: Record<string, unknown>): Promise<Preset> {
  const { data, error } = await getSupabase()
    .from('presets')
    .insert({ name, tool, mappings })
    .select()
    .single();
  if (error) throw error;
  return data as Preset;
}

export async function updatePreset(id: string, name: string, mappings: Record<string, unknown>): Promise<Preset> {
  const { data, error } = await getSupabase()
    .from('presets')
    .update({ name, mappings })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Preset;
}

export async function deletePreset(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('presets')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
