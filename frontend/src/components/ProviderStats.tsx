/**
 * ProviderStats Component
 * Displays key statistics cards for the provider dashboard
 */

import React from 'react';
import { Box, Paper, Typography, Button, CircularProgress, Tooltip } from '@mui/material';
import { motion } from 'framer-motion';
import {
  Package,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Users,
  Flame,
} from 'lucide-react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
  trend?: number;
  isLoading?: boolean;
  onClick?: () => void;
}

function StatCard({
  icon,
  label,
  value,
  subValue,
  color,
  trend,
  isLoading,
  onClick,
}: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <Paper
        sx={{
          p: 2.5,
          borderRadius: 2,
          height: '100%',
          background: `linear-gradient(135deg, ${color}15 0%, rgba(0,0,0,0.05) 100%)`,
          border: `1px solid ${color}30`,
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: `${color}60`,
            boxShadow: `0 8px 24px ${color}20`,
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Box
              sx={{
                p: 1,
                borderRadius: 1.5,
                background: `${color}20`,
                color,
                display: 'inline-flex',
                mb: 1,
              }}
            >
              {isLoading ? (
                <CircularProgress size={24} sx={{ color }} />
              ) : (
                icon
              )}
            </Box>
            <Typography sx={{ fontSize: '12px', color: 'text.secondary', mb: 0.5 }}>
              {label}
            </Typography>
            <Typography sx={{ fontSize: '28px', fontWeight: 700, color: 'text.primary', lineHeight: 1 }}>
              {isLoading ? '-' : value}
            </Typography>
            {subValue && (
              <Typography sx={{ fontSize: '11px', color: 'text.secondary', mt: 0.5 }}>
                {subValue}
              </Typography>
            )}
          </Box>
          {trend !== undefined && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.5,
                borderRadius: 1,
                background: trend > 0 ? '#22c55e20' : '#ef444420',
                color: trend > 0 ? '#22c55e' : '#ef4444',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <TrendingUp size={14} style={{ transform: trend < 0 ? 'rotate(180deg)' : 'none' }} />
              {trend > 0 ? '+' : ''}{trend}%
            </Box>
          )}
        </Box>
      </Paper>
    </motion.div>
  );
}

interface ProviderStatsProps {
  stats: {
    totalRequests: number;
    completedRequests: number;
    pendingRequests: number;
    activeRequests: number;
    activeHelpers: number;
    successRate: number;
    averageRating: number;
    totalRatings: number;
  } | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export default function ProviderStats({ stats, isLoading = false, onRefresh }: ProviderStatsProps) {
  if (!stats && !isLoading) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">No data available</Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography sx={{ fontSize: '18px', fontWeight: 700 }}>Overview</Typography>
        {onRefresh && (
          <Button
            size="small"
            onClick={onRefresh}
            disabled={isLoading}
            sx={{ textTransform: 'none' }}
          >
            Refresh
          </Button>
        )}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(5, 1fr)' },
          gap: 2,
        }}
      >
        <StatCard
          icon={<Package size={20} />}
          label="Total Requests"
          value={stats?.totalRequests ?? '-'}
          color="#3b82f6"
          isLoading={isLoading}
        />

        <Tooltip title={`Fulfilled: ${stats?.completedRequests ?? 0}`}>
          <div>
            <StatCard
              icon={<CheckCircle size={20} />}
              label="Completed"
              value={stats?.completedRequests ?? '-'}
              color="#22c55e"
              isLoading={isLoading}
            />
          </div>
        </Tooltip>

        <StatCard
          icon={<AlertCircle size={20} />}
          label="Pending"
          value={stats?.pendingRequests ?? '-'}
          color="#f59e0b"
          isLoading={isLoading}
        />

        <StatCard
          icon={<Flame size={20} />}
          label="Active Now"
          value={stats?.activeRequests ?? '-'}
          color="#ef4444"
          isLoading={isLoading}
        />

        <StatCard
          icon={<Users size={20} />}
          label="Active Helpers"
          value={stats?.activeHelpers ?? '-'}
          color="#8b5cf6"
          isLoading={isLoading}
        />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 2 }}>
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Success Rate"
          value={`${stats?.successRate ?? 0}%`}
          subValue={`${stats?.completedRequests ?? 0} of ${stats?.totalRequests ?? 0} fulfilled`}
          color="#10b981"
          isLoading={isLoading}
        />

        <StatCard
          icon={<Flame size={20} />}
          label="Average Rating"
          value={`${stats?.averageRating?.toFixed(1) ?? 0}`}
          subValue={`From ${stats?.totalRatings ?? 0} ratings`}
          color="#f97316"
          isLoading={isLoading}
        />
      </Box>
    </Box>
  );
}
