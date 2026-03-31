// components/smart/AnimatedRequestCard.tsx
// Drop into: frontend/src/components/smart/AnimatedRequestCard.tsx
// Replaces or wraps your existing RequestCard for the smart features sections

import { useState, forwardRef } from 'react';
import {
  Box, Typography, Avatar, Chip, Button, Skeleton, Divider,
} from '@mui/material';
import {
  MapPin, Clock, Flame, MessageCircle, ChevronDown, ChevronUp, Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import PriorityBadge from './PriorityBadge';
import type { ScoredRequest } from '../../hooks/usePriorityEngine';

interface AnimatedRequestCardProps {
  request: ScoredRequest;
  index?: number;
  onAccept?: (id: string) => Promise<void> | void;
  onChat?: (id: string) => void;
  showActions?: boolean;
  loading?: boolean;
  compact?: boolean;
}

const CYLINDER_COLOR = { LPG: '#f97316', CNG: '#3b82f6' };

export const RequestCardSkeleton = forwardRef<HTMLDivElement>((props, ref) => {
  return (
    <Box
      ref={ref}
      sx={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 3,
        p: 2.5,
        mb: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Skeleton variant="circular" width={44} height={44} sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="55%" sx={{ bgcolor: 'rgba(255,255,255,0.06)', mb: 0.5 }} />
          <Skeleton variant="text" width="30%" sx={{ bgcolor: 'rgba(255,255,255,0.04)' }} />
        </Box>
        <Skeleton variant="rounded" width={80} height={22} sx={{ bgcolor: 'rgba(255,255,255,0.06)', borderRadius: '99px' }} />
      </Box>
      <Skeleton variant="text" width="75%" sx={{ bgcolor: 'rgba(255,255,255,0.05)', mb: 1 }} />
      <Skeleton variant="text" width="50%" sx={{ bgcolor: 'rgba(255,255,255,0.04)', mb: 1.5 }} />
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Skeleton variant="rounded" width={60} height={28} sx={{ bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 2 }} />
        <Skeleton variant="rounded" width={80} height={28} sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }} />
      </Box>
    </Box>
  );
});

export default forwardRef<HTMLDivElement, AnimatedRequestCardProps>(function AnimatedRequestCard({
  request,
  index = 0,
  onAccept,
  onChat,
  showActions = false,
  loading = false,
  compact = false,
}: AnimatedRequestCardProps, ref) {
  const [expanded, setExpanded] = useState(false);
  const [accepting, setAccepting] = useState(false);

  if (loading) return <RequestCardSkeleton />;

  const isHigh = request.priority.level === 'high';
  const borderColor = isHigh
    ? 'rgba(239,68,68,0.25)'
    : request.priority.level === 'medium'
    ? 'rgba(245,158,11,0.15)'
    : 'rgba(255,255,255,0.06)';

  const handleAccept = async () => {
    if (!onAccept) return;
    setAccepting(true);
    try { await onAccept(request.id); }
    finally { setAccepting(false); }
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, scale: 0.97 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      layout
    >
      <Box
        sx={{
          position: 'relative',
          background: isHigh
            ? 'linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(17,17,19,0.95) 60%)'
            : 'rgba(17,17,19,0.95)',
          border: `1px solid ${borderColor}`,
          borderRadius: 3,
          p: compact ? 2 : 2.5,
          mb: 1.5,
          overflow: 'hidden',
          cursor: 'default',
          transition: 'border-color 0.3s, box-shadow 0.3s',
          '&:hover': {
            borderColor: isHigh ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.14)',
            boxShadow: isHigh
              ? '0 8px 32px rgba(239,68,68,0.12)'
              : '0 8px 24px rgba(0,0,0,0.4)',
          },
        }}
      >
        {/* Priority left accent bar */}
        <Box sx={{
          position: 'absolute',
          left: 0, top: 0, bottom: 0,
          width: 3,
          borderRadius: '3px 0 0 3px',
          background: request.priority.color,
          opacity: 0.8,
        }} />

        {/* Score indicator (top right) */}
        <Box sx={{
          position: 'absolute',
          top: 10, right: 12,
          fontSize: '10px',
          fontWeight: 700,
          color: 'rgba(255,255,255,0.2)',
          fontFamily: 'monospace',
        }}>
          #{Math.round(request.priority.score * 100)}
        </Box>

        {/* Header row */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2, pl: 0.5 }}>
          <Avatar
            sx={{
              width: 42, height: 42,
              background: `linear-gradient(135deg, ${CYLINDER_COLOR[request.cylinderType]}, #1e1e24)`,
              fontSize: '14px',
              fontWeight: 700,
              flexShrink: 0,
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {(request.seeker as any)?.fullName?.[0] ?? request.seeker?.email?.[0]?.toUpperCase() ?? '?'}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#fff', mb: 0.3, lineHeight: 1.2 }}>
              {(request.seeker as any)?.fullName ?? request.seeker?.email?.split('@')[0] ?? 'Anonymous'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
              </Typography>
              {request.minutesAgo <= 3 && (
                <Box sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 0.4,
                  px: 0.8, py: 0.15,
                  borderRadius: '99px',
                  background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.3)',
                }}>
                  <Zap size={9} color="#fca5a5" />
                  <Typography sx={{ fontSize: '9px', fontWeight: 700, color: '#fca5a5', letterSpacing: '0.05em' }}>
                    JUST NOW
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          <PriorityBadge level={request.priority.level} size="sm" />
        </Box>

        {/* Location */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.2, pl: 0.5 }}>
          <MapPin size={13} color="#f97316" style={{ marginTop: 2, flexShrink: 0 }} />
          <Typography sx={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>
            {request.address}
          </Typography>
        </Box>

        {/* Distance + time */}
        {(request.distanceKm !== null || request.minutesAgo > 0) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5, pl: 0.5 }}>
            {request.distanceKm !== null && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <MapPin size={11} color="rgba(255,255,255,0.3)" />
                <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                  {request.distanceKm < 1
                    ? `${Math.round(request.distanceKm * 1000)}m`
                    : `${request.distanceKm.toFixed(1)}km`}
                </Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Clock size={11} color="rgba(255,255,255,0.3)" />
              <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                {request.minutesAgo}m ago
              </Typography>
            </Box>
          </Box>
        )}

        {/* Tags */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 1.5, pl: 0.5 }}>
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.6,
            px: 1.2, py: 0.4,
            borderRadius: '8px',
            background: `${CYLINDER_COLOR[request.cylinderType]}18`,
            border: `1px solid ${CYLINDER_COLOR[request.cylinderType]}35`,
          }}>
            <Flame size={11} color={CYLINDER_COLOR[request.cylinderType]} />
            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: CYLINDER_COLOR[request.cylinderType] }}>
              {request.cylinderType}  {request.quantity}
            </Typography>
          </Box>
        </Box>

        {/* Expandable message */}
        {request.message && (
          <>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  key="msg"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  <Box sx={{
                    mx: 0.5, mb: 1.5,
                    p: 1.5,
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 2,
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}>
                    <Typography sx={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', lineHeight: 1.5 }}>
                      "{request.message}"
                    </Typography>
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>

            {!compact && (
              <Box
                onClick={() => setExpanded(!expanded)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.5,
                  cursor: 'pointer', mb: 1.5, pl: 0.5,
                  '&:hover': { opacity: 0.8 },
                }}
              >
                {expanded ? <ChevronUp size={12} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={12} color="rgba(255,255,255,0.3)" />}
                <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                  {expanded ? 'Hide message' : 'View message'}
                </Typography>
              </Box>
            )}
          </>
        )}

        {/* Actions */}
        {(showActions || request.status === 'accepted') && (
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5, pl: 0.5 }}>
            {showActions && request.status === 'pending' && onAccept && (
              <Button
                variant="contained"
                size="small"
                onClick={handleAccept}
                disabled={accepting}
                sx={{
                  flex: 1,
                  borderRadius: 2,
                  py: 0.9,
                  fontSize: '12px',
                  fontWeight: 700,
                  background: isHigh
                    ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                    : 'linear-gradient(135deg, #f97316, #ea580c)',
                  boxShadow: isHigh ? '0 4px 16px rgba(239,68,68,0.3)' : '0 4px 16px rgba(249,115,22,0.25)',
                  '&:hover': {
                    background: isHigh
                      ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
                      : 'linear-gradient(135deg, #ea580c, #c2410c)',
                    transform: 'scale(1.02)',
                  },
                  transition: 'all 0.2s',
                }}
              >
                {accepting ? 'Accepting...' : isHigh ? ' Accept Now' : 'Accept'}
              </Button>
            )}

            {request.status === 'accepted' && onChat && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<MessageCircle size={14} />}
                onClick={() => onChat(request.id)}
                sx={{
                  flex: 1,
                  borderRadius: 2,
                  fontSize: '12px',
                  borderColor: 'rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.7)',
                  '&:hover': { borderColor: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)' },
                }}
              >
                Open Chat
              </Button>
            )}
          </Box>
        )}
      </Box>
    </motion.div>
  );
});