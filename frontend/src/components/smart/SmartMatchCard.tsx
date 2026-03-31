// components/smart/SmartMatchCard.tsx
// Drop into: frontend/src/components/smart/SmartMatchCard.tsx

import { Box, Typography, Avatar, LinearProgress, Button } from '@mui/material';
import { Star, MapPin, Zap, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import type { MatchedHelper } from '../../hooks/useSmartMatch';

interface SmartMatchCardProps {
  helper: MatchedHelper;
  rank: number;
  isTopPick?: boolean;
  onContact?: (id: string) => void;
}

const BADGE_STYLES: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  fastest: {
    bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)',
    text: '#fb923c', icon: <Zap size={10} />,
  },
  nearest: {
    bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)',
    text: '#60a5fa', icon: <MapPin size={10} />,
  },
  trusted: {
    bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.30)',
    text: '#4ade80', icon: <span style={{ fontSize: 10 }}>🛡️</span>,
  },
  experienced: {
    bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.28)',
    text: '#34d399', icon: <span style={{ fontSize: 10 }}>✅</span>,
  },
  top_rated: {
    bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)',
    text: '#fcd34d', icon: <Star size={10} fill="#fcd34d" />,
  },
};

const RANK_COLORS = ['#f97316', '#94a3b8', '#b45309'];

export default function SmartMatchCard({
  helper, rank, isTopPick = false, onContact,
}: SmartMatchCardProps) {
  const matchPct = Math.round(helper.matchScore * 100);

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: rank * 0.07, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.015, transition: { duration: 0.15 } }}
    >
      <Box
        sx={{
          position: 'relative',
          background: isTopPick
            ? 'linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(17,17,19,0.97) 60%)'
            : 'rgba(17,17,19,0.95)',
          border: `1px solid ${isTopPick ? 'rgba(249,115,22,0.30)' : 'rgba(255,255,255,0.07)'}`,
          borderRadius: 3,
          p: 2,
          mb: 1.5,
          overflow: 'hidden',
          transition: 'all 0.25s',
          '&:hover': {
            borderColor: isTopPick ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.15)',
            boxShadow: isTopPick
              ? '0 8px 28px rgba(249,115,22,0.15)'
              : '0 4px 16px rgba(0,0,0,0.4)',
          },
        }}
      >
        {/* Rank badge */}
        <Box sx={{
          position: 'absolute',
          top: 10, right: 12,
          width: 22, height: 22,
          borderRadius: '50%',
          background: rank <= 3 ? `${RANK_COLORS[rank - 1]}22` : 'rgba(255,255,255,0.05)',
          border: `1px solid ${rank <= 3 ? RANK_COLORS[rank - 1] + '55' : 'rgba(255,255,255,0.1)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Typography sx={{ fontSize: '10px', fontWeight: 800, color: rank <= 3 ? RANK_COLORS[rank - 1] : 'rgba(255,255,255,0.3)' }}>
            #{rank}
          </Typography>
        </Box>

        {/* Top pick indicator */}
        {isTopPick && (
          <Box sx={{
            position: 'absolute', top: -1, left: 16,
            px: 1.2, py: 0.3,
            borderRadius: '0 0 8px 8px',
            background: 'linear-gradient(135deg, #f97316, #ef4444)',
            boxShadow: '0 4px 12px rgba(249,115,22,0.4)',
          }}>
            <Typography sx={{ fontSize: '9px', fontWeight: 800, color: '#fff', letterSpacing: '0.06em' }}>
              BEST MATCH
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mt: isTopPick ? 1.5 : 0 }}>
          {/* Avatar */}
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            <Avatar
              src={helper.avatarUrl ?? undefined}
              sx={{
                width: 46, height: 46,
                background: 'linear-gradient(135deg, #f97316, #7c3aed)',
                fontSize: '16px', fontWeight: 700,
                border: isTopPick ? '2px solid rgba(249,115,22,0.5)' : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {helper.fullName[0]}
            </Avatar>
            {/* Online dot */}
            <Box sx={{
              position: 'absolute', bottom: 1, right: 1,
              width: 10, height: 10,
              borderRadius: '50%',
              background: '#22c55e',
              border: '1.5px solid #111113',
              boxShadow: '0 0 6px rgba(34,197,94,0.6)',
            }} />
          </Box>

          {/* Info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#fff', mb: 0.3, lineHeight: 1.2 }}>
              {helper.fullName}
            </Typography>

            {/* Stars */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.8 }}>
              {[1,2,3,4,5].map((i) => (
                <Star
                  key={i}
                  size={11}
                  color={i <= Math.round(helper.ratings) ? '#f59e0b' : 'rgba(255,255,255,0.15)'}
                  fill={i <= Math.round(helper.ratings) ? '#f59e0b' : 'transparent'}
                />
              ))}
              <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', ml: 0.3 }}>
                {helper.ratings.toFixed(1)} ({helper.totalRatings})
              </Typography>
            </Box>

            {/* Stats row */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              {helper.distanceKm !== null && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                  <MapPin size={11} color="rgba(255,255,255,0.3)" />
                  <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>
                    {helper.distanceKm < 1
                      ? `${Math.round(helper.distanceKm * 1000)}m`
                      : `${helper.distanceKm.toFixed(1)}km`}
                  </Typography>
                </Box>
              )}
              {helper.estimatedArrivalMin !== null && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                  <Clock size={11} color="rgba(255,255,255,0.3)" />
                  <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>
                    ~{helper.estimatedArrivalMin}m arrival
                  </Typography>
                </Box>
              )}
              <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                {helper.completedRequests} helped
              </Typography>
            </Box>

            {/* Badges */}
            {helper.badgeLabels.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.7, mb: 1 }}>
                {helper.badgeLabels.slice(0, 3).map((label, i) => {
                  const badge = helper.badges[i];
                  const style = BADGE_STYLES[badge] ?? BADGE_STYLES.trusted;
                  return (
                    <Box
                      key={label}
                      sx={{
                        display: 'inline-flex', alignItems: 'center', gap: 0.5,
                        px: 1, py: 0.3,
                        borderRadius: '8px',
                        background: style.bg,
                        border: `1px solid ${style.border}`,
                      }}
                    >
                      <Box sx={{ color: style.text, display: 'flex', alignItems: 'center' }}>
                        {style.icon}
                      </Box>
                      <Typography sx={{ fontSize: '10px', fontWeight: 700, color: style.text, letterSpacing: '0.03em' }}>
                        {label.replace(/^[^\w]+/, '')}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )}

            {/* Match score bar */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                <Typography sx={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em' }}>
                  MATCH SCORE
                </Typography>
                <Typography sx={{ fontSize: '10px', fontWeight: 700, color: matchPct >= 70 ? '#4ade80' : matchPct >= 45 ? '#fcd34d' : 'rgba(255,255,255,0.4)' }}>
                  {matchPct}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={matchPct}
                sx={{
                  height: 4,
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.05)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 2,
                    background: matchPct >= 70
                      ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                      : matchPct >= 45
                      ? 'linear-gradient(90deg, #f97316, #fbbf24)'
                      : 'linear-gradient(90deg, #94a3b8, #cbd5e1)',
                  },
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* Contact button */}
        {onContact && (
          <Box sx={{ mt: 1.5 }}>
            <Button
              fullWidth
              size="small"
              onClick={() => onContact(helper.id)}
              sx={{
                borderRadius: 2,
                py: 0.8,
                fontSize: '12px',
                fontWeight: 700,
                background: isTopPick
                  ? 'linear-gradient(135deg, #f97316, #ea580c)'
                  : 'rgba(255,255,255,0.06)',
                border: `1px solid ${isTopPick ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
                color: isTopPick ? '#fff' : 'rgba(255,255,255,0.65)',
                boxShadow: isTopPick ? '0 4px 14px rgba(249,115,22,0.3)' : 'none',
                '&:hover': {
                  background: isTopPick
                    ? 'linear-gradient(135deg, #ea580c, #c2410c)'
                    : 'rgba(255,255,255,0.10)',
                  transform: 'scale(1.01)',
                },
                transition: 'all 0.2s',
              }}
            >
              {isTopPick ? '⚡ Contact Best Match' : 'Contact Helper'}
            </Button>
          </Box>
        )}
      </Box>
    </motion.div>
  );
}