/**
 * Enhanced Provider Dashboard
 * Complete integration of new features: stats, requests, helpers, inventory, real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Tabs,
  Tab,
  Typography,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { providerDashboardApi } from '../lib/providerApi';
import { useProviderSocket } from '../hooks/useProviderSocket';
import ProviderStats from '../components/ProviderStats';
import InventoryCard from '../components/InventoryCard';
import RequestsTable from '../components/RequestsTable';
import HelpersTable from '../components/HelpersTable';

interface DashboardStats {
  totalRequests: number;
  completedRequests: number;
  pendingRequests: number;
  activeRequests: number;
  activeHelpers: number;
  successRate: number;
  averageRating: number;
  totalRatings: number;
  businessName: string;
  businessType: 'LPG' | 'CNG' | 'Both';
  isVerified: boolean;
  fetchedAt: string;
}

interface Request {
  requestId: string;
  cylinderType: 'LPG' | 'CNG';
  status: string;
  quantity: number;
  address: string;
  seekerEmail: string;
  helperName: string;
  helperRating: number;
  createdAt: string;
  completedAt?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

interface Helper {
  helperId: string;
  fullName: string;
  phone: string;
  rating: number;
  totalRequests: number;
  completedRequests: number;
  isAvailable: boolean;
  currentActive: number;
}

interface Inventory {
  lpgStock: number;
  cngStock: number;
  totalStock: number;
  lastUpdated: string;
}

export default function ProviderDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);

  // Stats
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Requests
  const [requestsData, setRequestsData] = useState<Request[]>([]);
  const [requestsTotal, setRequestsTotal] = useState(0);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsPage, setRequestsPage] = useState(0);
  const [requestsLimit, setRequestsLimit] = useState(20);
  const [requestsStatus, setRequestsStatus] = useState<string>('');

  // Helpers
  const [helpersData, setHelpersData] = useState<Helper[]>([]);
  const [helpersTotal, setHelpersTotal] = useState(0);
  const [helpersLoading, setHelpersLoading] = useState(false);
  const [helpersPage, setHelpersPage] = useState(0);
  const [helpersLimit, setHelpersLimit] = useState(20);

  // Inventory
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  // Error
  const [error, setError] = useState<string | null>(null);

  // ════════════════════════════════════════════════════════════════════════════════════
  // LOAD DATA FUNCTIONS
  // ════════════════════════════════════════════════════════════════════════════════════

  const loadStats = useCallback(async () => {
    if (!user) return;
    try {
      setStatsLoading(true);
      const res = await providerDashboardApi.getDashboardStats();
      setStats(res.data.data);
      setError(null);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Failed to load stats';
      setError(msg);
      toast.error(msg);
    } finally {
      setStatsLoading(false);
    }
  }, [user]);

  const loadRequests = useCallback(async () => {
    if (!user) return;
    try {
      setRequestsLoading(true);
      const res = await providerDashboardApi.getRequests(
        requestsPage + 1,
        requestsLimit,
        requestsStatus
      );
      setRequestsData(res.data.data);
      setRequestsTotal(res.data.pagination?.total || 0);
      setError(null);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Failed to load requests';
      setError(msg);
      toast.error(msg);
    } finally {
      setRequestsLoading(false);
    }
  }, [user, requestsPage, requestsLimit, requestsStatus]);

  const loadHelpers = useCallback(async () => {
    if (!user) return;
    try {
      setHelpersLoading(true);
      const res = await providerDashboardApi.getHelpers(
        helpersPage + 1,
        helpersLimit
      );
      setHelpersData(res.data.data);
      setHelpersTotal(res.data.pagination?.total || 0);
      setError(null);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Failed to load helpers';
      setError(msg);
      toast.error(msg);
    } finally {
      setHelpersLoading(false);
    }
  }, [user, helpersPage, helpersLimit]);

  const loadInventory = useCallback(async () => {
    if (!user) return;
    try {
      setInventoryLoading(true);
      const res = await providerDashboardApi.getInventory();
      setInventory(res.data.data);
      setError(null);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Failed to load inventory';
      setError(msg);
      toast.error(msg);
    } finally {
      setInventoryLoading(false);
    }
  }, [user]);

  // Initial load on mount
  useEffect(() => {
    if (user) {
      loadStats();
      loadRequests();
      loadHelpers();
      loadInventory();
    }
  }, [user, loadStats, loadRequests, loadHelpers, loadInventory]);

  // ════════════════════════════════════════════════════════════════════════════════════
  // SOCKET REAL-TIME UPDATES
  // ════════════════════════════════════════════════════════════════════════════════════

  useProviderSocket({
    onDashboardUpdate: (event) => {
      console.log('[Dashboard] Update received:', event);
      loadStats(); // Refresh stats on update
    },
    onInventoryUpdate: (data) => {
      console.log('[Inventory] Update received:', data);
      setInventory({
        lpgStock: data.lpgStock || 0,
        cngStock: data.cngStock || 0,
        totalStock: (data.lpgStock || 0) + (data.cngStock || 0),
        lastUpdated: new Date().toISOString(),
      });
      toast.info('Inventory updated');
    },
    onStatsRefresh: () => {
      console.log('[Stats] Refresh requested');
      loadStats();
    },
  });

  // ════════════════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ════════════════════════════════════════════════════════════════════════════════════

  const handleUpdateInventory = async (lpg: number, cng: number) => {
    try {
      await providerDashboardApi.updateInventoryStock(lpg, cng);
      setInventory({
        lpgStock: lpg,
        cngStock: cng,
        totalStock: lpg + cng,
        lastUpdated: new Date().toISOString(),
      });
      toast.success('Inventory updated successfully');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Failed to update inventory';
      toast.error(msg);
    }
  };

  // ════════════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════════════

  if (error && !stats && !requestsData.length) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={loadStats}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', background: '#0a0a0b', pb: 8 }}>
      <Container maxWidth="xl" sx={{ pt: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography sx={{ fontSize: '32px', fontWeight: 800, mb: 0.5 }}>
                  Provider Dashboard
                </Typography>
                <Typography sx={{ fontSize: '14px', color: 'text.secondary' }}>
                  Welcome back, {stats?.businessName || 'Provider'}
                </Typography>
              </Box>
              <Button
                onClick={loadStats}
                disabled={statsLoading}
                variant="contained"
                sx={{ textTransform: 'none' }}
              >
                {statsLoading ? <CircularProgress size={20} /> : 'Refresh'}
              </Button>
            </Box>
          </motion.div>
        </Box>

        {/* Stats Cards */}
        <Box sx={{ mb: 4 }}>
          <ProviderStats stats={stats} isLoading={statsLoading} onRefresh={loadStats} />
        </Box>

        {/* Tabs for different views */}
        <Box sx={{ mb: 4 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs
                value={activeTab}
                onChange={(_, value) => setActiveTab(value)}
                sx={{
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontSize: '14px',
                    fontWeight: 600,
                  },
                }}
              >
                <Tab label="📊 Inventory" />
                <Tab label="📋 Requests" />
                <Tab label="👥 Helpers" />
              </Tabs>
            </Box>

            {/* Tab Content */}
            {activeTab === 0 && (
              <Box sx={{ mb: 4 }}>
                <InventoryCard
                  inventory={inventory}
                  isLoading={inventoryLoading}
                  onUpdate={handleUpdateInventory}
                  businessType={stats?.businessType || 'Both'}
                />
              </Box>
            )}

            {activeTab === 1 && (
              <Box sx={{ mb: 4 }}>
                <RequestsTable
                  requests={requestsData}
                  total={requestsTotal}
                  isLoading={requestsLoading}
                  page={requestsPage}
                  limit={requestsLimit}
                  onPageChange={(newPage) => setRequestsPage(newPage)}
                  onLimitChange={(newLimit) => {
                    setRequestsLimit(newLimit);
                    setRequestsPage(0);
                  }}
                  onStatusFilter={(status) => {
                    setRequestsStatus(status);
                    setRequestsPage(0);
                  }}
                />
              </Box>
            )}

            {activeTab === 2 && (
              <Box sx={{ mb: 4 }}>
                <HelpersTable
                  helpers={helpersData}
                  total={helpersTotal}
                  isLoading={helpersLoading}
                  page={helpersPage}
                  limit={helpersLimit}
                  onPageChange={(newPage) => setHelpersPage(newPage)}
                  onLimitChange={(newLimit) => {
                    setHelpersLimit(newLimit);
                    setHelpersPage(0);
                  }}
                />
              </Box>
            )}
          </motion.div>
        </Box>
      </Container>
    </Box>
  );
}
