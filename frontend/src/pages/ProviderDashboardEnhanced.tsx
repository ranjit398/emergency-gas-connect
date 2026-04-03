// frontend/src/pages/ProviderDashboardEnhanced.tsx
// World-class provider admin dashboard — fully dynamic, real-time

import { useState } from 'react';
import {
  Box, Container, Grid, Typography, Paper, Button, Tab, Tabs,
  Chip, LinearProgress, Avatar, IconButton, Tooltip, CircularProgress,
  Alert, Skeleton, Badge, Divider, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, Select,
  MenuItem, FormControl, InputLabel, TextField,
} from '@mui/material';
import {
  Package, AlertTriangle, TrendingUp, Star, Activity,
  RefreshCw, CheckCircle, Bell, BarChart2, Users,
  Flame, Clock, MapPin, Phone, ChevronUp, ChevronDown,
  Zap, Shield, Award, Edit3, Save, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns';
import { useProviderDashboard } from '../hooks/useProviderDashboard';

// ─────────────────────────────────────────────────────────────────────────────
// Colour tokens
// ─────────────────────────────────────────────────────────────────────────────
const PRIORITY: Record<string, { bg: string; text: string; dot: string }> = {
  critical: { bg: 'rgba(239,68,68,.12)',  text: '#fca5a5', dot: '#ef4444' },
  high:     { bg: 'rgba(245,158,11,.12)', text: '#fcd34d', dot: '#f59e0b' },
  medium:   { bg: 'rgba(59,130,246,.12)', text: '#93c5fd', dot: '#3b82f6' },
  low:      { bg: 'rgba(34,197,94,.10)',  text: '#86efac', dot: '#22c55e' },
};

const STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b', accepted: '#3b82f6',
  completed: '#22c55e', cancelled: '#6b7280',
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#ef4444', warning: '#f59e0b', info: '#3b82f6',
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, color, delta, pulse, onClick,
}: {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; color: string; delta?: number; pulse?: boolean; onClick?: () => void;
}) {
  return (
    <motion.div whileHover={{ y: -3, scale: 1.01 }} transition={{ duration: 0.15 }}>
      <Paper onClick={onClick} sx={{
        p: 2.5, borderRadius: 3, height: '100%', cursor: onClick ? 'pointer' : 'default',
        background: `linear-gradient(135deg, ${color}18 0%, #0d0d0e 70%)`,
        border: `1px solid ${color}28`,
        position: 'relative', overflow: 'hidden',
        transition: 'border-color .3s',
        '&:hover': { borderColor: `${color}55` },
      }}>
        {pulse && (
          <Box sx={{
            position: 'absolute', top: 12, right: 12,
            width: 8, height: 8, borderRadius: '50%', bgcolor: color,
            animation: 'pulse 1.8s infinite', boxShadow: `0 0 8px ${color}`,
          }} />
        )}
        <Box sx={{ p: 1, borderRadius: 2, background: `${color}22`, color, display: 'inline-flex', mb: 1.5 }}>
          {icon}
        </Box>
        <Typography sx={{ fontSize: '30px', fontWeight: 900, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </Typography>
        <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', mt: .5 }}>
          {label}
        </Typography>
        {sub && <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,.28)', mt: .3 }}>{sub}</Typography>}
        {delta !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: .4, mt: .8 }}>
            {delta > 0 ? <ChevronUp size={12} color="#22c55e" /> : delta < 0 ? <ChevronDown size={12} color="#ef4444" /> : null}
            <Typography sx={{ fontSize: '10px', fontWeight: 700, color: delta > 0 ? '#22c55e' : delta < 0 ? '#ef4444' : 'rgba(255,255,255,.3)' }}>
              {delta > 0 ? `+${delta}` : delta === 0 ? 'No change' : delta}
            </Typography>
          </Box>
        )}
      </Paper>
    </motion.div>
  );
}

function BarChart({ data }: { data: { label: string; fulfilled: number }[] }) {
  const max = Math.max(...data.map(d => d.fulfilled), 1);
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 80, px: 1 }}>
      {data.map((d, i) => (
        <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: .5 }}>
          <Tooltip title={`${d.fulfilled} fulfilled`}>
            <motion.div
              initial={{ height: 2 }}
              animate={{ height: `${Math.max((d.fulfilled / max) * 64, d.fulfilled > 0 ? 8 : 2)}px` }}
              transition={{ duration: .5, delay: i * .06, ease: 'easeOut' }}
              style={{
                width: '100%', borderRadius: '4px 4px 0 0',
                background: d.fulfilled > 0 ? 'linear-gradient(180deg,#f97316,#ef4444)' : 'rgba(255,255,255,.07)',
                cursor: 'pointer',
              }}
            />
          </Tooltip>
          <Typography sx={{ fontSize: '9px', color: 'rgba(255,255,255,.28)', textAlign: 'center', lineHeight: 1.2 }}>
            {d.label.substring(0, 3)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function PriorityDot({ level }: { level: string }) {
  const cfg = PRIORITY[level] ?? PRIORITY.low;
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: .6, px: 1.1, py: .25, borderRadius: 99,
      background: cfg.bg, border: `1px solid ${cfg.dot}40` }}>
      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: cfg.dot,
        animation: level === 'critical' ? 'pulse 1.5s infinite' : 'none',
        boxShadow: level === 'critical' ? `0 0 5px ${cfg.dot}` : 'none' }} />
      <Typography sx={{ fontSize: '10px', fontWeight: 700, color: cfg.text, textTransform: 'capitalize' }}>{level}</Typography>
    </Box>
  );
}

function TagChip({ tag }: { tag: string }) {
  const color = tag.includes('Fast') ? '#3b82f6' : tag.includes('Top') ? '#f59e0b' : tag.includes('Active') ? '#ef4444' : tag.includes('Elite') ? '#8b5cf6' : '#22c55e';
  return (
    <Chip label={tag} size="small" sx={{ fontSize: '10px', height: 20, bgcolor: `${color}15`, color, border: `1px solid ${color}30`, mr: .5, mb: .5 }} />
  );
}

// Inventory editor inline
function InventoryEditor({
  lpg, cng, onSave,
}: { lpg: number; cng: number; onSave: (l: number, c: number) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [lpgVal, setLpgVal] = useState(lpg);
  const [cngVal, setCngVal] = useState(cng);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(lpgVal, cngVal); setEditing(false); }
    finally { setSaving(false); }
  };

  return (
    <Box>
      {[{ type: 'LPG', val: lpgVal, set: setLpgVal, color: '#fb923c' }, { type: 'CNG', val: cngVal, set: setCngVal, color: '#60a5fa' }].map(({ type, val, set, color }) => (
        <Box key={type} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, mb: 1.5, borderRadius: 2.5,
          background: val === 0 ? 'rgba(107,114,128,.1)' : val < 5 ? 'rgba(245,158,11,.1)' : 'rgba(34,197,94,.08)',
          border: `1px solid ${val === 0 ? 'rgba(107,114,128,.2)' : val < 5 ? 'rgba(245,158,11,.2)' : 'rgba(34,197,94,.2)'}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: '10px', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Flame size={18} color={color} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '14px', fontWeight: 800, color }}>{type}</Typography>
              <Typography sx={{ fontSize: '10px', color: 'rgba(255,255,255,.35)' }}>
                {val === 0 ? '⚠️ Empty' : val < 5 ? '⚡ Low' : '✓ Stocked'}
              </Typography>
            </Box>
          </Box>
          {editing ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: .5 }}>
              <IconButton size="small" onClick={() => set(Math.max(0, val - 1))}
                sx={{ bgcolor: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.6)', borderRadius: '8px', width: 28, height: 28 }}>
                <ChevronDown size={14} />
              </IconButton>
              <TextField value={val} onChange={e => { const n = parseInt(e.target.value)||0; if (n>=0&&n<=999) set(n); }}
                inputProps={{ style: { textAlign:'center', color:'#fff', padding:'4px 0', fontSize:'16px', fontWeight:800, width:'48px' } }}
                sx={{ '& .MuiOutlinedInput-root': { background: 'rgba(255,255,255,.06)', borderRadius: 2,
                  '& fieldset': { borderColor: 'rgba(255,255,255,.1)' }, '&.Mui-focused fieldset': { borderColor: color } } }} />
              <IconButton size="small" onClick={() => set(Math.min(999, val + 1))}
                sx={{ bgcolor: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.6)', borderRadius: '8px', width: 28, height: 28 }}>
                <ChevronUp size={14} />
              </IconButton>
            </Box>
          ) : (
            <Typography sx={{ fontSize: '28px', fontWeight: 900, color: val === 0 ? '#6b7280' : val < 5 ? '#fcd34d' : '#4ade80', lineHeight: 1 }}>
              {val}
            </Typography>
          )}
        </Box>
      ))}

      {editing ? (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button fullWidth onClick={handleSave} disabled={saving} variant="contained"
            sx={{ borderRadius: 2, py: 1.2, fontWeight: 700, background: 'linear-gradient(135deg,#f97316,#ef4444)', '&:hover': { opacity: .9 } }}>
            {saving ? <CircularProgress size={16} color="inherit" /> : <><Save size={14} style={{marginRight:6}}/>Save</>}
          </Button>
          <Button onClick={() => { setEditing(false); setLpgVal(lpg); setCngVal(cng); }}
            sx={{ borderRadius: 2, color: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.1)' }}>
            <X size={14} />
          </Button>
        </Box>
      ) : (
        <Button fullWidth onClick={() => setEditing(true)} variant="outlined"
          sx={{ borderRadius: 2, borderColor: 'rgba(255,255,255,.12)', color: 'rgba(255,255,255,.5)',
            '&:hover': { borderColor: '#f97316', color: '#f97316' } }}>
          <Edit3 size={14} style={{ marginRight: 6 }} />Edit Inventory
        </Button>
      )}
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function ProviderDashboardEnhanced() {
  const [activeTab, setActiveTab] = useState(0);
  const {
    dashboard, helpers, requests, activity, insights, liveEvents,
    loading, refreshing, error, lastUpdated,
    requestPage, setRequestPage, requestStatus, setRequestStatus,
    refresh, updateInventory,
  } = useProviderDashboard(30_000);

  if (loading) return (
    <Box sx={{ minHeight: '100vh', background: '#0a0a0b', pt: 10 }}>
      <Container maxWidth="xl">
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 3, mb: 3 }}>
          {[0,1,2,3].map(i => <Skeleton key={i} variant="rounded" height={130} sx={{ borderRadius: 3, bgcolor: 'rgba(255,255,255,.05)' }} />)}
        </Box>
        <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3, bgcolor: 'rgba(255,255,255,.04)' }} />
      </Container>
    </Box>
  );

  if (error) return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Alert severity="error" action={<Button onClick={refresh} size="small">Retry</Button>}>{error}</Alert>
    </Box>
  );

  const stats = dashboard?.stats;
  const perf  = dashboard?.performance;
  const inv   = dashboard?.inventory;

  return (
    <Box sx={{ minHeight: '100vh', background: '#0a0a0b', pb: 10 }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.5)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

      {/* ── HEADER ── */}
      <Box sx={{ background: 'linear-gradient(135deg,rgba(249,115,22,.07),transparent)', borderBottom: '1px solid rgba(255,255,255,.05)', px: { xs:2, md:4 }, py: 2.5, position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(12px)' }}>
        <Box sx={{ maxWidth: 1400, mx: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: .5 }}>
              <Box sx={{ width: 34, height: 34, borderRadius: '11px', background: 'linear-gradient(135deg,#f97316,#ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(249,115,22,.4)' }}>
                <Package size={17} color="#fff" />
              </Box>
              <Typography sx={{ fontSize: '21px', fontWeight: 900, color: '#fff', letterSpacing: '-.02em' }}>
                {dashboard?.provider.businessName ?? 'Provider Dashboard'}
              </Typography>
              {dashboard?.provider.isVerified
                ? <Chip label="✓ Verified" size="small" sx={{ fontSize: '10px', bgcolor: 'rgba(34,197,94,.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,.3)' }} />
                : <Chip label="● Pending" size="small" sx={{ fontSize: '10px', bgcolor: 'rgba(245,158,11,.12)', color: '#fcd34d', border: '1px solid rgba(245,158,11,.3)' }} />
              }
            </Box>
            <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,.3)' }}>
              {dashboard?.provider.businessType} · {lastUpdated ? `Updated ${formatDistanceToNow(lastUpdated, { addSuffix: true })}` : ''}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {/* Alerts bell */}
            {(dashboard?.alerts?.length ?? 0) > 0 && (
              <Tooltip title={dashboard!.alerts.map(a => a.message).join(' | ')}>
                <Badge badgeContent={dashboard!.alerts.length} color="error">
                  <IconButton sx={{ bgcolor: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: '#fca5a5', borderRadius: 2 }}>
                    <Bell size={16} />
                  </IconButton>
                </Badge>
              </Tooltip>
            )}
            {/* Live events bell */}
            {liveEvents.length > 0 && (
              <Tooltip title={`${liveEvents.length} live events`}>
                <Badge badgeContent={liveEvents.length} color="warning">
                  <IconButton sx={{ bgcolor: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.6)', borderRadius: 2 }}>
                    <Activity size={16} />
                  </IconButton>
                </Badge>
              </Tooltip>
            )}
            <Tooltip title="Refresh">
              <IconButton onClick={refresh} disabled={refreshing}
                sx={{ bgcolor: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.6)', borderRadius: 2 }}>
                <RefreshCw size={16} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      <Container maxWidth="xl" sx={{ pt: 3 }}>

        {/* ── ALERT BANNERS ── */}
        <AnimatePresence>
          {(dashboard?.alerts ?? []).map(alert => (
            <motion.div key={alert.type} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Alert severity={alert.severity === 'critical' ? 'error' : alert.severity === 'warning' ? 'warning' : 'info'}
                sx={{ mb: 1.5, borderRadius: 2, fontSize: '13px' }}>
                {alert.message}
              </Alert>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* ── STAT CARDS ── */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4,1fr)', lg: 'repeat(8,1fr)' }, gap: 2, mb: 3 }}>
          <Box sx={{ gridColumn: { xs: 'span 1', lg: 'span 2' } }}>
            <StatCard icon={<AlertTriangle size={18} />} label="Nearby Emergencies"
              value={stats?.nearbyPending ?? 0} sub="within 5km" color="#ef4444"
              pulse={(stats?.nearbyPending ?? 0) > 0} />
          </Box>
          <Box sx={{ gridColumn: { xs: 'span 1', lg: 'span 2' } }}>
            <StatCard icon={<TrendingUp size={18} />} label="Today Completed"
              value={stats?.todayCompleted ?? 0} sub={`${stats?.weekCompleted ?? 0} this week`} color="#f97316" />
          </Box>
          <Box sx={{ gridColumn: { xs: 'span 1', lg: 'span 2' } }}>
            <StatCard icon={<Users size={18} />} label="Active Helpers"
              value={stats?.activeHelperCount ?? 0} sub="on duty now" color="#3b82f6" />
          </Box>
          <Box sx={{ gridColumn: { xs: 'span 1', lg: 'span 2' } }}>
            <StatCard icon={<Star size={18} />} label="Avg Rating"
              value={`${(perf?.averageRating ?? 0).toFixed(1)} ★`} sub={`${perf?.totalRatings ?? 0} reviews`} color="#f59e0b" />
          </Box>
        </Box>

        {/* ── SECONDARY STATS ── */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4,1fr)' }, gap: 2, mb: 3 }}>
          <StatCard icon={<Package size={18} />} label="Total Requests" value={stats?.totalRequests ?? 0} color="#8b5cf6" />
          <StatCard icon={<CheckCircle size={18} />} label="Completed" value={stats?.completedRequests ?? 0}
            sub={`${stats?.successRateLabel ?? '0%'} success`} color="#22c55e" />
          <StatCard icon={<Clock size={18} />} label="Pending" value={stats?.pendingRequests ?? 0} color="#f59e0b"
            pulse={(stats?.pendingRequests ?? 0) > 0} />
          <StatCard icon={<BarChart2 size={18} />} label="Avg Response" value={perf?.avgResponseLabel ?? 'N/A'} color="#06b6d4" />
        </Box>

        {/* ── MAIN CONTENT ── */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3 }}>

          {/* LEFT */}
          <Box>
            <Paper sx={{ background: 'rgba(13,13,14,.97)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 3, overflow: 'hidden', mb: 3 }}>
              <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{
                px: 1, pt: 1,
                '& .MuiTabs-indicator': { background: 'linear-gradient(90deg,#f97316,#ef4444)', borderRadius: 1 },
                '& .MuiTab-root': { color: 'rgba(255,255,255,.4)', fontWeight: 700, fontSize: '12px', textTransform: 'none', '&.Mui-selected': { color: '#fff' } },
              }}>
                <Tab label="📋 Requests" />
                <Tab label={<Badge badgeContent={helpers?.total} color="primary">👷 Helpers</Badge>} sx={{ pr: 3 }} />
                <Tab label="📡 Live Feed" />
                <Tab label="📈 Analytics" />
              </Tabs>
              <Divider sx={{ borderColor: 'rgba(255,255,255,.05)' }} />
              <Box sx={{ p: 2.5, maxHeight: 580, overflowY: 'auto' }}>
                <AnimatePresence mode="wait">

                  {/* ── TAB 0: REQUESTS ── */}
                  {activeTab === 0 && (
                    <motion.div key="requests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
                        {['all','pending','accepted','completed','cancelled'].map(s => (
                          <Chip key={s} label={s.charAt(0).toUpperCase()+s.slice(1)}
                            onClick={() => { setRequestStatus(s); setRequestPage(1); }}
                            sx={{ fontSize: '11px', cursor: 'pointer', textTransform: 'capitalize',
                              bgcolor: requestStatus === s ? `${STATUS_COLOR[s] ?? '#8b5cf6'}20` : 'rgba(255,255,255,.05)',
                              color: requestStatus === s ? (STATUS_COLOR[s] ?? '#a78bfa') : 'rgba(255,255,255,.4)',
                              border: `1px solid ${requestStatus === s ? (STATUS_COLOR[s] ?? '#8b5cf6')+'40' : 'rgba(255,255,255,.1)'}` }} />
                        ))}
                      </Box>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              {['Priority','Type','Seeker','Helper','Status','Time','Duration'].map(h => (
                                <TableCell key={h} sx={{ borderColor:'rgba(255,255,255,.07)', color:'rgba(255,255,255,.4)', fontSize:'11px', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em' }}>{h}</TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(requests?.requests ?? []).length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={7} sx={{ textAlign:'center', py:5, borderColor:'rgba(255,255,255,.05)', color:'rgba(255,255,255,.3)', fontSize:'13px' }}>
                                  No requests found
                                </TableCell>
                              </TableRow>
                            ) : (requests?.requests ?? []).map((req) => (
                              <TableRow key={req.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,.02)' }, '& td': { borderColor: 'rgba(255,255,255,.05)' } }}>
                                <TableCell><PriorityDot level={req.priorityLevel} /></TableCell>
                                <TableCell>
                                  <Chip label={req.cylinderType} size="small" sx={{ fontSize:'10px', bgcolor: req.cylinderType==='LPG' ? 'rgba(249,115,22,.15)' : 'rgba(59,130,246,.15)', color: req.cylinderType==='LPG' ? '#fb923c' : '#60a5fa', border:'none' }} />
                                  {req.quantity > 1 && <Typography sx={{ fontSize:'10px', color:'rgba(255,255,255,.3)', ml:.5 }}>×{req.quantity}</Typography>}
                                </TableCell>
                                <TableCell>
                                  <Typography sx={{ fontSize:'12px', color:'rgba(255,255,255,.8)', fontWeight:600 }}>{req.seekerName}</Typography>
                                  {req.seekerPhone && <Typography sx={{ fontSize:'10px', color:'rgba(255,255,255,.3)' }}>{req.seekerPhone}</Typography>}
                                </TableCell>
                                <TableCell>
                                  <Typography sx={{ fontSize:'12px', color: req.helperName ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.25)', fontStyle: req.helperName ? 'normal' : 'italic' }}>
                                    {req.helperName ?? 'Unassigned'}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip label={req.status} size="small" sx={{ fontSize:'10px', textTransform:'capitalize', bgcolor:`${STATUS_COLOR[req.status]??'#6b7280'}18`, color:STATUS_COLOR[req.status]??'#9ca3af', border:`1px solid ${STATUS_COLOR[req.status]??'#6b7280'}30` }} />
                                </TableCell>
                                <TableCell>
                                  <Typography sx={{ fontSize:'11px', color:'rgba(255,255,255,.4)' }}>
                                    {req.minutesAgo < 60 ? `${req.minutesAgo}m ago` : `${Math.floor(req.minutesAgo/60)}h ago`}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography sx={{ fontSize:'11px', color: req.durationMin ? '#22c55e' : 'rgba(255,255,255,.25)' }}>
                                    {req.durationMin ? `${req.durationMin}m` : '—'}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      {requests?.pagination && (
                        <TablePagination
                          component="div"
                          count={requests.pagination.total}
                          page={requestPage - 1}
                          rowsPerPage={20}
                          rowsPerPageOptions={[20]}
                          onPageChange={(_, p) => setRequestPage(p + 1)}
                          sx={{ color: 'rgba(255,255,255,.4)', '& .MuiTablePagination-actions button': { color: 'rgba(255,255,255,.5)' } }}
                        />
                      )}
                    </motion.div>
                  )}

                  {/* ── TAB 1: HELPERS ── */}
                  {activeTab === 1 && (
                    <motion.div key="helpers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      {/* Top 3 ranking */}
                      {(helpers?.topHelpers?.length ?? 0) > 0 && (
                        <Box sx={{ mb: 3 }}>
                          <Typography sx={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.07em', mb: 1.5 }}>
                            🏆 Top Performers
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            {helpers!.topHelpers.map((h: any) => (
                              <Paper key={h.id} sx={{ p: 2, flex: '1 1 140px', borderRadius: 2.5, background: h.rank===1 ? 'rgba(245,158,11,.08)' : 'rgba(255,255,255,.03)', border: `1px solid ${h.rank===1 ? 'rgba(245,158,11,.25)' : 'rgba(255,255,255,.07)'}`, textAlign:'center' }}>
                                <Typography sx={{ fontSize: '24px', mb: .5 }}>{h.medal}</Typography>
                                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{h.fullName}</Typography>
                                <Typography sx={{ fontSize: '11px', color: '#f59e0b' }}>★ {h.rating.toFixed(1)}</Typography>
                                <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,.4)' }}>{h.completedForProvider} deliveries</Typography>
                              </Paper>
                            ))}
                          </Box>
                        </Box>
                      )}

                      {/* Full list */}
                      {(helpers?.helpers ?? []).length === 0 ? (
                        <Box sx={{ py: 6, textAlign: 'center' }}>
                          <Users size={36} color="rgba(255,255,255,.15)" style={{ margin: '0 auto 12px' }} />
                          <Typography sx={{ fontSize: '13px', color: 'rgba(255,255,255,.3)' }}>No helpers have worked on your requests yet</Typography>
                        </Box>
                      ) : (helpers?.helpers ?? []).map((h: any) => (
                        <motion.div key={h.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, p: 2, mb: 1.5, borderRadius: 2.5,
                            background: h.activeNow ? 'rgba(34,197,94,.06)' : 'rgba(255,255,255,.02)',
                            border: `1px solid ${h.activeNow ? 'rgba(34,197,94,.2)' : 'rgba(255,255,255,.07)'}` }}>
                            <Box sx={{ position: 'relative' }}>
                              <Avatar sx={{ width: 42, height: 42, fontWeight: 700, bgcolor: h.activeNow ? '#22c55e' : '#374151' }}>
                                {h.fullName[0]}
                              </Avatar>
                              <Box sx={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', bgcolor: h.isAvailable ? '#22c55e' : '#6b7280', border: '1.5px solid #0d0d0e' }} />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: .5 }}>
                                <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{h.fullName}</Typography>
                                <Typography sx={{ fontSize: '13px', color: '#f59e0b' }}>★ {h.rating.toFixed(1)}</Typography>
                              </Box>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: .5, mb: .5 }}>
                                {h.tags.map((t: string) => <TagChip key={t} tag={t} />)}
                              </Box>
                              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,.4)' }}>✅ {h.completedForProvider} for you</Typography>
                                <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,.4)' }}>⏱ ~{h.avgResponseTimeMin ?? 15}min response</Typography>
                                <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,.4)' }}>{h.verificationStatus}</Typography>
                              </Box>
                              {h.activeNow && h.currentRequest && (
                                <Chip label="🟢 On active delivery" size="small" sx={{ mt: .5, fontSize: '10px', bgcolor: 'rgba(34,197,94,.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,.2)' }} />
                              )}
                            </Box>
                          </Box>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}

                  {/* ── TAB 2: LIVE FEED ── */}
                  {activeTab === 2 && (
                    <motion.div key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ef4444', animation: 'pulse 1.5s infinite', boxShadow: '0 0 6px #ef4444' }} />
                        <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Live Activity</Typography>
                      </Box>
                      {/* Socket events (real-time) */}
                      {liveEvents.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography sx={{ fontSize: '10px', color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '.07em', mb: 1 }}>Socket Events</Typography>
                          <AnimatePresence mode="popLayout">
                            {liveEvents.map(e => (
                              <motion.div key={e.id} layout initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, height:0 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.2, borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                                    bgcolor: e.type === 'NEW_REQUEST' ? '#ef4444' : e.type === 'REQUEST_COMPLETED' ? '#22c55e' : '#f59e0b' }} />
                                  <Typography sx={{ fontSize: '13px', color: 'rgba(255,255,255,.75)', flex: 1 }}>{e.message}</Typography>
                                  <Typography sx={{ fontSize: '10px', color: 'rgba(255,255,255,.25)', flexShrink: 0 }}>
                                    {formatDistanceToNow(e.timestamp, { addSuffix: true })}
                                  </Typography>
                                </Box>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </Box>
                      )}
                      {/* DB history */}
                      <Typography sx={{ fontSize: '10px', color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '.07em', mb: 1 }}>History</Typography>
                      {activity.length === 0 ? (
                        <Box sx={{ py: 4, textAlign: 'center' }}>
                          <Activity size={32} color="rgba(255,255,255,.15)" style={{ margin: '0 auto 12px' }} />
                          <Typography sx={{ fontSize: '13px', color: 'rgba(255,255,255,.3)' }}>Waiting for events...</Typography>
                        </Box>
                      ) : activity.map((a) => (
                        <Box key={a.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 1.5, borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                          <Typography sx={{ fontSize: '18px', flexShrink: 0, lineHeight: 1.3 }}>{a.emoji}</Typography>
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontSize: '12.5px', color: 'rgba(255,255,255,.7)', lineHeight: 1.4 }}>{a.message}</Typography>
                            {a.priority && <PriorityDot level={a.priority} />}
                          </Box>
                          <Typography sx={{ fontSize: '10px', color: 'rgba(255,255,255,.25)', flexShrink: 0 }}>
                            {formatDistanceToNow(new Date(a.timestamp), { addSuffix: true })}
                          </Typography>
                        </Box>
                      ))}
                    </motion.div>
                  )}

                  {/* ── TAB 3: ANALYTICS ── */}
                  {activeTab === 3 && insights && (
                    <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                        <Box sx={{ p: 2.5, borderRadius: 2.5, textAlign: 'center', background: `${insights.grade === 'A+' ? '#22c55e' : insights.grade === 'A' ? '#4ade80' : '#f59e0b'}12`, border: `1px solid ${insights.grade === 'A+' ? '#22c55e' : '#f59e0b'}25` }}>
                          <Typography sx={{ fontSize: '56px', fontWeight: 900, color: insights.grade === 'A+' ? '#22c55e' : insights.grade === 'A' ? '#4ade80' : '#f59e0b', lineHeight: 1 }}>
                            {insights.grade}
                          </Typography>
                          <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,.4)', mt: .5 }}>Performance Grade</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          {[
                            { label: 'Success Rate', value: insights.successRateLabel, color: '#22c55e' },
                            { label: 'Avg Response',  value: `${insights.avgResponseMin}min`, color: '#3b82f6' },
                            { label: 'Fastest',       value: `${insights.fastestResponseMin}min`, color: '#f97316' },
                          ].map(({ label, value, color }) => (
                            <Box key={label} sx={{ p: 1.5, borderRadius: 2, background: `${color}10`, border: `1px solid ${color}20` }}>
                              <Typography sx={{ fontSize: '18px', fontWeight: 800, color, lineHeight: 1 }}>{value}</Typography>
                              <Typography sx={{ fontSize: '10px', color: 'rgba(255,255,255,.4)' }}>{label}</Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>

                      {/* Rating distribution */}
                      <Box sx={{ p: 2, borderRadius: 2.5, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', mb: 2 }}>
                        <Typography sx={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,.5)', mb: 1.5, textTransform: 'uppercase', letterSpacing: '.05em' }}>Rating Distribution</Typography>
                        {[5,4,3,2,1].map(star => {
                          const count = insights.ratingDistribution[star] ?? 0;
                          const total = Object.values(insights.ratingDistribution).reduce((a,b)=>a+b,0);
                          return (
                            <Box key={star} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: .8 }}>
                              <Typography sx={{ fontSize: '11px', color: '#f59e0b', minWidth: 18 }}>{'★'.repeat(star)}</Typography>
                              <LinearProgress variant="determinate" value={total > 0 ? (count/total)*100 : 0}
                                sx={{ flex: 1, height: 7, borderRadius: 3.5, background: 'rgba(255,255,255,.06)', '& .MuiLinearProgress-bar': { borderRadius: 3.5, background: '#f59e0b' } }} />
                              <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,.35)', minWidth: 20, textAlign: 'right' }}>{count}</Typography>
                            </Box>
                          );
                        })}
                      </Box>

                      {/* Cylinder breakdown */}
                      <Box sx={{ p: 2, borderRadius: 2.5, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)' }}>
                        <Typography sx={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,.5)', mb: 1.5, textTransform: 'uppercase', letterSpacing: '.05em' }}>Cylinder Type Breakdown</Typography>
                        {Object.entries(insights.cylinderBreakdown).map(([type, count]) => (
                          <Box key={type} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <Typography sx={{ fontSize: '12px', fontWeight: 700, color: type==='LPG'?'#fb923c':'#60a5fa', minWidth: 36 }}>{type}</Typography>
                            <LinearProgress variant="determinate" value={Math.min(100, (count/Math.max(insights.completedTotal,1))*100)}
                              sx={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(255,255,255,.05)', '& .MuiLinearProgress-bar': { borderRadius: 4, background: type==='LPG'?'linear-gradient(90deg,#f97316,#fbbf24)':'linear-gradient(90deg,#3b82f6,#60a5fa)' } }} />
                            <Typography sx={{ fontSize: '12px', color: 'rgba(255,255,255,.4)', minWidth: 28, textAlign: 'right' }}>{count}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Box>
            </Paper>

            {/* 7-day chart */}
            <Paper sx={{ background: 'rgba(13,13,14,.97)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 3, p: 2.5 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#fff', mb: 1 }}>📈 7-Day Activity</Typography>
              <BarChart data={dashboard?.sevenDaySeries ?? []} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,.3)' }}>Total: {(dashboard?.sevenDaySeries ?? []).reduce((s,d)=>s+d.fulfilled,0)} fulfilled this week</Typography>
                <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,.3)' }}>₹{(dashboard?.sevenDaySeries ?? []).reduce((s,d)=>s+d.revenue,0).toLocaleString('en-IN')}</Typography>
              </Box>
            </Paper>
          </Box>

          {/* RIGHT */}
          <Box>
            {/* Inventory */}
            <Paper sx={{ background: 'rgba(13,13,14,.97)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 3, p: 2.5, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Package size={15} color="#f97316" />
                <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Gas Inventory</Typography>
                <Box sx={{ ml: 'auto', px: 1.2, py: .3, borderRadius: 99,
                  bgcolor: inv?.stockStatus === 'healthy' ? 'rgba(34,197,94,.12)' : inv?.stockStatus === 'critical' ? 'rgba(239,68,68,.12)' : 'rgba(245,158,11,.12)',
                  border: `1px solid ${inv?.stockStatus === 'healthy' ? 'rgba(34,197,94,.3)' : inv?.stockStatus === 'critical' ? 'rgba(239,68,68,.3)' : 'rgba(245,158,11,.3)'}` }}>
                  <Typography sx={{ fontSize: '10px', fontWeight: 700,
                    color: inv?.stockStatus === 'healthy' ? '#4ade80' : inv?.stockStatus === 'critical' ? '#fca5a5' : '#fcd34d' }}>
                    {inv?.stockStatus?.toUpperCase() ?? 'N/A'}
                  </Typography>
                </Box>
              </Box>
              <InventoryEditor
                lpg={inv?.lpgStock ?? 0}
                cng={inv?.cngStock ?? 0}
                onSave={updateInventory}
              />
            </Paper>

            {/* Provider info */}
            <Paper sx={{ background: 'rgba(13,13,14,.97)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 3, p: 2.5, mb: 2 }}>
              <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#fff', mb: 2 }}>🏢 Business Info</Typography>
              {[
                { icon: <Phone size={13} />, label: dashboard?.provider.contactNumber ?? '—' },
                { icon: <MapPin size={13} />, label: dashboard?.provider.address ?? '—' },
                { icon: <Clock size={13} />, label: dashboard?.provider.operatingHours ? `${dashboard.provider.operatingHours.open} – ${dashboard.provider.operatingHours.close}` : '—' },
              ].map(({ icon, label }, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 1.2, borderBottom: i < 2 ? '1px solid rgba(255,255,255,.05)' : 'none' }}>
                  <Box sx={{ color: 'rgba(255,255,255,.35)', mt: .1 }}>{icon}</Box>
                  <Typography sx={{ fontSize: '12.5px', color: 'rgba(255,255,255,.6)', lineHeight: 1.4 }}>{label}</Typography>
                </Box>
              ))}
            </Paper>

            {/* Success rate meter */}
            <Paper sx={{ background: 'rgba(13,13,14,.97)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 3, p: 2.5 }}>
              <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#fff', mb: 2 }}>📊 Performance</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ fontSize: '12px', color: 'rgba(255,255,255,.5)' }}>Success Rate</Typography>
                <Typography sx={{ fontSize: '20px', fontWeight: 800, color: (stats?.successRate??0) >= 80 ? '#22c55e' : '#f59e0b' }}>
                  {stats?.successRateLabel ?? '0%'}
                </Typography>
              </Box>
              <LinearProgress variant="determinate" value={stats?.successRate ?? 0}
                sx={{ height: 10, borderRadius: 5, mb: 2, background: 'rgba(255,255,255,.07)',
                  '& .MuiLinearProgress-bar': { borderRadius: 5, background: (stats?.successRate??0)>=80 ? 'linear-gradient(90deg,#22c55e,#4ade80)' : 'linear-gradient(90deg,#f59e0b,#fcd34d)' } }} />

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                {[
                  { label: 'Completed', value: stats?.completedRequests ?? 0, color: '#22c55e' },
                  { label: 'Cancelled',  value: stats?.cancelledRequests ?? 0, color: '#6b7280' },
                  { label: 'This Month', value: stats?.monthCompleted ?? 0, color: '#f97316' },
                  { label: 'Avg Rating', value: `★ ${(perf?.averageRating??0).toFixed(1)}`, color: '#f59e0b' },
                ].map(({ label, value, color }) => (
                  <Box key={label} sx={{ p: 1.5, borderRadius: 2, background: `${color}10`, border: `1px solid ${color}20`, textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '18px', fontWeight: 800, color, lineHeight: 1 }}>{value}</Typography>
                    <Typography sx={{ fontSize: '10px', color: 'rgba(255,255,255,.35)', mt: .3 }}>{label}</Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}