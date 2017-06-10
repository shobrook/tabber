////GLOBALS////

/* Nothin' here yet */

////MAIN////

// Called when a user clicks the browser action
chrome.browserAction.onClicked.addListener(function(tab) {
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		var activeTab = tabs[0];
		chrome.tabs.sendMessage(activeTab.id, {"message": "clicked_browser_action"});
	});
});

// Listens for selected messages from content script
chrome.runtime.onConnect.addListener(function(port) {
	console.assert(port.name == "saved-messages");
  port.onMessage.addListener(function(msg) {
		console.log(msg.messages);
  });
});

// Creates and handles "Find Messages" in context menu
chrome.contextMenus.create({
	title: "Find Messages",
	contexts: ["browser_action"],
	onclick: function () {
		chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
			var activeTab = tabs[0];
			chrome.tabs.sendMessage(activeTab.id, {"message": "clicked_find_messages"});
		});
	}
});
