/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Package,
  UserCheck,
  RotateCcw,
  Edit3,
  Trash2,
  GripVertical,
  AlertTriangle,
  XCircle,
  Wrench,
  Search,
  Boxes,
  Minus,
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  useLongPressDrag,
  DragPreview,
  type DragPayload,
} from '../../hooks/useLongPressDrag';
import {
  MaterialIssueRecord,
  MaterialItem,
  MechanicStaff,
  MechanicTeam,
  ToolCategory,
  ToolCheckoutRecord,
  User,
  WorkshopTool,
} from '../../types';

interface StoreDashboardProps {
  currentUser: User;
}

const TOOL_CATEGORIES: ToolCategory[] = [
  'Wrench',
  'Power',
  'Diagnostic',
  'Lifting',
  'Body',
  'Other',
];

const emptyDraft = {
  code: '',
  name: '',
  category: 'Wrench' as ToolCategory,
  totalQuantity: 1,
  availableQuantity: 1,
  condition: 'Good' as WorkshopTool['condition'],
  locationRack: '',
};

const emptyMaterialDraft = {
  name: '',
  quantity: 1,
  unit: 'Piece',
  location: '',
};

export const StoreDashboard: React.FC<StoreDashboardProps> = ({ currentUser }) => {
  const { t } = useLanguage();
  const [view, setView] = useState<'tools' | 'materials'>('tools');
  const [tools, setTools] = useState<WorkshopTool[]>(() => StorageService.getWorkshopTools());
  const [checkouts, setCheckouts] = useState<ToolCheckoutRecord[]>(() => StorageService.getToolCheckouts());
  const [materials, setMaterials] = useState<MaterialItem[]>(() => StorageService.getMaterials());
  const [materialIssues, setMaterialIssues] = useState<MaterialIssueRecord[]>(() =>
    StorageService.getMaterialIssues()
  );
  const [mechanics, setMechanics] = useState<MechanicStaff[]>(() => StorageService.getMechanics());
  const [teams, setTeams] = useState<MechanicTeam[]>(() => StorageService.getTeams());

  const [isToolModalOpen, setIsToolModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<WorkshopTool | null>(null);
  const [draft, setDraft] = useState({ ...emptyDraft });
  const [toolError, setToolError] = useState<string | null>(null);

  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null);
  const [materialDraft, setMaterialDraft] = useState({ ...emptyMaterialDraft });
  const [materialError, setMaterialError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | ToolCategory>('All');
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeKind, setNoticeKind] = useState<'ok' | 'error'>('ok');

  const isAdmin = currentUser.role === 'admin';
  const canIssue = currentUser.role === 'admin' || currentUser.role === 'storekeeper';

  type StoreDragPayload = DragPayload & { kind: 'tool' | 'material' };
  const { drag, activeTarget, startDrag, shouldIgnoreClick } = useLongPressDrag<StoreDragPayload>({
    onDrop: (payload, targetId) => {
      if (!targetId) return;
      const mechanic = mechanics.find((m) => m.id === targetId);
      if (!mechanic) return;
      if (payload.kind === 'tool') {
        const tool = tools.find((item) => item.id === payload.id);
        if (tool) issueToolToMechanic(tool, mechanic);
      } else {
        const material = materials.find((item) => item.id === payload.id);
        if (material) issueMaterialToMechanic(material, mechanic, 1);
      }
    },
  });

  useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setTools(StorageService.getWorkshopTools());
      setCheckouts(StorageService.getToolCheckouts());
      setMaterials(StorageService.getMaterials());
      setMaterialIssues(StorageService.getMaterialIssues());
      setMechanics(StorageService.getMechanics());
      setTeams(StorageService.getTeams());
    });
    return unsub;
  }, []);

  const flash = (msg: string, kind: 'ok' | 'error' = 'ok') => {
    setNoticeKind(kind);
    setNotice(msg);
    setTimeout(() => setNotice(null), 3200);
  };

  const filteredTools = useMemo(
    () =>
      tools.filter((t) => {
        const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
        const q = search.toLowerCase();
        const matchesSearch =
          !q ||
          t.name.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q) ||
          t.locationRack.toLowerCase().includes(q);
        return matchesCategory && matchesSearch;
      }),
    [tools, search, categoryFilter]
  );

  const filteredMaterials = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return materials;
    return materials.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.location.toLowerCase().includes(q) ||
        m.unit.toLowerCase().includes(q)
    );
  }, [materials, search]);

  const activeMechanics = mechanics.filter((m) => m.isActive);
  const activeCheckouts = checkouts.filter((c) => c.status === 'Checked Out' || c.status === 'Overdue');
  const outstandingForMechanic = (m: MechanicStaff) => activeCheckouts.filter((c) => c.mechanicId === m.id);
  const issuedCount = activeCheckouts.reduce((sum, c) => sum + (c.quantity || 1), 0);

  const activeMaterialIssues = materialIssues.filter((issue) => issue.status === 'Issued');
  const outstandingMaterialsForMechanic = (m: MechanicStaff) =>
    activeMaterialIssues.filter((issue) => issue.mechanicId === m.id);
  const issuedMaterialCount = activeMaterialIssues.reduce((sum, issue) => sum + issue.quantity, 0);

  const issueToolToMechanic = (tool: WorkshopTool, mechanic: MechanicStaff) => {
    if (!canIssue) return;
    if (tool.availableQuantity <= 0) {
      flash(`${tool.code} has none left to give out.`);
      return;
    }
    const team = teams.find((t) => t.id === mechanic.teamId);
    const record = StorageService.checkoutTool(
      tool.id,
      mechanic.id,
      mechanic.name,
      mechanic.teamId,
      team?.name,
      currentUser.name,
      undefined,
      undefined,
      1
    );
    if (record) {
      flash(`Gave ${tool.code} to ${mechanic.name}.`);
    } else {
      flash(`${tool.code} could not be given out.`);
    }
  };

  const handleReturn = (checkout: ToolCheckoutRecord, disposition: 'Returned' | 'Damaged' | 'Lost') => {
    const words = { Returned: 'is back in the store', Damaged: 'is marked damaged', Lost: 'is marked lost' } as const;
    const condition = disposition === 'Returned' ? 'Good' : 'Damaged / Needs Repair';
    StorageService.returnTool(checkout.id, currentUser.name, disposition, condition, `Marked ${disposition}`);
    flash(`${checkout.toolCode} ${words[disposition]}.`);
  };

  const handleOpenAddTool = () => {
    setEditingTool(null);
    setDraft({ ...emptyDraft });
    setToolError(null);
    setIsToolModalOpen(true);
  };

  const handleOpenEditTool = (tool: WorkshopTool) => {
    if (!isAdmin) return;
    setEditingTool(tool);
    setDraft({
      code: tool.code,
      name: tool.name,
      category: tool.category,
      totalQuantity: tool.totalQuantity,
      availableQuantity: tool.availableQuantity,
      condition: tool.condition,
      locationRack: tool.locationRack,
    });
    setToolError(null);
    setIsToolModalOpen(true);
  };

  const handleSaveTool = () => {
    if (!draft.code.trim() || !draft.name.trim() || !draft.locationRack.trim()) {
      setToolError('Please fill in the code, name and where it is kept.');
      return;
    }
    const qty = Math.max(0, Number(draft.totalQuantity));
    const avail = Math.max(0, Math.min(qty, Number(draft.availableQuantity)));
    const base: WorkshopTool = {
      id: editingTool?.id || `tool_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      code: draft.code.trim(),
      name: draft.name.trim(),
      category: draft.category,
      description: editingTool?.description || '',
      totalQuantity: qty,
      availableQuantity: avail,
      condition: draft.condition,
      locationRack: draft.locationRack.trim(),
      addedAt: editingTool?.addedAt || new Date().toISOString(),
      addedBy: currentUser.name,
    };
    if (editingTool) {
      StorageService.updateWorkshopTool(base);
      flash(`${base.code} saved.`);
    } else {
      StorageService.addWorkshopTool(base);
      flash(`${base.code} added to the store.`);
    }
    setIsToolModalOpen(false);
  };

  const handleDeleteTool = (tool: WorkshopTool) => {
    if (!isAdmin) return;
    if (confirm(`Remove ${tool.code} - ${tool.name}?`)) {
      StorageService.deleteWorkshopTool(tool.id);
      flash(`${tool.code} removed.`);
    }
  };

  const handleOpenAddMaterial = () => {
    setEditingMaterial(null);
    setMaterialDraft({ ...emptyMaterialDraft });
    setMaterialError(null);
    setIsMaterialModalOpen(true);
  };

  const handleOpenEditMaterial = (material: MaterialItem) => {
    if (!isAdmin) return;
    setEditingMaterial(material);
    setMaterialDraft({
      name: material.name,
      quantity: material.quantity,
      unit: material.unit,
      location: material.location,
    });
    setMaterialError(null);
    setIsMaterialModalOpen(true);
  };

  const handleSaveMaterial = () => {
    if (!materialDraft.name.trim() || !materialDraft.location.trim()) {
      setMaterialError('Please fill in the name and where it is kept.');
      return;
    }
    const quantity = editingMaterial
      ? Math.max(0, Number(materialDraft.quantity) || 0)
      : Math.max(1, Number(materialDraft.quantity) || 1);
    if (editingMaterial) {
      StorageService.updateMaterial({
        ...editingMaterial,
        name: materialDraft.name.trim(),
        quantity,
        unit: materialDraft.unit.trim() || 'Piece',
        location: materialDraft.location.trim(),
      });
      flash(`${materialDraft.name.trim()} saved.`);
    } else {
      StorageService.addMaterial({
        name: materialDraft.name.trim(),
        quantity,
        unit: materialDraft.unit.trim() || 'Piece',
        location: materialDraft.location.trim(),
        addedBy: currentUser.name,
      });
      flash(`${materialDraft.name.trim()} added to the store.`);
    }
    setIsMaterialModalOpen(false);
  };

  const handleDeleteMaterial = (material: MaterialItem) => {
    if (!isAdmin) return;
    if (confirm(`Remove ${material.name}?`)) {
      StorageService.deleteMaterial(material.id);
      flash(`${material.name} removed.`);
    }
  };

  const handleAdjustMaterial = (material: MaterialItem, delta: number) => {
    if (!canIssue) return;
    const updated = StorageService.adjustMaterialQuantity(material.id, delta);
    if (updated) {
      flash(`${updated.name}: ${updated.quantity} ${updated.unit} in store.`);
    }
  };

  const issueMaterialToMechanic = (
    material: MaterialItem,
    mechanic: MechanicStaff,
    quantity: number
  ) => {
    if (!canIssue) return;
    if (material.quantity <= 0) {
      flash(`${material.name} is out of stock.`);
      return;
    }
    const qty = Math.max(1, Math.min(Math.floor(quantity) || 1, material.quantity));
    const team = teams.find((t) => t.id === mechanic.teamId);
    const record = StorageService.issueMaterial({
      materialId: material.id,
      mechanicId: mechanic.id,
      mechanicName: mechanic.name,
      teamId: mechanic.teamId,
      teamName: team?.name,
      issuedByStaffName: currentUser.name,
      quantity: qty,
    });
    if (record) {
      flash(`Gave ${qty} ${material.unit} of ${material.name} to ${mechanic.name}.`);
    } else {
      flash(`Could not give ${material.name} out. Check the stock quantity.`, 'error');
    }
  };

  const handleReturnMaterialIssue = (issue: MaterialIssueRecord) => {
    const ok = StorageService.returnMaterial(issue.id, currentUser.name);
    if (ok) {
      flash(`${issue.quantity} ${issue.unit} of ${issue.materialName} returned to stock.`);
    } else {
      flash('Could not return this material.', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Simple header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-card shadow-soft border border-line p-3.5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-card bg-brand flex items-center justify-center text-white shadow-soft">
            {view === 'tools' ? (
              <Package className="w-5 h-5" />
            ) : (
              <Boxes className="w-5 h-5" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-ink">
              {view === 'tools' ? t('store.titleTools') : t('store.titleMaterials')}
            </h2>
            <p className="text-xs text-ink-muted">
              {view === 'tools' ? t('store.descTools') : t('store.descMaterials')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-sand/60 border border-line rounded-card p-1">
            <button
              onClick={() => setView('tools')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                view === 'tools' ? 'bg-brand text-white' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {t('store.tools')}
            </button>
            <button
              onClick={() => setView('materials')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                view === 'materials' ? 'bg-brand text-white' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {t('store.materials')}
            </button>
          </div>
          {view === 'tools' && (
            <span className="text-[11px] font-semibold text-ink-muted bg-sand/60 border border-line rounded-card px-3 py-2">
              {t('store.outNow', { count: issuedCount })}
            </span>
          )}
          {view === 'materials' && (
            <span className="text-[11px] font-semibold text-ink-muted bg-sand/60 border border-line rounded-card px-3 py-2">
              {t('store.givenOut', { count: issuedMaterialCount })}
            </span>
          )}
          {isAdmin && view === 'tools' && (
            <button
              onClick={handleOpenAddTool}
              className="px-3.5 py-2.5 bg-brand hover:bg-brand-hover text-white rounded-card text-sm font-semibold flex items-center gap-1.5 cursor-pointer shadow-soft"
            >
              <Plus className="w-4 h-4" /> {t('store.addTool')}
            </button>
          )}
          {isAdmin && view === 'materials' && (
            <button
              onClick={handleOpenAddMaterial}
              className="px-3.5 py-2.5 bg-brand hover:bg-brand-hover text-white rounded-card text-sm font-semibold flex items-center gap-1.5 cursor-pointer shadow-soft"
            >
              <Plus className="w-4 h-4" /> {t('store.addMaterial')}
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div
          className={`text-xs px-3 py-2 rounded-card font-medium border ${
            noticeKind === 'error'
              ? 'text-coral bg-coral/10 border-coral/30'
              : 'text-emerald-900 bg-emerald-50 border-emerald-300'
          }`}
        >
          {notice}
        </div>
      )}

      {view === 'tools' && (
      <div className="grid lg:grid-cols-12 gap-3">
        {/* Tools (big, easy cards) */}
        <div className="lg:col-span-7 bg-white rounded-card border border-line shadow-soft flex flex-col lg:max-h-[70vh]">
          <div className="p-3 border-b border-line">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-brand" />
                <h3 className="text-sm font-bold text-ink">{t('store.tools')}</h3>
              </div>
              <span className="text-[10px] text-ink-muted">{t('store.toolsCount', { count: filteredTools.length })}</span>
            </div>
            <p className="text-[10px] text-brand font-semibold mb-2 flex items-center gap-1">
              <GripVertical className="w-3 h-3" />
              {t('store.dragToolHint')}
            </p>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-ink-muted/70 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('store.searchTool')}
                className="w-full pl-8 pr-2 py-2 text-xs bg-cream border border-line rounded-card focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
              />
            </div>
            <div className="mt-2 flex gap-1.5 overflow-x-auto smooth-scroll pb-0.5">
              {(['All', ...TOOL_CATEGORIES] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-semibold border transition cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-brand text-white border-brand'
                      : 'bg-white text-ink-muted border-line hover:bg-sand/50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 overflow-y-auto smooth-scroll">
            <div className="grid sm:grid-cols-2 gap-2.5">
              {filteredTools.map((tool) => {
                const noneLeft = tool.availableQuantity <= 0;
                const canDrag = canIssue && !noneLeft;
                return (
                  <div
                    key={tool.id}
                    onPointerDown={(e) =>
                      startDrag(
                        e,
                        {
                          id: tool.id,
                          label: tool.name,
                          subLabel: `${tool.code} · ${tool.availableQuantity} available`,
                          kind: 'tool',
                        },
                        !canDrag
                      )
                    }
                    onContextMenu={(e) => e.preventDefault()}
                    className={`rounded-card border p-3 flex flex-col justify-between transition select-none ${
                      canDrag ? 'cursor-grab active:cursor-grabbing touch-pan-y' : ''
                    } ${
                      noneLeft
                        ? 'border-line bg-sand/30 opacity-70'
                        : 'border-line bg-white hover:bg-sand/40'
                    }`}
                    title={noneLeft ? t('store.outOfStock') : t('store.dragToolHint')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-ink text-sm leading-tight truncate">{tool.name}</p>
                        <p className="text-[10px] text-ink-muted mt-0.5 font-mono truncate">
                          {tool.code} · {tool.locationRack}
                        </p>
                      </div>
                      {canDrag && (
                        <GripVertical className="w-4 h-4 text-ink-muted/50 shrink-0" />
                      )}
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold ${
                          noneLeft
                            ? 'text-coral bg-coral/10 border-coral/40'
                            : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                        }`}
                      >
                        {t('store.available', { available: tool.availableQuantity, total: tool.totalQuantity })}
                      </span>
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditTool(tool);
                            }}
                            className="h-7 w-7 flex items-center justify-center bg-white border border-line hover:bg-sand/50 rounded-lg cursor-pointer"
                            title={t('common.edit')}
                          >
                            <Edit3 className="w-3.5 h-3.5 text-ink-muted" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTool(tool);
                            }}
                            className="h-7 w-7 flex items-center justify-center bg-white border border-line hover:bg-coral/10 rounded-lg cursor-pointer"
                            title={t('common.remove')}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-coral" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredTools.length === 0 && (
                <div className="sm:col-span-2 text-[11px] text-ink-muted text-center py-6 border border-dashed border-line rounded-card">
                  {t('store.noTools')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mechanics (simple boxes) */}
        <div className="lg:col-span-5 bg-white rounded-card border border-line shadow-soft flex flex-col lg:max-h-[70vh]">
          <div className="p-3 border-b border-line flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-brand" />
            <h3 className="text-sm font-bold text-ink">{t('store.mechanics')}</h3>
            <span className="text-[10px] text-ink-muted">({t('store.dropHere')})</span>
          </div>
          <div className="p-3 overflow-y-auto smooth-scroll">
            <div className="grid grid-cols-1 gap-2.5">
              {activeMechanics.map((m) => {
                const out = outstandingForMechanic(m);
                const team = teams.find((t) => t.id === m.teamId);
                const isTarget = drag?.payload.kind === 'tool' && activeTarget === m.id;
                return (
                  <div
                    key={m.id}
                    data-drop-target={m.id}
                    className={`border rounded-card flex flex-col overflow-hidden transition ${
                      isTarget
                        ? 'border-brand ring-2 ring-brand/50 bg-coral/5'
                        : drag?.payload.kind === 'tool'
                        ? 'border-dashed border-brand/50'
                        : 'border-line'
                    }`}
                  >
                    <div className="bg-brand text-white px-2.5 py-2 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{m.name}</p>
                        <p className="text-[10px] opacity-80 truncate">
                          {m.specialty}
                          {team ? ` · ${team.name}` : ''}
                        </p>
                      </div>
                      <span className="text-[10px] bg-white/20 rounded-full px-2 py-0.5 shrink-0 font-semibold">
                        {out.length} tool{out.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="p-2 space-y-1.5 bg-sand/30">
                      {out.map((c) => (
                        <div
                          key={c.id}
                          className="bg-white border border-line rounded-lg p-2 text-[11px] flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-ink font-mono">
                              {c.toolCode} x{c.quantity || 1}
                            </div>
                            <div className="text-ink-muted truncate">{c.toolName}</div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReturn(c, 'Returned');
                              }}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                              title={t('store.backToStore')}
                            >
                              <RotateCcw className="w-3 h-3" /> Return
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReturn(c, 'Damaged');
                              }}
                              className="h-7 w-7 flex items-center justify-center bg-white border border-coral/40 rounded-md cursor-pointer"
                              title={t('store.damaged')}
                            >
                              <AlertTriangle className="w-3.5 h-3.5 text-coral" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReturn(c, 'Lost');
                              }}
                              className="h-7 w-7 flex items-center justify-center bg-white border border-line rounded-md cursor-pointer"
                              title={t('store.lost')}
                            >
                              <XCircle className="w-3.5 h-3.5 text-ink-muted" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {out.length === 0 && (
                        <div
                          className={`text-[10px] text-center py-4 border border-dashed rounded-lg ${
                            drag?.payload.kind === 'tool'
                              ? 'border-brand text-brand font-semibold'
                              : 'border-line text-ink-muted/70'
                          }`}
                        >
                          {canIssue ? t('store.dropHere') : t('store.noToolsOut')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {activeMechanics.length === 0 && (
                <div className="text-[11px] text-ink-muted">{t('store.noMechanics')}</div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {view === 'materials' && (
        <div className="grid lg:grid-cols-12 gap-3">
          {/* Materials */}
          <div className="lg:col-span-7 bg-white rounded-card border border-line shadow-soft flex flex-col lg:max-h-[70vh]">
            <div className="p-3 border-b border-line space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-brand" />
                  <h3 className="text-sm font-bold text-ink">{t('store.materials')}</h3>
                </div>
                <span className="text-[10px] text-ink-muted">
                  {t('store.itemsCount', { count: filteredMaterials.length })}
                </span>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-ink-muted/70 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('store.searchMaterial')}
                  className="w-full pl-8 pr-2 py-2 text-xs bg-cream border border-line rounded-card focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
                />
              </div>
              <p className="text-[10px] text-brand font-semibold mt-2 flex items-center gap-1">
                <GripVertical className="w-3 h-3" />
                {t('store.dragMaterialHint')}
              </p>
            </div>

            <div className="p-3 overflow-y-auto smooth-scroll">
              <div className="grid sm:grid-cols-2 gap-2.5">
                {filteredMaterials.map((material) => {
                  const lowStock = material.quantity <= 5;
                  const noneLeft = material.quantity <= 0;
                  const canDrag = canIssue && !noneLeft;
                  return (
                    <div
                      key={material.id}
                      onPointerDown={(e) =>
                        startDrag(
                          e,
                          {
                            id: material.id,
                            label: material.name,
                            subLabel: `${material.quantity} ${material.unit} in store`,
                            kind: 'material',
                          },
                          !canDrag
                        )
                      }
                      onContextMenu={(e) => e.preventDefault()}
                      className={`rounded-card border p-3 flex flex-col justify-between gap-2 transition select-none ${
                        canDrag ? 'cursor-grab active:cursor-grabbing touch-pan-y' : ''
                      } ${
                        noneLeft
                          ? 'border-line bg-sand/30 opacity-70'
                          : 'border-line bg-white hover:bg-sand/40'
                      }`}
                      title={noneLeft ? t('store.outOfStock') : t('store.dragMaterialHint')}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-ink text-xs leading-snug">
                            {material.name}
                          </p>
                          <p className="text-[10px] text-ink-muted mt-0.5">
                            {t('store.keptIn', { location: material.location })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {canIssue && !noneLeft && (
                            <GripVertical className="w-4 h-4 text-ink-muted/50" />
                          )}
                          {isAdmin && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditMaterial(material);
                                }}
                                className="h-7 w-7 flex items-center justify-center bg-white border border-line hover:bg-sand/50 rounded-lg cursor-pointer"
                            title={t('common.edit')}
                              >
                                <Edit3 className="w-3.5 h-3.5 text-ink-muted" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteMaterial(material);
                                }}
                                className="h-7 w-7 flex items-center justify-center bg-white border border-line hover:bg-coral/10 rounded-lg cursor-pointer"
                            title={t('common.remove')}
                              >
                                <Trash2 className="w-3.5 h-3.5 text-coral" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-baseline gap-1 px-2 py-1 rounded-lg border font-mono font-bold ${
                            lowStock
                              ? 'text-coral bg-coral/10 border-coral/40'
                              : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                          }`}
                        >
                          <span className="text-lg">{material.quantity}</span>
                          <span className="text-[10px] font-sans font-semibold">
                            {material.unit}
                          </span>
                        </span>
                        {canIssue && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAdjustMaterial(material, -1);
                              }}
                              disabled={material.quantity <= 0}
                              className="h-8 w-8 flex items-center justify-center bg-white border border-line hover:bg-sand/50 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg cursor-pointer"
                              title={t('store.removeOne')}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAdjustMaterial(material, 1);
                              }}
                              className="h-8 w-8 flex items-center justify-center bg-brand text-white hover:bg-brand-hover rounded-lg cursor-pointer"
                              title={t('store.addOne')}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredMaterials.length === 0 && (
                  <div className="sm:col-span-2 text-[11px] text-ink-muted text-center py-6 border border-dashed border-line rounded-card">
                    {t('store.noMaterials')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mechanics */}
          <div className="lg:col-span-5 bg-white rounded-card border border-line shadow-soft flex flex-col lg:max-h-[70vh]">
            <div className="p-3 border-b border-line flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-brand" />
              <h3 className="text-sm font-bold text-ink">{t('store.mechanicsTitle')}</h3>
              <span className="text-[10px] text-ink-muted">({t('store.dropMaterialHere')})</span>
            </div>
            <div className="p-3 overflow-y-auto smooth-scroll">
              <div className="grid grid-cols-1 gap-2.5">
                {activeMechanics.map((m) => {
                  const out = outstandingMaterialsForMechanic(m);
                  const team = teams.find((t) => t.id === m.teamId);
                  const isTarget = drag?.payload.kind === 'material' && activeTarget === m.id;
                  const unitsOut = out.reduce((sum, issue) => sum + issue.quantity, 0);
                  return (
                    <div
                      key={m.id}
                      data-drop-target={m.id}
                      className={`border rounded-card flex flex-col overflow-hidden transition ${
                        isTarget
                          ? 'border-brand ring-2 ring-brand/50 bg-coral/5'
                          : drag?.payload.kind === 'material'
                          ? 'border-dashed border-brand/50'
                          : 'border-line'
                      }`}
                    >
                      <div className="bg-brand text-white px-2.5 py-2 flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">{m.name}</p>
                          <p className="text-[10px] opacity-80 truncate">
                            {m.specialty}
                            {team ? ` · ${team.name}` : ''}
                          </p>
                        </div>
                        <span className="text-[10px] bg-white/20 rounded-full px-2 py-0.5 shrink-0 font-semibold">
                          {unitsOut} unit{unitsOut === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="p-2 space-y-1.5 bg-sand/30">
                        {out.map((issue) => (
                          <div
                            key={issue.id}
                            className="bg-white border border-line rounded-lg p-2 text-[11px] flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-ink">
                                {issue.quantity} {issue.unit}{' '}
                                <span className="font-normal truncate">{issue.materialName}</span>
                              </div>
                              <div className="text-[10px] text-ink-muted truncate">
                                Issued {issue.issuedAt}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReturnMaterialIssue(issue);
                              }}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                              title={t('store.returnUnused')}
                            >
                              <RotateCcw className="w-3 h-3" /> {t('store.return')}
                            </button>
                          </div>
                        ))}
                        {out.length === 0 && (
                          <div
                            className={`text-[10px] text-center py-4 border border-dashed rounded-lg ${
                              drag?.payload.kind === 'material'
                                ? 'border-brand text-brand font-semibold'
                                : 'border-line text-ink-muted/70'
                            }`}
                          >
                            {canIssue ? t('store.dropMaterialHere') : t('store.noMaterialsOut')}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {activeMechanics.length === 0 && (
                  <div className="text-[11px] text-ink-muted">{t('store.noMechanics')}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phone/tablet drop dock: always reachable while a card is held */}
      {drag && canIssue && (
        <div className="fixed inset-x-0 bottom-0 z-[125] bg-white/95 backdrop-blur border-t-2 border-brand shadow-2xl no-print px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand px-1 mb-1">
            {t('store.dropOnMechanic')}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {activeMechanics.map((m) => {
              const isTarget = activeTarget === m.id;
              return (
                <div
                  key={m.id}
                  data-drop-target={m.id}
                  className={`shrink-0 min-w-[132px] rounded-xl border-2 px-3 py-2 transition ${
                    isTarget ? 'bg-brand text-white border-brand scale-[1.02]' : 'bg-white border-line text-ink'
                  }`}
                >
                  <p className="text-xs font-bold truncate">{m.name}</p>
                  <p className={`text-[10px] truncate ${isTarget ? 'text-white/80' : 'text-ink-muted'}`}>
                    {m.specialty}
                  </p>
                </div>
              );
            })}
            {activeMechanics.length === 0 && (
              <p className="text-[11px] text-ink-muted">{t('store.noMechanics')}</p>
            )}
          </div>
        </div>
      )}

      <DragPreview drag={drag} />

      {/* Add / Edit tool (admin) */}
      {isToolModalOpen && (
        <ToolEditorModal
          isEdit={!!editingTool}
          draft={draft}
          error={toolError}
          onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
          onCancel={() => setIsToolModalOpen(false)}
          onSave={handleSaveTool}
        />
      )}

      {/* Add / Edit material (admin) */}
      {isMaterialModalOpen && (
        <MaterialEditorModal
          isEdit={!!editingMaterial}
          draft={materialDraft}
          error={materialError}
          onChange={(patch) => setMaterialDraft((prev) => ({ ...prev, ...patch }))}
          onCancel={() => setIsMaterialModalOpen(false)}
          onSave={handleSaveMaterial}
        />
      )}
    </div>
  );
};

const ToolEditorModal: React.FC<{
  isEdit: boolean;
  draft: typeof emptyDraft;
  error: string | null;
  onChange: (patch: Partial<typeof emptyDraft>) => void;
  onCancel: () => void;
  onSave: () => void;
}> = ({ isEdit, draft, error, onChange, onCancel, onSave }) => {
  const { t } = useLanguage();
  return (
  <div className="fixed inset-0 bg-ink/50 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-card shadow-xl w-full max-w-lg border border-line">
      <div className="px-4 py-3 border-b border-line flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink">{isEdit ? t('store.editTool') : t('store.addTool')}</h3>
        <button onClick={onCancel} className="text-ink-muted hover:text-ink text-sm cursor-pointer">
          ✕
        </button>
      </div>
      <div className="p-4 space-y-3 text-xs">
        {error && (
          <div className="text-coral bg-coral/10 border border-coral/30 rounded-lg px-2.5 py-1.5">{error}</div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-ink mb-0.5">{t('store.code')}</label>
            <input
              value={draft.code}
              onChange={(e) => onChange({ code: e.target.value })}
              placeholder="TL-013"
              className="w-full px-2 py-2 bg-cream border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-ink mb-0.5">{t('store.whereKept')}</label>
            <input
              value={draft.locationRack}
              onChange={(e) => onChange({ locationRack: e.target.value })}
              placeholder="Rack A-1"
              className="w-full px-2 py-2 bg-cream border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-ink mb-0.5">{t('store.name')}</label>
          <input
            value={draft.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="e.g. Impact Wrench"
            className="w-full px-2 py-2 bg-cream border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-ink mb-0.5">{t('store.group')}</label>
            <select
              value={draft.category}
              onChange={(e) => onChange({ category: e.target.value as ToolCategory })}
              className="w-full px-2 py-2 bg-cream border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
            >
              {TOOL_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-ink mb-0.5">{t('store.total')}</label>
            <input
              type="number"
              min={0}
              value={draft.totalQuantity}
              onChange={(e) => onChange({ totalQuantity: Number(e.target.value) })}
              className="w-full px-2 py-2 bg-cream border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-ink mb-0.5">{t('store.availableLabel')}</label>
            <input
              type="number"
              min={0}
              value={draft.availableQuantity}
              onChange={(e) => onChange({ availableQuantity: Number(e.target.value) })}
              className="w-full px-2 py-2 bg-cream border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-ink mb-0.5">{t('store.condition')}</label>
          <select
            value={draft.condition}
            onChange={(e) => onChange({ condition: e.target.value as WorkshopTool['condition'] })}
            className="w-full px-2 py-2 bg-cream border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
          >
            <option>{t('store.excellent')}</option>
            <option>{t('store.good')}</option>
            <option>{t('store.fair')}</option>
            <option>{t('store.needsService')}</option>
          </select>
        </div>
      </div>
      <div className="px-4 py-3 border-t border-line flex items-center justify-end gap-1.5">
        <button
          onClick={onCancel}
          className="px-3 py-2 bg-white border border-line rounded-card text-xs font-semibold cursor-pointer"
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={onSave}
          className="px-3.5 py-2 bg-brand hover:bg-brand-hover text-white rounded-card text-xs font-semibold cursor-pointer"
        >
          {t('common.save')}
        </button>
      </div>
    </div>
  </div>
  );
};

const MaterialEditorModal: React.FC<{
  isEdit: boolean;
  draft: typeof emptyMaterialDraft;
  error: string | null;
  onChange: (patch: Partial<typeof emptyMaterialDraft>) => void;
  onCancel: () => void;
  onSave: () => void;
}> = ({ isEdit, draft, error, onChange, onCancel, onSave }) => {
  const { t } = useLanguage();
  return (
  <div className="fixed inset-0 bg-ink/50 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-card shadow-xl w-full max-w-lg border border-line">
      <div className="px-4 py-3 border-b border-line flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink">{isEdit ? t('store.editMaterial') : t('store.addMaterial')}</h3>
        <button onClick={onCancel} className="text-ink-muted hover:text-ink text-sm cursor-pointer">
          X
        </button>
      </div>
      <div className="p-4 space-y-3 text-xs">
        {error && (
          <div className="text-coral bg-coral/10 border border-coral/30 rounded-lg px-2.5 py-1.5">{error}</div>
        )}
        <div>
          <label className="block text-[10px] font-semibold text-ink mb-0.5">{t('store.name')}</label>
          <input
            value={draft.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="e.g. Brake Pad"
            className="w-full px-2 py-2 bg-cream border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-ink mb-0.5">{t('store.quantity')}</label>
            <input
              type="number"
              min={1}
              value={draft.quantity}
              onChange={(e) => onChange({ quantity: Number(e.target.value) })}
              className="w-full px-2 py-2 bg-cream border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-ink mb-0.5">{t('store.unit')}</label>
            <input
              value={draft.unit}
              onChange={(e) => onChange({ unit: e.target.value })}
              placeholder="Piece"
              className="w-full px-2 py-2 bg-cream border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-ink mb-0.5">{t('store.whereKept')}</label>
            <input
              value={draft.location}
              onChange={(e) => onChange({ location: e.target.value })}
              placeholder="Shelf B-2"
              className="w-full px-2 py-2 bg-cream border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
            />
          </div>
        </div>
      </div>
      <div className="px-4 py-3 border-t border-line flex items-center justify-end gap-1.5">
        <button
          onClick={onCancel}
          className="px-3 py-2 bg-white border border-line rounded-card text-xs font-semibold cursor-pointer"
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={onSave}
          className="px-3.5 py-2 bg-brand hover:bg-brand-hover text-white rounded-card text-xs font-semibold cursor-pointer"
        >
          {t('common.save')}
        </button>
      </div>
    </div>
  </div>
  );
};
