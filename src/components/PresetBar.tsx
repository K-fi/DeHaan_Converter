'use client';

import { useState, useEffect, useRef } from 'react';
import { useLang } from '../context/LangContext';
import { listPresets, createPreset, updatePreset, deletePreset, exportPresetsFile, importPresetsFile } from '../lib/presets';
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
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [confirmAction, setConfirmAction] = useState<'update' | 'delete' | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const nl = lang === 'nl';

  useEffect(() => { setPresets(listPresets(tool)); }, [tool]);

  const selected = presets.find(p => p.id === selectedId) ?? null;
  function refresh() { setPresets(listPresets(tool)); }

  function handleSave() {
    const name = saveName.trim();
    if (!name) return;
    try {
      const saved = createPreset(name, tool, getMappings());
      refresh();
      setSelectedId(saved.id);
      setShowSave(false); setSaveName('');
      setMsg({ text: nl ? `Preset "${saved.name}" opgeslagen.` : `Preset "${saved.name}" saved.`, ok: true });
    } catch (e) { setMsg({ text: (e as Error).message, ok: false }); }
  }

  function handleUpdate() {
    if (!selected) return;
    try {
      updatePreset(selected.id, selected.name, getMappings());
      refresh();
      setMsg({ text: nl ? `Preset "${selected.name}" bijgewerkt.` : `Preset "${selected.name}" updated.`, ok: true });
    } catch (e) { setMsg({ text: (e as Error).message, ok: false }); }
    setConfirmAction(null);
  }

  function handleDelete() {
    if (!selected) return;
    const name = selected.name;
    deletePreset(selected.id);
    refresh();
    setSelectedId('');
    setConfirmAction(null);
    setMsg({ text: nl ? `Preset "${name}" verwijderd.` : `Preset "${name}" deleted.`, ok: true });
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const count = await importPresetsFile(file, tool);
      refresh();
      setMsg({ text: nl ? `${count} preset(s) geïmporteerd.` : `${count} preset(s) imported.`, ok: true });
    } catch (e) { setMsg({ text: (e as Error).message, ok: false }); }
    finally { setBusy(false); e.target.value = ''; }
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
        <button className="btn btn-sm" disabled={!selectedId || busy} onClick={() => { setConfirmAction('update'); setShowSave(false); }} title={nl ? 'Overschrijf preset met huidige instellingen' : 'Overwrite preset with current settings'}>
          {nl ? 'Bijwerken' : 'Update'}
        </button>
        <button className="btn btn-sm" disabled={!selectedId || busy} style={{ color: 'var(--red-text)' }} onClick={() => { setConfirmAction('delete'); setShowSave(false); }}>
          {nl ? 'Verwijder' : 'Delete'}
        </button>
        <button className="btn btn-sm" disabled={busy} onClick={() => { setShowSave(v => !v); setSaveName(''); setConfirmAction(null); }}>
          {nl ? 'Opslaan als…' : 'Save as…'}
        </button>
        <button className="btn btn-sm" disabled={busy || presets.length === 0} onClick={() => exportPresetsFile(tool)} title={nl ? 'Download presets als JSON-bestand' : 'Download presets as JSON file'}>
          {nl ? 'Exporteren' : 'Export'}
        </button>
        <button className="btn btn-sm" disabled={busy} onClick={() => importRef.current?.click()} title={nl ? 'Laad presets uit JSON-bestand' : 'Load presets from JSON file'}>
          {nl ? 'Importeren' : 'Import'}
        </button>
        <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
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
            {nl ? 'Opslaan' : 'Save'}
          </button>
          <button className="btn btn-sm" onClick={() => { setShowSave(false); setSaveName(''); }}>✕</button>
        </div>
      )}

      {confirmAction && selected && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '7px 10px', background: confirmAction === 'delete' ? 'var(--red-bg, #fef2f2)' : 'var(--bg)', border: `0.5px solid ${confirmAction === 'delete' ? 'var(--red-text)' : 'var(--border-md)'}`, borderRadius: 'var(--radius-md)', flexWrap: 'wrap' }}>
          <span style={{ flex: 1, fontSize: 12, color: 'var(--text)' }}>
            {confirmAction === 'delete'
              ? (nl ? `Preset "${selected.name}" definitief verwijderen?` : `Permanently delete preset "${selected.name}"?`)
              : (nl ? `Preset "${selected.name}" overschrijven met huidige instellingen?` : `Overwrite preset "${selected.name}" with current settings?`)}
          </span>
          <button
            className="btn btn-sm"
            style={{ color: confirmAction === 'delete' ? 'var(--red-text)' : undefined, fontWeight: 600, flexShrink: 0 }}
            onClick={confirmAction === 'delete' ? handleDelete : handleUpdate}
          >
            {nl ? 'Bevestigen' : 'Confirm'}
          </button>
          <button className="btn btn-sm" style={{ flexShrink: 0 }} onClick={() => setConfirmAction(null)}>
            {nl ? 'Annuleren' : 'Cancel'}
          </button>
        </div>
      )}

      {presets.length === 0 && !msg && (
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>
          {nl ? 'Geen presets — gebruik "Opslaan als…" om de huidige kolominstellingen op te slaan.' : 'No presets yet — use "Save as…" to save the current column settings.'}
        </div>
      )}
      {msg && (
        <div style={{ fontSize: 11, color: msg.ok ? 'var(--green-text)' : 'var(--red-text)', marginTop: 4 }}>
          {msg.ok ? '✓' : '⚠'} {msg.text}
        </div>
      )}
    </div>
  );
}
