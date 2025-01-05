import { REDIRECT_URL, STATUS } from '../common/constants.js';
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
 *        pastCumulativeTime: <time in milliseconds>
 *    },
 *    <id_2>: <rule_2>,
 *    ...
 * }
 * 
 * tab = {
 *    tabId: <integer>,
 *    windowId: <integer>,
 *    openedTime: <time in milliseconds>
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
 * if the rule is expired, redirect the tab
 * (redirecting only the current tab is enough, others will be redirected by the cleaner scheduler)
 * if not required, regiser the tab to the rule
 */
export const handleNewTabOpen = async (tabId, windowId, rule) => {
  const ruleExpired = await isRuleExpired(rule);
  if (ruleExpired) {
    console.log("Rule for [" + rule.url + "] is expired, need to redirect");
    redirectTab(tabId);
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


export const checkForExpiredDomains = async () => {
  await cleanUnnecessaryTabs();

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
};


/**
 * clean redirected tabs from the storage
 * (and remove any outliers)
 * update only tabs array, don't touch pastCumulativeTime or status here
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
 * only this method has the right to RESET the rule status and pastCumulativeTime
 * (but they can be upated in other methods)
 */
export const doDailyReset = async () => {
  console.log("Performing daily reset...");
  const blockMap = await getBlockMapFromStorage();
  Object.values(blockMap).forEach(rule => {
    if(rule.status === STATUS.EXPIRED) {
      rule.status = STATUS.LIVE;
      rule.pastCumulativeTime = 0;
    } else {
      const now = new Date();
      const tabs = rule.tabs ?? [];
      tabs.forEach(tab => tab.openedTime = now);
      rule.pastCumulativeTime = 0;
    }
    console.log("Rule for domain " + rule.url + " is reset. New rule details: ", rule);
  });
  await saveBlockMapToStorage(blockMap);
}