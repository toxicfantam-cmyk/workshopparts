import React, { useState, useEffect } from 'react';
import {
  Package,
  IndianRupee,
  AlertTriangle,
  AlertCircle,
  Wrench,
  Clock,
  ShoppingCart,
  ArrowRight,
  TrendingUp,
  Plus,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from 'recharts';
import { dashboardAPI } from '../services/api';
import { StatCard } from '../components/common/StatCard';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { formatCurrency, formatDate, getJobStatusConfig } from '../utils/formatters';

const PIE_COLORS = [
  '#2563eb', // blue
  '#7c3aed', // purple
  '#059669', // emerald
  '#d97706', // amber
  '#dc2626', // rose
  '#0891b2', // cyan
  '#4f46e5', // indigo
  '#64748b', // slate
];

export const Dashboard = ({ onNavigate, onQuickAction }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await dashboardAPI.getStats();
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading || !data) {
    return <LoadingSkeleton rows={6} cols={4} />;
  }

  const { stats, charts, criticalAlerts, recentJobs, recentMovements } = data;

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Workshop Operational Dashboard</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time stock valuation, job bottlenecks & component movement metrics
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchDashboard}
            icon={RefreshCw}
            className="flex-1 sm:flex-none"
          >
            Refresh
          </Button>
          <Button
            variant="blue"
            size="sm"
            onClick={() => onQuickAction('new_job')}
            icon={Plus}
            className="flex-1 sm:flex-none"
          >
            New Job
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onQuickAction('new_po')}
            icon={ShoppingCart}
            className="flex-1 sm:flex-none"
          >
            Order Parts
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Stock Value"
          value={formatCurrency(stats.totalStockValue)}
          subtext={`${stats.totalStockUnits} total units in inventory`}
          icon={IndianRupee}
          color="blue"
          onClick={() => onNavigate('reports')}
        />
        <StatCard
          title="Jobs Waiting for Parts"
          value={stats.waitingForPartsJobsCount}
          subtext="Repair jobs blocked by shortages"
          icon={Clock}
          color={stats.waitingForPartsJobsCount > 0 ? 'rose' : 'emerald'}
          onClick={() => onNavigate('alerts')}
        />
        <StatCard
          title="Stock Alerts"
          value={stats.lowStockCount + stats.outOfStockCount}
          subtext={`${stats.outOfStockCount} out of stock • ${stats.lowStockCount} low`}
          icon={AlertTriangle}
          color="amber"
          onClick={() => onNavigate('alerts')}
        />
        <StatCard
          title="Active Repair Jobs"
          value={stats.activeRepairJobsCount}
          subtext={`${stats.pendingPurchaseRequestsCount} pending purchase requests`}
          icon={Wrench}
          color="indigo"
          onClick={() => onNavigate('jobs')}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Stock Movements (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Stock Movements (Received vs Issued)</h3>
              <p className="text-xs text-slate-500">Component inflows and consumption volume over time</p>
            </div>
            <button
              onClick={() => onNavigate('inventory')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              View Log <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.movementChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="received" name="Stock Received" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="issued" name="Stock Issued" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inventory Category Distribution Donut (1 col) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Inventory by Category</h3>
              <p className="text-xs text-slate-500">Stock distribution across systems</p>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.categoryDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="category"
                >
                  {charts.categoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name, item) => [`${val} parts (${formatCurrency(item.payload.value)})`, name]}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Repair Job Status Breakdown & Critical Shortages Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Job Status Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Repair Job Pipeline</h3>
              <p className="text-xs text-slate-500">Current status of all open workshop tickets</p>
            </div>
            <button
              onClick={() => onNavigate('jobs')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              All Jobs <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={charts.jobStatusData}
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="status"
                  tick={{ fontSize: 11, fill: '#334155' }}
                  width={90}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low-stock & Urgent Shortages (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Immediate Inventory Attention</h3>
              <p className="text-xs text-slate-500">Items below minimum stock threshold</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('alerts')}
            >
              View All Alerts ({stats.lowStockCount + stats.outOfStockCount})
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Part Details</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Available</th>
                  <th className="py-2.5 px-3">Min Level</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {criticalAlerts.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-800">{item.name}</div>
                      <div className="font-mono text-[10px] text-slate-400">{item.sku}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{item.category}</td>
                    <td className="py-2.5 px-3">
                      {item.isOut ? (
                        <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          0 Out of Stock
                        </span>
                      ) : (
                        <span className="font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          {item.available} Low
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-600">{item.minimumStockLevel}</td>
                    <td className="py-2.5 px-3 text-right">
                      <Button
                        variant="blue"
                        size="sm"
                        onClick={() => onQuickAction('new_po', { partId: item._id })}
                      >
                        Order
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Repair Jobs & Recent Stock Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Repair Jobs */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Recent Repair Jobs</h3>
            <button
              onClick={() => onNavigate('jobs')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {recentJobs.map((job) => {
              const statusCfg = getJobStatusConfig(job.status);
              return (
                <div
                  key={job._id}
                  onClick={() => onNavigate('jobs', job._id)}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 cursor-pointer transition-all"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{job.jobId}</span>
                      <span className="text-xs text-slate-600">• {job.customerName}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {job.registrationNumber} ({job.vehicleDetails?.make} {job.vehicleDetails?.model})
                    </div>
                  </div>
                  <Badge variant={statusCfg.color}>{statusCfg.label}</Badge>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Stock Movements */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Recent Inventory Movements</h3>
            <button
              onClick={() => onNavigate('inventory')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Audit Trail <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {recentMovements.map((mov) => {
              const isReceived = mov.type === 'RECEIVED';
              const isIssued = mov.type === 'ISSUED';
              const isReserved = mov.type === 'RESERVED';
              return (
                <div
                  key={mov._id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/40"
                >
                  <div>
                    <div className="font-semibold text-xs text-slate-900">{mov.partName}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {mov.movementId} • {formatDate(mov.createdAt)} • Ref: {mov.referenceId || 'N/A'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        isReceived
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isIssued
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : isReserved
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}
                    >
                      {isReceived ? `+${mov.quantity}` : `-${mov.quantity}`} {mov.type}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
