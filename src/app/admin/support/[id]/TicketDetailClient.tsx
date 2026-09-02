'use client';

import { useState } from 'react';
import { updateTicketStatusAction } from './actions';
import { toast } from 'react-hot-toast';
import { CheckCircle2, Circle, Save } from 'lucide-react';

export default function TicketDetailClient({ ticket }: { ticket: any }) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(ticket.status);

  async function handleSaveStatus() {
    setIsLoading(true);
    try {
      await updateTicketStatusAction(ticket.id, status);
      toast.success('Ticket status updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update ticket');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
      <h3 className="text-lg font-medium text-white mb-4">Resolution Workflow</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">Update Status</label>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setStatus('OPEN')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                status === 'OPEN' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-neutral-300'
              }`}
            >
              <Circle size={16} /> Open
            </button>
            <button
              onClick={() => setStatus('RESOLVED')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                status === 'RESOLVED' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-neutral-300'
              }`}
            >
              <CheckCircle2 size={16} /> Resolved
            </button>
            <button
              onClick={() => setStatus('CLOSED')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                status === 'CLOSED' 
                  ? 'bg-neutral-700 text-white' 
                  : 'bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-neutral-300'
              }`}
            >
              <CheckCircle2 size={16} /> Closed
            </button>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button 
            onClick={handleSaveStatus}
            disabled={isLoading || status === ticket.status}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Save size={18} />
            {isLoading ? 'Saving...' : 'Update Ticket'}
          </button>
        </div>
      </div>
    </div>
  );
}
