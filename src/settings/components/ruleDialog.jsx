import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid2, Slider, Snackbar, TextField, Typography } from '@mui/material';
import React, { useState } from 'react';
import { DEFAULT_ID, DEFAULT_THRESHOLD } from '../../common/constants';
import { getBaseUrl, getBlockMapFromStorage, getNextId, isValidUrl, saveBlockMapToStorage } from '../../common/util';
import useSharedData from './useSharedData';


const ALREADY_EXISTS_ALERT = "Sorry, the provided URL is already in the list.";
const CANNOT_UPDATE_ALERT = "Sorry, cannot update an existing rule.";

const RuleDialog = ({ dialogOpen, setDialogOpen }) => {
  const { url, setUrl, threshold, setThreshold, id, setId, setRows } = useSharedData();
  const [urlError, setUrlError] = useState(false);
  const [urlErrorText, setUrlErrorText] = useState('');
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState(ALREADY_EXISTS_ALERT);


  const handleAlertClose = () => {
    setAlertOpen(false);
  };


  const handleThresholdChange = (e) => {
    setThreshold(e.target.value);
    //TODO: do we need validations or type conversions here ??
  };


  const handleUrlChange = (e) => {
    const url = e.target.value;
    setUrl(url);
    if (e.target.validity.valid) {
      if (isValidUrl(url)) {
        setUrlError(false);
        setUrlErrorText('');
      } else {
        setUrlError(true);
        setUrlErrorText('Please provide an valid URL');
      }
    } else {
      setUrlError(true);
      setUrlErrorText('Please provide an URL');
    }
  };


  const handleAddClick = async () => {
    await saveNewRule();
    setDialogOpen(false);
    setUrl('');
    setThreshold(DEFAULT_THRESHOLD);
    setId(DEFAULT_ID);
  };


  const handleRuleDialogClose = () => {
    setUrl('');
    setThreshold(DEFAULT_THRESHOLD);
    setId(DEFAULT_ID);
    setDialogOpen(false);
  };


  const saveNewRule = async () => {
    const baseUrl = getBaseUrl(url);
    const blockMap = await getBlockMapFromStorage();
    if (Number.isInteger(id)) {
      if (id in blockMap) {
        setAlertMessage(CANNOT_UPDATE_ALERT);
        setAlertOpen(true);
      } else {
        if (Object.values(blockMap).some(block => block.url === baseUrl)) {
          setAlertMessage(ALREADY_EXISTS_ALERT);
          setAlertOpen(true);
          return;
        } else {
          const newId = getNextId(blockMap);
          blockMap[newId] = { id: newId, url: baseUrl, threshold: threshold };
          await saveBlockMapToStorage(blockMap);
          setRows(Object.values(blockMap))
        }
      }
    }
  };


  return (
    <>
      <Dialog
        open={dialogOpen}
        onClose={handleRuleDialogClose}
      >
        <DialogTitle>
          Add new rule
        </DialogTitle>
        <DialogContent>
          <Grid2 container spacing={2} sx={{ minWidth: 500 }}>
            <Grid2 size={12}>
              <Typography gutterBottom >Website URL</Typography>
              <TextField
                required
                name="url"
                type="text"
                value={url}
                error={urlError}
                helperText={urlErrorText}
                onChange={handleUrlChange}
                fullWidth
                variant="outlined"
                size='small'
              />
            </Grid2>
            <Grid2 size={12}>
              <Typography>Time threashold (mins)</Typography>
              <Slider
                size='small'
                step={15}
                defaultValue={DEFAULT_THRESHOLD}
                valueLabelDisplay="auto"
                value={threshold}
                onChange={handleThresholdChange}
                min={0}
                max={180}
              />
            </Grid2>
          </Grid2>
        </DialogContent>
        <DialogActions sx={{ mx: 2 }}>
          <Button
            disabled={urlError || !url}
            variant='outlined'
            color="primary"
            onClick={handleAddClick}
          >
            Add
          </Button>
          <Button
            variant='outlined'
            color="warning"
            onClick={handleRuleDialogClose}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={alertOpen}
        autoHideDuration={5000}
        onClose={handleAlertClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity="error"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {alertMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default RuleDialog;