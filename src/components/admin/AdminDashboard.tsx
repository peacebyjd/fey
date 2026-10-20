import React, { useState } from 'react';
import { GarageSettings, PriceItem, User, UserRole } from '../../types';
import { StorageService } from '../../services/storage';
import {
  Users,
  Shield,
  Plus,
  Edit2,
  Trash2,
  Settings,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  X,
  Check,
  Building,
  Tag,
} from 'lucide-react';

interface AdminDashboardProps {
  currentUser: User;
  allUsers: User[];
  onRefreshUsers: () => void;
  onRefreshJobs: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  allUsers,
  onRefreshUsers,
  onRefreshJobs,
}) => {
  const [settings, setSettings] = useState<GarageSettings>(StorageService.getSettings());
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // User form
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('reception');
  const [userPhone, setUserPhone] = useState('');
  const [userIsActive, setUserIsActive] = useState(true);

  // Settings form
  const [garageName, setGarageName] = useState(settings.garageName);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(settings.email);
  const [taxId, setTaxId] = useState(settings.taxId);
  const [currency, setCurrency] = useState(settings.currency);
  const [defaultTaxRate, setDefaultTaxRate] = useState(settings.defaultTaxRate);

  // Fixed price list
  const [priceItems, setPriceItems] = useState<PriceItem[]>(() => StorageService.getPriceItems());
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [editingPriceItem, setEditingPriceItem] = useState<PriceItem | null>(null);
  const [priceName, setPriceName] = useState('');
  const [priceAmount, setPriceAmount] = useState<number>(0);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const openCreateUser = () => {
    setEditingUser(null);
    setUserName('');
    setUserEmail('');
    setUserRole('reception');
    setUserPhone('');
    setUserIsActive(true);
    setIsUserModalOpen(true);
  };

  const openEditUser = (user: User) => {
    setEditingUser(user);
    setUserName(user.name);
    setUserEmail(user.email);
    setUserRole(user.role);
    setUserPhone(user.phone || '');
    setUserIsActive(user.isActive);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = () => {
    if (!userName.trim() || !userEmail.trim()) {
      alert('Please fill in user name and email.');
      return;
    }

    if (editingUser) {
      const updated = allUsers.map((u) =>
        u.id === editingUser.id
          ? {
              ...u,
              name: userName.trim(),
              email: userEmail.trim().toLowerCase(),
              role: userRole,
              phone: userPhone.trim(),
              isActive: userIsActive,
            }
          : u
      );
      StorageService.saveUsers(updated);
      showToast(`User account ${userName} updated successfully.`);
    } else {
      const newUser: User = {
        id: `user-${Date.now()}`,
        name: userName.trim(),
        email: userEmail.trim().toLowerCase(),
        role: userRole,
        phone: userPhone.trim(),
        isActive: userIsActive,
      };
      StorageService.saveUsers([...allUsers, newUser]);
      showToast(`New staff account ${userName} created with role ${userRole.toUpperCase()}.`);
    }

    onRefreshUsers();
    setIsUserModalOpen(false);
  };

  const handleToggleActive = (user: User) => {
    if (user.id === currentUser.id) {
      alert('You cannot deactivate your own active session account.');
      return;
    }
    const updated = allUsers.map((u) =>
      u.id === user.id ? { ...u, isActive: !u.isActive } : u
    );
    StorageService.saveUsers(updated);
    onRefreshUsers();
    showToast(`Staff account ${user.name} status updated.`);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: GarageSettings = {
      ...settings,
      garageName: garageName.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim(),
      taxId: taxId.trim(),
      currency: currency.trim(),
      defaultTaxRate: Number(defaultTaxRate) || 15,
    };
    StorageService.saveSettings(updated);
    setSettings(updated);
    showToast('Garage workshop profile and tax settings saved.');
  };

  const handleExportBackup = () => {
    const jsonStr = StorageService.exportFullBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Feyamet_Garage_Database_Backup_${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Complete garage database backup exported successfully.');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = StorageService.importBackup(content);
      if (res.success) {
        onRefreshUsers();
        onRefreshJobs();
        showToast('Database backup imported and restored successfully.');
      } else {
        alert(`Failed to restore backup: ${res.error}`);
      }
    };
    reader.readAsText(file);
  };

  const handleResetDefaults = () => {
    if (confirm('Reset entire system database to initial default demo data? All test records will be reset.')) {
      StorageService.resetToDefaultData();
      onRefreshUsers();
      onRefreshJobs();
      showToast('Database restored to default demo records.');
    }
  };

  const refreshPriceItems = () => setPriceItems(StorageService.getPriceItems());

  const openCreatePriceItem = () => {
    setEditingPriceItem(null);
    setPriceName('');
    setPriceAmount(0);
    setIsPriceModalOpen(true);
  };

  const openEditPriceItem = (item: PriceItem) => {
    setEditingPriceItem(item);
    setPriceName(item.name);
    setPriceAmount(item.amount);
    setIsPriceModalOpen(true);
  };

  const handleSavePriceItem = () => {
    if (!priceName.trim() || priceAmount <= 0) {
      alert('Please enter an item name and a price greater than 0.');
      return;
    }
    if (editingPriceItem) {
      StorageService.updatePriceItem({
        ...editingPriceItem,
        name: priceName.trim(),
        amount: Number(priceAmount),
      });
      showToast(`Price item ${priceName.trim()} updated.`);
    } else {
      StorageService.addPriceItem({ name: priceName.trim(), amount: Number(priceAmount) });
      showToast(`Price item ${priceName.trim()} added.`);
    }
    refreshPriceItems();
    setIsPriceModalOpen(false);
  };

  const handleDeletePriceItem = (item: PriceItem) => {
    if (confirm(`Remove "${item.name}" from the price list?`)) {
      StorageService.deletePriceItem(item.id);
      refreshPriceItems();
      showToast(`Price item ${item.name} removed.`);
    }
  };

  const handleResetPriceItems = () => {
    if (confirm('Restore the default price list? Your custom items will be replaced.')) {
      StorageService.resetPriceItems();
      refreshPriceItems();
      showToast('Default price list restored.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-line/80 p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#800020]">
              Administration
            </span>
            <span className="text-line">·</span>
            <span className="text-xs font-medium text-ink-muted">Security & Access Control</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink mt-0.5">
            Staff Accounts & System Configuration
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-1 max-w-2xl">
            Only authorized administrators can provision staff credentials, grant role-based dashboard permissions, manage garage tax settings, and create database recovery backups.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateUser}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#800020] hover:bg-[#600018] text-white font-semibold text-xs shadow-xs transition duration-150 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Staff Account</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-xs sm:text-sm text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Staff Accounts Management */}
      <div className="bg-white rounded-xl border border-line overflow-hidden shadow-2xs">
        <div className="px-4 py-3 border-b border-line flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-bold text-ink uppercase tracking-wider">
              Authorized Staff Directory ({allUsers.length})
            </h2>
            <p className="text-[11px] text-ink-muted/70">Manage user access and assigned dashboard roles</p>
          </div>
          <button
            type="button"
            onClick={openCreateUser}
            className="text-xs text-[#800020] hover:underline font-semibold cursor-pointer"
          >
            + New Account
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead className="bg-sand/40 border-b text-[11px] font-semibold text-ink-muted uppercase">
              <tr>
                <th className="py-2.5 px-3">Staff Name</th>
                <th className="py-2.5 px-3">Email Address</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3 hidden lg:table-cell">Phone</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {allUsers.map((user) => (
                <tr key={user.id} className="hover:bg-sand/40 transition">
                  <td className="py-3 px-3 font-semibold text-ink">
                    {user.name}
                    <p className="lg:hidden text-[10px] font-mono font-normal text-ink-muted mt-0.5">
                      {user.phone || '-'}
                    </p>
                  </td>
                  <td className="py-3 px-3 font-mono text-ink-muted">{user.email}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                        user.role === 'admin'
                          ? 'bg-brand text-white'
                          : user.role === 'manager'
                          ? 'bg-purple-100 text-purple-900'
                          : user.role === 'finance'
                          ? 'bg-blue-100 text-blue-900'
                          : user.role === 'reception'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-rose-100 text-rose-900'
                      }`}
                    >
                      {user.role === 'reception' ? 'Recorder' : user.role}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-ink-muted tabular-nums whitespace-nowrap hidden lg:table-cell">
                    {user.phone || '—'}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                        user.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-sand/50 text-ink-muted border border-line'
                      }`}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditUser(user)}
                        className="text-ink-muted hover:text-ink p-1"
                        title="Edit user"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(user)}
                        className={`text-xs px-2 py-0.5 rounded ${
                          user.isActive
                            ? 'text-ink-muted hover:text-brand hover:bg-coral/10'
                            : 'text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fixed Price List */}
      <div className="bg-white rounded-xl border border-line overflow-hidden shadow-2xs">
        <div className="px-4 py-3 border-b border-line flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-brand" />
            <div>
              <h2 className="text-xs font-bold text-ink uppercase tracking-wider">
                Fixed Price List ({priceItems.length})
              </h2>
              <p className="text-[11px] text-ink-muted/70">
                Items Finance can tap to add when pricing a repair
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetPriceItems}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-ink-muted hover:text-ink hover:bg-sand/50 rounded-lg transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
            <button
              type="button"
              onClick={openCreatePriceItem}
              className="flex items-center gap-1.5 px-3 py-2 bg-brand hover:bg-brand-hover text-white font-semibold text-xs rounded-lg transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>
        </div>

        <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {priceItems.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-xl border border-line bg-sand/30 flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink truncate">{item.name}</p>
                <p className="text-xs font-mono tabular-nums text-ink-muted">
                  {item.amount.toLocaleString()} {settings.currency}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => openEditPriceItem(item)}
                  className="text-ink-muted hover:text-ink p-1 cursor-pointer"
                  title="Edit item"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeletePriceItem(item)}
                  className="text-ink-muted hover:text-coral p-1 cursor-pointer"
                  title="Delete item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {priceItems.length === 0 && (
            <p className="col-span-full text-xs text-ink-muted italic py-3 text-center">
              No price items yet. Tap "Add Item" to create one.
            </p>
          )}
        </div>
      </div>

      {/* 2-Column Split: Workshop Settings and Database Backup/Recovery */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Garage Profile Settings */}
        <div className="bg-white rounded-xl border border-line p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b pb-2">
            <Building className="w-4 h-4 text-[#800020]" />
            <h3 className="text-sm font-bold text-ink">Garage Profile & Tax Configuration</h3>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-ink mb-0.5">Workshop Trade Name</label>
              <input
                type="text"
                value={garageName}
                onChange={(e) => setGarageName(e.target.value)}
                className="w-full px-3 py-2 border border-line rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-ink mb-0.5">Official Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border border-line rounded-lg text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-ink mb-0.5">Contact Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block font-medium text-ink mb-0.5">Contact Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-ink mb-0.5">Taxpayer ID (TIN)</label>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-ink mb-0.5">Billing Currency</label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-ink mb-0.5">Default VAT / Tax (%)</label>
                <input
                  type="number"
                  value={defaultTaxRate}
                  onChange={(e) => setDefaultTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-line rounded-lg text-xs tabular-nums"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 font-semibold text-white bg-brand hover:bg-ink rounded-lg text-xs cursor-pointer"
              >
                Save Garage Settings
              </button>
            </div>
          </form>
        </div>

        {/* Database Backups & Recovery Plan */}
        <div className="bg-white rounded-xl border border-line p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b pb-2">
            <Shield className="w-4 h-4 text-[#800020]" />
            <h3 className="text-sm font-bold text-ink">Database Backup & Disaster Recovery</h3>
          </div>
          <p className="text-xs text-ink-muted leading-relaxed">
            Ensure business continuity for Feyamet Auto Garage. You can export complete snapshot dumps of vehicle records, finance quotations, mechanics, and settings, or restore from a previous backup file.
          </p>

          <div className="space-y-3 pt-2">
            <div className="p-3.5 bg-sand/40 border border-line rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-ink">Export Full JSON Database Backup</p>
                <p className="text-[11px] text-ink-muted">Includes all jobs, audit history, users, and teams</p>
              </div>
              <button
                type="button"
                onClick={handleExportBackup}
                className="flex items-center gap-1.5 px-3 py-2 bg-brand hover:bg-ink text-white font-semibold text-xs rounded-lg transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Backup</span>
              </button>
            </div>

            <div className="p-3.5 bg-sand/40 border border-line rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-ink">Restore from Database Backup</p>
                <p className="text-[11px] text-ink-muted">Import a previously saved .json backup file</p>
              </div>
              <label className="flex items-center gap-1.5 px-3 py-2 bg-white border border-line hover:bg-sand/50 text-ink font-semibold text-xs rounded-lg transition cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload & Restore</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleImportBackup}
                />
              </label>
            </div>

            <div className="p-3.5 bg-coral/10 border border-coral/30 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-brand">Reset Demo Database</p>
                <p className="text-[11px] text-brand/80">Restore default demo vehicles, teams, and sample quotation</p>
              </div>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="flex items-center gap-1.5 px-3 py-2 bg-coral hover:bg-coral-hover text-white font-semibold text-xs rounded-lg transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Demo Data</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Price Item Create/Edit Modal */}
      {isPriceModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-line space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-ink">
                {editingPriceItem ? 'Edit Price Item' : 'Add Price Item'}
              </h3>
              <button
                onClick={() => setIsPriceModalOpen(false)}
                className="text-ink-muted/70 hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-medium text-ink mb-0.5">Item Name</label>
                <input
                  type="text"
                  value={priceName}
                  onChange={(e) => setPriceName(e.target.value)}
                  placeholder="e.g. Oil Change"
                  className="w-full px-3 py-2 border border-line rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block font-medium text-ink mb-0.5">Price ({settings.currency})</label>
                <input
                  type="number"
                  min="0"
                  value={priceAmount || ''}
                  onChange={(e) => setPriceAmount(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 2500"
                  className="w-full px-3 py-2 border border-line rounded-lg text-xs font-mono tabular-nums"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsPriceModalOpen(false)}
                className="px-3 py-2 text-ink-muted hover:bg-sand/50 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePriceItem}
                className="flex items-center gap-1.5 px-5 py-2 font-semibold text-white bg-brand hover:bg-brand-hover rounded-lg shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>Save Item</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff User Create/Edit Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-line space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-ink">
                {editingUser ? 'Edit Staff Account' : 'Create Authorized Staff Account'}
              </h3>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="text-ink-muted/70 hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-medium text-ink mb-0.5">Staff Full Name</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Ermiya Hailu"
                  className="w-full px-3 py-2 border border-line rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-ink mb-0.5">Staff Email Address</label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="ermiya@feyamet.com"
                  className="w-full px-3 py-2 border border-line rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-ink mb-0.5">Assigned System Role</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-line rounded-lg text-xs font-semibold"
                >
                  <option value="admin">Administrator (Full Access & User Control)</option>
                  <option value="reception">Recorder (Vehicle Intake & Photos)</option>
                  <option value="finance">Finance (Quotations & Payment Ledger)</option>
                  <option value="manager">Manager (Daily Task Dispatch & Approvals)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-ink mb-0.5">Contact Phone</label>
                <input
                  type="text"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  placeholder="+251 911 ..."
                  className="w-full px-3 py-2 border border-line rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="userActiveCheck"
                  checked={userIsActive}
                  onChange={(e) => setUserIsActive(e.target.checked)}
                  className="rounded text-[#800020]"
                />
                <label htmlFor="userActiveCheck" className="text-xs font-medium text-ink">
                  Account is active and authorized to sign in
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="px-3 py-2 text-ink-muted hover:bg-sand/50 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveUser}
                className="px-5 py-2 font-semibold text-white bg-[#800020] hover:bg-[#600018] rounded-lg shadow-xs"
              >
                Save Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
