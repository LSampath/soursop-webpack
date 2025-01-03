import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import React from 'react';
import { DEFAULT_ID } from '../../common/constants';
import { getBlockMapFromStorage, saveBlockMapToStorage } from '../../common/util';
import useSharedData from './useSharedData';

const RemoveConfirmationDialog = ({ dialogOpen, setDialogOpen }) => {
  const { id, setId, setRows } = useSharedData();

  const handleConfirmationClose = () => {
    setDialogOpen(false);
  };

  const handelRuleRemoveClick = async () => {
    if (id > 0) {
      const blockMap = await getBlockMapFromStorage();
      if (blockMap?.[id]) {
        delete blockMap[id];
        await saveBlockMapToStorage(blockMap);
        setRows(Object.values(blockMap));
        setId(DEFAULT_ID);
      }
    };
    setDialogOpen(false);
  }

  return (
    <Dialog
      open={dialogOpen}
      onClose={handleConfirmationClose}
    >
      <DialogTitle>Wait a moment ..!</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Removing this site may hurt your focus. Are you sure about this?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button
          variant='outlined'
          color="primary"
          onClick={handleConfirmationClose}
        >
          Stay Focused
        </Button>
        <Button
          variant='outlined'
          color="warning"
          onClick={handelRuleRemoveClick}
        >
          Remove
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RemoveConfirmationDialog;