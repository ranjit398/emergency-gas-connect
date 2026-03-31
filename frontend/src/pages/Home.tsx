import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert
} from '@mui/material';
import { Search, MapPin } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { requestsApi } from '../lib/api';
import { useSocket } from '../hooks/usesocket';
import { EmergencyRequest } from '../types';

import RequestCard from '../components/RequestCard';
import Map, { MapMarker } from '../components/Map';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import FloatingActionButton from '../components/FloatingActionButton';

import { calculateDistance } from '../utils/distance';
import { getCurrentLocation } from '../utils/location';
import { toast } from '../utils/toast';

export default function Home() {
  const { profile } = useAuth();

  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [cylinderFilter, setCylinderFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);

      const params = userLocation
        ? {
            latitude: userLocation.lat,
            longitude: userLocation.lng,
            maxDistance: 25
          }
        : undefined;

      const { data } = await requestsApi.getPending(params);
      setRequests(data.data || []);
    } catch {
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [userLocation]);

  useEffect(() => {
    getCurrentLocation()
      .then((loc) => setUserLocation({ lat: loc.latitude, lng: loc.longitude }))
      .catch(() => console.warn('Location unavailable'));
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Socket updates
  useSocket({
    'request:new': (newRequest: EmergencyRequest) => {
      setRequests((prev) => [
        newRequest,
        ...prev.filter((r) => r.id !== newRequest.id)
      ]);
    },
    'request:updated': (updated: EmergencyRequest) => {
      setRequests((prev) =>
        updated.status !== 'pending'
          ? prev.filter((r) => r.id !== updated.id)
          : prev.map((r) => (r.id === updated.id ? updated : r))
      );
    }
  });

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await requestsApi.accept(requestId);
      toast.success('Request accepted successfully!');
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err: any) {
      toast.error(
        err.response?.data?.error?.message || 'Failed to accept request'
      );
    }
  };

  const filteredRequests = requests.filter((request) => {
    const matchesCylinder =
      cylinderFilter === 'all' || request.cylinderType === cylinderFilter;

    const matchesSearch = request.address
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    return matchesCylinder && matchesSearch;
  });

  const canAcceptRequests =
    profile?.role === 'helper' && profile?.isAvailable;

  const mapMarkers: MapMarker[] = filteredRequests.map((r) => ({
    lat: r.location.coordinates[1],
    lng: r.location.coordinates[0],
    type: 'request',
    label: r.address,
    popup: `<strong>${r.cylinderType} Request</strong><br/>${r.address}`
  }));

  return (
    <>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Emergency Gas Requests
          </Typography>

          <Typography variant="body1" color="text.secondary">
            {canAcceptRequests
              ? 'View and accept nearby emergency requests'
              : 'Browse active emergency gas requests'}
          </Typography>
        </Box>

        {/* ✅ ROLE-BASED ALERTS */}
        {profile?.role === 'seeker' && (
          <Alert severity="info" sx={{ mb: 3 }}>
            You are viewing requests as a <strong>Seeker</strong>. Visit your <strong>Dashboard</strong> to create a new emergency request.
          </Alert>
        )}
        
        {profile?.role === 'helper' && !profile?.isAvailable && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            You are currently <strong>unavailable</strong>. Update your availability in Dashboard to accept requests.
          </Alert>
        )}

        {profile?.role === 'provider' && (
          <Alert severity="info" sx={{ mb: 3 }}>
            You are viewing requests as a <strong>Provider</strong>. Please contact available helpers to handle these requests.
          </Alert>
        )}

        {/* ✅ MAIN GRID */}
        <Grid container spacing={3}>
          {/* @ts-expect-error - MUI Grid v7 item prop type compatibility */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
              
              {/* FILTER GRID */}
              <Grid container spacing={2}>
                {/* @ts-expect-error - MUI Grid v7 item prop type compatibility */}
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    placeholder="Search by location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search size={20} />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>

                {/* @ts-expect-error - MUI Grid v7 item prop type compatibility */}
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Cylinder Type</InputLabel>
                    <Select
                      value={cylinderFilter}
                      label="Cylinder Type"
                      onChange={(e) =>
                        setCylinderFilter(e.target.value)
                      }
                    >
                      <MenuItem value="all">All Types</MenuItem>
                      <MenuItem value="LPG">LPG</MenuItem>
                      <MenuItem value="CNG">CNG</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>

            {/* CHIPS */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Chip
                label={`${filteredRequests.length} Requests`}
                color="primary"
              />
              {canAcceptRequests && (
                <Chip
                  label="Available to Help"
                  color="success"
                  variant="outlined"
                />
              )}
            </Box>

            {/* CONTENT */}
            {loading ? (
              <Loader />
            ) : filteredRequests.length === 0 ? (
              <EmptyState
                icon={<MapPin size={64} />}
                title="No Requests Found"
                description="No active emergency requests at the moment. Check back soon."
              />
            ) : (
              filteredRequests.map((request) => {
                const distance = userLocation
                  ? calculateDistance(
                      userLocation.lat,
                      userLocation.lng,
                      request.location.coordinates[1],
                      request.location.coordinates[0]
                    )
                  : undefined;

                return (
                  <RequestCard
                    key={request.id}
                    request={request}
                    distance={distance}
                    onAccept={
                      canAcceptRequests
                        ? handleAcceptRequest
                        : undefined
                    }
                    showActions={canAcceptRequests}
                  />
                );
              })
            )}
          </Grid>

          {/* RIGHT SIDE MAP */}
          {/* @ts-expect-error - MUI Grid v7 item prop type compatibility */}
          <Grid item xs={12} md={4}>
            <Paper
              sx={{
                p: 2,
                borderRadius: 2,
                position: 'sticky',
                top: 80
              }}
            >
              <Typography
                variant="h6"
                sx={{ mb: 2, fontWeight: 600 }}
              >
                Live Map
              </Typography>

              <Box sx={{ height: 400 }}>
                {userLocation ? (
                  <Map
                    latitude={userLocation.lat}
                    longitude={userLocation.lng}
                    zoom={12}
                    markers={mapMarkers}
                    height={400}
                  />
                ) : (
                  <Box
                    sx={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'action.hover',
                      borderRadius: 2
                    }}
                  >
                    <Typography color="text.secondary">
                      Enable location to view map
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {profile?.role !== 'provider' && <FloatingActionButton />}
    </>
  );
}