import { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Box,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  Brightness4,
  Brightness7,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import { Flame } from 'lucide-react';

export default function Navbar() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    handleClose();
  };

  const handleSignOut = async () => {
    await signOut();
    handleClose();
    navigate('/login');
  };

  return (
    <AppBar position="sticky" elevation={2}>
      <Toolbar>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            flexGrow: 1,
          }}
          onClick={() => navigate('/')}
        >
          <Flame size={28} className="mr-2" />
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            {isMobile ? 'GasConnect' : 'Emergency Gas Connect'}
          </Typography>
        </Box>

        <IconButton color="inherit" onClick={toggleDarkMode} sx={{ mr: 1 }}>
          {darkMode ? <Brightness7 /> : <Brightness4 />}
        </IconButton>

        {user && (
          <>
            <IconButton
              size="large"
              onClick={handleMenu}
              color="inherit"
            >
              {profile?.avatar_url ? (
                <Avatar src={profile.avatar_url} sx={{ width: 32, height: 32 }} />
              ) : (
                <AccountCircle />
              )}
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <MenuItem disabled>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {profile?.full_name}
                </Typography>
              </MenuItem>
              <MenuItem onClick={() => handleNavigate('/')}>Home</MenuItem>
              <MenuItem onClick={() => handleNavigate('/smart')}>
                ⚡ Smart Hub
              </MenuItem>
              <MenuItem onClick={() => handleNavigate('/dashboard')}>
                Dashboard
              </MenuItem>
              <MenuItem onClick={() => handleNavigate('/providers')}>
                Providers
              </MenuItem>
              {user?.role === 'provider' && (
                <MenuItem onClick={() => handleNavigate('/provider-dashboard')}>
                  📊 Provider Dashboard
                </MenuItem>
              )}
              <MenuItem onClick={handleSignOut}>Sign Out</MenuItem>
            </Menu>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
}
