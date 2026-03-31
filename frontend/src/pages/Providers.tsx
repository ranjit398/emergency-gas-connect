import { useState, useEffect, useCallback } from 'react';
import {
  Container, Grid, Typography, Box, TextField,
  InputAdornment, FormControl, InputLabel, Select,
  MenuItem, Chip, Paper,
} from '@mui/material';
import { Search, Building2 } from 'lucide-react';
import { providersApi } from '../lib/api';
import { Provider } from '../types';
import ProviderCard from '../components/ProviderCard';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import { getCurrentLocation } from '../utils/location';
import { calculateDistance } from '../utils/distance';
import { toast } from '../utils/toast';

export default function Providers() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [businessTypeFilter, setBusinessTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadProviders = useCallback(async () => {
    try {
      setLoading(true);
      let res;

      if (userLocation) {
        // Try nearby first
        res = await providersApi.getNearby(
          userLocation.lat,
          userLocation.lng,
          50, // 50km radius — wide enough to catch all providers
          businessTypeFilter !== 'all' ? businessTypeFilter : undefined
        );
      } else {
        // No location → fetch top providers (all, not just verified)
        res = await providersApi.getTop(50);
      }

      // Normalize _id → id
      const raw: any[] = res.data.data ?? res.data ?? [];
      const normalized: Provider[] = raw.map((p: any) => ({
        ...p,
        id: p.id ?? p._id?.toString() ?? '',
      }));

      setProviders(normalized);

      // If nearby returned empty, fall back to search/top
      if (normalized.length === 0 && userLocation) {
        const fallback = await providersApi.getTop(50);
        const fallbackRaw: any[] = fallback.data.data ?? fallback.data ?? [];
        setProviders(
          fallbackRaw.map((p: any) => ({ ...p, id: p.id ?? p._id?.toString() ?? '' }))
        );
      }
    } catch (err: any) {
      console.error('[Providers] Load error:', err?.response?.data ?? err);
      toast.error('Failed to load providers');
    } finally {
      setLoading(false);
    }
  }, [userLocation, businessTypeFilter]);

  useEffect(() => {
    getCurrentLocation()
      .then((loc) => setUserLocation({ lat: loc.latitude, lng: loc.longitude }))
      .catch(() => {
        // Location denied → still load providers without distance
        loadProviders();
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  // ── Client-side filter ─────────────────────────────────────────────────────
  const filteredProviders = providers
    .filter((p) => {
      const matchesType =
        businessTypeFilter === 'all' ||
        p.businessType === businessTypeFilter ||
        p.businessType === 'Both';

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        (p.businessName ?? '').toLowerCase().includes(q) ||
        (p.address ?? '').toLowerCase().includes(q) ||
        (p.contactNumber ?? '').includes(q);

      return matchesType && matchesSearch;
    })
    .map((p) => ({
      provider: p,
      distance: userLocation && p.location?.coordinates?.length === 2
        ? calculateDistance(
            userLocation.lat,
            userLocation.lng,
            p.location.coordinates[1], // lat
            p.location.coordinates[0]  // lng
          )
        : undefined,
    }))
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

  // ── Search handler (hits /providers/search endpoint) ──────────────────────
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) return;

    try {
      const res = await providersApi.search(
        query,
        businessTypeFilter !== 'all' ? businessTypeFilter : undefined
      );
      const raw: any[] = res.data.data ?? res.data ?? [];
      if (raw.length > 0) {
        setProviders(
          raw.map((p: any) => ({ ...p, id: p.id ?? p._id?.toString() ?? '' }))
        );
      }
    } catch {
      // Silently fail — client-side filter will still narrow results
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Gas Providers & Agencies
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Find verified gas providers near you
        </Typography>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2}>
          {/* @ts-expect-error - MUI Grid v7 item prop type compatibility */}
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              placeholder="Search by name, address or phone..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={20} />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          {/* @ts-expect-error - MUI Grid v7 item prop type compatibility */}
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Gas Type</InputLabel>
              <Select
                value={businessTypeFilter}
                label="Gas Type"
                onChange={(e) => setBusinessTypeFilter(e.target.value)}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="LPG">LPG Only</MenuItem>
                <MenuItem value="CNG">CNG Only</MenuItem>
                <MenuItem value="Both">LPG & CNG</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <Box sx={{ mb: 3, display: 'flex', gap: 1, alignItems: 'center' }}>
        <Chip label={`${filteredProviders.length} Providers Found`} color="primary" />
        {!userLocation && (
          <Chip
            label="Enable location for distance"
            variant="outlined"
            size="small"
            color="warning"
          />
        )}
      </Box>

      {loading ? (
        <Loader />
      ) : filteredProviders.length === 0 ? (
        <EmptyState
          icon={<Building2 size={64} />}
          title="No Providers Found"
          description={
            providers.length === 0
              ? 'No gas providers are registered yet in the system.'
              : 'No providers match your search criteria.'
          }
        />
      ) : (
        <Grid container spacing={3}>
          {filteredProviders.map(({ provider, distance }) => (
            // @ts-expect-error MUI Grid v7 item prop type compatibility
            <Grid item xs={12} sm={6} md={4} key={provider.id ?? provider._id}>
              <ProviderCard provider={provider} distance={distance} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}