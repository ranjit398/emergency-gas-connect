import { useState, useEffect } from 'react';
import { Container, Paper, TextField, Button, Typography, Box, FormControl, InputLabel, Select, MenuItem, Alert, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { requestsApi } from '../lib/api';
import { getCurrentLocation, reverseGeocode } from '../utils/location';
import { toast } from '../utils/toast';
import { MapPin, AlertCircle, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import Loader from '../components/Loader';

export default function RequestHelp() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [formData, setFormData] = useState({ cylinderType: 'LPG', message: '', latitude: 0, longitude: 0, address: '', quantity: 1 });
  const [error, setError] = useState('');

  //  ROLE CHECK: Only seekers can create requests
  useEffect(() => {
    if (profile && profile.role !== 'seeker') {
      navigate('/');
      toast.error('Only seekers can create emergency requests');
    }
  }, [profile, navigate]);

  useEffect(() => { loadCurrentLocation(); }, []);

  const loadCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const loc = await getCurrentLocation();
      const address = await reverseGeocode(loc.latitude, loc.longitude);
      setFormData((prev) => ({ ...prev, latitude: loc.latitude, longitude: loc.longitude, address }));
    } catch {
      setError('Please enable location access to create a request');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.latitude || !formData.longitude) return setError('Location is required');
    setLoading(true);
    try {
      await requestsApi.create({
        cylinderType: formData.cylinderType,
        message: formData.message || undefined,
        latitude: formData.latitude,
        longitude: formData.longitude,
        address: formData.address,
        quantity: formData.quantity,
      });
      toast.success('Emergency request created!');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ width: '100%' }}>
          <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
              <Box sx={{ p: 2, borderRadius: '50%', bgcolor: 'error.light', color: 'error.dark' }}>
                <AlertCircle size={40} />
              </Box>
            </Box>
            <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 700 }}>Request Emergency Help</Typography>
            <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
              Fill in the details to request immediate gas assistance
            </Typography>
            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
            <form onSubmit={handleSubmit}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Cylinder Type</InputLabel>
                <Select value={formData.cylinderType} label="Cylinder Type"
                  onChange={(e) => setFormData((p) => ({ ...p, cylinderType: e.target.value }))}>
                  <MenuItem value="LPG">LPG (Liquefied Petroleum Gas)</MenuItem>
                  <MenuItem value="CNG">CNG (Compressed Natural Gas)</MenuItem>
                </Select>
              </FormControl>
              <TextField label="Quantity" type="number" fullWidth value={formData.quantity}
                onChange={(e) => setFormData((p) => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                margin="normal" inputProps={{ min: 1, max: 10 }} />
              <TextField label="Your Location" fullWidth value={formData.address}
                onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                margin="normal" required multiline rows={2}
                InputProps={{
                  endAdornment: (
                    <IconButton onClick={loadCurrentLocation} disabled={locationLoading} size="small">
                      {locationLoading ? <Loader size={20} /> : <MapPin size={20} />}
                    </IconButton>
                  ),
                }} />
              <TextField label="Additional Message (Optional)" fullWidth multiline rows={4}
                value={formData.message}
                onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
                margin="normal" placeholder="Describe your emergency..." />
              <Button type="submit" fullWidth variant="contained" size="large" color="error"
                disabled={loading || locationLoading || !formData.latitude}
                sx={{ mt: 3, borderRadius: 2, py: 1.5 }}>
                {loading ? 'Creating Request...' : 'Submit Emergency Request'}
              </Button>
              <Button fullWidth variant="outlined" size="large" onClick={() => navigate('/dashboard')}
                sx={{ mt: 2, borderRadius: 2, py: 1.5 }}>
                Cancel
              </Button>
            </form>
          </Paper>
        </motion.div>
      </Box>
    </Container>
  );
}