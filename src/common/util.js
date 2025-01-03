import { STORAGE_KEYS } from "./constants";


export const getNextId = (blockMap) => {
  const keys = Object.keys(blockMap).map(key => parseInt(key, 10));
  const maxId = keys.length === 0 ? 0 : Math.max(...keys);
  return maxId + 1;
};


export const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};


export const getBaseUrl = (url) => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.origin;
  } catch (error) {
    return url;
  }
};


export const getBlockMapFromStorage = async () => {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(STORAGE_KEYS.BLOCK_MAP, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError));
      } else {
        const blockMap = result[STORAGE_KEYS.BLOCK_MAP] || {};
        resolve(blockMap);
      }
    });
  });
};


export const saveBlockMapToStorage = (blockMap) => {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ [STORAGE_KEYS.BLOCK_MAP]: blockMap }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError));
      } else {
        resolve();
      }
    });
  });
};


export const resetBlockMapForDev = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.clear(() => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError));
      } else {
        resolve();
      }
    });
  });
}


