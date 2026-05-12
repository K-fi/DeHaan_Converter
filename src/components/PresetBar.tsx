'use client';

import { useState, useEffect } from 'react';
import { useLang } from '../context/LangContext';
import { listPresets, createPreset, updatePreset, deletePreset } from '../lib/presets';
import type { Preset } from '../types';

interface PresetBarProps {
  tool: 'price_updater' | 'supplier_converter';
  getMappings: () => Record<string, unknown>;
  onLoad: (preset: Preset) => void;
}

export default function PresetBar({ tool, getMappings, onLoad }: PresetBarProps) {
  const { lang } = useLang();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [showSave, setShowSave] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    listPresets(tool).then(setPresets).catch(e => setErr((e as Error).message));
  }, [tool]);

  const selected = presets.find(p => p.id === selectedId) ?? null;
  const nl = lang === 'nl';

  async function handleSave() {
    const name = saveName.trim();
    if (!name) return;
    setBusy(true); setErr(null);
    try {
      const saved = await createPreset(name, tool, getMappings());
      setPresets(prev => [...prev, saved].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedId(saved.id);
      setShowSave(false); setSaveName('');
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  async function handleUpdate() {
    if (!selected) return;
    setBusy(true); setErr(null);
    try {
      const updated = await updatePreset(selected.id, selected.name, getMappings());
      setPresets(prev => prev.map(p => p.id === updated.id ? updated : p));
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  async function handleDelete() {
    if (!selected) return;
    if (!confirm(nl ? `Preset "${selected.name}" verwijderen?` : `Delete preset "${selected.name}"?`)) return;
    setBusy(true); setErr(null);
    try {
      await deletePreset(selected.id);
      setPresets(prev => prev.filter(p => p.id !== selected.id));
      setSelectedId('');
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', flexShrink: 0 }}>
          💾 {nl ? 'Preset:' : 'Preset:'}
        </span>
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          style={{ flex: 1, minWidth: 150, fontSize: 12, padding: '5px 8px' }}
          disabled={busy}
        >
          <option value="">— {nl ? 'kies preset' : 'choose preset'} —</option>
          {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button className="btn btn-sm btn-primary" disabled={!selectedId || busy} onClick={() => selected && onLoad(selected)}>
          {nl ? 'Laden' : 'Load'}
        </button>
        <button className="btn btn-sm" disabled={!selectedId || busy} onClick={handleUpdate} title={nl ? 'Overschrijf deze preset met de huidige instellingen' : 'Overwrite this preset with current settings'}>
          {nl ? 'Bijwerken' : 'Update'}
        </button>
        <button className="btn btn-sm" disabled={!selectedId || busy} style={{ color: 'var(--red-text)' }} onClick={handleDelete}>
          {nl ? 'Verwijder' : 'Delete'}
        </button>
        <button className="btn btn-sm" disabled={busy} onClick={() => { setShowSave(v => !v); setSaveName(''); }}>
          {nl ? 'Opslaan als…' : 'Save as…'}
        </button>
      </div>

      {showSave && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
          <input
            type="text"
            autoFocus
            placeholder={nl ? 'Naam voor nieuwe preset…' : 'New preset name…'}
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setShowSave(false); setSaveName(''); } }}
            style={{ flex: 1, fontSize: 12, padding: '5px 8px' }}
          />
          <button className="btn btn-sm btn-primary" disabled={!saveName.trim() || busy} onClick={handleSave}>
            {busy ? '…' : nl ? 'Opslaan' : 'Save'}
          </button>
          <button className="btn btn-sm" onClick={() => { setShowSave(false); setSaveName(''); }}>✕</button>
        </div>
      )}

      {presets.length === 0 && !err && (
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>
          {nl ? 'Geen presets — gebruik "Opslaan als…" om de huidige kolominstellingen op te slaan.' : 'No presets yet — use "Save as…" to save the current column settings.'}
        </div>
      )}
      {err && <div style={{ fontSize: 11, color: 'var(--red-text)', marginTop: 4 }}>⚠ {err}</div>}
    </div>
  );
}
