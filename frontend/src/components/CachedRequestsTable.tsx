import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import { motion } from 'framer-motion';
import { providerDashboardApi as providerApi } from '../lib/providerApi';
import { useDashboardCache, cacheKeys, useCachedData } from '../context/DashboardCacheContext';
import { VirtualizedDataTable } from './VirtualizedDataTable';

interface Request {
  _id: string;
  cylinderType: 'LPG' | 'CNG';
  seekerId: string;
  helperAssigned?: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  amount?: number;
}

interface CachedRequestsTableProps {
  providerId: string;
  onRefresh?: () => void;
}

/**
 * Optimized Requests Table with Caching & Virtualization
 */
export function CachedRequestsTable({ providerId, onRefresh }: CachedRequestsTableProps) {
  const { invalidateCache } = useDashboardCache();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [status, setStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Generate cache key based on filters
  const cacheKey = useMemo(
    () => cacheKeys.requests(providerId, page, limit, status),
    [providerId, page, limit, status]
  );

  // Fetch with caching
  const { data, loading, error } = useCachedData(
    cacheKey,
    async () => {
      const response = await providerApi.getRequests(page, limit, status);
      return response.data;
    },
    5 * 60 * 1000 // 5 minute cache
  );

  // Filter in-memory for search
  const filteredRows = useMemo(() => {
    if (!data || !searchTerm) return data.requests || [];

    const term = searchTerm.toLowerCase();
    return data.requests.filter((req) =>
      Object.values(req).some((val) =>
        String(val).toLowerCase().includes(term)
      )
    );
  }, [data, searchTerm]);

  // Table columns
  const columns = useMemo(
    () => [
      {
        id: '_id',
        label: 'Request ID',
        width: 120,
        render: (val: string) => (
          <code style={{ fontSize: '0.75rem' }}>{val.slice(0, 8)}</code>
        ),
      },
      {
        id: 'cylinderType',
        label: 'Type',
        width: 80,
        render: (val: string) => (
          <Chip
            label={val}
            variant="outlined"
            size="small"
            color={val === 'LPG' ? 'primary' : 'success'}
          />
        ),
      },
      {
        id: 'priority',
        label: 'Priority',
        width: 100,
        render: (val: string) => (
          <Chip
            label={val.toUpperCase()}
            size="small"
            color={
              val === 'critical'
                ? 'error'
                : val === 'high'
                  ? 'warning'
                  : 'default'
            }
          />
        ),
      },
      {
        id: 'status',
        label: 'Status',
        width: 100,
        render: (val: string) => (
          <Chip
            label={val}
            variant="outlined"
            size="small"
            color={
              val === 'completed'
                ? 'success'
                : val === 'pending'
                  ? 'default'
                  : 'primary'
            }
          />
        ),
      },
      {
        id: 'createdAt',
        label: 'Created',
        width: 150,
        render: (val: string) => new Date(val).toLocaleDateString(),
      },
      {
        id: 'amount',
        label: 'Amount',
        width: 100,
        render: (val: number) => `₹${val?.toFixed(2) || '0.00'}`,
      },
    ],
    []
  );

  const handleRefresh = useCallback(() => {
    invalidateCache(cacheKey);
    onRefresh?.();
  }, [cacheKey, invalidateCache, onRefresh]);

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    setPage(1);
  };

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">
            Failed to load requests: {error.message}
            <Button size="small" onClick={handleRefresh} sx={{ ml: 2 }}>
              Retry
            </Button>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardContent>
          {/* Controls */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
            <TextField
              placeholder="Search requests..."
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ flex: 1 }}
            />
            <TextField
              select
              label="Status"
              size="small"
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              sx={{ width: 150 }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </TextField>
            <TextField
              select
              label="Limit"
              size="small"
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value));
                setPage(1);
              }}
              sx={{ width: 100 }}
            >
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={20}>20</MenuItem>
              <MenuItem value={50}>50</MenuItem>
            </TextField>
            <Button
              variant="outlined"
              size="small"
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? <CircularProgress size={20} /> : 'Refresh'}
            </Button>
          </Box>

          {/* Virtual Table */}
          {loading && !data ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <VirtualizedDataTable
                columns={columns}
                rows={filteredRows}
                height={500}
                itemSize={53}
                loading={loading}
              />

              {/* Pagination Info */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, p: 2 }}>
                <span>
                  Showing {filteredRows.length} of {data?.pagination?.total || 0} requests
                </span>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1 || loading}
                  >
                    Previous
                  </Button>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    Page {page} of {data?.pagination?.pages || 1}
                  </span>
                  <Button
                    size="small"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= (data?.pagination?.pages || 1) || loading}
                  >
                    Next
                  </Button>
                </Box>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
