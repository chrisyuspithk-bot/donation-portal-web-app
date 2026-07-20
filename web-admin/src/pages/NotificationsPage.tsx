import { useState } from 'react';
import { notificationsApi } from '../services/api';
import toast from 'react-hot-toast';

export function NotificationsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [minDonated, setMinDonated] = useState('');
  const [lastDonationDays, setLastDonationDays] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return toast.error('Title and body are required');
    setSending(true);
    try {
      const segment: any = {};
      if (minDonated) segment.min_total_donated = Number(minDonated) * 100; // convert dollars to cents
      if (lastDonationDays) segment.last_donation_days = Number(lastDonationDays);

      const payload: any = { title: title.trim(), body: body.trim() };
      if (Object.keys(segment).length > 0) payload.segment = segment;

      const { data } = await notificationsApi.broadcast(payload);
      toast.success(`Notification sent to ${data.sent} users`);
      setTitle('');
      setBody('');
      setMinDonated('');
      setLastDonationDays('');
    } catch {
      toast.error('Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold">Push Notification Composer</h2>

      <form onSubmit={handleSend} className="bg-white rounded-xl shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notification Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Double Your Impact Today!"
            maxLength={100}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Your notification message..."
            rows={4}
            maxLength={500}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none resize-none"
            required
          />
        </div>

        <fieldset className="border rounded-lg p-4">
          <legend className="text-sm font-medium text-gray-700 px-2">Target Segment (optional)</legend>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Min Total Donated ($)</label>
              <input
                type="number"
                value={minDonated}
                onChange={(e) => setMinDonated(e.target.value)}
                placeholder="e.g., 100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Last Donation (days)</label>
              <input
                type="number"
                value={lastDonationDays}
                onChange={(e) => setLastDonationDays(e.target.value)}
                placeholder="e.g., 30"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>
        </fieldset>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={sending}
            className="px-6 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {sending ? 'Sending...' : 'Send Notification'}
          </button>
          <button
            type="button"
            onClick={() => { setTitle(''); setBody(''); setMinDonated(''); setLastDonationDays(''); }}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}
