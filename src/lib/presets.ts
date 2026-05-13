import type { Preset } from '../types';

const STORAGE_KEY = 'dehaan-presets';

function getAll(): Preset[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Preset[];
  } catch { return []; }
}

function saveAll(presets: Preset[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function listPresets(tool: string): Preset[] {
  return getAll()
    .filter(p => p.tool === tool)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function createPreset(name: string, tool: string, mappings: Record<string, unknown>): Preset {
  const preset: Preset = {
    id: crypto.randomUUID(),
    name,
    tool: tool as Preset['tool'],
    mappings,
    created_at: new Date().toISOString(),
  };
  saveAll([...getAll(), preset]);
  return preset;
}

export function updatePreset(id: string, name: string, mappings: Record<string, unknown>): Preset {
  const all = getAll();
  const idx = all.findIndex(p => p.id === id);
  if (idx === -1) throw new Error('Preset not found');
  all[idx] = { ...all[idx], name, mappings };
  saveAll(all);
  return all[idx];
}

export function deletePreset(id: string): void {
  saveAll(getAll().filter(p => p.id !== id));
}

export function exportPresetsFile(tool: string): void {
  const presets = listPresets(tool);
  const blob = new Blob([JSON.stringify(presets, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `presets-${tool}-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importPresetsFile(file: File, tool: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target!.result as string);
        const imported = (Array.isArray(raw) ? raw : [raw]) as Preset[];
        const valid = imported.filter(p => p.tool === tool && p.name && p.mappings);
        const existing = getAll();
        const existingNames = new Set(existing.filter(p => p.tool === tool).map(p => p.name));
        const toAdd = valid
          .filter(p => !existingNames.has(p.name))
          .map(p => ({ ...p, id: crypto.randomUUID(), created_at: new Date().toISOString() }));
        saveAll([...existing, ...toAdd]);
        resolve(toAdd.length);
      } catch {
        reject(new Error('Invalid preset file'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsText(file);
  });
}
