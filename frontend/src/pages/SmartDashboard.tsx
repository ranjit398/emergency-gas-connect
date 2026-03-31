// pages/SmartDashboard.tsx
// Drop into: frontend/src/pages/SmartDashboard.tsx
// Add route in App.tsx: <Route path="/smart" element={<ProtectedRoute><><Navbar /><SmartDashboard /></></ProtectedRoute>} />

import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Tabs, Tab, Button, Skeleton,
} from '@mui/material';
import {
  Zap, MapPin, Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { useAuth } from '../context/AuthContext';
import { requestsApi } from '../lib/api';
import { usePriorityEngine } from '../hooks/usePriorityEngine';
import { useSmartMatch } from '../hooks/useSmartMatch';
import { useLiveActivity } from '../hooks/useLiveActivity';

import AnimatedRequestCard, { RequestCardSkeleton } from '../components/smart/AnimatedRequestCard';
import SmartMatchCard from '../components/smart/SmartMatchCard';
import RecommendationPanel from '../components/smart/RecommendationPanel';
import LiveActivityFeed from '../components/smart/LiveActivityFeed';
import EnhancedMapView from '../components/smart/EnhancedMapView';
import PriorityBadge from '../components/smart/PriorityBadge';
import type { RawRequest } from '../hooks/usePriorityEngine';
import type { HelperProfile } from '../hooks/useSmartMatch';

// ── Mock helper data (replace with real API when available)
const MOCK_HELPERS: HelperProfile[] = [
  {
    id: 'h1', fullName: 'Suresh Kumar', avatarUrl: null,
    ratings: 4.8, totalRatings: 94, completedRequests: 132,
    isAvailable: true, avgResponseMinutes: 5,
    location: { type: 'Point', coordinates: [77.21, 28.62] },
  },
  {
    id: 'h2', fullName: 'Ajay Sharma', avatarUrl: null,
    ratings: 4.5, totalRatings: 42, completedRequests: 57,
    isAvailable: true, avgResponseMinutes: 9,
    location: { type: 'Point', coordinates: [77.23, 28.60] },
  },
  {
    id: 'h3', fullName: 'Ravi Mehta', avatarUrl: null,
    ratings: 4.2, totalRatings: 18, completedRequests: 23,
    isAvailable: true, avgResponseMinutes: 14,
    location: { type: 'Point', coordinates: [77.19, 28.63] },
  },
  {
    id: 'h4', fullName: 'Deepak Patel', avatarUrl: null,
    ratings: 3.9, totalRatings: 11, completedRequests: 14,
    isAvailable: true,
    location: { type: 'Point', coordinates: [77.25, 28.61] },
  },
];

// ── Mock provider
const MOCK_PROVIDER = {
  id: 'p1',
  businessName: 'Krishna Gas Agency',
  contactNumber: '9876543210',
  address: 'Sector 15, Gurugram',
  distanceKm: 1.4,
  businessType: 'LPG',
  location: { type: 'Point' as const, coordinates: [77.22, 28.605] as [number, number] },
};

type SortMode = 'priority' | 'distance' | 'time';

export default function SmartDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [rawRequests, setRawRequests] = useState<RawRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('priority');
  const [activeTab, setActiveTab] = useState(0);
  const [filterLevel, setFilterLevel] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // ── Core hooks
  const scoredRequests = usePriorityEngine(rawRequests, { userLocation, sortBy: sortMode });
  const matchedHelpers = useSmartMatch(MOCK_HELPERS, userLocation, 4);
  const activity = useLiveActivity({ maxItems: 12, intervalMs: 5000 });

  // ── Load data
  const loadRequests = useCallback(async () => {
    try {
      const { data } = await requestsApi.getPending();
      setRawRequests(data.data ?? []);
    } catch {
      // Fallback mock data if API unavailable
      setRawRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
    // Get user location if available (optional)
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, [loadRequests]);

  // ── Filter requests
  const filtered = filterLevel === 'all'
    ? scoredRequests
    : scoredRequests.filter((r) => r.priority.level === filterLevel);

  // ── Stats
  const stats = {
    total: scoredRequests.length,
    high: scoredRequests.filter((r) => r.priority.level === 'high').length,
    medium: scoredRequests.filter((r) => r.priority.level === 'medium').length,
    low: scoredRequests.filter((r) => r.priority.level === 'low').length,
  };

  const handleAccept = useCallback(async (id: string) => {
    try {
      await requestsApi.accept(id);
      toast.success('Request accepted!');
      setRawRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to accept');
    }
  }, []);

  const canAccept = profile?.role === 'helper' && profile?.isAvailable;

  return (
    <Box sx={{ minHeight: '100vh', background: '#0a0a0b', pb: 10 }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <Box sx={{
        background: 'linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(10,10,11,0) 60%)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        px: { xs: 2, sm: 4 },
        py: 3,
      }}>
        <Box sx={{ maxWidth: 1280, mx: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                <Box sx={{
                  width: 32, height: 32,
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #f97316, #ef4444)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(249,115,22,0.4)',
                }}>
                  <Zap size={16} color="#fff" />
                </Box>
                <Typography sx={{
                  fontSize: '22px', fontWeight: 800, color: '#fff',
                  fontFamily: '"Syne", sans-serif',
                }}>
                  Smart Emergency Hub
                </Typography>
              </Box>
              <Typography sx={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                AI-prioritized · Real-time matched · {profile?.role === 'helper' ? 'Ready to help' : 'Find help fast'}
              </Typography>
            </Box>

            {/* Priority summary pills */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {[
                { level: 'high' as const, count: stats.high },
                { level: 'medium' as const, count: stats.medium },
                { level: 'low' as const, count: stats.low },
              ].map(({ level, count }) => (
                <Box
                  key={level}
                  onClick={() => setFilterLevel(filterLevel === level ? 'all' : level)}
                  sx={{ cursor: 'pointer' }}
                >
                  <PriorityBadge level={level} />
                  <Typography sx={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', textAlign: 'center', mt: 0.3 }}>
                    {count}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 4 }, pt: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(12, 1fr)' }, gap: 3 }}>

          {/* ── LEFT COLUMN: Requests ──────────────────────── */}
          <Box sx={{ gridColumn: { xs: 'span 1', lg: 'span 7' } }}>

            {/* Sort controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Typography sx={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                {filtered.length} Request{filtered.length !== 1 ? 's' : ''}
                {filterLevel !== 'all' && (
                  <Box component="span" sx={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', ml: 1, fontWeight: 400 }}>
                    (filtered: {filterLevel})
                  </Box>
                )}
              </Typography>

              <Box sx={{ display: 'flex', gap: 0.8 }}>
                {(['priority', 'distance', 'time'] as SortMode[]).map((mode) => (
                  <Box
                    key={mode}
                    onClick={() => setSortMode(mode)}
                    component={motion.div}
                    whileTap={{ scale: 0.96 }}
                    sx={{
                      px: 1.5, py: 0.6,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      background: sortMode === mode
                        ? 'linear-gradient(135deg, #f97316, #ef4444)'
                        : 'rgba(255,255,255,0.05)',
                      color: sortMode === mode ? '#fff' : 'rgba(255,255,255,0.4)',
                      border: `1px solid ${sortMode === mode ? 'transparent' : 'rgba(255,255,255,0.08)'}`,
                      transition: 'all 0.2s',
                      '&:hover': { background: sortMode === mode ? undefined : 'rgba(255,255,255,0.09)' },
                    }}
                  >
                    {mode === 'priority' ? '🎯' : mode === 'distance' ? '📍' : '⏱'} {mode}
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Request cards */}
            <AnimatePresence mode="popLayout">
              {loading ? (
                [0, 1, 2, 3].map((i) => <RequestCardSkeleton key={i} />)
              ) : filtered.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Box sx={{
                    py: 8, textAlign: 'center',
                    background: 'rgba(17,17,19,0.8)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 3,
                  }}>
                    <Typography sx={{ fontSize: '32px', mb: 2 }}>🟢</Typography>
                    <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#fff', mb: 1 }}>
                      No {filterLevel !== 'all' ? filterLevel : ''} priority requests
                    </Typography>
                    <Typography sx={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
                      All caught up! Check back soon.
                    </Typography>
                    {filterLevel !== 'all' && (
                      <Button
                        onClick={() => setFilterLevel('all')}
                        sx={{ mt: 2, color: '#f97316', fontSize: '13px' }}
                      >
                        Show All →
                      </Button>
                    )}
                  </Box>
                </motion.div>
              ) : (
                filtered.map((req, idx: number) => (
                  <AnimatedRequestCard
                    key={req.id}
                    request={req}
                    index={idx}
                    showActions={canAccept}
                    onAccept={canAccept ? handleAccept : undefined}
                    onChat={(id: string) => navigate(`/chat/${id}`)}
                  />
                ))
              )}
            </AnimatePresence>
          </Box>

          {/* ── RIGHT COLUMN: Smart panels ─────────────────── */}
          <Box sx={{ gridColumn: { xs: 'span 1', lg: 'span 5' } }}>

            {/* Tabs: Match / Map / Activity */}
            <Box sx={{ mb: 2 }}>
              <Tabs
                value={activeTab}
                onChange={(_, v) => setActiveTab(v)}
                sx={{
                  minHeight: 38,
                  background: 'rgba(17,17,19,0.95)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 2,
                  p: 0.5,
                  '& .MuiTabs-indicator': {
                    background: 'linear-gradient(90deg, #f97316, #ef4444)',
                    borderRadius: 1.5,
                    height: '100%',
                    zIndex: 0,
                  },
                  '& .MuiTab-root': {
                    minHeight: 30,
                    py: 0.5,
                    px: 1.5,
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.4)',
                    zIndex: 1,
                    textTransform: 'none',
                    letterSpacing: '0.01em',
                    '&.Mui-selected': { color: '#fff' },
                  },
                }}
              >
                <Tab label="⚡ Best Matches" />
                <Tab label="🗺️ Live Map" />
                <Tab label="📡 Activity" />
              </Tabs>
            </Box>

            {/* AI Recommendation panel — always visible */}
            <RecommendationPanel
              topHelper={matchedHelpers[0] ?? null}
              nearestProvider={MOCK_PROVIDER}
              loading={loading}
              onContactHelper={(id) => navigate(`/chat/${id}`)}
              onCallProvider={(num) => window.location.href = `tel:${num}`}
              onViewMap={() => setActiveTab(1)}
            />

            {/* Tab content */}
            <AnimatePresence mode="wait">

              {/* ── Best Matches ── */}
              {activeTab === 0 && (
                <motion.div
                  key="matches"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <Box sx={{
                    background: 'rgba(17,17,19,0.95)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 3,
                    overflow: 'hidden',
                    mb: 2,
                  }}>
                    <Box sx={{
                      px: 2.5, py: 1.8,
                      background: 'rgba(255,255,255,0.02)',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      display: 'flex', alignItems: 'center', gap: 1,
                    }}>
                      <Sparkles size={14} color="#f97316" />
                      <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                        Best Matches Near You
                      </Typography>
                      <Box sx={{
                        ml: 'auto',
                        px: 1, py: 0.3,
                        borderRadius: '99px',
                        background: 'rgba(249,115,22,0.12)',
                        border: '1px solid rgba(249,115,22,0.25)',
                      }}>
                        <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#f97316' }}>
                          {matchedHelpers.length} available
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ p: 1.5 }}>
                      {loading ? (
                        [0,1,2].map((i) => (
                          <Box key={i} sx={{ p: 1.5, mb: 1, background: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
                            <Box sx={{ display: 'flex', gap: 1.5 }}>
                              <Skeleton variant="circular" width={46} height={46} sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
                              <Box sx={{ flex: 1 }}>
                                <Skeleton variant="text" width="60%" sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
                                <Skeleton variant="text" width="40%" sx={{ bgcolor: 'rgba(255,255,255,0.04)' }} />
                              </Box>
                            </Box>
                          </Box>
                        ))
                      ) : matchedHelpers.length === 0 ? (
                        <Box sx={{ py: 4, textAlign: 'center' }}>
                          <Typography sx={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
                            No available helpers found nearby
                          </Typography>
                        </Box>
                      ) : (
                        matchedHelpers.map((helper, idx: number) => (
                          <SmartMatchCard
                            key={helper.id}
                            helper={helper}
                            rank={idx + 1}
                            isTopPick={idx === 0}
                            onContact={(id: string) => navigate(`/chat/${id}`)}
                          />
                        ))
                      )}
                    </Box>
                  </Box>
                </motion.div>
              )}

              {/* ── Live Map ── */}
              {activeTab === 1 && (
                <motion.div
                  key="map"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <Box sx={{
                    background: 'rgba(17,17,19,0.95)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 3,
                    overflow: 'hidden',
                    mb: 2,
                  }}>
                    <Box sx={{
                      px: 2.5, py: 1.8,
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      display: 'flex', alignItems: 'center', gap: 1,
                    }}>
                      <MapPin size={14} color="#3b82f6" />
                      <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                        Live Map View
                      </Typography>
                      <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        <Box sx={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.6)' }} />
                        <Typography sx={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Live</Typography>
                      </Box>
                    </Box>
                    <EnhancedMapView
                      userLocation={userLocation}
                      requests={scoredRequests.slice(0, 8)}
                      helpers={matchedHelpers.filter((h) => h.location?.coordinates)}
                      providers={[MOCK_PROVIDER]}
                      height={380}
                      bestMatchHelperId={matchedHelpers[0]?.id}
                    />
                  </Box>
                </motion.div>
              )}

              {/* ── Activity Feed ── */}
              {activeTab === 2 && (
                <motion.div
                  key="activity"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <LiveActivityFeed
                    events={activity.events}
                    isLive={activity.isLive}
                    onPause={activity.pause}
                    onResume={activity.resume}
                    onClear={activity.clear}
                    maxVisible={8}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </Box>
        </Box>
      </Box>

      {/* ── Sticky mobile emergency button ─────────────────── */}
      <Box sx={{
        display: { xs: 'flex', sm: 'none' },
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        p: 2,
        background: 'linear-gradient(to top, rgba(10,10,11,0.98), transparent)',
        zIndex: 100,
      }}>
        <Button
          fullWidth
          onClick={() => navigate('/request')}
          sx={{
            py: 1.8,
            borderRadius: 3,
            fontSize: '15px',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #ef4444, #f97316)',
            color: '#fff',
            boxShadow: '0 8px 28px rgba(239,68,68,0.45)',
            '&:hover': { background: 'linear-gradient(135deg, #dc2626, #ea580c)' },
          }}
        >
          🚨 Request Emergency Help
        </Button>
      </Box>
    </Box>
  );
}