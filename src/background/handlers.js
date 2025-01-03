import { REDIRECT_URL, STATUS } from '../common/constants.js';
import { getBaseUrl, getBlockMapFromStorage, saveBlockMapToStorage } from '../common/util.js';


export const findRuleFromTabId = async (tabId) => {
  const blockMap = await getBlockMapFromStorage();
  return Object.values(blockMap).find(rule => rule.tabs?.some(tab => tab.tabId === tabId));
}


export const handleTabClose = async (tabId) => {
  const currentTime = Date.now();
  const blockMap = await getBlockMapFromStorage();
  for (const rule of Object.values(blockMap)) {
    const tabIndex = rule.tabs?.findIndex(tab => tab.tabId === tabId);
    if (tabIndex >= 0) {
      let pastCumulativeTime = rule.pastCumulativeTime ?? 0;
      pastCumulativeTime += currentTime - rule.tabs[tabIndex].openedTime;
      rule.pastCumulativeTime = pastCumulativeTime;
      rule.tabs.splice(tabIndex, 1);
      await saveUpdatedRuleToStorage(rule);
      console.log("Tab " + tabId + " removed from domain " + rule.url + " only " + rule.tabs.length + " tabs remaining.");
    }
  };
};


/**
 * only this method has the right to update the rule status to EXPIRED
 * do not update the pastCumulativeTime, it should be done by the daily reset
 */
const isRuleExpired = async (rule) => {
  if (rule?.status === STATUS.EXPIRED) {
    return true;
  } else {
    const tabs = rule?.tabs ? rule.tabs : [];
    const currentTime = Date.now();
    const threshold = rule.threshold * 60 * 1000;
    const liveCumulativeTime = tabs.reduce((totalTime, tab) => totalTime + (currentTime - tab.openedTime), 0);
    const pastCumulativeTime = rule.pastCumulativeTime ?? 0;
    if ((liveCumulativeTime + pastCumulativeTime) >= threshold) {
      rule.status = STATUS.EXPIRED;
      await saveUpdatedRuleToStorage(rule);
      return true;
    }
    return false;
  }
}


const saveUpdatedRuleToStorage = async (rule) => {
  if (rule?.id) {
    const blockMap = await getBlockMapFromStorage();
    blockMap[rule.id] = rule;
    await saveBlockMapToStorage(blockMap);
  } else {
    console.error("Couldn't find an id for the given rule: " + rule);
  }
};

/**
 * redirect tab to the REDIRECT_URL
 * rule status should be updated to EXPIRED before calling this method
 * redirected tabs will later be removed by the clearnStorage method
 */
const redirectTab = (tabId) => {
  //TODO: what happens to the redirected tab after day is resetted ???? should we remove them from the database ??? or is it already handled ???? even if it is handled, we should remove them from the database
  chrome.tabs.update(tabId, { url: REDIRECT_URL }, (tab) => {
    if (chrome.runtime.lastError) {
      console.error(`Error updating tab: ${chrome.runtime.lastError.message}`);
    } else {
      console.log(`Tab ${tabId} updated to ${REDIRECT_URL} from ${tab.url} domain`);
    }
  });
}

//TODO: search url/domain and make sure every url is a baseUrl
export const findRuleFromUrl = async (url) => {
  const blockMap = await getBlockMapFromStorage();
  const baseUrl = getBaseUrl(url);
  return Object.values(blockMap).find(rule => rule.url.includes(baseUrl));
}


const addNewTabToRule = async (rule, tabId, windowId) => {
  const tabMetadata = {
    tabId: tabId,
    windowId: windowId,
    openedTime: Date.now()
  };
  if (rule.tabs?.length > 0) {  // TODO: error here, when a redirect link from youtube is clicked
    rule.tabs.push(tabMetadata);
    console.log("Opening " + rule.tabs.length + " tabs for the domain: ", rule.url);
  } else {
    rule.tabs = [tabMetadata];
    console.log("Opening first tab: " + tabId + " for the domain: ", rule.url);
  }
  await saveUpdatedRuleToStorage(rule);
};


export const handleNewTabOpen = async (tabId, windowId, rule) => {
  const ruleExpired = await isRuleExpired(rule);
  if (ruleExpired) {
    console.log("Rule for [" + rule.url + "] is expired, need to redirect");
    redirectTab(tabId);
  } else {
    addNewTabToRule(rule, tabId, windowId);
  }
}


export const handleWindowClose = async (windowId) => {
  const currentTime = Date.now();
  const blockMap = await getBlockMapFromStorage();

  for (const rule of Object.values(blockMap)) {
    const tabsToRemove = rule.tabs?.filter(tab => tab.windowId === windowId) ?? [];
    const remainingTabs = rule.tabs?.filter(tab => tab.windowId !== windowId) ?? [];
    let pastCumulativeTime = rule.pastCumulativeTime ?? 0;

    tabsToRemove.forEach(tab => {
      pastCumulativeTime += currentTime - tab.openedTime
      console.log("Tab " + tab.tabId + " removed from domain " + rule.url + " due to window being closed.");
    });

    rule.tabs = remainingTabs;
    rule.pastCumulativeTime = pastCumulativeTime;
    await saveUpdatedRuleToStorage(rule);
    console.log("Remaining tab count for domain " + rule.url + " is ", remainingTabs.length);
  };
};


export const handleTabWindowChange = async (tabId, newWindowId) => {
  const blockMap = await getBlockMapFromStorage();
  for (const rule of Object.values(blockMap)) {
    const matchingTab = rule.tabs?.find(tab => tab.tabId === tabId);
    if (matchingTab) {
      const oldWindowId = matchingTab.windowId;
      matchingTab.windowId = newWindowId;
      console.log(`Tab ${tabId} was moved from window ${oldWindowId} to window ${newWindowId}`);
      await saveUpdatedRuleToStorage(rule);
      break;
    }
  }
};

//TODO: handle undfined tabs in a better way
export const checkForExpiredDomains = () => {
  getBlockMapFromStorage().then(blockMap => {
    Object.values(blockMap).forEach(async rule => {
      const ruleExpired = await isRuleExpired(rule);
      if (ruleExpired) {
        console.log("Domain: " + rule.url + " is expired, need to redirect tabs");
        rule?.tabs?.forEach(tab => {
          redirectTab(tab.tabId);
          // what is there is a connection error, or the tab is not redirected for some reason, what should be done then
        });
      }
      await cleanUnnecessaryTabs();
    });
  });
};


/**
 * clean redirected tabs from the storage
 * (and remove any outliers)
 * update only tabs, don't touch pastCumulativeTime or status here
 */
export const cleanUnnecessaryTabs = async () => {
  const blockMap = await getBlockMapFromStorage();
  for (const rule of Object.values(blockMap)) {
    const tabs = rule.tabs ?? [];
    if (rule.status === STATUS.EXPIRED) {
      tabs = []; // race condition here ?????
    }
    for (const tab of tabs) {
      chrome.tabs.get(tab.tabId, (tabInfo) => {
        if (chrome.runtime.lastError) {
          console.error(`Error retrieving tab: ${chrome.runtime.lastError.message}`);
          // remove tab from rule data, tab does not exists, but how to check actual error is because of tab not existing
        } else {
          console.log(`Tab ID: ${tab.tabId}, URL: ${tabInfo.url}`);
          // if tabUrl is the rule.tab.url then -> ok, otherwise remove the tab from the rule
        }
      });
    }
  }
  await saveBlockMapToStorage(blockMap);
};


export const timeUntilMidnight = () => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(23, 59, 59, 0);
  if (now > midnight) {
    midnight.setDate(midnight.getDate() + 1);
  }
  return midnight - now;
};


/**
 * only this method has the right to reset the rule data
 * (including pastCumulativeTime and status)
 */
export const doPeriodicReset = (metadataStore) => {
  console.log("Performing daily reset...");
  metadataStore.forEach(metadata => {
    if (metadata.status === STATUS.EXPIRED) {
      metadata.status = STATUS.LIVE;

      // just to make sure
      metadata.tabs = [];
      metadata.pastCumulativeTime = 0;
    } else {
      const now = new Date();
      metadata.tabs.forEach(tab => tab.openedTime = now);
      metadata.pastCumulativeTime = 0;
    }
  });
}