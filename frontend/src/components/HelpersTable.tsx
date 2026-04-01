/**
 * HelpersTable Component
 * Displays provider's helpers with their performance metrics
 */

import React, { useState } from 'react';
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
  Avatar,
  Typography,
  CircularProgress,
  Rating,
  Tooltip,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { User, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';

const MotionTableRow = motion(TableRow);

interface Helper {
  helperId: string;
  fullName: string;
  phone: string;
  rating: number;
  totalRequests: number;
  completedRequests: number;
  isAvailable: boolean;
  currentActive: number;
}

interface HelpersTableProps {
  helpers: Helper[] | null;
  total?: number;
  isLoading?: boolean;
  page?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}

export default function HelpersTable({
  helpers,
  total = 0,
  isLoading = false,
  page = 0,
  limit = 20,
  onPageChange,
  onLimitChange,
}: HelpersTableProps) {
  const getAvailabilityStatus = (isAvailable: boolean) => {
    return isAvailable
      ? { label: 'Available', color: '#10b981', icon: CheckCircle }
      : { label: 'Unavailable', color: '#ef4444', icon: AlertCircle };
  };

  if (isLoading) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2, color: 'text.secondary' }}>Loading helpers...</Typography>
      </Paper>
    );
  }

  if (!helpers || helpers.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center', background: '#ffffff', border: '1px solid #e8eef5' }}>
        <Typography color="text.secondary" sx={{ fontSize: '16px' }}>
          No helpers found
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
        <TableContainer sx={{ borderRadius: 1.5, mb: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ background: '#f9fafb' }}>
                <TableCell sx={{ fontWeight: 700, color: '#374151' }}>Helper</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#374151' }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#374151' }} align="center">
                  Rating
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#374151' }} align="center">
                  Completed
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#374151' }} align="center">
                  Total
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#374151' }} align="center">
                  Success Rate
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#374151' }} align="center">
                  Status
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#374151' }} align="center">
                  Active Now
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <AnimatePresence>
                {helpers.map((helper, index) => {
                  const successRate =
                    helper.totalRequests > 0
                      ? Math.round((helper.completedRequests / helper.totalRequests) * 100)
                      : 0;
                  const statusInfo = getAvailabilityStatus(helper.isAvailable);
                  const StatusIcon = statusInfo.icon;

                  return (
                    <MotionTableRow
                      key={helper.helperId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      sx={{
                        '&:hover': { background: '#f3f4f6' },
                        borderBottom: '1px solid #e5e7eb',
                      }}
                    >
                      <TableCell sx={{ fontSize: '13px' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32, background: '#8b5cf6' }}>
                            {helper.fullName.charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography sx={{ fontSize: '13px', fontWeight: 500 }}>
                            {helper.fullName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: '12px', fontFamily: 'monospace', color: 'text.secondary' }}>
                        {helper.phone}
                      </TableCell>
                      <TableCell align="center">
                        <Rating value={helper.rating} readOnly size="small" />
                        <Typography sx={{ fontSize: '11px', color: 'text.secondary', mt: 0.5 }}>
                          {helper.rating.toFixed(1)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Completed requests">
                          <Chip
                            label={helper.completedRequests}
                            size="small"
                            sx={{
                              background: '#22c55e20',
                              color: '#22c55e',
                              fontWeight: 600,
                            }}
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center">
                        <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>
                          {helper.totalRequests}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          <Box
                            sx={{
                              width: 40,
                              height: 6,
                              background: 'rgba(255,255,255,0.1)',
                              borderRadius: 3,
                              overflow: 'hidden',
                            }}
                          >
                            <Box
                              sx={{
                                width: `${successRate}%`,
                                height: '100%',
                                background: successRate >= 80 ? '#22c55e' : successRate >= 60 ? '#f59e0b' : '#ef4444',
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </Box>
                          <Typography sx={{ fontSize: '11px', minWidth: '25px', textAlign: 'right' }}>
                            {successRate}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          <StatusIcon size={16} color={statusInfo.color} />
                          <Chip
                            label={statusInfo.label}
                            size="small"
                            sx={{
                              background: `${statusInfo.color}20`,
                              color: statusInfo.color,
                              fontSize: '10px',
                              fontWeight: 600,
                            }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        {helper.currentActive > 0 ? (
                          <Tooltip title={`${helper.currentActive} active request(s)`}>
                            <Chip
                              icon={<TrendingUp size={14} />}
                              label={helper.currentActive}
                              size="small"
                              sx={{
                                background: '#ef444420',
                                color: '#ef4444',
                                fontWeight: 600,
                              }}
                            />
                          </Tooltip>
                        ) : (
                          <Typography sx={{ fontSize: '12px', color: 'text.secondary' }}>-</Typography>
                        )}
                      </TableCell>
                    </MotionTableRow>
                  );
                })}
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
