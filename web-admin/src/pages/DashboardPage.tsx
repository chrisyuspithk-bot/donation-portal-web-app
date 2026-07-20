import { useEffect, useState } from 'react';
import { analyticsApi } from '../services/api';
import { getSocket } from '../services/socket';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';

interface AnalyticsData {
  daily: Array<{
    date: string;
    total_donors: number;
    new_donors: number;
    average_gift: number;
    total_revenue: number;
    retention_rate: number;
  }>;
  summary: {
    total_donors: number;
    total_revenue: number;
    average_gift: number;
    churn_rate: number;
  };
}

export function DashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [days, setDays] = useState(30);
  const [liveDonations, setLiveDonations] = useState<any[]>([]);

  useEffect(() => {
    analyticsApi.get(days).then(({ data }) => setData(data)).catch(console.error);
  }, [days]);

  useEffect(() => {
    const socket = getSocket();
    socket.on('donation:live', (event: any) => {
      setLiveDonations((prev) => [event, ...prev].slice(0, 20));
    });
    return () => { socket.off('donation:live'); };
  }, []);

  if (!data) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  const fmtCurrency = (cents: number) => `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="border rounded-lg px-3 py-1.5 text-sm">
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="Total Donors" value={data.summary.total_donors.toLocaleString()} icon="👥" />
        <SummaryCard title="Total Revenue" value={fmtCurrency(data.summary.total_revenue)} icon="💰" />
        <SummaryCard title="Avg Gift" value={fmtCurrency(data.summary.average_gift)} icon="🎁" />
        <SummaryCard title="Churn Rate" value={`${(data.summary.churn_rate * 100).toFixed(1)}%`} icon="📉" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="total_revenue" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold mb-4">Average Gift Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="average_gift" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Live Donations Feed */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" /></span>
          Live Donations
        </h3>
        {liveDonations.length === 0 ? (
          <p className="text-gray-400 text-sm">Waiting for donations...</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-auto">
            {liveDonations.map((d, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="font-medium">{d.donor_name}</span>
                <span className="text-green-600 font-semibold">{fmtCurrency(d.amount)} {d.currency.toUpperCase()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-500 text-sm">{title}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
