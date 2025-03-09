import { Container, Grid2, ThemeProvider } from '@mui/material';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { COLORS } from '../common/constants';
import About from './components/about';
import BlockList from './components/blockList';
import theme from './theme';
import SidePane from './components/sidePane';
import Usage from './components/usage';

function Settings() {
  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <Container disableGutters maxWidth={false} sx={{ height: '100vh', backgroundColor: COLORS.BACKGROUND }}>
          <Grid2 container spacing={0} sx={{ height: '100%' }}>
            <Grid2 size={2} sx={{ height: '100%' }}>
              <SidePane />
            </Grid2>
            <Grid2 size={10} sx={{ height: '100%', p: 2 }}>
              <Routes>
                <Route path="/about" element={<About />} />
                <Route path="*" element={<BlockList />} />
                <Route path="/usage" element={<Usage />} />
              </Routes>
            </Grid2>
          </Grid2>
        </Container>
      </BrowserRouter>
    </ThemeProvider>
  );
}

const root = createRoot(document.getElementById('settings-root'));
root.render(<Settings />);

if (module.hot) {
  module.hot.accept();
}