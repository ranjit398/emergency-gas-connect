// components/smart/RecommendationPanel.tsx
// Drop into: frontend/src/components/smart/RecommendationPanel.tsx

import { useState } from 'react';
import { Box, Typography, Avatar, Button, Skeleton, Divider, IconButton } from '@mui/material';
import { Sparkles, ChevronRight, X, Phone, MessageCircle, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MatchedHelper } from '../../hooks/useSmartMatch';

interface Recommendation {
  id: string;
  type: 'helper' | 'provider' | 'agency';
  title: string;
  subtitle: string;
  reason: string;
  reasonIcon: string;
  cta: string;
  ctaVariant: 'primary' | 'secondary';
  data: MatchedHelper | null;
  contactNumber?: string;
}

interface RecommendationPanelProps {
  topHelper: MatchedHelper | null;
  nearestProvider?: { id: string; businessName: string; contactNumber: string; address: string; distanceKm?: number } | null;
  loading?: boolean;
  onContactHelper?: (id: string) => void;
  onCallProvider?: (number: string) => void;
  onViewMap?: () => void;
}

export default function RecommendationPanel({
  topHelper,
  nearestProvider,
  loading,
  onContactHelper,
  onCallProvider,
  onViewMap,
}: RecommendationPanelProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(true);

  const recommendations: Recommendation[] = [];

  if (topHelper && !dismissed.has('top-helper')) {
    recommendations.push({
      id: 'top-helper',
      type: 'helper',
      title: topHelper.fullName,
      subtitle: `${topHelper.estimatedArrivalMin ? `~${topHelper.estimatedArrivalMin}min arrival` : 'Nearby'}  ${topHelper.ratings.toFixed(1)}  ${topHelper.completedRequests} helped`,
      reason: topHelper.badges.includes('fastest') ? 'Fastest responder in your area' :
              topHelper.badges.includes('nearest') ? 'Closest verified helper to you' :
              'Highest match score for your request',
      reasonIcon: topHelper.badges.includes('fastest') ? '' : topHelper.badges.includes('nearest') ? '' : '',
      cta: 'Contact Now',
      ctaVariant: 'primary',
      data: topHelper,
      contactNumber: undefined,
    });
  }

  if (nearestProvider && !dismissed.has('nearest-provider')) {
    recommendations.push({
      id: 'nearest-provider',
      type: 'provider',
      title: nearestProvider.businessName,
      subtitle: `${nearestProvider.distanceKm?.toFixed(1) ?? '?'}km away  ${nearestProvider.address}`,
      reason: 'Verified agency with fastest stock availability',
      reasonIcon: '',
      cta: 'Call Agency',
      ctaVariant: 'secondary',
      data: null,
      contactNumber: nearestProvider.contactNumber,
    });
  }

  if (!dismissed.has('map-tip')) {
    recommendations.push({
      id: 'map-tip',
      type: 'agency',
      title: 'View Live Map',
      subtitle: 'See all helpers and providers near you in real-time',
      reason: 'Track positions and pick the closest option',
      reasonIcon: '',
      cta: 'Open Map',
      ctaVariant: 'secondary',
      data: null,
    });
  }

  if (loading) {
    return (
      <Box sx={{ background: 'rgba(17,17,19,0.95)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, p: 2.5, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Skeleton variant="circular" width={28} height={28} sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
          <Skeleton variant="text" width="50%" sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
        </Box>
        {[0,1].map((i) => (
          <Box key={i} sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', gap: 1.5, p: 1.5, background: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
              <Skeleton variant="circular" width={36} height={36} sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="60%" sx={{ bgcolor: 'rgba(255,255,255,0.05)', mb: 0.5 }} />
                <Skeleton variant="text" width="80%" sx={{ bgcolor: 'rgba(255,255,255,0.04)' }} />
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Box sx={{
        background: 'rgba(17,17,19,0.97)',
        border: '1px solid rgba(249,115,22,0.18)',
        borderRadius: 3,
        overflow: 'hidden',
        mb: 2,
      }}>
        {/* Header */}
        <Box
          onClick={() => setExpanded(!expanded)}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            px: 2.5, py: 2,
            cursor: 'pointer',
            background: 'linear-gradient(90deg, rgba(249,115,22,0.08), transparent)',
            borderBottom: expanded ? '1px solid rgba(255,255,255,0.05)' : 'none',
            '&:hover': { background: 'linear-gradient(90deg, rgba(249,115,22,0.12), transparent)' },
          }}
        >
          <Box sx={{
            width: 28, height: 28,
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #f97316, #ef4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(249,115,22,0.4)',
            flexShrink: 0,
          }}>
            <Sparkles size={14} color="#fff" />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
              AI Recommendations
            </Typography>
            <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
              {recommendations.length} suggestion{recommendations.length !== 1 ? 's' : ''} based on your situation
            </Typography>
          </Box>
          <Box sx={{
            width: 20, height: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.3)',
            transform: expanded ? 'rotate(90deg)' : 'rotate(-90deg)',
            transition: 'transform 0.25s',
          }}>
            <ChevronRight size={14} />
          </Box>
        </Box>

        {/* Content */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28 }}
              style={{ overflow: 'hidden' }}
            >
              <Box sx={{ p: 2 }}>
                <AnimatePresence mode="popLayout">
                  {recommendations.map((rec, i) => (
                    <motion.div
                      key={rec.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.25, delay: i * 0.06 }}
                      layout
                    >
                      <Box sx={{
                        position: 'relative',
                        p: 1.8,
                        mb: 1.2,
                        background: i === 0 ? 'rgba(249,115,22,0.07)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${i === 0 ? 'rgba(249,115,22,0.22)' : 'rgba(255,255,255,0.06)'}`,
                        borderRadius: 2.5,
                        '&:hover': { borderColor: i === 0 ? 'rgba(249,115,22,0.35)' : 'rgba(255,255,255,0.12)' },
                        transition: 'border-color 0.2s',
                      }}>
                        {/* Dismiss */}
                        <IconButton
                          size="small"
                          onClick={() => setDismissed(new Set([...dismissed, rec.id]))}
                          sx={{
                            position: 'absolute', top: 6, right: 6,
                            width: 20, height: 20,
                            color: 'rgba(255,255,255,0.2)',
                            '&:hover': { color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)' },
                          }}
                        >
                          <X size={11} />
                        </IconButton>

                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                          {/* Icon / Avatar */}
                          <Box sx={{
                            width: 38, height: 38,
                            borderRadius: '10px',
                            background: i === 0 ? 'linear-gradient(135deg, #f97316, #7c3aed)' : 'rgba(255,255,255,0.06)',
                            border: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '18px',
                            flexShrink: 0,
                          }}>
                            {rec.type === 'helper' && rec.data ? (
                              <Typography sx={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                                {rec.data.fullName[0]}
                              </Typography>
                            ) : (
                              <Typography sx={{ fontSize: '18px' }}>{rec.reasonIcon}</Typography>
                            )}
                          </Box>

                          {/* Text */}
                          <Box sx={{ flex: 1, minWidth: 0, pr: 2 }}>
                            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#fff', mb: 0.2, lineHeight: 1.3 }}>
                              {rec.title}
                            </Typography>
                            <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', mb: 0.8, lineHeight: 1.4 }}>
                              {rec.subtitle}
                            </Typography>

                            {/* Reason chip */}
                            <Box sx={{
                              display: 'inline-flex', alignItems: 'center', gap: 0.5,
                              px: 1, py: 0.3,
                              mb: 1.2,
                              borderRadius: '8px',
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.07)',
                            }}>
                              <Typography sx={{ fontSize: '9px' }}>{rec.reasonIcon}</Typography>
                              <Typography sx={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', fontStyle: 'italic' }}>
                                {rec.reason}
                              </Typography>
                            </Box>

                            {/* CTA */}
                            <Button
                              size="small"
                              variant={rec.ctaVariant === 'primary' ? 'contained' : 'outlined'}
                              startIcon={
                                rec.type === 'helper' ? <MessageCircle size={12} /> :
                                rec.type === 'provider' ? <Phone size={12} /> :
                                <Navigation size={12} />
                              }
                              onClick={() => {
                                if (rec.type === 'helper' && rec.data && onContactHelper) onContactHelper(rec.data.id);
                                if (rec.type === 'provider' && rec.contactNumber && onCallProvider) onCallProvider(rec.contactNumber);
                                if (rec.id === 'map-tip' && onViewMap) onViewMap();
                              }}
                              sx={{
                                borderRadius: 1.5,
                                py: 0.5,
                                px: 1.5,
                                fontSize: '11px',
                                fontWeight: 700,
                                ...(rec.ctaVariant === 'primary' ? {
                                  background: 'linear-gradient(135deg, #f97316, #ef4444)',
                                  color: '#fff',
                                  boxShadow: '0 4px 12px rgba(249,115,22,0.3)',
                                  '&:hover': { background: 'linear-gradient(135deg, #ea580c, #dc2626)' },
                                } : {
                                  borderColor: 'rgba(255,255,255,0.15)',
                                  color: 'rgba(255,255,255,0.65)',
                                  '&:hover': { borderColor: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)' },
                                }),
                              }}
                            >
                              {rec.cta}
                            </Button>
                          </Box>
                        </Box>
                      </Box>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
    </motion.div>
  );
}