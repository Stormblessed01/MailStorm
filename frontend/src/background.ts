declare const chrome: any;

chrome.runtime.onInstalled.addListener(() => {
  console.log("Mailstorm extension installed");
});
