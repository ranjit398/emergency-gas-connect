import { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

export interface MapMarker {
  lat: number;
  lng: number;
  label?: string;
  type?: string;
  popup?: string;
}

interface MapProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  markers?: MapMarker[];
  height?: number;
}

export default function Map({ latitude, longitude, zoom = 13, markers = [], height = 400 }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.05},${latitude - 0.05},${longitude + 0.05},${latitude + 0.05}&layer=mapnik&marker=${latitude},${longitude}`;

    const iframe = document.createElement('iframe');
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.style.border = 'none';
    iframe.src = mapUrl;

    mapRef.current.innerHTML = '';
    mapRef.current.appendChild(iframe);
  }, [latitude, longitude, zoom, markers]);

  return (
    <Box
      ref={mapRef}
      sx={{
        width: '100%',
        height: height,
        borderRadius: 2,
        overflow: 'hidden',
      }}
    />
  );
}
