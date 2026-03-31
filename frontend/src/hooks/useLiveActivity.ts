// hooks/useLiveActivity.ts
// Drop into: frontend/src/hooks/useLiveActivity.ts
// Works with mock data out of the box; swap in socket.on() calls for real-time

import { useState, useEffect, useCallback, useRef } from 'react';

export type ActivityType =
  | 'request_created'
  | 'request_accepted'
  | 'request_completed'
  | 'helper_available'
  | 'provider_joined';

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  actorName: string;
  actorInitials: string;
  actorColor: string;
  message: string;
  location?: string;
  timestamp: Date;
  isNew?: boolean;
}

const AVATAR_COLORS = [
  '#f97316', '#ef4444', '#8b5cf6', '#06b6d4',
  '#10b981', '#f59e0b', '#ec4899', '#6366f1',
];

const MOCK_NAMES = [
  'Priya S.', 'Rahul M.', 'Anjali V.', 'Deepak K.',
  'Kavita N.', 'Amit P.', 'Sunita R.', 'Vikram T.',
  'Meena L.', 'Rohan G.', 'Pooja D.', 'Arun S.',
];

const MOCK_LOCATIONS = [
  'Sector 14, Gurugram', 'Lajpat Nagar, Delhi', 'Koramangala, Bangalore',
  'Bandra West, Mumbai', 'T. Nagar, Chennai', 'Satellite, Ahmedabad',
  'Salt Lake, Kolkata', 'Jubilee Hills, Hyderabad',
];

const EVENT_TEMPLATES: Array<{ type: ActivityType; getMessage: (name: string) => string }> = [
  { type: 'request_created', getMessage: (n) => `${n} requested emergency LPG gas` },
  { type: 'request_created', getMessage: (n) => `${n} needs CNG cylinder urgently` },
  { type: 'request_accepted', getMessage: (n) => `${n} accepted a nearby request` },
  { type: 'request_completed', getMessage: (n) => `${n} completed a gas delivery` },
  { type: 'helper_available', getMessage: (n) => `${n} is now available to help` },
  { type: 'request_accepted', getMessage: (n) => `${n} is on the way to a seeker` },
  { type: 'provider_joined', getMessage: (n) => `${n} Gas Agency joined the network` },
  { type: 'request_completed', getMessage: (n) => `${n} marked request completed ` },
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function makeEvent(): ActivityEvent {
  const template = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
  const name = MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)];
  const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  const initials = name.split(' ').map((w) => w[0]).join('');

  return {
    id: uid(),
    type: template.type,
    actorName: name,
    actorInitials: initials,
    actorColor: color,
    message: template.getMessage(name),
    location: MOCK_LOCATIONS[Math.floor(Math.random() * MOCK_LOCATIONS.length)],
    timestamp: new Date(),
    isNew: true,
  };
}

interface UseLiveActivityOptions {
  maxItems?: number;
  intervalMs?: number;
  // Pass your socket instance here for real-time:
  // socket?: Socket;
}

export function useLiveActivity({
  maxItems = 12,
  intervalMs = 4500,
}: UseLiveActivityOptions = {}) {
  const [events, setEvents] = useState<ActivityEvent[]>(() =>
    // Pre-seed with 5 events at varied past times
    Array.from({ length: 5 }, (_, i) => {
      const ev = makeEvent();
      ev.timestamp = new Date(Date.now() - (i + 1) * 55000);
      ev.isNew = false;
      return ev;
    })
  );

  const [isLive, setIsLive] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const pushEvent = useCallback((ev?: ActivityEvent) => {
    const newEv = ev ?? makeEvent();
    setEvents((prev) => {
      const updated = [newEv, ...prev.slice(0, maxItems - 1)];
      // Clear isNew after 3s
      setTimeout(() => {
        setEvents((p) => p.map((e) => (e.id === newEv.id ? { ...e, isNew: false } : e)));
      }, 3000);
      return updated;
    });
  }, [maxItems]);

  useEffect(() => {
    if (!isLive) return;
    timerRef.current = setInterval(() => pushEvent(), intervalMs);
    return () => clearInterval(timerRef.current);
  }, [isLive, intervalMs, pushEvent]);

  //  If you have a socket, add this inside a useEffect:
  // useEffect(() => {
  //   if (!socket) return;
  //   const handler = (data: any) => pushEvent({ ...data, timestamp: new Date(), isNew: true });
  //   socket.on('activity:new', handler);
  //   return () => socket.off('activity:new', handler);
  // }, [socket, pushEvent]);

  const pause = () => { setIsLive(false); clearInterval(timerRef.current); };
  const resume = () => setIsLive(true);
  const clear = () => setEvents([]);

  return { events, isLive, pause, resume, clear, pushEvent };
}