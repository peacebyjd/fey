import React, { useEffect, useState } from 'react';
import { JobRecord, PartsRequest, User } from '../../types';
import { StorageService } from '../../services/storage';
import {
  CheckCircle2,
  Info,
  Minus,
  PackageCheck,
  PhoneCall,
  Plus,
  ShoppingCart,
  Truck,
  X,
} from 'lucide-react';

interface PartsRequestModalProps {
  isOpen: boolean;
  job: JobRecord | null;
  currentUser: User;
  onClose: () => void;
}

const statusStyle = (status: PartsRequest['status']) => {
  if (status === 'Received') {
    return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  }
  if (status === 'Ordered Outside') {
    return 'bg-blue-50 text-blue-800 border-blue-200';
  }
  if (status === 'Issued') {
    return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  }
  if (status === 'Cancelled') {
    return 'bg-sand text-ink-muted border-line';
  }
  return 'bg-amber-50 text-amber-900 border-amber-300';
};

const statusRank = (status: PartsRequest['status']) => {
  if (status === 'Ordered Outside') return 0;
  if (status === 'Pending') return 1;
  if (status === 'Issued') return 2;
  if (status === 'Received') return 3;
  return 4;
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
  const [supplierPhone, setSupplierPhone] = useState('');
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
    setSupplierPhone('');
    setError(null);
    setNotice(null);
  }, [job?.id]);

  if (!isOpen || !job) return null;

  const jobRequests = requests
    .filter((request) => request.jobId === job.id)
    .sort(
      (a, b) =>
        statusRank(a.status) - statusRank(b.status) || b.requestedAt.localeCompare(a.requestedAt)
    );

  const activeOrders = jobRequests.filter((request) => request.status === 'Ordered Outside').length;

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
      supplierPhone,
      orderOutside: true,
    });
    if (!created) {
      setError('The order was not sent. Please check the part name and try again.');
      return;
    }

    setItemName('');
    setQuantity('1');
    setNote('');
    setSupplierPhone('');
    setNotice(`Ordered outside: ${created.quantity} x ${created.itemName}.`);
    setTimeout(() => setNotice(null), 3500);
  };

  const handleOrderOutside = (request: PartsRequest) => {
    setError(null);
    setNotice(null);
    const result = StorageService.updatePartsRequest(request.id, 'order-outside');
    if (!result.ok) {
      setError(result.error || 'Could not move this request to an outside order.');
      return;
    }
    setNotice(`${request.quantity} x ${request.itemName} sent to an outside shop.`);
    setTimeout(() => setNotice(null), 3500);
  };

  const handleMarkReceived = (request: PartsRequest) => {
    setError(null);
    setNotice(null);
    const result = StorageService.updatePartsRequest(request.id, 'mark-received');
    if (!result.ok) {
      setError(result.error || 'Could not mark this order received.');
      return;
    }
    setNotice(`${request.quantity} x ${request.itemName} marked received.`);
    setTimeout(() => setNotice(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 overflow-y-auto flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-line">
        <div className="p-4 border-b border-line flex items-start justify-between gap-3 bg-sand/40 rounded-t-2xl">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5" />
              Outside Parts Order
            </p>
            <h2 className="text-base font-bold text-ink mt-0.5 truncate">
              {job.jobNumber} · {job.plateNumber}
            </h2>
            <p className="text-xs text-ink-muted truncate">
              {job.vehicleMake} {job.vehicleModel} · {job.customerName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close parts order"
            className="p-2 text-ink-muted hover:text-ink hover:bg-sand rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4">
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-[11px] text-blue-950 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              This order is for <b>{job.plateNumber}</b> only. The Recorder sends it straight to
              the outside shop, then taps the green received icon when the part arrives. It does
              not go to the storekeeper.
            </p>
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
              <label
                htmlFor="parts-item"
                className="block text-[11px] font-bold uppercase tracking-wide text-ink-muted mb-1"
              >
                Part needed for this vehicle
              </label>
              <input
                id="parts-item"
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-1">
                <label
                  htmlFor="parts-qty"
                  className="block text-[11px] font-bold uppercase tracking-wide text-ink-muted mb-1"
                >
                  Qty
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
                    id="parts-qty"
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
              <div className="sm:col-span-2">
                <label
                  htmlFor="parts-phone"
                  className="block text-[11px] font-bold uppercase tracking-wide text-ink-muted mb-1"
                >
                  Shop phone — for calling (optional)
                </label>
                <div className="relative">
                  <input
                    id="parts-phone"
                    type="tel"
                    inputMode="tel"
                    value={supplierPhone}
                    onChange={(event) => setSupplierPhone(event.target.value)}
                    placeholder="+251 911 000 000"
                    className="w-full px-3 pr-12 py-2.5 text-sm font-mono bg-white border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
                  />
                  {supplierPhone.trim() && (
                    <a
                      href={`tel:${supplierPhone.trim()}`}
                      title={`Call ${supplierPhone.trim()}`}
                      aria-label={`Call ${supplierPhone.trim()}`}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-700 hover:bg-emerald-100 flex items-center justify-center"
                    >
                      <PhoneCall className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="parts-note"
                className="block text-[11px] font-bold uppercase tracking-wide text-ink-muted mb-1"
              >
                Shop name / note (optional)
              </label>
              <input
                id="parts-note"
                type="text"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Shop name, brand, urgency..."
                className="w-full px-3 py-2.5 text-sm bg-white border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-bold cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              Send order to outside shop
            </button>
          </form>

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-xs font-bold text-ink flex items-center gap-1.5">
                <PackageCheck className="w-4 h-4 text-brand" />
                Orders for this vehicle
              </h3>
              <span className="text-[10px] text-ink-muted">
                {activeOrders > 0
                  ? `${activeOrders} waiting for arrival`
                  : `${jobRequests.length} total`}
              </span>
            </div>

            {jobRequests.length > 0 ? (
              <div className="border border-line rounded-xl divide-y divide-line overflow-hidden">
                {jobRequests.map((request) => {
                  const isWaiting = request.status === 'Ordered Outside';
                  const isReceived = request.status === 'Received';
                  return (
                    <div
                      key={request.id}
                      className="px-3 py-2.5 bg-white flex items-start gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-bold text-ink">
                            {request.quantity} x {request.itemName}
                          </p>
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${statusStyle(
                              request.status
                            )}`}
                          >
                            {request.status === 'Ordered Outside' ? 'Ordered outside' : request.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-ink-muted mt-0.5">
                          Ordered by {request.requestedBy} · {request.requestedAt}
                        </p>
                        {request.note && (
                          <p className="text-[10px] text-ink-muted mt-0.5">Note: {request.note}</p>
                        )}
                        {request.supplierPhone && (
                          <p className="text-[10px] text-ink-muted mt-0.5">
                            Shop phone:{' '}
                            <a
                              href={`tel:${request.supplierPhone}`}
                              className="font-mono font-semibold text-brand hover:underline"
                            >
                              {request.supplierPhone}
                            </a>
                          </p>
                        )}
                        {(isReceived || isWaiting) && request.handledBy && (
                          <p className="text-[10px] text-ink-muted mt-0.5">
                            {isReceived ? 'Received by' : 'Handled by'} {request.handledBy}
                            {request.handledAt ? ` · ${request.handledAt}` : ''}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        {request.supplierPhone && (
                          <a
                            href={`tel:${request.supplierPhone}`}
                            title={`Call shop ${request.supplierPhone}`}
                            aria-label={`Call shop ${request.supplierPhone}`}
                            className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-line text-brand hover:bg-sand/60 hover:border-brand/40 transition"
                          >
                            <PhoneCall className="w-4 h-4" />
                          </a>
                        )}

                        {isWaiting ? (
                          <button
                            type="button"
                            onClick={() => handleMarkReceived(request)}
                            title="Mark as received"
                            aria-label={`Mark ${request.itemName} as received`}
                            className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-500 transition cursor-pointer"
                          >
                            <PackageCheck className="w-5 h-5" />
                          </button>
                        ) : request.status === 'Pending' ? (
                          <button
                            type="button"
                            onClick={() => handleOrderOutside(request)}
                            title="Send this request to an outside shop"
                            aria-label={`Order ${request.itemName} outside`}
                            className="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-50 border border-blue-300 text-blue-700 hover:bg-blue-100 hover:border-blue-500 transition cursor-pointer"
                          >
                            <Truck className="w-5 h-5" />
                          </button>
                        ) : isReceived ? (
                          <span
                            className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600"
                            title="Received"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-ink-muted text-center py-5 border border-dashed border-line rounded-xl">
                No parts ordered yet. Orders show here, and you mark each one received when it
                arrives.
              </p>
            )}
          </div>

          <p className="text-[10px] text-ink-muted">
            Signed in as {currentUser.name}. The manager gets a notification for every outside
            order and received part.
          </p>
        </div>
      </div>
    </div>
  );
};
