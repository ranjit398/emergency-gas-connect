/**
 * RequestsTable Component
 * Displays provider's requests in a detailed table with status and details
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Button,
  Typography,
  CircularProgress,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Eye, MapPin, Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-toastify';

const MotionTableRow = motion(TableRow);

interface Request {
  requestId: string;
  cylinderType: 'LPG' | 'CNG';
  status: string;
  quantity: number;
  address: string;
  seekerEmail: string;
  helperName: string;
  helperRating: number;
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

interface RequestsTableProps {
  requests: Request[] | null;
  total?: number;
  isLoading?: boolean;
  page?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  onStatusFilter?: (status: string) => void;
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: '#fef3c7', text: '#92400e', label: 'Pending' },
  accepted: { bg: '#dbeafe', text: '#1e40af', label: 'Accepted' },
  in_progress: { bg: '#fecaca', text: '#7f1d1d', label: 'In Progress' },
  completed: { bg: '#dcfce7', text: '#15803d', label: 'Completed' },
  cancelled: { bg: '#f3f4f6', text: '#374151', label: 'Cancelled' },
};

const priorityColors: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#10b981',
};

export default function RequestsTable({
  requests,
  total = 0,
  isLoading = false,
  page = 0,
  limit = 20,
  onPageChange,
  onLimitChange,
  onStatusFilter,
}: RequestsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);

  useEffect(() => {
    if (!requests) return;

    let filtered = requests;

    if (searchTerm) {
      filtered = filtered.filter(
        (req) =>
          req.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
          req.seekerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
          req.helperName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredRequests(filtered);
  }, [requests, searchTerm]);

  const handleStatusChange = (event: any) => {
    const value = event.target.value;
    setStatusFilter(value);
    onStatusFilter?.(value === 'all' ? '' : value);
  };

  if (isLoading) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center', background: '#ffffff', border: '1px solid #e8eef5' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2, color: 'text.secondary' }}>Loading requests...</Typography>
      </Paper>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center', background: '#ffffff', border: '1px solid #e8eef5' }}>
        <Typography color="text.secondary" sx={{ fontSize: '16px' }}>
          No requests found
        </Typography>
      </Paper>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Paper
        sx={{
          p: 2.5,
          borderRadius: 2,
          background: '#ffffff',
          border: '1px solid #e8eef5',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        }}
      >
        {/* Filters */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
            mb: 2,
          }}
        >
          <TextField
            placeholder="Search by address, seeker, or helper..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                background: '#ffffff',
                borderColor: '#e8eef5',
              },
            }}
          />
          <FormControl size="small" fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={handleStatusChange}
              sx={{
                background: '#ffffff',
                borderColor: '#e8eef5',
              }}
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="accepted">Accepted</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Table */}
        <TableContainer sx={{ borderRadius: 1.5, mb: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ background: '#f9fafb' }}>
                <TableCell sx={{ fontWeight: 700, color: '#374151' }}>Request ID</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#374151' }}>Cylinder</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#374151' }}>Seeker</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#374151' }}>Helper</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#374151' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#374151' }}>Priority</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#374151' }}>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <AnimatePresence>
                {filteredRequests.map((request, index) => (
                  <MotionTableRow
                    key={request.requestId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    sx={{
                      '&:hover': { background: '#f3f4f6' },
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    <TableCell sx={{ fontSize: '12px', fontFamily: 'monospace', color: '#3b82f6' }}>
                      {request.requestId.substring(0, 12)}...
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${request.quantity} ${request.cylinderType}`}
                        size="small"
                        sx={{
                          background: request.cylinderType === 'LPG' ? '#3b82f620' : '#f9731620',
                          color: request.cylinderType === 'LPG' ? '#3b82f6' : '#f97316',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '13px' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <User size={14} />
                        {request.seekerEmail.split('@')[0]}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: '13px' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {request.helperName}
                        {request.helperRating > 0 && (
                          <Chip
                            label={request.helperRating.toFixed(1)}
                            size="small"
                            sx={{ fontSize: '11px', height: '20px' }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={statusColors[request.status]?.label || request.status}
                        size="small"
                        sx={{
                          background: statusColors[request.status]?.bg || '#f3f4f6',
                          color: statusColors[request.status]?.text || '#374151',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={request.priority.toUpperCase()}
                        size="small"
                        sx={{
                          background: `${priorityColors[request.priority]}20`,
                          color: priorityColors[request.priority],
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '12px', color: 'text.secondary' }}>
                      {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                    </TableCell>
                  </MotionTableRow>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[10, 20, 50]}
          component="div"
          count={total}
          rowsPerPage={limit}
          page={page}
          onPageChange={(_, newPage) => onPageChange?.(newPage)}
          onRowsPerPageChange={(e) => onLimitChange?.(parseInt(e.target.value))}
          sx={{
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              margin: 0,
            },
          }}
        />
      </Paper>
    </motion.div>
  );
}
