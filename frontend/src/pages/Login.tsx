import { useState } from 'react';
import { Container, Paper, TextField, Button, Typography, Box, Link, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Flame } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to sign in';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ width: '100%' }}>
          <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
              <Flame size={40} color="#f44336" />
              <Typography variant="h4" sx={{ ml: 1, fontWeight: 700 }}>GasConnect</Typography>
            </Box>
            <Typography variant="h5" align="center" gutterBottom sx={{ fontWeight: 600 }}>Welcome Back</Typography>
            <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
              Sign in to continue to your account
            </Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <form onSubmit={handleSubmit}>
              <TextField label="Email Address" type="email" fullWidth required value={email}
                onChange={(e) => setEmail(e.target.value)} margin="normal" autoComplete="email" autoFocus />
              <TextField label="Password" type="password" fullWidth required value={password}
                onChange={(e) => setPassword(e.target.value)} margin="normal" autoComplete="current-password" />
              <Button type="submit" fullWidth variant="contained" size="large" disabled={loading}
                sx={{ mt: 3, mb: 2, borderRadius: 2, py: 1.5 }}>
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Don't have an account?{' '}
                  <Link component="button" type="button" onClick={() => navigate('/signup')} sx={{ cursor: 'pointer', fontWeight: 600 }}>
                    Sign Up
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