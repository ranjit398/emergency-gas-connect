// frontend/src/pages/Dashboard.tsx
// UNIFIED DASHBOARD  Shows live data for seeker, helper, and provider in one page

import { useState } from 'react';
import {
  Container, Grid, Typography, Box, Paper, Button, Tab, Tabs,
  Chip, LinearProgress, Avatar, Switch, FormControlLabel,
  CircularProgress, Alert, Badge, IconButton, Tooltip,
} from '@mui/material';
import {
  AlertCircle, CheckCircle, Package, Clock, MapPin,
  Star, MessageCircle, RefreshCw, Activity, TrendingUp,
  Zap, Navigation,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { requestsApi, profileApi } from '../lib/api';
import { useLiveData } from '../hooks/useLiveData';
import type { NearbyRequest, RequestItem } from '../hooks/useLiveData';

//  Colour helpers 
const PRIORITY = {
  critical: { bg: 'rgba(239,68,68,.12)', border: 'rgba(239,68,68,.35)', text: '#fca5a5', dot: '#ef4444' },
  high:     { bg: 'rgba(245,158,11,.12)', border: 'rgba(245,158,11,.35)', text: '#fcd34d', dot: '#f59e0b' },
  medium:   { bg: 'rgba(59,130,246,.12)', border: 'rgba(59,130,246,.30)', text: '#93c5fd', dot: '#3b82f6' },
  low:      { bg: 'rgba(34,197,94,.10)', border: 'rgba(34,197,94,.28)',  text: '#86efac', dot: '#22c55e' },
} as const;

const STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b', accepted: '#3b82f6', completed: '#22c55e', cancelled: '#6b7280',
};

//  Tiny stat card 
function StatCard({ icon, label, value, color, sub }: { icon: React.ReactNode; label: string; value: number | string; color: string; sub?: string }) {
  return (
    <Paper sx={{ p: 2.5, borderRadius: 3, background: `linear-gradient(135deg, ${color}12, transparent)`, border: `1px solid ${color}25`, height: '100%' }}>
      <Box sx={{ p: 1, borderRadius: 2, background: `${color}20`, color, display: 'inline-flex', mb: 1.5 }}>{icon}</Box>
      <Typography sx={{ fontSize: '28px', fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>{value}</Typography>
      <Typography sx={{ fontSize: '11px', color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', mt: .5 }}>{label}</Typography>
      {sub && <Typography sx={{ fontSize: '11px', color: 'text.disabled', mt: .3 }}>{sub}</Typography>}
    </Paper>
  );
}

//  Priority badge 
function PriorityBadge({ level }: { level: string }) {
  const cfg = PRIORITY[level as keyof typeof PRIORITY] ?? PRIORITY.low;
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: .7, px: 1.2, py: .3, borderRadius: '99px', background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, animation: level === 'critical' ? 'pulse 1.5s infinite' : 'none', boxShadow: level === 'critical' ? `0 0 6px ${cfg.dot}` : 'none' }} />
      <Typography sx={{ fontSize: '10px', fontWeight: 700, color: cfg.text, textTransform: 'capitalize' }}>{level}</Typography>
    </Box>
  );
}

//  Request row card 
function RequestRow({ req, showAccept, showChat, showCancel, showComplete, onAccept, onCancel, onComplete }: {
  req: RequestItem;
  showAccept?: boolean; showChat?: boolean; showCancel?: boolean; showComplete?: boolean;
  onAccept?: (id: string) => void; onCancel?: (id: string) => void; onComplete?: (id: string) => void;
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const statusColor = STATUS_COLOR[req.status] ?? '#6b7280';

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      <Box sx={{
        p: 2, mb: 1.5, borderRadius: 2.5,
        border: `1px solid`,
        borderColor: req.priorityLevel === 'critical' ? 'rgba(239,68,68,.25)' : 'divider',
        background: req.priorityLevel === 'critical' ? 'rgba(239,68,68,.04)' : 'background.paper',
        transition: 'all .2s',
        '&:hover': { borderColor: 'primary.main', boxShadow: 1 },
      }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <PriorityBadge level={req.priorityLevel} />
            <Chip label={req.status.toUpperCase()} size="small" sx={{ fontSize: '10px', fontWeight: 700, bgcolor: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}30` }} />
            <Chip label={`${req.cylinderType} ${req.quantity}`} size="small" variant="outlined" sx={{ fontSize: '10px' }} />
          </Box>
          <Typography variant="caption" color="text.disabled">
            {req.minutesAgo < 2 ? 'Just now' : req.minutesAgo < 60 ? `${req.minutesAgo}m ago` : `${Math.floor(req.minutesAgo/60)}h ago`}
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: .5, display: 'flex', alignItems: 'center', gap: .5 }}>
          <MapPin size={13} /> {req.address}
        </Typography>

        {(req.seekerName || req.helperName) && (
          <Typography variant="caption" color="text.disabled">
            {req.seekerName ? `Seeker: ${req.seekerName}` : ''}
            {req.helperName ? `Helper: ${req.helperName}` : ''}
          </Typography>
        )}

        {req.message && (
          <Typography variant="caption" sx={{ display: 'block', mt: .5, fontStyle: 'italic', color: 'text.secondary' }}>
            "{req.message}"
          </Typography>
        )}

        <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {showAccept && req.status === 'pending' && onAccept && (
            <Button size="small" variant="contained" onClick={async () => { setLoading(true); try { await onAccept(req.id); } finally { setLoading(false); } }}
              disabled={loading} sx={{ borderRadius: 1.5, fontSize: '12px', minWidth: 80 }}>
              {loading ? <CircularProgress size={14} color="inherit" /> : ' Accept'}
            </Button>
          )}
          {showChat && req.status === 'accepted' && (
            <Button size="small" variant="outlined" startIcon={<MessageCircle size={13} />}
              onClick={() => navigate(`/chat/${req.id}`)} sx={{ borderRadius: 1.5, fontSize: '12px' }}>
              Open Chat
            </Button>
          )}
          {showComplete && req.status === 'accepted' && onComplete && (
            <Button size="small" variant="contained" color="success" startIcon={<CheckCircle size={13} />}
              onClick={async () => { setLoading(true); try { await onComplete(req.id); } finally { setLoading(false); } }}
              disabled={loading} sx={{ borderRadius: 1.5, fontSize: '12px' }}>
              {loading ? <CircularProgress size={14} color="inherit" /> : ' Complete'}
            </Button>
          )}
          {showCancel && req.status === 'pending' && onCancel && (
            <Button size="small" variant="outlined" color="error"
              onClick={async () => { setLoading(true); try { await onCancel(req.id); } finally { setLoading(false); } }}
              disabled={loading} sx={{ borderRadius: 1.5, fontSize: '12px' }}>
              Cancel
            </Button>
          )}
        </Box>
      </Box>
    </motion.div>
  );
}

//  Nearby request card (for provider / helper) 
function NearbyCard({ req, onFulfill, onAccept }: {
  req: NearbyRequest;
  onFulfill?: (id: string) => void;
  onAccept?: (id: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const handler = onFulfill ?? onAccept;
  const btnLabel = onFulfill ? (req.canFulfill ? ' Fulfill' : ' No Stock') : ' Accept';
  const disabled = onFulfill ? !req.canFulfill : false;

  return (
    <Box sx={{
      p: 2, mb: 1.5, borderRadius: 2.5,
      border: `1px solid`, borderColor: req.priorityLevel === 'critical' ? 'rgba(239,68,68,.3)' : 'divider',
      background: req.priorityLevel === 'critical' ? 'rgba(239,68,68,.04)' : 'background.paper',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', gap: .8, flexWrap: 'wrap' }}>
          <PriorityBadge level={req.priorityLevel} />
          <Chip label={req.cylinderType} size="small" variant="outlined" sx={{ fontSize: '10px' }} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: .5 }}>
          <Navigation size={12} color="#4CAF50" />
          <Typography variant="caption" color="success.main" fontWeight={700}>{req.distanceKm}km</Typography>
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: .5 }}> {req.address}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
        <Typography variant="caption" color="text.disabled">
          {req.seekerName}  {req.minutesAgo < 2 ? 'Just now' : `${req.minutesAgo}m ago`}
        </Typography>
        <Button size="small" variant="contained" disabled={loading || disabled}
          onClick={async () => { if (!handler) return; setLoading(true); try { await handler(req.id); } finally { setLoading(false); } }}
          sx={{ borderRadius: 1.5, fontSize: '11px', py: .4 }}>
          {loading ? <CircularProgress size={13} color="inherit" /> : btnLabel}
        </Button>
      </Box>
    </Box>
  );
}

// 
// MAIN DASHBOARD
// 
export default function Dashboard() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  const role = profile?.role as 'provider' | 'helper' | 'seeker' | undefined;
  const { data, loading, refreshing, error, newEvents, refresh, silentRefresh,
    providerData, helperData, seekerData } = useLiveData(role, 30_000);

  //  Actions 
  const handleAccept = async (requestId: string) => {
    try {
      await requestsApi.accept(requestId);
      toast.success('Request accepted!');
      silentRefresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message ?? 'Failed to accept');
    }
  };

  const handleCancel = async (requestId: string) => {
    try {
      await requestsApi.cancel(requestId);
      toast.success('Request cancelled');
      silentRefresh();
    } catch {
      toast.error('Failed to cancel');
    }
  };

  const handleComplete = async (requestId: string) => {
    try {
      await requestsApi.complete(requestId);
      toast.success('Request completed! ');
      silentRefresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message ?? 'Failed to complete');
    }
  };

  const handleToggleAvailability = async () => {
    if (!profile) return;
    try {
      await profileApi.setAvailability(!profile.isAvailable);
      await refreshProfile();
      toast.success(profile.isAvailable ? 'Now unavailable' : 'Now available for requests');
      silentRefresh();
    } catch {
      toast.error('Failed to update availability');
    }
  };

  //  Loading 
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <CircularProgress size={28} />
          <Typography color="text.secondary">Loading live data...</Typography>
        </Box>
        <Grid container spacing={3}>
          {[0,1,2,3].map((i) => <Grid item xs={12} sm={6} md={3} key={i}><Paper sx={{ height: 120, borderRadius: 3, bgcolor: 'action.hover' }} /></Grid>)}
        </Grid>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" action={<Button size="small" onClick={refresh}>Retry</Button>}>{error}</Alert>
      </Container>
    );
  }

  // 
  // SEEKER VIEW
  // 
  if (seekerData) {
    const { stats, myRequests, recentHelpers } = seekerData;
    const TABS = ['All', 'Pending', 'Active', 'Completed'];
    const filtered = activeTab === 0 ? myRequests
      : myRequests.filter((r) => {
        if (activeTab === 1) return r.status === 'pending';
        if (activeTab === 2) return r.status === 'accepted';
        if (activeTab === 3) return r.status === 'completed';
        return true;
      });

    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={700}>My Dashboard</Typography>
            <Typography color="text.secondary">Manage your emergency gas requests</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Refresh">
              <IconButton onClick={refresh} disabled={refreshing} size="small">
                <RefreshCw size={18} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              </IconButton>
            </Tooltip>
            <Button variant="contained" onClick={() => navigate('/request')} sx={{ borderRadius: 2 }}>
              + New Request
            </Button>
          </Box>
        </Box>

        {/* Stats */}
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          {[
            { label: 'Pending',   value: stats.pending,   color: '#f59e0b', icon: <Clock size={20} /> },
            { label: 'Active',    value: stats.accepted,  color: '#3b82f6', icon: <Activity size={20} />, sub: stats.accepted > 0 ? 'In progress' : undefined },
            { label: 'Completed', value: stats.completed, color: '#22c55e', icon: <CheckCircle size={20} /> },
            { label: 'Total',     value: stats.total,     color: '#8b5cf6', icon: <Package size={20} /> },
          ].map(({ label, value, color, icon, sub }) => (
            <Grid item xs={6} md={3} key={label}>
              <StatCard icon={icon} label={label} value={value} color={color} sub={sub} />
            </Grid>
          ))}
        </Grid>

        {/* Live events */}
        {newEvents.length > 0 && (
          <Paper sx={{ p: 2, mb: 3, borderRadius: 2, borderLeft: '4px solid', borderColor: 'primary.main' }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}> Live Updates</Typography>
            {newEvents.slice(0, 3).map((e) => (
              <Box key={e.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: .5 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />
                <Typography variant="body2">{e.message}</Typography>
                <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto' }}>
                  {formatDistanceToNow(e.time, { addSuffix: true })}
                </Typography>
              </Box>
            ))}
          </Paper>
        )}

        <Grid container spacing={3}>
          {/* Left: request list */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 1 }}>
                {TABS.map((t, i) => <Tab key={i} label={`${t} (${i === 0 ? stats.total : i === 1 ? stats.pending : i === 2 ? stats.accepted : stats.completed})`} sx={{ textTransform: 'none', fontWeight: 600, fontSize: '13px' }} />)}
              </Tabs>
              <Box sx={{ p: 2.5, maxHeight: 600, overflowY: 'auto' }}>
                <AnimatePresence mode="wait">
                  {filtered.length === 0 ? (
                    <Box sx={{ py: 6, textAlign: 'center' }}>
                      <Package size={48} color="rgba(0,0,0,.15)" style={{ margin: '0 auto 12px' }} />
                      <Typography color="text.secondary">No {TABS[activeTab].toLowerCase()} requests</Typography>
                      {activeTab === 0 && <Button sx={{ mt: 2 }} variant="outlined" onClick={() => navigate('/request')}>Create your first request</Button>}
                    </Box>
                  ) : (
                    <motion.div key={activeTab}>
                      {filtered.map((req) => (
                        <RequestRow key={req.id} req={req}
                          showChat={true} showCancel={true}
                          onCancel={handleCancel} />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </Box>
            </Paper>
          </Grid>

          {/* Right: past helpers */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2.5, borderRadius: 3 }}>
              <Typography fontWeight={700} sx={{ mb: 2 }}> Your Helpers</Typography>
              {recentHelpers.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>No helpers yet</Typography>
              ) : recentHelpers.map((h) => (
                <Box key={h.helperId} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Avatar src={h.avatarUrl ?? undefined} sx={{ width: 36, height: 36 }}>{h.fullName[0]}</Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={600}>{h.fullName}</Typography>
                    <Typography variant="caption" color="text.secondary"> {h.rating.toFixed(1)}  helped {h.timesHelped}</Typography>
                  </Box>
                </Box>
              ))}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    );
  }

  // 
  // HELPER VIEW
  // 
  if (helperData) {
    const { helper, stats, pendingNearby, myRequests } = helperData;
    const activeReqs = myRequests.filter((r) => r.status === 'accepted');
    const completedReqs = myRequests.filter((r) => r.status === 'completed');

    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={700}>Helper Dashboard</Typography>
            <Typography color="text.secondary">Welcome back, {helper.fullName}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <FormControlLabel
              control={<Switch checked={helper.isAvailable} onChange={handleToggleAvailability} />}
              label={
                <Typography variant="body2" fontWeight={600} color={helper.isAvailable ? 'success.main' : 'text.disabled'}>
                  {helper.isAvailable ? ' Available' : ' Offline'}
                </Typography>
              }
            />
            <Tooltip title="Refresh"><IconButton onClick={refresh} disabled={refreshing} size="small"><RefreshCw size={18} /></IconButton></Tooltip>
          </Box>
        </Box>

        {/* Verification warning */}
        {helper.verificationStatus !== 'verified' && (
          <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
            Your account is pending verification. Complete verification to accept requests.
          </Alert>
        )}

        {/* Stats */}
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          {[
            { label: 'Total Accepted', value: stats.totalAccepted, color: '#3b82f6', icon: <Package size={20} /> },
            { label: 'Completed',      value: stats.totalCompleted, color: '#22c55e', icon: <CheckCircle size={20} /> },
            { label: 'Active Now',     value: stats.activeNow, color: '#f97316', icon: <Activity size={20} />, sub: stats.activeNow > 0 ? 'In progress' : undefined },
            { label: 'Rating',         value: ` ${helper.rating.toFixed(1)}`, color: '#f59e0b', icon: <Star size={20} />, sub: `${helper.totalRatings} reviews` },
          ].map(({ label, value, color, icon, sub }) => (
            <Grid item xs={6} md={3} key={label}>
              <StatCard icon={icon} label={label} value={value} color={color} sub={sub} />
            </Grid>
          ))}
        </Grid>

        {/* Completion rate bar */}
        <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography fontWeight={700}>Completion Rate</Typography>
            <Typography fontWeight={800} color={stats.completionRate >= 80 ? 'success.main' : 'warning.main'}>
              {stats.completionRateLabel}
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={stats.completionRate}
            sx={{ height: 10, borderRadius: 5, '& .MuiLinearProgress-bar': { borderRadius: 5 } }} />
          <Typography variant="caption" color="text.disabled" sx={{ mt: .5, display: 'block' }}>
            Avg response: {helper.avgResponseTimeMin}min  {stats.totalCompleted} completed this month
          </Typography>
        </Paper>

        {/* Tabs */}
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 1 }}>
            <Tab label={<Badge badgeContent={pendingNearby.length} color="error">Available Nearby</Badge>} sx={{ textTransform: 'none', fontWeight: 600, fontSize: '13px', pr: 3 }} />
            <Tab label={`My Active (${activeReqs.length})`} sx={{ textTransform: 'none', fontWeight: 600, fontSize: '13px' }} />
            <Tab label={`Completed (${completedReqs.length})`} sx={{ textTransform: 'none', fontWeight: 600, fontSize: '13px' }} />
          </Tabs>
          <Box sx={{ p: 2.5, maxHeight: 600, overflowY: 'auto' }}>
            <AnimatePresence mode="wait">
              {activeTab === 0 && (
                <motion.div key="nearby">
                  {pendingNearby.length === 0 ? (
                    <Box sx={{ py: 6, textAlign: 'center' }}>
                      <MapPin size={40} color="rgba(0,0,0,.15)" style={{ margin: '0 auto 12px' }} />
                      <Typography color="text.secondary">No pending requests nearby</Typography>
                    </Box>
                  ) : pendingNearby.map((req) => (
                    <NearbyCard key={req.id} req={req} onAccept={handleAccept} />
                  ))}
                </motion.div>
              )}
              {activeTab === 1 && (
                <motion.div key="active">
                  {activeReqs.length === 0 ? (
                    <Box sx={{ py: 6, textAlign: 'center' }}>
                      <CheckCircle size={40} color="rgba(0,0,0,.15)" style={{ margin: '0 auto 12px' }} />
                      <Typography color="text.secondary">No active requests</Typography>
                    </Box>
                  ) : activeReqs.map((req) => (
                    <RequestRow key={req.id} req={req} showChat={true} showComplete={true} onComplete={handleComplete} />
                  ))}
                </motion.div>
              )}
              {activeTab === 2 && (
                <motion.div key="done">
                  {completedReqs.length === 0 ? (
                    <Box sx={{ py: 6, textAlign: 'center' }}>
                      <Typography color="text.secondary">No completed requests yet</Typography>
                    </Box>
                  ) : completedReqs.map((req) => (
                    <RequestRow key={req.id} req={req} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </Box>
        </Paper>
      </Container>
    );
  }

  // 
  // PROVIDER VIEW
  // 
  if (providerData) {
    const { provider, stats, nearbyRequests, ratings, sevenDaySeries, recentActivity } = providerData;
    const handleFulfill = async (requestId: string) => {
      try {
        await import('../lib/api').then(m => m.default.post(`/provider-dashboard/fulfill/${requestId}`));
        toast.success('Request fulfilled!');
        silentRefresh();
      } catch (e: any) {
        toast.error(e?.response?.data?.error?.message ?? 'Failed to fulfill');
      }
    };

    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={700}>{provider.businessName}</Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: .5 }}>
              <Chip label={provider.businessType} size="small" color="primary" />
              {provider.isVerified ? <Chip label=" Verified" size="small" color="success" /> : <Chip label="Pending Verification" size="small" color="warning" />}
            </Box>
          </Box>
          <Tooltip title="Refresh"><IconButton onClick={refresh} disabled={refreshing}><RefreshCw size={18} /></IconButton></Tooltip>
        </Box>

        {/* Top Stats */}
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          {[
            { label: 'Nearby Pending', value: stats.nearbyPending, color: '#ef4444', icon: <AlertCircle size={20} /> },
            { label: 'Today Fulfilled', value: stats.todayCompleted, color: '#f97316', icon: <TrendingUp size={20} />, sub: `${stats.monthCompleted} this month` },
            { label: 'Total Stock', value: provider.totalStock, color: provider.stockStatus === 'healthy' ? '#22c55e' : provider.stockStatus === 'empty' ? '#6b7280' : '#f59e0b', icon: <Package size={20} />, sub: provider.stockStatus },
            { label: 'Rating', value: ` ${ratings.average.toFixed(1)}`, color: '#f59e0b', icon: <Star size={20} />, sub: `${ratings.total} reviews` },
          ].map(({ label, value, color, icon, sub }) => (
            <Grid item xs={6} md={3} key={label}>
              <StatCard icon={icon} label={label} value={value} color={color} sub={sub} />
            </Grid>
          ))}
        </Grid>

        {/* Main Content */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Nearby Requests - 2/3 width */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ p: 2.5, borderBottom: 1, borderColor: 'divider' }}>
                <Typography fontWeight={700}> Nearby Emergency Requests</Typography>
              </Box>
              <Box sx={{ p: 2.5, maxHeight: 500, overflowY: 'auto' }}>
                {nearbyRequests.length === 0 ? (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary"> No pending requests nearby</Typography>
                  </Box>
                ) : nearbyRequests.map((req) => (
                  <NearbyCard key={req.id} req={req} onFulfill={handleFulfill} />
                ))}
              </Box>
            </Paper>
          </Grid>

          {/* Inventory + Rating - 1/3 width */}
          <Grid item xs={12} md={4}>
            {/* Inventory */}
            <Paper sx={{ p: 2.5, borderRadius: 3, mb: 2 }}>
              <Typography fontWeight={700} sx={{ mb: 2 }}> Inventory</Typography>
              {provider.inventory.map((c) => (
                <Box key={c.type} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, mb: 1, borderRadius: 2,
                  bgcolor: c.quantity === 0 ? 'rgba(107,114,128,.08)' : c.quantity < 5 ? 'rgba(245,158,11,.08)' : 'rgba(34,197,94,.08)',
                  border: '1px solid', borderColor: c.quantity === 0 ? 'rgba(107,114,128,.2)' : c.quantity < 5 ? 'rgba(245,158,11,.2)' : 'rgba(34,197,94,.2)' }}>
                  <Typography fontWeight={700} color={c.type === 'LPG' ? 'warning.main' : 'primary.main'}>{c.type}</Typography>
                  <Typography fontWeight={800} sx={{ fontSize: '20px' }}>{c.quantity}</Typography>
                </Box>
              ))}
            </Paper>

            {/* Rating Distribution */}
            <Paper sx={{ p: 2.5, borderRadius: 3 }}>
              <Typography fontWeight={700} sx={{ mb: 1.5 }}> Rating</Typography>
              <Typography sx={{ fontSize: '42px', fontWeight: 900, color: 'warning.main', lineHeight: 1 }}>{ratings.average.toFixed(1)}</Typography>
              <Typography variant="caption" color="text.secondary">{ratings.total} total reviews</Typography>
              {[5,4,3,2,1].map((star) => {
                const count = ratings.distribution[star] ?? 0;
                const total = Object.values(ratings.distribution).reduce((a,b)=>a+b,0);
                return (
                  <Box key={star} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: .8 }}>
                    <Typography sx={{ fontSize: '11px', color: 'warning.main', minWidth: 18 }}>{''.repeat(star)}</Typography>
                    <LinearProgress variant="determinate" value={total > 0 ? (count/total)*100 : 0}
                      sx={{ flex: 1, height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { borderRadius: 3 } }} />
                    <Typography variant="caption" color="text.disabled" sx={{ minWidth: 18 }}>{count}</Typography>
                  </Box>
                );
              })}
            </Paper>
          </Grid>
        </Grid>

        {/* Bottom Row: 7-day chart + Recent Activity */}
        <Grid container spacing={3}>
          {/* 7-Day Chart */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2.5, borderRadius: 3 }}>
              <Typography fontWeight={700} sx={{ mb: 2 }}> 7-Day Fulfillment</Typography>
              <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: 160, gap: 1 }}>
                {sevenDaySeries.map((d) => {
                  const maxVal = Math.max(...sevenDaySeries.map(x => x.fulfilled), 1);
                  const height = (d.fulfilled / maxVal) * 100;
                  return (
                    <Box key={d.date} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                      <Box sx={{
                        height: `${height}%`, width: '100%', borderRadius: '4px 4px 0 0',
                        background: 'linear-gradient(to top, #3b82f6, #60a5fa)', transition: 'all .3s'
                      }} />
                      <Typography variant="caption" sx={{ mt: 1, fontWeight: 600 }}>{d.fulfilled}</Typography>
                      <Typography variant="caption" color="text.disabled">{d.label}</Typography>
                    </Box>
                  );
                })}
              </Box>
            </Paper>
          </Grid>

          {/* Recent Activity */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2.5, borderRadius: 3 }}>
              <Typography fontWeight={700} sx={{ mb: 1.5 }}> Recent Activity</Typography>
              <Box sx={{ maxHeight: 250, overflowY: 'auto' }}>
                {recentActivity.length === 0 ? (
                  <Typography variant="caption" color="text.secondary">No recent activity</Typography>
                ) : recentActivity.map((activity, i) => (
                  <Box key={i} sx={{ py: 1.2, borderBottom: i < recentActivity.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                      <Box sx={{
                        mt: .4, width: 6, height: 6, borderRadius: '50%',
                        bgcolor: activity.status === 'completed' ? '#22c55e' : activity.status === 'accepted' ? '#3b82f6' : '#f59e0b'
                      }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" fontWeight={600}>
                          {activity.cylinderType} {activity.quantity} {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {activity.address}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '10px' }}>
                          {new Date(activity.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    );
  }

  return null;
}