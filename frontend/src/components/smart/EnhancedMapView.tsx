import { Box, Typography } from '@mui/material';
import { MapPin } from 'lucide-react';

interface EnhancedMapViewProps {
  userLocation?: { lat: number; lng: number } | null;
  requests?: any[];
  helpers?: any[];
  providers?: any[];
  height?: number;
  bestMatchHelperId?: string;
}

export default function EnhancedMapView({
  height = 400,
}: EnhancedMapViewProps) {
  return (
    <Box
      sx={{
        height,
        background: 'linear-gradient(135deg, #1a1a1f 0%, #0f0f12 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Placeholder for Leaflet map */}
      <Box sx={{ textAlign: 'center', zIndex: 1 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
            mb: 2,
          }}
        >
          <MapPin size={20} color="#3b82f6" />
          <Typography sx={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
            Map View Ready
          </Typography>
        </Box>
        <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
          Integrate with react-leaflet to display requests, helpers & providers
        </Typography>
      </Box>
    </Box>
  );
}
