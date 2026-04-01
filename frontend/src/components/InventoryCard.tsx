/**
 * InventoryCard Component
 * Displays and manages provider inventory (LPG and CNG stock)
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplet, Fuel, Edit2, Check, X } from 'lucide-react';
import { toast } from 'react-toastify';

interface InventoryData {
  lpgStock: number;
  cngStock: number;
  totalStock: number;
  lastUpdated?: string;
}

interface InventoryCardProps {
  inventory: InventoryData | null;
  isLoading?: boolean;
  onUpdate?: (lpgStock: number, cngStock: number) => Promise<void>;
  businessType?: 'LPG' | 'CNG' | 'Both';
}

export default function InventoryCard({
  inventory,
  isLoading = false,
  onUpdate,
  businessType = 'Both',
}: InventoryCardProps) {
  const [editMode, setEditMode] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    lpgStock: inventory?.lpgStock ?? 0,
    cngStock: inventory?.cngStock ?? 0,
  });
  const [updating, setUpdating] = useState(false);

  const handleEditClick = () => {
    setFormData({
      lpgStock: inventory?.lpgStock ?? 0,
      cngStock: inventory?.cngStock ?? 0,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!onUpdate) {
      toast.warning('Update function not available');
      return;
    }

    if (formData.lpgStock < 0 || formData.cngStock < 0) {
      toast.error('Stock values cannot be negative');
      return;
    }

    setUpdating(true);
    try {
      await onUpdate(formData.lpgStock, formData.cngStock);
      setDialogOpen(false);
      setEditMode(false);
      toast.success('Inventory updated successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update inventory');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = () => {
    setDialogOpen(false);
    setEditMode(false);
  };

  const getLpgStatus = () => {
    const stock = inventory?.lpgStock ?? 0;
    if (stock <= 5) return { label: 'Critical', color: '#ef4444' };
    if (stock <= 10) return { label: 'Low', color: '#f59e0b' };
    if (stock <= 20) return { label: 'Medium', color: '#f97316' };
    return { label: 'Healthy', color: '#22c55e' };
  };

  const getCngStatus = () => {
    const stock = inventory?.cngStock ?? 0;
    if (stock <= 3) return { label: 'Critical', color: '#ef4444' };
    if (stock <= 8) return { label: 'Low', color: '#f59e0b' };
    if (stock <= 15) return { label: 'Medium', color: '#f97316' };
    return { label: 'Healthy', color: '#22c55e' };
  };

  const lpgStatus = getLpgStatus();
  const cngStatus = getCngStatus();

  if (isLoading) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
      </Paper>
    );
  }

  const maxLpg = 100;
  const maxCng = 60;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Paper
        sx={{
          p: 3,
          borderRadius: 2,
          background: '#ffffff',
          border: '1px solid #e8eef5',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography sx={{ fontSize: '18px', fontWeight: 700 }}>Inventory Management</Typography>
          {onUpdate && (
            <Button
              size="small"
              startIcon={<Edit2 size={16} />}
              onClick={handleEditClick}
              variant="outlined"
              sx={{ textTransform: 'none' }}
            >
              Update Stock
            </Button>
          )}
        </Box>

        {/* Inventory Items */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
          {/* LPG Stock */}
          {(businessType === 'LPG' || businessType === 'Both') && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <Paper
                sx={{
                  p: 2.5,
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: 2,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ p: 1, background: 'rgba(59, 130, 246, 0.2)', borderRadius: 1 }}>
                      <Droplet size={18} color="#3b82f6" />
                    </Box>
                    <Typography sx={{ fontWeight: 600 }}>LPG Stock</Typography>
                  </Box>
                  <Chip label={lpgStatus.label} size="small" sx={{ background: `${lpgStatus.color}20`, color: lpgStatus.color }} />
                </Box>

                <Box sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6' }}>
                      {inventory?.lpgStock ?? 0}
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: 'text.secondary' }}>
                      Max: {maxLpg} cylinders
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(((inventory?.lpgStock ?? 0) / maxLpg) * 100)}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      background: 'rgba(59, 130, 246, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        background: 'linear-gradient(90deg, #3b82f6, #2563eb)',
                      },
                    }}
                  />
                </Box>

                <Typography sx={{ fontSize: '11px', color: 'text.secondary' }}>
                  {((((inventory?.lpgStock ?? 0) / maxLpg) * 100).toFixed(1))}% utilized
                </Typography>
              </Paper>
            </motion.div>
          )}

          {/* CNG Stock */}
          {(businessType === 'CNG' || businessType === 'Both') && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <Paper
                sx={{
                  p: 2.5,
                  background: 'rgba(249, 115, 22, 0.1)',
                  border: '1px solid rgba(249, 115, 22, 0.3)',
                  borderRadius: 2,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ p: 1, background: 'rgba(249, 115, 22, 0.2)', borderRadius: 1 }}>
                      <Fuel size={18} color="#f97316" />
                    </Box>
                    <Typography sx={{ fontWeight: 600 }}>CNG Stock</Typography>
                  </Box>
                  <Chip label={cngStatus.label} size="small" sx={{ background: `${cngStatus.color}20`, color: cngStatus.color }} />
                </Box>

                <Box sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: '24px', fontWeight: 700, color: '#f97316' }}>
                      {inventory?.cngStock ?? 0}
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: 'text.secondary' }}>
                      Max: {maxCng} cylinders
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(((inventory?.cngStock ?? 0) / maxCng) * 100)}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      background: 'rgba(249, 115, 22, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        background: 'linear-gradient(90deg, #f97316, #ea580c)',
                      },
                    }}
                  />
                </Box>

                <Typography sx={{ fontSize: '11px', color: 'text.secondary' }}>
                  {((((inventory?.cngStock ?? 0) / maxCng) * 100).toFixed(1))}% utilized
                </Typography>
              </Paper>
            </motion.div>
          )}
        </Box>

        {/* Total Stock */}
        <Box
          sx={{
            mt: 2,
            p: 2,
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: 2,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ fontWeight: 600, color: 'text.secondary' }}>Total Stock</Typography>
            <Typography sx={{ fontSize: '20px', fontWeight: 700, color: '#8b5cf6' }}>
              {(inventory?.lpgStock ?? 0) + (inventory?.cngStock ?? 0)} cylinders
            </Typography>
          </Box>
        </Box>

        {/* Last Updated */}
        {inventory?.lastUpdated && (
          <Typography
            sx={{ fontSize: '11px', color: 'text.secondary', mt: 2, textAlign: 'right' }}
          >
            Last updated: {new Date(inventory.lastUpdated).toLocaleTimeString()}
          </Typography>
        )}
      </Paper>

      {/* Update Dialog */}
      <Dialog open={dialogOpen} onClose={handleCancel} maxWidth="sm" fullWidth>
        <DialogTitle>Update Inventory</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {businessType === 'LPG' || businessType === 'Both' ? (
            <TextField
              label="LPG Cylinders"
              type="number"
              fullWidth
              value={formData.lpgStock}
              onChange={(e) => setFormData({ ...formData, lpgStock: Math.max(0, parseInt(e.target.value) || 0) })}
              margin="normal"
              inputProps={{ min: 0, max: maxLpg }}
            />
          ) : null}

          {businessType === 'CNG' || businessType === 'Both' ? (
            <TextField
              label="CNG Cylinders"
              type="number"
              fullWidth
              value={formData.cngStock}
              onChange={(e) => setFormData({ ...formData, cngStock: Math.max(0, parseInt(e.target.value) || 0) })}
              margin="normal"
              inputProps={{ min: 0, max: maxCng }}
            />
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} disabled={updating}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={updating}
            startIcon={updating ? <CircularProgress size={18} /> : <Check size={18} />}
          >
            {updating ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
}
