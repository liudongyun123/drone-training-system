import React from 'react'
import {
  Box,
  TablePagination,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
} from '@mui/material'

interface AdminTablePaginationProps {
  total: number
  page: number
  rowsPerPage: number
  onPageChange: (page: number) => void
  onRowsPerPageChange: (rowsPerPage: number) => void
  rowsPerPageOptions?: number[]
}

export default function AdminTablePagination({
  total,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = [10, 25, 50, 100]
}: AdminTablePaginationProps) {
  const handleChangePage = (_event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    onPageChange(newPage)
  }

  const handleChangeRowsPerPage = (event: SelectChangeEvent<number>) => {
    onRowsPerPageChange(parseInt(event.target.value as string, 10))
    onPageChange(0)
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mt: 2 }}>
      <Typography variant="body2" sx={{ mr: 2 }}>
        共 {total} 条记录
      </Typography>

      <FormControl size="small" sx={{ mr: 2, minWidth: 120 }}>
        <InputLabel id="rows-per-page-label">每页显示</InputLabel>
        <Select
          labelId="rows-per-page-label"
          value={rowsPerPage}
          onChange={handleChangeRowsPerPage}
          label="每页显示"
        >
          {rowsPerPageOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {option} 条
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={rowsPerPageOptions}
        showFirstButton
        showLastButton
        labelDisplayedRows={({ from, to, count }) => {
          return `${from + 1}-${to} / ${count !== -1 ? count : `超过 ${to}`}`
        }}
        sx={{
          '.MuiTablePagination-toolbar': {
            pl: 0,
          },
          '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
            display: 'none',
          },
        }}
      />
    </Box>
  )
}
