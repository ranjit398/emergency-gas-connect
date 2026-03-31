import { Fab, Tooltip } from '@mui/material';
import { AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function FloatingActionButton() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  // ✅ Only show FAB for seekers who want to create requests
  if (profile?.role !== 'seeker') {
    return null;
  }

  return (
    <Tooltip title="Request Emergency Help" placement="left">
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1000,
        }}
      >
        <Fab
          color="error"
          size="large"
          onClick={() => navigate('/request')}
          sx={{
            width: 70,
            height: 70,
            boxShadow: 4,
            '&:hover': {
              boxShadow: 8,
            },
          }}
        >
          <AlertCircle size={32} />
        </Fab>
      </motion.div>
    </Tooltip>
  );
}
