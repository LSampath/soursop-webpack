import { CLEANER_INTERVAL } from '../common/constants.js';
import { getBaseUrl } from '../common/util.js';
import {
  checkForExpiredDomains,
  doDailyReset,
  findRuleFromTabId,
  findRuleFromUrl,
  handleNewTabOpen,
  handleTabClose,
  handleTabWindowChange,
  handleWindowClose
} from './handlers.js';



/**
 * triggered when a new tab is opened
 */
chrome.tabs.onCreated.addListener(async (tab) => {
  if (tab.pendingUrl) {
    const rule = await findRuleFromUrl(tab.pendingUrl);
    if (rule) {
      handleNewTabOpen(tab.id, tab.windowId, rule);
    }
  } else {
    // TODO: pending url is not available for tabs opened using redirect links
  }
});


/**
 * triggered in many cases
 * WILL LIST DOWN HERE
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const oldDomainRule = await findRuleFromTabId(tabId);
  if (changeInfo.url) {
    const newUrl = getBaseUrl(changeInfo.url);
    const newDomainRule = await findRuleFromUrl(newUrl);
    if (oldDomainRule) {
      if (newDomainRule) {
        const isSameDomain = newUrl === oldDomainRule.url;
        if (isSameDomain) {
          // nothing to do, old and new urls point to the same domain
        } else {
          await handleTabClose(tabId);
          handleNewTabOpen(tabId, tab.windowId, newDomainRule);
        }
      } else {
        handleTabClose(tabId);
      }

    } else {
      if (newDomainRule) {
        handleNewTabOpen(tabId, tab.windowId, newDomainRule);
      } else {
        // do nothing old and new url does not match any given domain
      }
    }
  } else {
    const matchingRule = await findRuleFromUrl(tab.url);
    if (oldDomainRule) {
      // do nothing, as the tab is already in the metadata store
    } else if (matchingRule) {
      handleNewTabOpen(tabId, tab.windowId, matchingRule);
    }
  }
});


/**
 * setting expired status and redirecting is not done here, but in the scheduler
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  handleTabClose(tabId);
});


/**
 * triggered after (chrome.tabs.onDetached and chrome.tabs.onAttached) listeners
 * drag and drop events are handled before reaching this listener, no need to handle it here
 * (onRemoved can be called when the last tab of the window is drag and dropped to another window)
 * setting expired status and redirecting is not done here, but in the scheduler
 */
chrome.windows.onRemoved.addListener((windowId) => {
  handleWindowClose(windowId);
});


/**
 * called both when
 * 1. a tab is dragged from current window to create an individual (new) window
 * 2. a tab is dropped into an existing window
 * triggered before chrome.windows.onRemoved listener (in a drag and drop event)
 */
chrome.tabs.onAttached.addListener((tabId, attachInfo) => {
  handleTabWindowChange(tabId, attachInfo.newWindowId);
});
//TOOD: does this work against right click and move to new window feature ???


/**
 * check for and update expired domains often
 */
setInterval(() => {
  console.log("Performing periodic task...");
  checkForExpiredDomains();
}, CLEANER_INTERVAL);


/**
 * registers a periodic trigger to reset the expired domains at midnight
 */
setTimeout(() => {
  console.log("Started the one-time tast to schedule the daily reset...");
  setInterval(() => {
    doDailyReset();
  }, ONE_DAY);
}, timeUntilMidnight());



// is it handled from using link to reload a another website (facebook link to youtube in same tab) ????
// same tab id is not used here ??? buy whey
// ex - when I click a youtube link from reddit, it will redirect to the youtube in same tab, but tabId will be changed






