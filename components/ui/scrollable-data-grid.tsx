'use client'

import { DataGrid, DataGridProps } from '@mui/x-data-grid'
import Box from '@mui/material/Box'

interface ScrollableDataGridProps extends DataGridProps {
  scrollAmount?: number
}

export function ScrollableDataGrid({ 
  sx,
  ...props 
}: ScrollableDataGridProps) {
  return (
    <Box 
      sx={{ 
        width: '100%',
        '& .MuiDataGrid-root': {
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
        },
      }}
    >
      <DataGrid
        {...props}
        sx={{
          '& .MuiDataGrid-cell': {
            borderColor: '#f3f4f6',
          },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: '#f9fafb',
          },
          ...sx,
        }}
      />
    </Box>
  )
}
