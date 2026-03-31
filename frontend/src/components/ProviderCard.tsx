import { Card, CardContent, Typography, Chip, Box, Button, Avatar } from '@mui/material';
import { MapPin, Phone, Building2, Star, Clock } from 'lucide-react';
import { Provider } from '../types';
import { formatDistance } from '../utils/distance';

interface ProviderCardProps {
  provider: Provider;
  distance?: number;
}

export default function ProviderCard({ provider, distance }: ProviderCardProps) {
  const handleCall = () => {
    if (provider.contactNumber) {
      window.location.href = `tel:${provider.contactNumber}`;
    }
  };

  return (
    <Card
      sx={{
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
      }}
    >
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
          <Avatar sx={{ bgcolor: 'secondary.main', width: 50, height: 50 }}>
            <Building2 size={24} />
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }} noWrap>
              {provider.businessName}
            </Typography>

            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              <Chip
                label={provider.businessType}
                color="primary"
                size="small"
              />
              {provider.isVerified && (
                <Chip label="✓ Verified" color="success" size="small" variant="outlined" />
              )}
              {!provider.isVerified && (
                <Chip label="Pending" color="warning" size="small" variant="outlined" />
              )}
            </Box>
          </Box>
        </Box>

        {/* Address */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
          <MapPin size={16} color="#4CAF50" style={{ marginTop: 2, flexShrink: 0 }} />
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4 }}>
            {provider.address}
          </Typography>
        </Box>

        {/* Rating */}
        {provider.rating > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            <Star size={14} color="#FFC107" fill="#FFC107" />
            <Typography variant="body2" color="text.secondary">
              {provider.rating.toFixed(1)} ({provider.totalRatings} reviews)
            </Typography>
          </Box>
        )}

        {/* Operating hours */}
        {provider.operatingHours && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            <Clock size={14} color="#9C27B0" />
            <Typography variant="body2" color="text.secondary">
              {provider.operatingHours.open} – {provider.operatingHours.close}
            </Typography>
          </Box>
        )}

        {/* Distance */}
        {distance !== undefined && (
          <Typography variant="body2" color="primary" sx={{ fontWeight: 500, mb: 1 }}>
            📍 {formatDistance(distance)} away
          </Typography>
        )}

        {/* Inventory */}
        {provider.availableCylinders && provider.availableCylinders.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5, flexWrap: 'wrap' }}>
            {provider.availableCylinders.map((c) => (
              <Chip
                key={c.type}
                label={`${c.type}: ${c.quantity}`}
                size="small"
                variant="outlined"
                color={c.quantity > 0 ? 'default' : 'error'}
                sx={{ fontSize: '11px' }}
              />
            ))}
          </Box>
        )}

        {/* Call button */}
        <Button
          variant="contained"
          fullWidth
          startIcon={<Phone size={16} />}
          onClick={handleCall}
          disabled={!provider.contactNumber}
          sx={{ borderRadius: 2, mt: 0.5 }}
        >
          {provider.contactNumber ? `Call ${provider.contactNumber}` : 'No contact'}
        </Button>
      </CardContent>
    </Card>
  );
}