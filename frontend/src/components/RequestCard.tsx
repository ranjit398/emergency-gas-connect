import {
  Card, CardContent, Typography, Chip, Box,
  Button, Avatar,
} from '@mui/material';
import { MapPin, Clock, Flame, MessageCircle, XCircle } from 'lucide-react';
import { EmergencyRequest } from '../types';
import { formatDistance } from '../utils/distance';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface RequestCardProps {
  request: EmergencyRequest;
  distance?: number;
  onAccept?: (id: string) => void;
  onCancel?: (id: string) => void;
  showActions?: boolean;
}

const STATUS_COLORS: Record<string, 'warning' | 'info' | 'success' | 'error' | 'default'> = {
  pending:   'warning',
  accepted:  'info',
  completed: 'success',
  cancelled: 'error',
  rejected:  'error',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#f59e0b',
  low:      '#22c55e',
};

export default function RequestCard({
  request, distance, onAccept, onCancel, showActions = false,
}: RequestCardProps) {
  const navigate = useNavigate();

  const seekerName =
    request.seeker?.fullName ||
    request.seeker?.email?.split('@')[0] ||
    'Anonymous';

  const reqId = request.id ?? (request as any)._id?.toString() ?? '';
  const priorityColor = PRIORITY_COLORS[request.priorityLevel ?? 'low'];

  return (
    <Card sx={{
      mb: 2,
      transition: 'transform 0.2s, box-shadow 0.2s',
      borderLeft: `4px solid ${priorityColor}`,
      '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
    }}>
      <CardContent>
        {/* Header row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
              <Flame size={20} />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                {seekerName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
            <Chip
              label={request.status.toUpperCase()}
              color={STATUS_COLORS[request.status] ?? 'default'}
              size="small"
            />
            {request.priorityLevel && request.priorityLevel !== 'low' && (
              <Chip
                label={request.priorityLevel.toUpperCase()}
                size="small"
                sx={{
                  bgcolor: `${priorityColor}18`,
                  color: priorityColor,
                  border: `1px solid ${priorityColor}40`,
                  fontSize: '10px',
                  fontWeight: 700,
                }}
              />
            )}
          </Box>
        </Box>

        {/* Cylinder type */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Flame size={16} color="#f97316" />
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            {request.cylinderType} Cylinder  {request.quantity ?? 1}
          </Typography>
        </Box>

        {/* Address */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
          <MapPin size={16} color="#4CAF50" style={{ marginTop: 2, flexShrink: 0 }} />
          <Typography variant="body2" color="text.secondary">
            {request.address}
          </Typography>
        </Box>

        {/* Distance */}
        {distance !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Clock size={16} color="#2196F3" />
            <Typography variant="body2" color="text.secondary">
              {formatDistance(distance)} away
            </Typography>
          </Box>
        )}

        {/* Message */}
        {request.message && (
          <Typography variant="body2" sx={{
            mt: 1.5, p: 1.5,
            bgcolor: 'action.hover',
            borderRadius: 2,
            fontStyle: 'italic',
          }}>
            "{request.message}"
          </Typography>
        )}

        {/* Actions */}
        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {showActions && request.status === 'pending' && onAccept && (
            <Button
              variant="contained"
              onClick={() => onAccept(reqId)}
              sx={{ borderRadius: 2, flex: 1 }}
              color={request.priorityLevel === 'critical' ? 'error' : 'primary'}
            >
              {request.priorityLevel === 'critical' ? ' Accept Now' : 'Accept'}
            </Button>
          )}

          {request.status === 'accepted' && (
            <Button
              variant="outlined"
              startIcon={<MessageCircle size={16} />}
              onClick={() => navigate(`/chat/${reqId}`)}
              sx={{ borderRadius: 2, flex: 1 }}
            >
              Open Chat
            </Button>
          )}

          {request.status === 'pending' && onCancel && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<XCircle size={16} />}
              onClick={() => onCancel(reqId)}
              sx={{ borderRadius: 2 }}
            >
              Cancel
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}