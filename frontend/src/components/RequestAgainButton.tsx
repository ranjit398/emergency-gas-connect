// frontend/src/components/RequestAgainButton.tsx
// Allow seeker to request a new helper if current one doesn't respond

import React, { useState } from 'react';
import { RotateCw, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { NotificationManager } from './NotificationToast';

interface RequestAgainButtonProps {
  requestId: string;
  reassignmentCount?: number;
  maxReassignments?: number;
  currentStatus?: string;
  latitude?: number;
  longitude?: number;
  onReassignSuccess?: () => void;
  className?: string;
}

/**
 * Request Again Button Component
 * Allows seeker to find a new helper if current one doesn't respond
 */
export const RequestAgainButton: React.FC<RequestAgainButtonProps> = ({
  requestId,
  reassignmentCount = 0,
  maxReassignments = 3,
  currentStatus = 'accepted',
  latitude,
  longitude,
  onReassignSuccess,
  className = '',
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canReassign =
    reassignmentCount < maxReassignments && ['accepted', 'pending'].includes(currentStatus);

  const handleRequestAgain = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/requests/${requestId}/request-again`,
        {},
        {
          params: {
            ...(latitude && { latitude }),
            ...(longitude && { longitude }),
          },
        }
      );

      if (response.data.success) {
        NotificationManager.success(
          `✨ Looking for a new helper... (Attempt ${reassignmentCount + 1}/${maxReassignments})`
        );
        onReassignSuccess?.();
      } else {
        throw new Error(response.data.error?.message || 'Reassignment failed');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to request another helper';
      setError(errorMsg);
      NotificationManager.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (reassignmentCount >= maxReassignments) {
    return (
      <div className={`inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium ${className}`}>
        <AlertCircle className="w-4 h-4" />
        <span>Max reassignments reached. Please contact support.</span>
      </div>
    );
  }

  if (!canReassign) {
    return null;
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleRequestAgain}
        disabled={loading}
        className={`inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors ${className}`}
      >
        <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        <span>
          {loading
            ? 'Searching for new helper...'
            : `Request Again (${reassignmentCount + 1}/${maxReassignments})`}
        </span>
      </button>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
          <AlertCircle className="w-3 h-3 inline mr-1" />
          {error}
        </div>
      )}

      <p className="text-xs text-gray-600">
        💡 Tip: Use this if the helper isn't responsive. You have {maxReassignments - reassignmentCount} more attempts.
      </p>
    </div>
  );
};

export default RequestAgainButton;
