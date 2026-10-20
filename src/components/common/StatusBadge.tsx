import React from 'react';
import { JobStatus, Priority } from '../../types';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Wrench,
  FileCheck,
  Search,
  Package,
  Car,
  XCircle,
} from 'lucide-react';

interface StatusBadgeProps {
  status: JobStatus;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, showIcon = true }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'Received':
        return {
          color: 'text-ink bg-sand/50 border-line',
          icon: <Car className="w-3.5 h-3.5 shrink-0" />,
        };
      case 'Awaiting Inspection':
        return {
          color: 'text-amber-800 bg-amber-50 border-amber-200',
          icon: <Search className="w-3.5 h-3.5 shrink-0" />,
        };
      case 'Awaiting Quotation Approval':
        return {
          color: 'text-blue-800 bg-blue-50 border-blue-200',
          icon: <FileCheck className="w-3.5 h-3.5 shrink-0" />,
        };
      case 'Awaiting Spare Parts':
        return {
          color: 'text-orange-800 bg-orange-50 border-orange-200',
          icon: <Package className="w-3.5 h-3.5 shrink-0" />,
        };
      case 'Ready to Start':
        return {
          color: 'text-indigo-800 bg-indigo-50 border-indigo-200',
          icon: <Clock className="w-3.5 h-3.5 shrink-0" />,
        };
      case 'In Progress':
        return {
          color: 'text-rose-800 bg-rose-50 border-rose-200',
          icon: <Wrench className="w-3.5 h-3.5 shrink-0" />,
        };
      case 'Quality Check':
        return {
          color: 'text-purple-800 bg-purple-50 border-purple-200',
          icon: <Search className="w-3.5 h-3.5 shrink-0" />,
        };
      case 'Ready for Delivery':
        return {
          color: 'text-emerald-800 bg-emerald-50 border-emerald-200',
          icon: <Car className="w-3.5 h-3.5 shrink-0" />,
        };
      case 'Completed':
        return {
          color: 'text-emerald-900 bg-emerald-100 border-emerald-300 font-semibold',
          icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-700" />,
        };
      case 'Cancelled':
        return {
          color: 'text-ink-muted bg-sand/50 border-line',
          icon: <XCircle className="w-3.5 h-3.5 shrink-0" />,
        };
      default:
        return {
          color: 'text-ink bg-sand/50 border-line',
          icon: <Clock className="w-3.5 h-3.5 shrink-0" />,
        };
    }
  };

  const { color, icon } = getStatusConfig();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border font-medium whitespace-nowrap shrink-0 ${color}`}
    >
      {showIcon && icon}
      <span>{status}</span>
    </span>
  );
};

interface PriorityBadgeProps {
  priority: Priority;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  switch (priority) {
    case 'Urgent':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-brand bg-coral/10 border border-coral/30 rounded-md">
          <AlertCircle className="w-3 h-3 text-coral" />
          <span>Urgent</span>
        </span>
      );
    case 'High':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-md">
          <span>High Priority</span>
        </span>
      );
    case 'Medium':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-blue-800 bg-blue-50 border border-blue-200 rounded-md">
          <span>Medium</span>
        </span>
      );
    case 'Low':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-ink-muted bg-sand/50 border border-line rounded-md">
          <span>Low</span>
        </span>
      );
  }
};
