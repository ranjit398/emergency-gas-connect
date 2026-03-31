// frontend/src/components/RequestStatusBadge.tsx
// Status indicator for emergency requests with production styling

import React from 'react';
import { Clock, CheckCircle, Zap, AlertCircle, RotateCw, XCircle } from 'lucide-react';

export type RequestStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'rejected' | 'expired';

interface RequestStatusBadgeProps {
  status: RequestStatus;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig = {
  pending: {
    label: 'Requesting',
    color: 'bg-yellow-100 text-yellow-900',
    icon: Clock,
    emoji: '🔄',
    description: 'Waiting for a helper to accept',
  },
  accepted: {
    label: 'Accepted',
    color: 'bg-blue-100 text-blue-900',
    icon: CheckCircle,
    emoji: '🟦',
    description: 'Helper accepted - starting service',
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-purple-100 text-purple-900',
    icon: Zap,
    emoji: '⚡',
    description: 'Helper is on the way / serving you',
  },
  completed: {
    label: '✓ Completed',
    color: 'bg-green-100 text-green-900',
    icon: CheckCircle,
    emoji: '✅',
    description: 'Service completed successfully',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-900',
    icon: XCircle,
    emoji: '❌',
    description: 'Request was cancelled',
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-900',
    icon: AlertCircle,
    emoji: '⛔',
    description: 'Request was rejected',
  },
  expired: {
    label: 'Expired',
    color: 'bg-gray-100 text-gray-900',
    icon: AlertCircle,
    emoji: '⏱️',
    description: 'No helpers available - request expired',
  },
};

const sizeConfig = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-2 text-base',
};

/**
 * RequestStatusBadge Component
 * Displays request status with icon and color coding
 */
export const RequestStatusBadge: React.FC<RequestStatusBadgeProps> = ({
  status,
  className = '',
  showIcon = true,
  size = 'md',
}) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full font-semibold transition-colors ${config.color} ${sizeConfig[size]} ${className}`}
      title={config.description}
    >
      {showIcon && <Icon className="w-4 h-4" />}
      <span>{config.label}</span>
    </div>
  );
};

/**
 * Status timeline component showing request progression
 */
interface RequestTimelineProps {
  status: RequestStatus;
  timestamps?: {
    created: Date;
    accepted?: Date;
    inProgress?: Date;
    completed?: Date;
  };
}

export const RequestTimeline: React.FC<RequestTimelineProps> = ({ status, timestamps }) => {
  const steps: Array<{
    id: RequestStatus | 'created';
    label: string;
    emoji: string;
    completed: boolean;
  }> = [
    {
      id: 'created',
      label: 'Created',
      emoji: '📋',
      completed: !!timestamps?.created,
    },
    {
      id: 'accepted',
      label: 'Accepted',
      emoji: statusConfig.accepted.emoji,
      completed: ['accepted', 'in_progress', 'completed'].includes(status),
    },
    {
      id: 'in_progress',
      label: 'In Progress',
      emoji: statusConfig.in_progress.emoji,
      completed: ['in_progress', 'completed'].includes(status),
    },
    {
      id: 'completed',
      label: 'Completed',
      emoji: statusConfig.completed.emoji,
      completed: status === 'completed',
    },
  ];

  return (
    <div className="flex justify-between items-center gap-2 my-4">
      {steps.map((step, idx) => (
        <div key={step.id} className="flex flex-col items-center flex-1">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-colors ${
              step.completed
                ? 'bg-green-500 text-white'
                : status === step.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-500'
            }`}
          >
            {step.emoji}
          </div>
          <span className="text-xs font-medium mt-1 text-center">{step.label}</span>

          {/* Connector line */}
          {idx < steps.length - 1 && (
            <div
              className={`h-1 flex-1 my-2 transition-colors ${
                step.completed ? 'bg-green-500' : 'bg-gray-200'
              }`}
              style={{ width: '40px' }}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default RequestStatusBadge;
