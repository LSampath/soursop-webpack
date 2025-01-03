import { useState } from 'react';
import { useBetween } from 'use-between';
import { DEFAULT_ID, DEFAULT_THRESHOLD } from '../../common/constants';

const sharedData = () => {
  const [rows, setRows] = useState([]);
  const [url, setUrl] = useState('');
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [id, setId] = useState(DEFAULT_ID);

  return {
    rows, setRows,
    url, setUrl,
    threshold, setThreshold,
    id, setId,
  };
};

const useSharedData = () => useBetween(sharedData);
export default useSharedData;