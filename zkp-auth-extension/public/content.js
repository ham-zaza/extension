// content.js
// Optional: notify popup when on a supported site
// For demo, we assume all sites are supported
chrome.runtime.sendMessage({ action: 'pageLoaded' });