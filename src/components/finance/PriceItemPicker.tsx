import React, { useState } from 'react';
import { PriceItem } from '../../types';
import { Plus, X, Pencil, Check } from 'lucide-react';

interface PriceItemPickerProps {
  catalog: PriceItem[];
  value: PriceItem[];
  onChange: (items: PriceItem[]) => void;
  currency: string;
}

/**
 * Simple tap-to-add fixed price list.
 * Tap an item to add it, tap again to remove it.
 * Tap the pencil to change a price for this job. The total updates automatically.
 */
export const PriceItemPicker: React.FC<PriceItemPickerProps> = ({
  catalog,
  value,
  onChange,
  currency,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [customAmount, setCustomAmount] = useState('');

  const total = value.reduce((sum, item) => sum + (item.amount || 0), 0);
  const isSelected = (id: string) => value.some((v) => v.id === id);

  const add = (item: PriceItem) => onChange([...value, { ...item }]);
  const remove = (id: string) => onChange(value.filter((v) => v.id !== id));

  const customAmountNumber = parseFloat(customAmount);
  const canAddCustom =
    customName.trim().length > 0 && Number.isFinite(customAmountNumber) && customAmountNumber > 0;

  const addCustom = () => {
    if (!canAddCustom) return;
    onChange([
      ...value,
      {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: customName.trim(),
        amount: customAmountNumber,
      },
    ]);
    setCustomName('');
    setCustomAmount('');
  };

  const startEdit = (item: PriceItem) => {
    setEditingId(item.id);
    setEditValue(String(item.amount));
  };

  const saveEdit = () => {
    const amount = parseFloat(editValue) || 0;
    onChange(value.map((v) => (v.id === editingId ? { ...v, amount } : v)));
    setEditingId(null);
  };

  return (
    <div className="space-y-3">
      {/* Catalog */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {catalog.map((item) => {
          const active = isSelected(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => (active ? remove(item.id) : add(item))}
              className={`flex items-center justify-between gap-2 px-3 py-3 rounded-xl border text-left transition cursor-pointer ${
                active
                  ? 'bg-brand text-white border-brand shadow-soft'
                  : 'bg-white text-ink border-line hover:border-brand hover:bg-sand/40'
              }`}
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold truncate">{item.name}</span>
                <span
                  className={`block text-xs font-mono tabular-nums ${
                    active ? 'text-sand/90' : 'text-ink-muted'
                  }`}
                >
                  {item.amount.toLocaleString()} {currency}
                </span>
              </span>
              {active ? (
                <X className="w-4 h-4 shrink-0" />
              ) : (
                <Plus className="w-4 h-4 shrink-0 opacity-70" />
              )}
            </button>
          );
        })}

        {catalog.length === 0 && (
          <p className="col-span-full text-xs text-ink-muted italic py-2">
            No price items yet. Ask the Admin to add items to the list.
          </p>
        )}
      </div>

      {/* Add a one-off line for this vehicle */}
      <div className="rounded-xl border border-dashed border-line bg-sand/20 p-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold text-ink">Add a price line</p>
          <span className="text-[10px] text-ink-muted">This vehicle only</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addCustom();
            }}
            placeholder="Price name"
            className="flex-1 min-w-0 px-3 py-2.5 text-sm bg-white border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <input
            type="number"
            min="0"
            step="1"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addCustom();
            }}
            placeholder={`Amount (${currency})`}
            className="sm:w-44 px-3 py-2.5 text-sm font-mono tabular-nums bg-white border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!canAddCustom}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-sm font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Selected items (editable) */}
      {value.length > 0 && (
        <div className="border border-line rounded-xl divide-y divide-line overflow-hidden">
          {value.map((item) => (
            <div key={item.id} className="flex items-center gap-2 px-3 py-2 bg-white">
              <span className="flex-1 min-w-0 flex items-center gap-2">
                <span className="text-sm font-semibold text-ink truncate">{item.name}</span>
                {item.action ? (
                  <span
                    className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                      item.action === 'Replace'
                        ? 'bg-brand/10 text-brand border border-brand/30'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {item.action}
                  </span>
                ) : (
                  <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium text-ink-muted bg-sand border border-line">
                    Extra
                  </span>
                )}
              </span>

              {editingId === item.id ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="w-24 px-2 py-1 text-sm font-mono tabular-nums border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                  <button
                    type="button"
                    onClick={saveEdit}
                    title="Save price"
                    className="p-1.5 rounded-lg bg-brand text-white cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="font-mono text-sm text-ink tabular-nums">
                    {item.amount.toLocaleString()} {currency}
                  </span>
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    title="Edit price"
                    className="p-1.5 rounded-lg text-ink-muted hover:text-brand hover:bg-coral/10 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    title="Remove"
                    className="p-1.5 rounded-lg text-ink-muted hover:text-coral hover:bg-coral/10 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-brand text-white">
        <span className="text-sm font-semibold">Total</span>
        <span className="text-xl font-mono font-bold tabular-nums">
          {total.toLocaleString()} {currency}
        </span>
      </div>
    </div>
  );
};
