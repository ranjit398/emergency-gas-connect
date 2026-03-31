// components/smart/PriorityBadge.tsx
// Drop into: frontend/src/components/smart/PriorityBadge.tsx

import { Box, Chip, Tooltip } from '@mui/material';
import { motion } from 'framer-motion';
import type { UrgencyLevel } from '../../hooks/usePriorityEngine';

interface PriorityBadgeProps {
  level: UrgencyLevel;
  score?: number;
  showScore?: boolean;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

const CONFIG: Record<UrgencyLevel, {
  label: string;
  bg: string;
  border: string;
  text: string;
  dot: string;
  tooltip: string;
}> = {
  high: {
    label: 'Critical',
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.40)',
    text: '#fca5a5',
    dot: '#ef4444',
    tooltip: 'High urgency  needs immediate attention',
  },
  medium: {
    label: 'Moderate',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.35)',
    text: '#fcd34d',
    dot: '#f59e0b',
    tooltip: 'Moderate urgency  respond soon',
  },
  low: {
    label: 'Standard',
    bg: 'rgba(34,197,94,0.10)',
    border: 'rgba(34,197,94,0.30)',
    text: '#86efac',
    dot: '#22c55e',
    tooltip: 'Standard priority  normal response time',
  },
};

export default function PriorityBadge({
  level,
  score,
  showScore = false,
  size = 'md',
  pulse = true,
}: PriorityBadgeProps) {
  const cfg = CONFIG[level];
  const isSmall = size === 'sm';

  return (
    <Tooltip title={cfg.tooltip} placement="top" arrow>
      <Box
        component={motion.div}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: isSmall ? 0.6 : 0.8,
          px: isSmall ? 1.2 : 1.6,
          py: isSmall ? 0.35 : 0.5,
          borderRadius: '999px',
          border: `1px solid ${cfg.border}`,
          background: cfg.bg,
          backdropFilter: 'blur(8px)',
          cursor: 'default',
          userSelect: 'none',
        }}
      >
        {/* Pulsing dot */}
        <Box sx={{ position: 'relative', width: isSmall ? 7 : 9, height: isSmall ? 7 : 9, flexShrink: 0 }}>
          {pulse && level === 'high' && (
            <Box
              component={motion.div}
              animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              sx={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: cfg.dot,
              }}
            />
          )}
          <Box sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: cfg.dot,
            boxShadow: level === 'high' ? `0 0 8px ${cfg.dot}` : 'none',
          }} />
        </Box>

        <Box sx={{
          fontSize: isSmall ? '10px' : '11px',
          fontWeight: 700,
          letterSpacing: '0.04em',
          color: cfg.text,
          textTransform: 'uppercase',
          fontFamily: '"DM Sans", sans-serif',
        }}>
          {cfg.label}
          {showScore && score !== undefined && (
            <Box component="span" sx={{ opacity: 0.65, ml: 0.5, fontWeight: 500 }}>
              {Math.round(score * 100)}
            </Box>
          )}
        </Box>
      </Box>
    </Tooltip>
  );
}