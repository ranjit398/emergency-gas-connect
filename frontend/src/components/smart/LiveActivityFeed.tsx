// components/smart/LiveActivityFeed.tsx
// Drop into: frontend/src/components/smart/LiveActivityFeed.tsx

import { useRef, useState } from 'react';
import { Box, Typography, Avatar, IconButton, Switch, FormControlLabel } from '@mui/material';
import { Activity, Pause, Play, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import type { ActivityEvent, ActivityType } from '../../hooks/useLiveActivity';

interface LiveActivityFeedProps {
  events: ActivityEvent[];
  isLive: boolean;
  onPause: () => void;
  onResume: () => void;
  onClear: () => void;
  maxVisible?: number;
}

const TYPE_CONFIG: Record<ActivityType, { icon: string; color: string; bg: string }> = {
  request_created: { icon: '', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  request_accepted: { icon: '', color: '#22c55e', bg: 'rgba(34,197,94,0.10)' },
  request_completed: { icon: '', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  helper_available: { icon: '', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  provider_joined: { icon: '', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
};

function EventRow({ event, index }: { event: ActivityEvent; index: number }) {
  const cfg = TYPE_CONFIG[event.type];

  return (
    <motion.div
      key={event.id}
      initial={event.isNew ? { opacity: 0, x: -20, height: 0 } : false}
      animate={{ opacity: 1, x: 0, height: 'auto' }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      layout
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.5,
          py: 1.2,
          px: 1.5,
          borderRadius: 2,
          background: event.isNew ? cfg.bg : 'transparent',
          border: `1px solid ${event.isNew ? cfg.color + '22' : 'transparent'}`,
          transition: 'background 1.5s, border 1.5s',
          mb: 0.3,
        }}
      >
        {/* Avatar */}
        <Avatar
          sx={{
            width: 30, height: 30,
            background: event.actorColor,
            fontSize: '11px',
            fontWeight: 700,
            flexShrink: 0,
            boxShadow: event.isNew ? `0 0 10px ${event.actorColor}55` : 'none',
            transition: 'box-shadow 1.5s',
          }}
        >
          {event.actorInitials}
        </Avatar>

        {/* Content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: '13px' }}>{cfg.icon}</Typography>
              <Typography sx={{
                fontSize: '12.5px',
                color: 'rgba(255,255,255,0.75)',
                lineHeight: 1.4,
                flex: 1,
              }}>
                {event.message}
              </Typography>
            </Box>
            <Typography sx={{
              fontSize: '10px',
              color: 'rgba(255,255,255,0.2)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              mt: 0.2,
            }}>
              {formatDistanceToNow(event.timestamp, { addSuffix: true })}
            </Typography>
          </Box>

          {event.location && (
            <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', mt: 0.3 }}>
               {event.location}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Divider */}
      <Box sx={{ height: '1px', background: 'rgba(255,255,255,0.04)', mx: 1.5 }} />
    </motion.div>
  );
}

export default function LiveActivityFeed({
  events,
  isLive,
  onPause,
  onResume,
  onClear,
  maxVisible = 8,
}: LiveActivityFeedProps) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? events : events.slice(0, maxVisible);

  return (
    <Box sx={{
      background: 'rgba(17,17,19,0.97)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 3,
      overflow: 'hidden',
      mb: 2,
    }}>
      {/* Header */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        px: 2.5, py: 2,
        background: 'rgba(255,255,255,0.02)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        {/* Pulsing live dot */}
        <Box sx={{ position: 'relative', width: 24, height: 24, flexShrink: 0 }}>
          {isLive && (
            <Box
              component={motion.div}
              animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              sx={{
                position: 'absolute', inset: 0,
                borderRadius: '50%',
                background: '#ef4444',
              }}
            />
          )}
          <Box sx={{
            position: 'absolute', inset: '25%',
            borderRadius: '50%',
            background: isLive ? '#ef4444' : 'rgba(255,255,255,0.2)',
            boxShadow: isLive ? '0 0 8px rgba(239,68,68,0.6)' : 'none',
          }} />
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
            Live Activity Near You
          </Typography>
          <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
            {isLive ? `${events.length} event${events.length !== 1 ? 's' : ''}  updating live` : 'Paused'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={isLive ? onPause : onResume}
            sx={{
              width: 28, height: 28,
              color: isLive ? '#fbbf24' : '#4ade80',
              background: isLive ? 'rgba(251,191,36,0.1)' : 'rgba(74,222,128,0.1)',
              border: `1px solid ${isLive ? 'rgba(251,191,36,0.25)' : 'rgba(74,222,128,0.25)'}`,
              borderRadius: '8px',
              '&:hover': { background: isLive ? 'rgba(251,191,36,0.18)' : 'rgba(74,222,128,0.18)' },
            }}
          >
            {isLive ? <Pause size={12} /> : <Play size={12} />}
          </IconButton>
          <IconButton
            size="small"
            onClick={onClear}
            sx={{
              width: 28, height: 28,
              color: 'rgba(255,255,255,0.25)',
              '&:hover': { color: '#ef4444', background: 'rgba(239,68,68,0.1)' },
            }}
          >
            <Trash2 size={12} />
          </IconButton>
        </Box>
      </Box>

      {/* Feed */}
      <Box sx={{ maxHeight: showAll ? 420 : 'none', overflowY: showAll ? 'auto' : 'visible', p: 1.5 }}>
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((event, i) => (
            <EventRow key={event.id} event={event} index={i} />
          ))}
        </AnimatePresence>

        {events.length === 0 && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Activity size={24} color="rgba(255,255,255,0.15)" style={{ margin: '0 auto 8px' }} />
            <Typography sx={{ fontSize: '13px', color: 'rgba(255,255,255,0.25)' }}>
              Waiting for activity...
            </Typography>
          </Box>
        )}
      </Box>

      {/* Show more */}
      {events.length > maxVisible && (
        <Box
          onClick={() => setShowAll(!showAll)}
          sx={{
            py: 1.5, textAlign: 'center',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            cursor: 'pointer',
            '&:hover': { background: 'rgba(255,255,255,0.02)' },
          }}
        >
          <Typography sx={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
            {showAll ? ' Show less' : ` Show ${events.length - maxVisible} more events`}
          </Typography>
        </Box>
      )}
    </Box>
  );
}