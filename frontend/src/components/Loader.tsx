import { CircularProgress, Box } from '@mui/material';

interface LoaderProps {
  size?: number;
  fullScreen?: boolean;
}

export default function Loader({ size = 40, fullScreen = false }: LoaderProps) {
  if (fullScreen) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          width: '100%',
        }}
      >
        <CircularProgress size={size} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
      <CircularProgress size={size} />
    </Box>
  );
}
