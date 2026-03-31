import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Container, Typography, Paper, Button, Tab, Tabs,
  Chip, LinearProgress, Avatar, IconButton, Tooltip, CircularProgress,
  TextField, Divider, Alert, Skeleton, Badge,
} from '@mui/material';
import {
  Package, AlertTriangle, TrendingUp, Star, MapPin, Clock,
  RefreshCw, Zap, CheckCircle, BarChart2, Activity,
  ChevronUp, ChevronDown, Bell,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-toastify';
import { providerDashboardApi } from '../lib/providerApi';
import { getSocket } from '../lib/socket';
import { useAuth } from '../context/AuthContext';

//  API helper 
import api from '../lib/api';

const statsApi = {
  getStats: () => api.get('/provider-dashboard/stats'),
};

//  Types 
interface ProviderStats {
  totalRequests: number;
  activeRequests: number;
  completedRequests: number;
  cancelledRequests: number;
  nearbyRequests: number;
  todayCompleted: number;
  monthCompleted: number;
  responseRate: number;
  responseRateLabel: string;
  averageRating: number;
  totalRatings: number;
  ratingDistribution: Record<number, number>;
  inventory: { type: string; quantity: number }[];
  totalStock: number;
  businessName: string;
  businessType: string;
  isVerified: boolean;
  sevenDaySeries: { date: string; label: string; fulfilled: number; revenue: number }[];
  recentActivity: any[];
  fetchedAt: string;
}

//  Stat Card 
function StatCard({ icon, label, value, sub, color, delta, pulse }: {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; color: string; delta?: number; pulse?: boolean;
}) {
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
      <Paper sx={{
        p: 2.5, borderRadius: 3, height: '100%',
        background: `linear-gradient(135deg, ${color}15 0%, rgba(17,17,19,0.97) 70%)`,
        border: `1px solid ${color}30`,
        position: 'relative', overflow: 'hidden',
        '&:hover': { borderColor: `${color}60` },
      }}>
        {pulse && (
          <Box sx={{
            position: 'absolute', top: 10, right: 10,
            width: 8, height: 8, borderRadius: '50%', bgcolor: color,
            animation: 'pulse 2s infinite',
            boxShadow: `0 0 8px ${color}`,
          }} />
        )}
        <Box sx={{ p: 1, borderRadius: 2, background: `${color}20`, color, display: 'inline-flex', mb: 1.5 }}>
          {icon}
        </Box>
        <Typography sx={{ fontSize: '28px', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
          {value}
        </Typography>
        <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mt: 0.5 }}>
          {label}
        </Typography>
        {sub && <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', mt: 0.3 }}>{sub}</Typography>}
        {delta !== undefined && delta !== 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.5 }}>
            {delta > 0 ? <ChevronUp size={12} color="#22c55e" /> : <ChevronDown size={12} color="#ef4444" />}
            <Typography sx={{ fontSize: '10px', color: delta > 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
              {delta > 0 ? `+${delta}` : delta} vs yesterday
            </Typography>
          </Box>
        )}
      </Paper>
    </motion.div>
  );
}

//  Mini bar chart 
function MiniChart({ data }: { data: { label: string; fulfilled: number }[] }) {
  const max = Math.max(...data.map((d) => d.fulfilled), 1);
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.8, height: 72 }}>
      {data.map((d, i) => (
        <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
          <motion.div
            initial={{ height: 2 }}
            animate={{ height: `${Math.max((d.fulfilled / max) * 56, d.fulfilled > 0 ? 6 : 2)}px` }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
            style={{
              width: '100%', borderRadius: '4px 4px 0 0',
              background: d.fulfilled > 0 ? 'linear-gradient(180deg, #f97316, #ef4444)' : 'rgba(255,255,255,0.07)',
            }}
          />
          <Typography sx={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
            {d.label.substring(0, 3)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

//  Main Page 
export default function ProviderDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ProviderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [liveAlerts, setLiveAlerts] = useState<{ id: string; message: string; type: string; time: Date }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  //  Load stats 
  const loadStats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const res = await statsApi.getStats();
      setStats(res.data.data);
      setLastUpdated(new Date());
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? 'Failed to load stats';
      setError(msg);
      if (!silent) toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadStats(false); }, [loadStats]);

  // Auto-refresh every 30s
  useEffect(() => {
    timerRef.current = setInterval(() => loadStats(true), 30_000);
    return () => clearInterval(timerRef.current);
  }, [loadStats]);

  //  Socket: instant updates 
  useEffect(() => {
    const socket = getSocket();

    const addAlert = (message: string, type: string) => {
      const id = `alert_${Date.now()}`;
      setLiveAlerts((prev) => [{ id, message, type, time: new Date() }, ...prev.slice(0, 9)]);
      // Refresh stats after activity
      loadStats(true);
    };

    socket.on('request:new', (data: any) => {
      addAlert(` New ${data.cylinderType ?? ''} emergency request nearby`, 'new');
      toast.info(`New emergency: ${data.address ?? 'nearby'}`, { autoClose: 4000 });
    });

    socket.on('request:status-changed', (data: any) => {
      if (data.status === 'completed') {
        addAlert(' Request completed', 'completed');
      } else if (data.status === 'accepted') {
        addAlert(` Request accepted by helper`, 'accepted');
      }
      loadStats(true);
    });

    socket.on('activity:new', (data: any) => {
      addAlert(data.message, data.type);
    });

    return () => {
      socket.off('request:new');
      socket.off('request:status-changed');
      socket.off('activity:new');
    };
  }, [loadStats]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', background: '#0a0a0b', pt: 8 }}>
        <Container maxWidth="xl">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 3 }}>
            {[0,1,2,3].map((i) => (
              <Box key={i}>
                <Skeleton variant="rounded" height={120} sx={{ borderRadius: 3, bgcolor: 'rgba(255,255,255,0.05)' }} />
              </Box>
            ))}
          </Box>
          <Box sx={{ mt: 3 }}>
            <Skeleton variant="rounded" height={300} sx={{ borderRadius: 3, bgcolor: 'rgba(255,255,255,0.04)' }} />
          </Box>
        </Container>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Alert severity="error" action={<Button onClick={() => loadStats(false)} size="small">Retry</Button>}>
          {error}
        </Alert>
      </Box>
    );
  }

  const gradeColor = stats?.responseRate && stats.responseRate >= 90 ? '#22c55e'
    : stats?.responseRate && stats.responseRate >= 70 ? '#f59e0b' : '#ef4444';

  return (
    <Box sx={{ minHeight: '100vh', background: '#0a0a0b', pb: 8 }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }`}</style>

      {/* Header */}
      <Box sx={{ background: 'linear-gradient(135deg,rgba(249,115,22,.08),transparent)', borderBottom: '1px solid rgba(255,255,255,.06)', px: { xs: 2, sm: 4 }, py: 2.5 }}>
        <Box sx={{ maxWidth: 1400, mx: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <Box sx={{ width: 32, height: 32, borderRadius: '10px', background: 'linear-gradient(135deg,#f97316,#ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Package size={16} color="#fff" />
              </Box>
              <Typography sx={{ fontSize: '20px', fontWeight: 800, color: '#fff' }}>
                {stats?.businessName ?? 'Provider Dashboard'}
              </Typography>
              {stats?.isVerified
                ? <Chip label=" Verified" size="small" sx={{ fontSize: '10px', bgcolor: 'rgba(34,197,94,.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,.3)' }} />
                : <Chip label=" Pending" size="small" sx={{ fontSize: '10px', bgcolor: 'rgba(245,158,11,.12)', color: '#fcd34d', border: '1px solid rgba(245,158,11,.3)' }} />
              }
            </Box>
            {lastUpdated && (
              <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,.3)' }}>
                Live  Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {liveAlerts.length > 0 && (
              <Badge badgeContent={liveAlerts.length} color="error">
                <IconButton sx={{ bgcolor: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.6)', borderRadius: 2 }}>
                  <Bell size={16} />
                </IconButton>
              </Badge>
            )}
            <Tooltip title="Refresh stats">
              <IconButton
                onClick={() => loadStats(false)}
                disabled={refreshing}
                sx={{ bgcolor: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.6)', borderRadius: 2 }}
              >
                <RefreshCw size={16} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      <Container maxWidth="xl" sx={{ pt: 3 }}>
        {/* Stat cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 2.5, mb: 3 }}>
          <Box>
            <StatCard icon={<AlertTriangle size={18} />} label="Nearby Emergencies"
              value={stats?.nearbyRequests ?? 0} sub="within 5km" color="#ef4444" pulse={(stats?.nearbyRequests ?? 0) > 0} />
          </Box>
          <Box>
            <StatCard icon={<Activity size={18} />} label="Today Completed"
              value={stats?.todayCompleted ?? 0} sub={`${stats?.monthCompleted ?? 0} this month`} color="#f97316" />
          </Box>
          <Box>
            <StatCard icon={<Package size={18} />} label="Total Stock"
              value={stats?.totalStock ?? 0}
              sub={stats?.inventory?.map((c) => `${c.type}: ${c.quantity}`).join('  ') ?? ''}
              color={stats?.totalStock === 0 ? '#6b7280' : (stats?.totalStock ?? 0) < 5 ? '#f59e0b' : '#22c55e'} />
          </Box>
          <Box>
            <StatCard icon={<Star size={18} />} label="Avg Rating"
              value={stats?.averageRating.toFixed(1) ?? ''} sub={`${stats?.totalRatings ?? 0} reviews`} color="#f59e0b" />
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3 }}>

          {/* Left: Tabs */}
          <Box>
            <Paper sx={{ background: 'rgba(17,17,19,.97)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 3, overflow: 'hidden', mb: 3 }}>
              <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{
                px: 1, pt: 1,
                '& .MuiTabs-indicator': { background: 'linear-gradient(90deg,#f97316,#ef4444)', borderRadius: 1 },
                '& .MuiTab-root': { color: 'rgba(255,255,255,.4)', fontWeight: 600, fontSize: '12px', textTransform: 'none', '&.Mui-selected': { color: '#fff' } },
              }}>
                <Tab label=" Overview" />
                <Tab label=" 7-Day Chart" />
                <Tab label=" Live Feed" />
                <Tab label=" Ratings" />
              </Tabs>
              <Divider sx={{ borderColor: 'rgba(255,255,255,.05)' }} />

              <Box sx={{ p: 2.5, minHeight: 300 }}>
                <AnimatePresence mode="wait">

                  {/* Overview */}
                  {activeTab === 0 && (
                    <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
                        {[
                          { label: 'Total Requests', value: stats?.totalRequests ?? 0, color: '#3b82f6' },
                          { label: 'Active', value: stats?.activeRequests ?? 0, color: '#f97316' },
                          { label: 'Completed', value: stats?.completedRequests ?? 0, color: '#22c55e' },
                          { label: 'Cancelled', value: stats?.cancelledRequests ?? 0, color: '#6b7280' },
                        ].map(({ label, value, color }) => (
                          <Box key={label} sx={{ p: 2, background: `${color}12`, border: `1px solid ${color}25`, borderRadius: 2.5, textAlign: 'center' }}>
                            <Typography sx={{ fontSize: '24px', fontWeight: 800, color }}>{value}</Typography>
                            <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,.4)', mt: 0.5 }}>{label}</Typography>
                          </Box>
                        ))}
                      </Box>
                      <Box sx={{ p: 2.5, background: 'rgba(255,255,255,.03)', borderRadius: 2.5, border: '1px solid rgba(255,255,255,.07)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                          <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Response Rate</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ fontSize: '22px', fontWeight: 800, color: gradeColor }}>
                              {stats?.responseRateLabel ?? '0%'}
                            </Typography>
                            <Box sx={{ px: 1.2, py: 0.4, borderRadius: '8px', background: `${gradeColor}18`, border: `1px solid ${gradeColor}35` }}>
                              <Typography sx={{ fontSize: '12px', fontWeight: 800, color: gradeColor }}>
                                {(stats?.responseRate ?? 0) >= 90 ? 'A+' : (stats?.responseRate ?? 0) >= 70 ? 'A' : (stats?.responseRate ?? 0) >= 50 ? 'B' : 'C'}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                        <LinearProgress variant="determinate" value={stats?.responseRate ?? 0}
                          sx={{ height: 10, borderRadius: 5, background: 'rgba(255,255,255,.06)', '& .MuiLinearProgress-bar': { borderRadius: 5, background: `linear-gradient(90deg, ${gradeColor}, ${gradeColor}aa)` } }}
                        />
                      </Box>
                    </motion.div>
                  )}

                  {/* 7-day chart */}
                  {activeTab === 1 && (
                    <motion.div key="chart" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Typography sx={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,.6)', mb: 2, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                        7-Day Fulfillment Activity
                      </Typography>
                      <Box sx={{ background: 'rgba(255,255,255,.02)', borderRadius: 2.5, p: 2.5, border: '1px solid rgba(255,255,255,.06)', mb: 2 }}>
                        <MiniChart data={stats?.sevenDaySeries ?? []} />
                      </Box>
                      {(stats?.sevenDaySeries ?? []).map((d) => (
                        <Box key={d.date} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.2, borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                          <Typography sx={{ fontSize: '13px', color: 'rgba(255,255,255,.6)' }}>{d.label}</Typography>
                          <Box sx={{ display: 'flex', gap: 2 }}>
                            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: d.fulfilled > 0 ? '#f97316' : 'rgba(255,255,255,.25)' }}>
                              {d.fulfilled} fulfilled
                            </Typography>
                            {d.revenue > 0 && (
                              <Typography sx={{ fontSize: '12px', color: 'rgba(255,255,255,.3)' }}>
                                {d.revenue.toLocaleString('en-IN')}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </motion.div>
                  )}

                  {/* Live feed */}
                  {activeTab === 2 && (
                    <motion.div key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Box sx={{ w: 8, h: 8, borderRadius: '50%', bgcolor: '#ef4444', animation: 'pulse 1.5s infinite', boxShadow: '0 0 6px #ef4444', width: 8, height: 8 }} />
                        <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Live Activity</Typography>
                      </Box>
                      {liveAlerts.length === 0 ? (
                        <Box sx={{ py: 6, textAlign: 'center' }}>
                          <Activity size={32} color="rgba(255,255,255,.15)" style={{ margin: '0 auto 12px' }} />
                          <Typography sx={{ fontSize: '13px', color: 'rgba(255,255,255,.3)' }}>Waiting for live events...</Typography>
                        </Box>
                      ) : (
                        <AnimatePresence mode="popLayout">
                          {liveAlerts.map((alert) => (
                            <motion.div key={alert.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }} layout>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                                  bgcolor: alert.type === 'NEW_REQUEST' ? '#ef4444' : alert.type === 'REQUEST_COMPLETED' ? '#22c55e' : '#f59e0b' }} />
                                <Typography sx={{ fontSize: '13px', color: 'rgba(255,255,255,.7)', flex: 1 }}>{alert.message}</Typography>
                                <Typography sx={{ fontSize: '10px', color: 'rgba(255,255,255,.25)', flexShrink: 0 }}>
                                  {formatDistanceToNow(alert.time, { addSuffix: true })}
                                </Typography>
                              </Box>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      )}
                      {/* Recent DB activity */}
                      {(stats?.recentActivity ?? []).map((a: any) => (
                        <Box key={a.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,.04)', opacity: 0.7 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                            bgcolor: a.status === 'completed' ? '#22c55e' : a.status === 'accepted' ? '#3b82f6' : '#6b7280' }} />
                          <Typography sx={{ fontSize: '12px', color: 'rgba(255,255,255,.5)', flex: 1 }}>
                            {a.cylinderType} request  {a.status}
                          </Typography>
                          <Typography sx={{ fontSize: '10px', color: 'rgba(255,255,255,.25)' }}>
                            {a.completedAt ? formatDistanceToNow(new Date(a.completedAt), { addSuffix: true }) : ''}
                          </Typography>
                        </Box>
                      ))}
                    </motion.div>
                  )}

                  {/* Ratings */}
                  {activeTab === 3 && (
                    <motion.div key="ratings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography sx={{ fontSize: '52px', fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>
                            {stats?.averageRating.toFixed(1)}
                          </Typography>
                          <Typography sx={{ fontSize: '12px', color: 'rgba(255,255,255,.4)', mt: 0.5 }}>
                            {stats?.totalRatings} reviews
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          {[5,4,3,2,1].map((star) => {
                            const count = (stats?.ratingDistribution ?? {})[star] ?? 0;
                            const total = Object.values(stats?.ratingDistribution ?? {}).reduce((a: number, b: any) => a + b, 0) as number;
                            return (
                              <Box key={star} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.8 }}>
                                <Typography sx={{ fontSize: '11px', color: '#f59e0b', minWidth: 20 }}>{''.repeat(star)}</Typography>
                                <LinearProgress variant="determinate" value={total > 0 ? (count / total) * 100 : 0}
                                  sx={{ flex: 1, height: 7, borderRadius: 3.5, background: 'rgba(255,255,255,.06)', '& .MuiLinearProgress-bar': { borderRadius: 3.5, background: '#f59e0b' } }} />
                                <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,.35)', minWidth: 20, textAlign: 'right' }}>{count}</Typography>
                              </Box>
                            );
                          })}
                        </Box>
                      </Box>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Box>
            </Paper>
          </Box>

          {/* Right: inventory + recent */}
          <Box>
            <Paper sx={{ background: 'rgba(17,17,19,.97)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 3, p: 2.5, mb: 2 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#fff', mb: 2 }}> Inventory</Typography>
              {(stats?.inventory ?? []).length === 0 ? (
                <Typography sx={{ fontSize: '12px', color: 'rgba(255,255,255,.3)' }}>No inventory data</Typography>
              ) : (
                (stats?.inventory ?? []).map((c) => (
                  <Box key={c.type} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, p: 1.5,
                    background: c.quantity === 0 ? 'rgba(107,114,128,.08)' : c.quantity < 5 ? 'rgba(245,158,11,.08)' : 'rgba(34,197,94,.08)',
                    borderRadius: 2, border: `1px solid ${c.quantity === 0 ? 'rgba(107,114,128,.2)' : c.quantity < 5 ? 'rgba(245,158,11,.2)' : 'rgba(34,197,94,.2)'}` }}>
                    <Typography sx={{ fontSize: '13px', fontWeight: 700, color: c.type === 'LPG' ? '#fb923c' : '#60a5fa' }}>{c.type}</Typography>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography sx={{ fontSize: '20px', fontWeight: 800, color: c.quantity === 0 ? '#6b7280' : c.quantity < 5 ? '#fcd34d' : '#4ade80', lineHeight: 1 }}>
                        {c.quantity}
                      </Typography>
                      <Typography sx={{ fontSize: '10px', color: 'rgba(255,255,255,.3)' }}>cylinders</Typography>
                    </Box>
                  </Box>
                ))
              )}
            </Paper>

            <Paper sx={{ background: 'rgba(17,17,19,.97)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 3, p: 2.5 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#fff', mb: 2 }}> Recent Activity</Typography>
              {(stats?.recentActivity ?? []).slice(0, 5).map((a: any) => (
                <Box key={a.id} sx={{ py: 1.2, borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.3 }}>
                    <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>{a.cylinderType}  {a.status}</Typography>
                    <Chip label={a.priorityLevel ?? 'low'} size="small" sx={{ fontSize: '9px', height: 18,
                      bgcolor: a.priorityLevel === 'critical' ? 'rgba(239,68,68,.15)' : 'rgba(255,255,255,.06)',
                      color: a.priorityLevel === 'critical' ? '#fca5a5' : 'rgba(255,255,255,.4)' }} />
                  </Box>
                  <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,.4)' }} noWrap>{a.address}</Typography>
                </Box>
              ))}
              {(stats?.recentActivity ?? []).length === 0 && (
                <Typography sx={{ fontSize: '12px', color: 'rgba(255,255,255,.3)', textAlign: 'center', py: 2 }}>No recent activity</Typography>
              )}
            </Paper>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}