import React, { useEffect, useState } from 'react';
import { JobRecord, PartsRequest, User } from '../../types';
import { StorageService } from '../../services/storage';
import { CheckCircle2, Minus, PackagePlus, Plus, Send, X } from 'lucide-react';

interface PartsRequestModalProps {
  isOpen: boolean;
  job: JobRecord | null;
  currentUser: User;
  onClose: () => void;
}

const statusStyle = (status: PartsRequest['status']) => {
  if (status === 'Issued' || status === 'Received') {
    return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  }
  if (status === 'Ordered Outside') {
    return 'bg-blue-50 text-blue-800 border-blue-200';
  }
  if (status === 'Cancelled') {
    return 'bg-sand text-ink-muted border-line';
  }
  return 'bg-amber-50 text-amber-900 border-amber-300';
};

export const PartsRequestModal: React.FC<PartsRequestModalProps> = ({
  isOpen,
  job,
  currentUser,
  onClose,
}) => {
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [materials, setMaterials] = useState(() => StorageService.getMaterials());
  const [requests, setRequests] = useState<PartsRequest[]>(() => StorageService.getPartsRequests());

  useEffect(() => {
    const refresh = () => {
      setMaterials(StorageService.getMaterials());
      setRequests(StorageService.getPartsRequests());
    };
    refresh();
    return StorageService.subscribe(refresh);
  }, []);

  useEffect(() => {
    setItemName('');
    setQuantity('1');
    setNote('');
    setError(null);
    setNotice(null);
  }, [job?.id]);

  if (!isOpen || !job) return null;

  const jobRequests = requests.filter((request) => request.jobId === job.id);
  const stock = materials.find(
    (material) => material.name.trim().toLowerCase() === itemName.trim().toLowerCase()
  );

  const changeQuantity = (delta: number) => {
    const current = parseInt(quantity, 10);
    const next = Math.max(1, (Number.isFinite(current) ? current : 1) + delta);
    setQuantity(String(next));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const amount = Math.floor(Number(quantity));
    if (!itemName.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError('Write the part name and a quantity of at least 1.');
      return;
    }

    const created = StorageService.addPartsRequest({
      jobId: job.id,
      itemName,
      quantity: amount,
      note,
    });
    if (!created) {
      setError('The request was not sent. Please check the part name and try again.');
      return;
    }

    setItemName('');
    setQuantity('1');
    setNote('');
    setNotice(`Sent to Store: ${created.quantity} x ${created.itemName}.`);
    setTimeout(() => setNotice(null), 3200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 overflow-y-auto flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-line">
        <div className="p-4 border-b border-line flex items-start justify-between gap-3 bg-sand/40 rounded-t-2xl">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand">
              Parts Request
            </p>
            <h2 className="text-base font-bold text-ink mt-0.5">
              {job.jobNumber} - {job.plateNumber}
            </h2>
            <p className="text-xs text-ink-muted">
              {job.vehicleMake} {job.vehicleModel} / {job.customerName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-ink-muted hover:text-ink hover:bg-sand rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4">
          <div className="p-3 rounded-xl bg-sand/40 border border-line text-[11px] text-ink-muted">
            Send the part to the Store. The Store Keeper will issue it from stock or order it
            outside if it is not available.
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-coral/10 border border-coral/30 text-coral text-xs font-semibold">
              {error}
            </div>
          )}
          {notice && (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {notice}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-ink-muted mb-1">
                Part or material
              </label>
              <input
                type="text"
                list={`parts-materials-${job.id}`}
                value={itemName}
                onChange={(event) => setItemName(event.target.value)}
                placeholder="e.g. Front brake pad set"
                className="w-full px-3 py-2.5 text-sm bg-white border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
              />
              <datalist id={`parts-materials-${job.id}`}>
                {materials.map((material) => (
                  <option key={material.id} value={material.name} />
                ))}
              </datalist>
              {stock ? (
                <p className="text-[11px] text-ink-muted mt-1">
                  In store: <strong className="text-emerald-700">{stock.quantity}</strong> {stock.unit}
                  {stock.location ? ` / ${stock.location}` : ''}
                </p>
              ) : itemName.trim() ? (
                <p className="text-[11px] text-amber-700 mt-1">
                  Not found in store stock. The Store Keeper can order it outside.
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="block text-[11px] font-bold uppercase tracking-wide text-ink-muted mb-1">
                  Quantity
                </label>
                <div className="flex items-stretch gap-1">
                  <button
                    type="button"
                    onClick={() => changeQuantity(-1)}
                    disabled={parseInt(quantity, 10) <= 1}
                    className="w-9 flex items-center justify-center bg-white border border-line hover:bg-sand/50 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg cursor-pointer"
                    title="Less"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    className="min-w-0 flex-1 px-2 py-2.5 text-sm text-center font-mono tabular-nums bg-white border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
                  />
                  <button
                    type="button"
                    onClick={() => changeQuantity(1)}
                    className="w-9 flex items-center justify-center bg-brand text-white hover:bg-brand-hover rounded-lg cursor-pointer"
                    title="More"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wide text-ink-muted mb-1">
                  Note (optional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Size, brand, urgency..."
                  className="w-full px-3 py-2.5 text-sm bg-white border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-bold cursor-pointer"
            >
              <Send className="w-4 h-4" />
              Send to Store
            </button>
          </form>

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-xs font-bold text-ink flex items-center gap-1.5">
                <PackagePlus className="w-4 h-4 text-brand" />
                Requests for this vehicle
              </h3>
              <span className="text-[10px] text-ink-muted">{jobRequests.length}</span>
            </div>

            {jobRequests.length > 0 ? (
              <div className="border border-line rounded-xl divide-y divide-line overflow-hidden">
                {jobRequests.map((request) => (
                  <div key={request.id} className="px-3 py-2.5 bg-white">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-ink">
                          {request.quantity} x {request.itemName}
                        </p>
                        <p className="text-[10px] text-ink-muted">
                          By {request.requestedBy} / {request.requestedAt}
                        </p>
                        {request.note && (
                          <p className="text-[10px] text-ink-muted mt-0.5">Note: {request.note}</p>
                        )}
                      </div>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-bold ${statusStyle(
                          request.status
                        )}`}
                      >
                        {request.status}
                      </span>
                    </div>
                    {request.handledBy && (
                      <p className="text-[10px] text-ink-muted mt-1">
                        Handled by {request.handledBy} / {request.handledAt}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-ink-muted text-center py-5 border border-dashed border-line rounded-xl">
                No parts requested yet. Sent requests show here with their status.
              </p>
            )}
          </div>

          <p className="text-[10px] text-ink-muted">
            Requested by {currentUser.name}. The Store Keeper also gets a notification.
          </p>
        </div>
      </div>
    </div>
  );
};
