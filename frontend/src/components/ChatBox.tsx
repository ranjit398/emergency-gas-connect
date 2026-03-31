// frontend/src/components/ChatBox.tsx
// NEW FILE  drop into frontend/src/components/
// WhatsApp-style real-time chat UI
// Replaces the Chat.tsx page OR can be embedded anywhere

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, TextField, IconButton, Typography, Avatar,
  Paper, CircularProgress, Chip, Divider,
} from '@mui/material';
import { Send, CheckCheck, Check, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { messagesApi } from '../lib/api';
import { getSocket } from '../lib/socket';
import { useChatRoom, useTypingIndicator } from '../hooks/usesocket';
import { useAuth } from '../context/AuthContext';

// -- Types --
interface ChatMessage {
  id: string;
  requestId: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender?: { fullName: string; avatarUrl?: string | null };
  // local optimistic state
  _status?: 'sending' | 'sent' | 'failed';
}

interface TypingState {
  userId: string;
  userName: string;
  isTyping: boolean;
}

interface ChatBoxProps {
  requestId: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar?: string | null;
  cylinderType?: string;
  requestStatus?: string;
  height?: number | string;
  compact?: boolean;           // embed mode (no header)
}

// -- Helpers --
function formatMessageTime(date: string): string {
  const d = new Date(date);
  if (isToday(d))     return format(d, 'HH:mm');
  if (isYesterday(d)) return `Yesterday ${format(d, 'HH:mm')}`;
  return format(d, 'dd MMM HH:mm');
}

function formatDateSeparator(date: string): string {
  const d = new Date(date);
  if (isToday(d))     return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEEE, d MMM');
}

function shouldShowDateSeparator(curr: ChatMessage, prev: ChatMessage | undefined): boolean {
  if (!prev) return true;
  const c = new Date(curr.createdAt);
  const p = new Date(prev.createdAt);
  return c.toDateString() !== p.toDateString();
}

// -- Main Component --
export default function ChatBox({
  requestId,
  receiverId,
  receiverName,
  receiverAvatar,
  cylinderType,
  requestStatus,
  height = 500,
  compact = false,
}: ChatBoxProps) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingState, setTypingState] = useState<TypingState | null>(null);
  const [isReceiverOnline, setIsReceiverOnline] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Join chat room via socket
  useChatRoom(requestId);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // -- Load chat history --
  useEffect(() => {
    if (!requestId) return;

    const load = async () => {
      try {
        // Try new chat endpoint first, fall back to existing
        let msgs: ChatMessage[] = [];
        try {
          const res = await messagesApi.getByRequest(requestId, { limit: 100 });
          const raw = res.data.data ?? res.data ?? [];
          msgs = raw.map((m: any) => ({
            ...m,
            id: m.id ?? m._id?.toString(),
            _status: 'sent' as const,
          })).reverse(); // newest-first  oldest-first
        } catch {
          msgs = [];
        }

        setMessages(msgs);
        setTimeout(() => scrollToBottom(false), 50);

        // Mark as read
        const socket = getSocket();
        socket.emit('mark_read', { requestId });
      } catch {
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [requestId, scrollToBottom]);

  // -- Socket listeners --
  useEffect(() => {
    const socket = getSocket();

    const handleReceive = (msg: any) => {
      if (msg.requestId !== requestId) return;

      const normalized: ChatMessage = {
        ...msg,
        id: msg.id ?? msg._id?.toString() ?? `sock_${Date.now()}`,
        _status: 'sent',
      };

      setMessages((prev) => {
        // Replace matching temp message (same sender + content)
        const hasTemp = prev.find(
          (m) => m._status === 'sending' &&
                 m.content === normalized.content &&
                 m.senderId === normalized.senderId
        );
        if (hasTemp) {
          return prev.map((m) =>
            m === hasTemp ? normalized : m
          );
        }
        // Deduplicate by id
        if (prev.find((m) => m.id === normalized.id)) return prev;
        return [...prev, normalized];
      });
    };

    const handleTyping = (data: TypingState) => {
      if (data.userId === user?.id) return;
      setTypingState(data.isTyping ? data : null);
      if (data.isTyping) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingState(null), 3000);
      }
    };

    const handleOnline  = (d: { userId: string }) => { if (d.userId === receiverId) setIsReceiverOnline(true); };
    const handleOffline = (d: { userId: string }) => { if (d.userId === receiverId) setIsReceiverOnline(false); };

    const handleRead = (d: { requestId: string }) => {
      if (d.requestId !== requestId) return;
      setMessages((prev) =>
        prev.map((m) => m.senderId === user?.id ? { ...m, isRead: true } : m)
      );
    };

    socket.on('receive_message', handleReceive);
    socket.on('message:new',     handleReceive); // legacy compat
    socket.on('typing',          handleTyping);
    socket.on('user:online',     handleOnline);
    socket.on('user:offline',    handleOffline);
    socket.on('messages:read',   handleRead);

    return () => {
      socket.off('receive_message', handleReceive);
      socket.off('message:new',     handleReceive);
      socket.off('typing',          handleTyping);
      socket.off('user:online',     handleOnline);
      socket.off('user:offline',    handleOffline);
      socket.off('messages:read',   handleRead);
    };
  }, [requestId, user?.id, receiverId]);

  // -- Send message --
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content || !user) return;

    setNewMessage('');
    setSending(true);

    // Optimistic message
    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const tempMsg: ChatMessage = {
      id: tempId,
      requestId,
      senderId: user.id,
      receiverId,
      content,
      isRead: false,
      createdAt: new Date().toISOString(),
      sender: {
        fullName: profile?.fullName ?? user.email ?? 'You',
        avatarUrl: profile?.avatarUrl,
      },
      _status: 'sending',
    };

    setMessages((prev) => [...prev, tempMsg]);

    try {
      const socket = getSocket();

      // Send via new chat socket event
      socket.emit('send_message', {
        requestId,
        receiverId,
        content,
        tempId,
      });

      // Also persist via HTTP as backup
      const res = await messagesApi.send(requestId, receiverId, content);
      const saved = res.data.data ?? res.data;

      // Replace temp with saved
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...saved, id: saved.id ?? saved._id?.toString(), _status: 'sent' as const }
            : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) => m.id === tempId ? { ...m, _status: 'failed' as const } : m)
      );
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as any);
    }

    // Emit typing
    const socket = getSocket();
    socket.emit('typing', { requestId, isTyping: true });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { requestId, isTyping: false });
    }, 2000);
  };

  const handleRetry = (tempId: string, content: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== tempId));
    setNewMessage(content);
  };

  // -- Render --
  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column',
      height, border: '1px solid', borderColor: 'divider',
      borderRadius: compact ? 0 : 2, overflow: 'hidden',
      bgcolor: 'background.default',
    }}>
      {/* Header */}
      {!compact && (
        <Box sx={{
          px: 2, py: 1.5,
          bgcolor: 'primary.main', color: 'white',
          display: 'flex', alignItems: 'center', gap: 1.5,
        }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar
              src={receiverAvatar ?? undefined}
              sx={{ width: 40, height: 40, fontWeight: 700 }}
            >
              {receiverName[0]?.toUpperCase() ?? '?'}
            </Avatar>
            {isReceiverOnline && (
              <Box sx={{
                position: 'absolute', bottom: 1, right: 1,
                width: 10, height: 10, borderRadius: '50%',
                bgcolor: '#22c55e', border: '1.5px solid',
                borderColor: 'primary.main',
              }} />
            )}
          </Box>

          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '15px', lineHeight: 1.2 }}>
              {receiverName}
            </Typography>
            <Typography sx={{ fontSize: '11px', opacity: 0.8 }}>
              {isReceiverOnline ? ' Online' : ' Offline'}
              {cylinderType && `  ${cylinderType} Request`}
              {requestStatus && `  ${requestStatus}`}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Messages area */}
      <Box sx={{
        flex: 1, overflowY: 'auto', p: 2,
        bgcolor: 'action.hover',
        display: 'flex', flexDirection: 'column', gap: 0.5,
      }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : messages.length === 0 ? (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: '32px', mb: 1 }}></Typography>
              <Typography color="text.secondary" sx={{ fontSize: '14px' }}>
                No messages yet. Say hello!
              </Typography>
            </Box>
          </Box>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => {
              const isOwn = msg.senderId === user?.id;
              const prev  = messages[idx - 1];
              const showDate = shouldShowDateSeparator(msg, prev);

              return (
                <Box key={msg.id}>
                  {/* Date separator */}
                  {showDate && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 1.5 }}>
                      <Chip
                        label={formatDateSeparator(msg.createdAt)}
                        size="small"
                        sx={{ fontSize: '11px', bgcolor: 'rgba(0,0,0,0.08)', color: 'text.secondary' }}
                      />
                    </Box>
                  )}

                  {/* Message bubble */}
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                  >
                    <Box sx={{
                      display: 'flex',
                      justifyContent: isOwn ? 'flex-end' : 'flex-start',
                      mb: 0.5,
                    }}>
                      {/* Avatar for other person */}
                      {!isOwn && (
                        <Avatar
                          src={msg.sender?.avatarUrl ?? undefined}
                          sx={{ width: 28, height: 28, mr: 0.8, mt: 0.5, fontSize: '12px', flexShrink: 0 }}
                        >
                          {(msg.sender?.fullName ?? 'U')[0]}
                        </Avatar>
                      )}

                      <Box sx={{ maxWidth: '72%' }}>
                        {/* Sender name (for group chats  useful for future) */}
                        {!isOwn && (
                          <Typography sx={{ fontSize: '11px', color: 'text.secondary', mb: 0.3, ml: 0.5 }}>
                            {msg.sender?.fullName ?? 'User'}
                          </Typography>
                        )}

                        {/* Bubble */}
                        <Paper
                          elevation={0}
                          sx={{
                            px: 1.5, pt: 1, pb: 0.6,
                            borderRadius: 2.5,
                            borderTopRightRadius: isOwn ? 4 : 16,
                            borderTopLeftRadius:  isOwn ? 16 : 4,
                            bgcolor: isOwn ? 'primary.main' : 'background.paper',
                            color: isOwn ? 'white' : 'text.primary',
                            border: isOwn ? 'none' : '1px solid',
                            borderColor: 'divider',
                            opacity: msg._status === 'sending' ? 0.7 : 1,
                            transition: 'opacity 0.2s',
                            cursor: msg._status === 'failed' ? 'pointer' : 'default',
                          }}
                          onClick={() => msg._status === 'failed' && handleRetry(msg.id, msg.content)}
                        >
                          <Typography sx={{ fontSize: '14px', lineHeight: 1.5, wordBreak: 'break-word' }}>
                            {msg.content}
                          </Typography>

                          {/* Timestamp + status */}
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.4, mt: 0.3 }}>
                            <Typography sx={{ fontSize: '10px', opacity: isOwn ? 0.75 : 0.5 }}>
                              {formatMessageTime(msg.createdAt)}
                            </Typography>

                            {isOwn && (
                              <>
                                {msg._status === 'sending' && <Clock size={11} style={{ opacity: 0.6 }} />}
                                {msg._status === 'failed'  && <Typography sx={{ fontSize: '10px', color: '#fca5a5' }}> Tap to retry</Typography>}
                                {(msg._status === 'sent' || !msg._status) && (
                                  msg.isRead
                                    ? <CheckCheck size={13} style={{ opacity: 0.85 }} />
                                    : <Check      size={13} style={{ opacity: 0.6 }} />
                                )}
                              </>
                            )}
                          </Box>
                        </Paper>
                      </Box>
                    </Box>
                  </motion.div>
                </Box>
              );
            })}
          </AnimatePresence>
        )}

        {/* Typing indicator */}
        <AnimatePresence>
          {typingState && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 0.5 }}>
                <Paper elevation={0} sx={{
                  px: 1.5, py: 1, borderRadius: 2.5,
                  borderTopLeftRadius: 4,
                  bgcolor: 'background.paper',
                  border: '1px solid', borderColor: 'divider',
                  display: 'flex', alignItems: 'center', gap: 0.5,
                }}>
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                      style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: 'currentColor', opacity: 0.5,
                      }}
                    />
                  ))}
                </Paper>
                <Typography sx={{ fontSize: '11px', color: 'text.secondary' }}>
                  {typingState.userName} is typing...
                </Typography>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </Box>

      <Divider />

      {/* Input */}
      <Box
        component="form"
        onSubmit={handleSend}
        sx={{
          p: 1.5,
          display: 'flex', alignItems: 'flex-end', gap: 1,
          bgcolor: 'background.paper',
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          variant="outlined"
          size="small"
          disabled={sending}
          sx={{
            '& .MuiOutlinedInput-root': { borderRadius: 3 },
          }}
        />
        <IconButton
          type="submit"
          disabled={!newMessage.trim() || sending}
          sx={{
            bgcolor: newMessage.trim() ? 'primary.main' : 'action.disabledBackground',
            color: newMessage.trim() ? 'white' : 'text.disabled',
            '&:hover': { bgcolor: 'primary.dark' },
            width: 40, height: 40,
            flexShrink: 0,
            transition: 'all 0.2s',
          }}
        >
          {sending
            ? <CircularProgress size={18} color="inherit" />
            : <Send size={18} />
          }
        </IconButton>
      </Box>
    </Box>
  );
}