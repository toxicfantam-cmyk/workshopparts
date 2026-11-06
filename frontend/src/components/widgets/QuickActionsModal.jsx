import React from 'react';
import { PackagePlus, Wrench, ShoppingCart, ArrowDownLeft, Sliders } from 'lucide-react';
import { Modal } from '../common/Modal';

export const QuickActionsModal = ({ isOpen, onClose, onSelectAction }) => {
  const actions = [
    {
      id: 'new_job',
      title: 'New Repair Job',
      description: 'Book customer vehicle, assign technician & check required parts availability',
      icon: Wrench,
      color: 'bg-blue-50 text-blue-600 border-blue-200',
    },
    {
      id: 'new_part',
      title: 'Add Spare Part',
      description: 'Create a new SKU with storage location, supplier & threshold alert levels',
      icon: PackagePlus,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    },
    {
      id: 'new_po',
      title: 'Create Purchase Request',
      description: 'Order stock from suppliers to replenish low inventory or resolve job shortages',
      icon: ShoppingCart,
      color: 'bg-amber-50 text-amber-600 border-amber-200',
    },
    {
      id: 'receive_stock',
      title: 'Receive Stock Delivery',
      description: 'Log delivered spare parts against purchase orders & auto-reserve for waiting jobs',
      icon: ArrowDownLeft,
      color: 'bg-purple-50 text-purple-600 border-purple-200',
    },
    {
      id: 'adjust_stock',
      title: 'Manual Stock Adjustment',
      description: 'Record cycle count variances, damaged stock, or manual audit corrections',
      icon: Sliders,
      color: 'bg-slate-50 text-slate-700 border-slate-200',
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Actions"
      subtitle="Select an operation to perform immediately"
      maxWidth="max-w-lg"
    >
      <div className="grid grid-cols-1 gap-2.5">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              onClick={() => {
                onClose();
                onSelectAction(act.id);
              }}
              className="flex items-start gap-4 p-3.5 rounded-xl border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/80 transition-all text-left group"
            >
              <div className={`p-2.5 rounded-xl border ${act.color} shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {act.title}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{act.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
};
