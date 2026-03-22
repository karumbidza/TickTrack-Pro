'use client'

import { createTheme, ThemeProvider, Theme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { ReactNode } from 'react'

// Extend theme type to include DataGrid
declare module '@mui/material/styles' {
  interface Components {
    MuiDataGrid?: {
      styleOverrides?: {
        root?: React.CSSProperties | Record<string, unknown>
        columnHeaders?: React.CSSProperties | Record<string, unknown>
        columnHeader?: React.CSSProperties | Record<string, unknown>
        row?: React.CSSProperties | Record<string, unknown>
        cell?: React.CSSProperties | Record<string, unknown>
      }
    }
  }
}

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2a2825',
      light: '#4a4843',
      dark: '#1a1916',
    },
    secondary: {
      main: '#6b6860',
      light: '#9e9c94',
      dark: '#4a4843',
    },
    success: {
      main: '#2d6a4f',
      light: '#6ee7b7',
      dark: '#064e3b',
    },
    warning: {
      main: '#92400e',
      light: '#fcd34d',
      dark: '#78350f',
    },
    error: {
      main: '#991b1b',
      light: '#fca5a5',
      dark: '#7f1d1d',
    },
    background: {
      default: '#f7f6f3',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: "'DM Sans', sans-serif",
    h1: { fontWeight: 300, letterSpacing: '-0.04em' },
    h2: { fontWeight: 300, letterSpacing: '-0.03em' },
    h3: { fontWeight: 300, letterSpacing: '-0.025em' },
    h4: { fontWeight: 300, letterSpacing: '-0.025em' },
    h5: { fontWeight: 400 },
    h6: { fontWeight: 400 },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 'none',
          '& .MuiDataGrid-cell:focus': { outline: 'none' },
          '& .MuiDataGrid-cell:focus-within': { outline: 'none' },
          '& .MuiDataGrid-columnHeader:focus': { outline: 'none' },
          '& .MuiDataGrid-columnHeader:focus-within': { outline: 'none' },
        },
        columnHeaders: {
          backgroundColor: 'var(--surface2)',
          borderBottom: '1px solid var(--border)',
        },
        columnHeader: {
          fontWeight: 500,
          color: 'var(--text-secondary)',
          fontFamily: "'DM Mono', monospace",
          fontSize: '11px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        },
        row: {
          '&:hover': { backgroundColor: 'var(--surface2)' },
        },
        cell: {
          borderBottom: '1px solid var(--border)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500 },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
  },
})

interface MUIThemeProviderProps {
  children: ReactNode
}

export function MUIThemeProvider({ children }: MUIThemeProviderProps) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  )
}
