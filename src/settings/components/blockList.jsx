import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import { Button, Container, Grid2, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { getBlockMapFromStorage, resetBlockMapForDev } from '../../common/util';
import RemoveConfirmationDialog from './removeConfirmationDialog';
import RuleDialog from './RuleDialog';
import useSharedData from './useSharedData';


const BlockList = () => {
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const { rows, setRows, setId } = useSharedData();


  useEffect(() => {
    // resetBlockMapForDev();
    getBlockMapFromStorage().then((blockMap) => {
      setRows(Object.values(blockMap));
    });
  }, []);


  const handleNewRuleClick = () => {
    setRuleDialogOpen(true);
  };


  const handleDeleteClick = (row) => {
    setId(row.id);
    setConfirmationOpen(true);
  };


  return (
    <>
      <Container sx={{ p: 2, borderRadius: 2, backgroundColor: 'white' }}>
        <Grid2 container spacing={0}>
          <Grid2 size={12} sx={{ mb: 2 }}>
            <Typography variant='h6'>Block List</Typography>
            <Typography variant='body2'>Manage websites you want to restrict</Typography>
          </Grid2>

          <Grid2 size={12} sx={{}}>
            <Button
              variant='outlined'
              color='primary'
              size='small'
              startIcon={<AddOutlinedIcon />}
              onClick={handleNewRuleClick}
            >
              Add Website
            </Button>
          </Grid2>

          <Grid2 size={12}>
            {(rows.length > 0) ? (
              <TableContainer component={Paper} sx={{ my: 3, maxHeight: 500 }}>
                <Table stickyHeader>
                  <TableHead >
                    <TableRow>
                      <TableCell></TableCell>
                      <TableCell>Website URL</TableCell>
                      <TableCell align='right'>Time Threshold</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <PublicOutlinedIcon />
                        </TableCell>
                        <TableCell>{row.url}</TableCell>
                        <TableCell align='right'>{row.threshold} mins</TableCell>
                        <TableCell align='right'>
                          <IconButton
                            size='small'
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteClick(row)
                            }}
                          >
                            <DeleteOutlinedIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant='body2' sx={{ my: 3 }}>
                No websites are added to the block list
              </Typography>
            )}
          </Grid2>
        </Grid2>
      </Container>


      <RuleDialog
        dialogOpen={ruleDialogOpen}
        setDialogOpen={setRuleDialogOpen}
      />

      <RemoveConfirmationDialog
        dialogOpen={confirmationOpen}
        setDialogOpen={setConfirmationOpen}
      />
    </>
  );
};

export default BlockList;