import { Box, Container, Grid2, LinearProgress, Paper, Stack, Typography } from '@mui/material';

import React, { useEffect, useState } from 'react';
import { getBlockMapFromStorage, getHostFromUrl } from '../../common/util';

const Usage = () => {
  const [usageHistory, setUsageHistory] = useState([]);

  useEffect(() => {
    getBlockMapFromStorage().then((blockMap) => {
      deriveUsageHistory(blockMap);
    });
  }, []);

  const deriveUsageHistory = (blockMap) => {
    const usageHistory = [];
    for (const rule of Object.values(blockMap)) {
      const tabs = rule.tabs ?? [];
      const currentTime = Date.now();
      const threshold = rule.threshold;
      const liveCumulativeTime = tabs.reduce((totalTime, tab) => totalTime + (currentTime - tab.openedTime), 0);
      const pastCumulativeTime = rule.pastCumulativeTime ?? 0;
      const totalCumulativeTime = Math.round((liveCumulativeTime + pastCumulativeTime) / (1000 * 60));
      const hostUrl = getHostFromUrl(rule.url);

      const usageSummary = { url: hostUrl, completed: totalCumulativeTime, total: threshold };
      usageHistory.push(usageSummary);
    }
    setUsageHistory(usageHistory);
  };

  return (
    <Container sx={{ p: 2, borderRadius: 2, backgroundColor: 'white' }}>
      <Grid2 container spacing={0}>
        <Grid2 size={12} sx={{ mb: 2 }}>
          <Typography variant='h6'>Usage</Typography>
          <Typography variant='body2'>View the usage history for the defined rules</Typography>
        </Grid2>

        <Grid2 size={12} sx={{ my: 2 }}>
          <Stack spacing={3}>
            {usageHistory.map((usage, index) => (
              <Paper key={index} sx={{ p: 2 }} variant="outlined">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant='body1'>{usage.url}</Typography>
                  <Typography variant='body2'>{`${usage.completed.toFixed(2)} / ${usage.total} minutes completed`}</Typography>
                </Box>
                <LinearProgress variant="determinate" value={(usage.completed / usage.total) * 100} />
              </Paper>
            ))}
          </Stack>
        </Grid2>
      </Grid2>
    </Container>
  );
};

export default Usage;