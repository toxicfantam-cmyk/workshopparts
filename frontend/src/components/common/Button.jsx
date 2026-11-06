import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  className = '',
  icon: Icon,
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 select-none disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5 rounded-lg gap-1.5',
    md: 'text-sm px-3.5 py-2 rounded-xl gap-2 shadow-xs',
    lg: 'text-base px-5 py-2.5 rounded-xl gap-2.5 shadow-sm',
    icon: 'p-2 rounded-xl',
  }[size] || 'text-sm px-3.5 py-2 rounded-xl gap-2';

  const variantClasses = {
    primary:
      'bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-900 active:scale-[0.99] border border-slate-900',
    blue:
      'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-600 active:scale-[0.99] border border-blue-600',
    secondary:
      'bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-300 border border-slate-200 hover:border-slate-300 shadow-2xs',
    outline:
      'bg-transparent text-slate-700 hover:bg-slate-100/70 border border-slate-300/80 focus:ring-slate-400',
    ghost:
      'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-400',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-600 active:scale-[0.99] border border-rose-600',
    success:
      'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-600 active:scale-[0.99] border border-emerald-600',
  }[variant] || 'bg-slate-900 text-white hover:bg-slate-800 border border-slate-900';

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}
      {children}
    </button>
  );
};
