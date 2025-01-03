import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { Box, Button, Stack, Typography } from '@mui/material';
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { COLORS } from '../../common/constants';

const SidePane = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getButtonStyles = (path) => ({
    width: '100%',
    justifyContent: 'flex-start',
    color: location.pathname === path ? COLORS.DARK_GREEN : COLORS.BLACK,
    fontWeight: location.pathname === path ? 'bold' : 'normal',
    border: `1px solid ${COLORS.BACKGROUND}`,
    borderColor: location.pathname === path ? COLORS.DARK_GREEN : COLORS.BACKGROUND
  });

  const handleNavigationClick = (path) => () => {
    navigate(`/${path}`);
  };

  return (
    <Stack spacing={0} sx={{ p: 2 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ color: COLORS.DARK_GREEN, fontWeight: 'bold' }}>
          Digital Detox
        </Typography>
        <Typography variant="body2">Version 1.0.0</Typography>
      </Box>
      <Box>
        <Button
          variant="text"
          onClick={handleNavigationClick('')}
          sx={getButtonStyles('/')}
          startIcon={<BlockOutlinedIcon />}
        >
          Block list
        </Button>
      </Box>
      <Box>
        <Button
          variant="text"
          disabled
          sx={getButtonStyles('/history')}
          startIcon={<BarChartOutlinedIcon />}
        >
          Usage history
        </Button>
      </Box>
      <Box>
        <Button
          variant="text"
          disabled
          sx={getButtonStyles('/settings')}
          startIcon={<SettingsOutlinedIcon />}
        >
          Settings
        </Button>
      </Box>
      <Box>
        <Button
          variant="text"
          onClick={handleNavigationClick('about')}
          sx={getButtonStyles('/about')}
          startIcon={<InfoOutlinedIcon />}
        >
          About
        </Button>
      </Box>
    </Stack>
  );
};

export default SidePane;