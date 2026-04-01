import React, { useMemo, useCallback } from 'react';
// @ts-ignore
import { FixedSizeList as List } from 'react-window';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Skeleton,
  Box,
} from '@mui/material';
import { motion } from 'framer-motion';

interface Column {
  id: string;
  label: string;
  width: number;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: any) => React.ReactNode;
}

interface VirtualizedTableProps {
  columns: Column[];
  rows: any[];
  height?: number;
  itemSize?: number;
  loading?: boolean;
}

/**
 * VirtualizedDataTable Component
 * Uses react-window for rendering large lists efficiently
 * Only renders visible rows, reducing memory usage and improving performance
 */
export function VirtualizedDataTable({
  columns,
  rows,
  height = 600,
  itemSize = 53,
  loading = false,
}: VirtualizedTableProps) {
  const totalWidth = useMemo(() => columns.reduce((sum, col) => sum + col.width, 0), [columns]);

  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const row = rows[index];

      return (
        <motion.div
          style={style}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <TableRow
            sx={{
              display: 'flex',
              width: '100%',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
            }}
          >
            {columns.map((column) => (
              <TableCell
                key={column.id}
                sx={{
                  width: column.width,
                  flex: `0 0 ${column.width}px`,
                  textAlign: column.align || 'left',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {column.render ? column.render(row[column.id], row) : row[column.id]}
              </TableCell>
            ))}
          </TableRow>
        </motion.div>
      );
    },
    [rows, columns]
  );

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} height={53} sx={{ mb: 1 }} />
        ))}
      </Box>
    );
  }

  if (rows.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
        No data available
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ height: height + 60 }}>
      <Table stickyHeader sx={{ display: 'flex', flexDirection: 'column' }}>
        <TableHead>
          <TableRow
            sx={{
              display: 'flex',
              width: '100%',
              backgroundColor: '#f5f5f5',
              borderBottom: '2px solid #ddd',
            }}
          >
            {columns.map((column) => (
              <TableCell
                key={column.id}
                sx={{
                  width: column.width,
                  flex: `0 0 ${column.width}px`,
                  fontWeight: 600,
                  textAlign: column.align || 'left',
                  backgroundColor: '#f5f5f5',
                }}
              >
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody sx={{ flex: 1 }}>
          <List
            height={height}
            itemCount={rows.length}
            itemSize={itemSize}
            width="100%"
          >
            {Row}
          </List>
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/**
 * Example usage:
 * 
 * const columns = [
 *   { id: 'id', label: 'ID', width: 100 },
 *   { id: 'name', label: 'Name', width: 200 },
 *   { id: 'email', label: 'Email', width: 250 },
 * ];
 * 
 * <VirtualizedDataTable
 *   columns={columns}
 *   rows={largeDataset}
 *   height={600}
 *   itemSize={53}
 *   loading={isLoading}
 * />
 */
