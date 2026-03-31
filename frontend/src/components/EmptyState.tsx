import { Box, Typography, Button } from '@mui/material';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 8,
          px: 2,
          textAlign: 'center',
        }}
      >
        <Box sx={{ mb: 3, opacity: 0.5 }}>{icon}</Box>
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
          {description}
        </Typography>
        {actionLabel && onAction && (
          <Button variant="contained" onClick={onAction} sx={{ borderRadius: 2 }}>
            {actionLabel}
          </Button>
        )}
      </Box>
    </motion.div>
  );
}
