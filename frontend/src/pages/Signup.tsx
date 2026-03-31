import { useState } from 'react';
import {
  Container, Paper, TextField, Button, Typography,
  Box, Link, Alert, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Flame } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Signup() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'seeker',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleChange = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await signUp({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        role: formData.role,
        // Don't send phone/address — backend has safe defaults
      });
      navigate('/');
    } catch (err: any) {
      // ✅ Axios wraps the real error inside err.response.data
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to create account';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ width: '100%' }}
        >
          <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
              <Flame size={40} color="#f44336" />
              <Typography variant="h4" sx={{ ml: 1, fontWeight: 700 }}>GasConnect</Typography>
            </Box>

            <Typography variant="h5" align="center" gutterBottom sx={{ fontWeight: 600 }}>
              Create Account
            </Typography>
            <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
              Join our emergency gas assistance network
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <form onSubmit={handleSubmit}>
              <TextField
                label="Full Name" fullWidth required
                value={formData.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                margin="normal" autoFocus
              />
              <TextField
                label="Email Address" type="email" fullWidth required
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                margin="normal" autoComplete="email"
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>I am a</InputLabel>
                <Select
                  value={formData.role} label="I am a"
                  onChange={(e) => handleChange('role', e.target.value)}
                >
                  <MenuItem value="seeker">Gas Seeker</MenuItem>
                  <MenuItem value="helper">Helper</MenuItem>
                  <MenuItem value="provider">Gas Provider/Agency</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Password" type="password" fullWidth required
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                margin="normal" autoComplete="new-password"
              />
              <TextField
                label="Confirm Password" type="password" fullWidth required
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                margin="normal" autoComplete="new-password"
              />

              <Button
                type="submit" fullWidth variant="contained" size="large"
                disabled={loading}
                sx={{ mt: 3, mb: 2, borderRadius: 2, py: 1.5 }}
              >
                {loading ? 'Creating Account...' : 'Sign Up'}
              </Button>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Already have an account?{' '}
                  <Link
                    component="button" type="button"
                    onClick={() => navigate('/login')}
                    sx={{ cursor: 'pointer', fontWeight: 600 }}
                  >
                    Sign In
                  </Link>
                </Typography>
              </Box>
            </form>
          </Paper>
        </motion.div>
      </Box>
    </Container>
  );
}