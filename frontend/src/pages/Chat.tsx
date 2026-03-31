import { useState, useEffect } from 'react';
import {
  Container, Box, IconButton, Typography, Paper,
} from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { requestsApi } from '../lib/api';
import { EmergencyRequest } from '../types';
import ChatBox from '../components/ChatBox';
import Loader from '../components/Loader';

export default function Chat() {
  const { requestId } = useParams<{ requestId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [request, setRequest] = useState<EmergencyRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!requestId) return;

    requestsApi.getById(requestId)
      .then((res) => {
        const data = res.data.data ?? res.data;
        setRequest(data);
      })
      .catch(() => {
        // Create minimal request so chat still works
        setRequest({
          id: requestId,
          seekerId: user?.id ?? '',
          helperId: null,
          cylinderType: 'LPG',
          quantity: 1,
          status: 'accepted',
          message: null,
          location: { type: 'Point', coordinates: [0, 0] },
          address: '',
          rating: null,
          assignedAt: null,
          priorityScore: 0,
          priorityLevel: 'low',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as EmergencyRequest);
      })
      .finally(() => setLoading(false));
  }, [requestId, user?.id]);

  if (loading) return <Loader fullScreen />;

  // Resolve the other participant
  const seekerId = request?.seekerId ?? (request?.seeker as any)?.id;
  const helperId = request?.helperId ?? (request?.helper as any)?.id;

  const isSeeker    = user?.id === seekerId;
  const receiverId  = isSeeker ? (helperId ?? '') : (seekerId ?? '');
  const receiverData = isSeeker ? request?.helper : request?.seeker;
  const receiverName = (receiverData as any)?.fullName
    ?? (receiverData as any)?.email?.split('@')[0]
    ?? (isSeeker ? 'Helper' : 'Seeker');
  const receiverAvatar = (receiverData as any)?.avatarUrl ?? null;

  return (
    <Container maxWidth="md" sx={{ py: 2, height: 'calc(100vh - 64px)' }}>
      <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 2, overflow: 'hidden' }}>
        {/* Header */}
        <Box sx={{
          px: 1.5, py: 1,
          bgcolor: 'primary.main', color: 'white',
          display: 'flex', alignItems: 'center', gap: 1,
        }}>
          <IconButton onClick={() => navigate('/dashboard')} sx={{ color: 'white' }}>
            <ArrowLeft size={20} />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
            Chat with {receiverName}
          </Typography>
        </Box>

        {/* ChatBox fills remaining height */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <ChatBox
            requestId={requestId ?? ''}
            receiverId={receiverId}
            receiverName={receiverName}
            receiverAvatar={receiverAvatar}
            cylinderType={request?.cylinderType}
            requestStatus={request?.status}
            compact={true}   // no header  we already have one above
            height="100%"
          />
        </Box>
      </Paper>
    </Container>
  );
}