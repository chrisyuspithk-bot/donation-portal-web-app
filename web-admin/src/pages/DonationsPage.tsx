import { useEffect, useState, useCallback } from 'react';
import { donationsApi } from '../services/api';
import toast from 'react-hot-toast';

interface Donation {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  donor_name: string;
  donor_email: string;
}

const statusColors: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
};

export function DonationsPage() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchDonations = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), page_size: '50' };
      if (status) params.status = status;
      const { data } = await donationsApi.getAll(params);
      setDonations(data.donations);
      setTotal(data.total);
    } catch (err) {
      toast.error('Failed to fetch donations');
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => { fetchDonations(); }, [fetchDonations]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleResendReceipts = async () => {
    if (selected.size === 0) return toast.error('Select donations first');
    try {
      const { data } = await donationsApi.resendReceipts([...selected]);
      toast.success(`Resent ${data.sent} receipts`);
      setSelected(new Set());
    } catch {
      toast.error('Failed to resend receipts');
    }
  };

  const fmt = (cents: number, curr: string) =>
    (cents / 100).toLocaleString('en-US', { style: 'currency', currency: curr.toUpperCase() });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Donations</h2>
        <div className="flex gap-3">
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="border rounded-lg px-3 py-1.5 text-sm">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
          <button onClick={handleResendReceipts} disabled={selected.size === 0}
            className="px-4 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
            Resend Receipts ({selected.size})
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="w-10 px-4 py-3"><input type="checkbox" onChange={(e) => {
                setSelected(e.target.checked ? new Set(donations.map((d) => d.id)) : new Set());
              }} /></th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Donor</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">Loading...</td></tr>
            ) : donations.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">No donations found</td></tr>
            ) : donations.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.has(d.id)} onChange={() => toggleSelect(d.id)} />
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-sm">{d.donor_name}</p>
                  <p className="text-xs text-gray-400">{d.donor_email}</p>
                </td>
                <td className="px-4 py-3 font-mono text-sm">{fmt(d.amount, d.currency)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[d.status] || ''}`}>
                    {d.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{new Date(d.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Showing {donations.length} of {total} donations</span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 border rounded disabled:opacity-30">Previous</button>
          <button disabled={donations.length < 50} onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 border rounded disabled:opacity-30">Next</button>
        </div>
      </div>
    </div>
  );
}
