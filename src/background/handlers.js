import { ONE_DAY, REDIRECT_URL, STATUS } from '../common/constants.js';
import { getBaseUrl, getBlockMapFromStorage, saveBlockMapToStorage } from '../common/util.js';

/**
 * Object formats
 * 
 * blockMap = {
 *    <id>: {
 *        id: <integer id starting from 1>,
 *        url: <base url>,
 *        threshold: <minutes in integer>,
 *        status: <LIVE or EXPIRED>,
 *        tabs: <array of tab objects>,
 *        pastCumulativeTime: <time in milliseconds>,
 *        lastResetTime: <daily reset timestamp in milliseconds>
 *    },
 *    <id_2>: <rule_2>,
 *    ...
 * }
 * 
 * tab = {
 *    tabId: <integer>,
 *    windowId: <integer>,
 *    openedTime: <tab open timestamp in milliseconds>
 * }
 */


export const findRuleFromTabId = async (tabId) => {
  const blockMap = await getBlockMapFromStorage();
  return Object.values(blockMap).find(rule => rule.tabs?.some(tab => tab.tabId === tabId));
}


/**
 * update pastCumulativeTime for rule and remove the tab rule.tabs array
 */
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
 * and update the pastCumulativeTime
 */
const isRuleExpired = async (rule) => {
  if (rule?.status === STATUS.EXPIRED) {
    return true;
  } else {
    const tabs = rule.tabs ?? [];
    const currentTime = Date.now();
    const threshold = rule.threshold * 60 * 1000;
    const liveCumulativeTime = tabs.reduce((totalTime, tab) => totalTime + (currentTime - tab.openedTime), 0);
    const pastCumulativeTime = rule.pastCumulativeTime ?? 0;
    if ((liveCumulativeTime + pastCumulativeTime) >= threshold) {
      rule.status = STATUS.EXPIRED;
      rule.pastCumulativeTime = liveCumulativeTime + pastCumulativeTime;
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
  chrome.tabs.update(tabId, { url: REDIRECT_URL }, (tab) => {
    if (chrome.runtime.lastError) {
      console.error(`Error updating tab: ${chrome.runtime.lastError.message}`);
    } else {
      console.log(`Tab ${tabId} updated to ${REDIRECT_URL} from ${tab.url} domain`);
    }
  });
}


export const findRuleFromUrl = async (url) => {
  const blockMap = await getBlockMapFromStorage();
  const baseUrl = getBaseUrl(url);
  return Object.values(blockMap).find(rule => rule.url === baseUrl);
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


/**
 * if the rule is expired, redirect all tabs from the same rule
 */
export const handleNewTabOpen = async (tabId, windowId, rule) => {
  const ruleExpired = await isRuleExpired(rule);
  if (ruleExpired) {
    console.log("Rule for [" + rule.url + "] is expired, need to redirect.");
    const tabs = rule.tabs ?? [];
    tabs.forEach(tab => redirectTab(tab.tabId));
  } else {
    addNewTabToRule(rule, tabId, windowId);
  }
}


/**
 * update pastCumulativeTime for rule and remove corresponding tabs from the rule.tabs array
 */
export const handleWindowClose = async (windowId) => {
  const currentTime = Date.now();
  const blockMap = await getBlockMapFromStorage();

  for (const rule of Object.values(blockMap)) {
    const tabs = rule.tabs ?? [];
    const tabsToRemove = tabs.filter(tab => tab.windowId === windowId) ?? [];
    const remainingTabs = tabs.filter(tab => tab.windowId !== windowId) ?? [];
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


export const cleanerScheduler = async () => {
  await cleanUnnecessaryTabs();
  await doDailyReset();
  await redirectExpiredDomains();
};


/**
 * check for expired domains and redirect tabs
 */
export const redirectExpiredDomains = async () => {
  const blockMap = await getBlockMapFromStorage();
  Object.values(blockMap).forEach(async rule => {
    const ruleExpired = await isRuleExpired(rule);
    if (ruleExpired) {
      console.log("Domain: " + rule.url + " is expired, need to redirect tabs");
      const tabs = rule.tabs ?? [];
      tabs.forEach(tab => {
        redirectTab(tab.tabId);
      });
    }
  });
}


/**
 * Remove any outliers from the tabs array
 * 1. if rule is EXPIRED, then all the tabs should be redirected, they need to be removed from the tabs array
 * 2. actual details of every tab should match with the current tab details saved in the rule, otherwise remove from the storage
 * (they should be registered correctly after the next action of the tab)
 */
export const cleanUnnecessaryTabs = async () => {
  const blockMap = await getBlockMapFromStorage();
  for (const rule of Object.values(blockMap)) {
    if (rule.status === STATUS.EXPIRED) {
      rule.tabs = [];
    }
    let tabs = rule.tabs ?? [];
    tabs = tabs.filter(tab => isTabValidAndExists(tab, rule.url));
  }
  await saveBlockMapToStorage(blockMap);
};


export const isTabValidAndExists = async (tab, baseUrl) => {
  if (tab?.tabId && tab?.windowId && tab?.openedTime) {
    try {
      let tabInfo = await chrome.tabs.get(tab.tabId);
      const tabBaseUrl = getBaseUrl(tabInfo.url);
      if (tabBaseUrl === baseUrl) {
        return true;
      }
    } catch (error) {
      console.error(error);
    }
  }
  console.log("Something is wrong with the tab: ", tab);
  return false;
};


/**
 * only this method has the right to RESET the rule status and pastCumulativeTime
 * (but they can be upated in other methods)
 */
export const doDailyReset = async () => {
  const blockMap = await getBlockMapFromStorage();
  const now = Date.now();
  Object.values(blockMap).forEach(rule => {
    if (rule.lastResetTime) {
      const timeSinceLastReset = now - rule.lastResetTime;
      if (timeSinceLastReset > ONE_DAY) {
        
        rule.lastResetTime = now;
        rule.pastCumulativeTime = 0;
        if (rule.status === STATUS.EXPIRED) {
          rule.status = STATUS.LIVE;
        } else {
          const tabs = rule.tabs ?? [];
          tabs.forEach(tab => tab.openedTime = now);
        }
      }
    } else {
      rule.lastResetTime = now;
    }
    console.log("Rule status and time details for domain " + rule.url + " is reset.");
  });
  await saveBlockMapToStorage(blockMap);
}