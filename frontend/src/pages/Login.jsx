import React, { useState } from 'react';
import { ShieldCheck, UserCheck, Wrench, Lock, Mail, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Button } from '../components/common/Button';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useNotification();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please enter email and password', 'warning');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      showToast('Welcome back to WorkshopParts', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email or password';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    // Submit directly
    (async () => {
      setLoading(true);
      try {
        await login(demoEmail, demoPassword);
        showToast(`Signed in as ${demoEmail}`, 'success');
      } catch (err) {
        showToast('Login failed', 'error');
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 font-black text-2xl tracking-tight">
            WP
          </div>
        </div>
        <h2 className="mt-5 text-center text-2xl font-bold tracking-tight text-white">
          WorkshopParts
        </h2>
        <p className="mt-1 text-center text-sm text-slate-400">
          Spare Parts Inventory & Repair Job Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Email Address
              </label>
              <div className="mt-1 relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@workshopparts.com"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-900 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Password
              </label>
              <div className="mt-1 relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-900 transition-colors"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full justify-center text-sm shadow-md"
              >
                Sign In to WorkshopParts
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </form>

          {/* Quick Demo Sign In Section */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Quick Demo Logins (1-Click)
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@workshopparts.com', 'admin123')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-50 text-left transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-purple-100 rounded-lg text-purple-700">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-purple-900">Vikram Malhotra</div>
                    <div className="text-[11px] text-purple-600">Admin (Full Access)</div>
                  </div>
                </div>
                <span className="text-xs font-medium text-purple-700 opacity-0 group-hover:opacity-100 transition-opacity">
                  Sign In →
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('manager@workshopparts.com', 'manager123')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-left transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-blue-100 rounded-lg text-blue-700">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-blue-900">Suresh Patel</div>
                    <div className="text-[11px] text-blue-600">Inventory Manager (Stock & POs)</div>
                  </div>
                </div>
                <span className="text-xs font-medium text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity">
                  Sign In →
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('rajesh.tech@workshopparts.com', 'tech123')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-slate-200 rounded-lg text-slate-700">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900">Rajesh Kumar</div>
                    <div className="text-[11px] text-slate-600">Technician (Assigned Jobs)</div>
                  </div>
                </div>
                <span className="text-xs font-medium text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                  Sign In →
                </span>
              </button>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Production-Ready Workshop Management System • Demo seeded with realistic Indian workshop catalog
        </p>
      </div>
    </div>
  );
};
