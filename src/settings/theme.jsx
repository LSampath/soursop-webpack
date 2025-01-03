import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#478778',
    },
    secondary: {
      main: '#C4B454',
    },
  },
  typography: {
    fontSize: 12,
    fontFamily: 'Poppins, Roboto, sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

export default theme;