////GLOBALS////

/* Nothin' here yet */

////MAIN////

// Called when a user clicks the browser action
chrome.browserAction.onClicked.addListener(function(tab) {
	var xhr = new XMLHttpRequest;
	xhr.open("GET", chrome.runtime.getURL("messages.json"));
	xhr.onreadystatechange = function() {
		if (this.readyState == 4) {
			var folders = JSON.parse(xhr.responseText);
			var folderNames = Object.keys(folders);

			chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
				var activeTab = tabs[0];
				chrome.tabs.sendMessage(activeTab.id, {"message": "clicked_browser_action", "folders": folderNames});
			});
		}
	};
	xhr.send();
});

// Listens for selected messages from content script
// TODO: Write to messages.json?
chrome.runtime.onConnect.addListener(function(port) {
	console.assert(port.name == "saved-messages");
	port.onMessage.addListener(function(msg) {
		var xhr = new XMLHttpRequest();
		xhr.open('POST', chrome.runtime.getURL("messages.json"), true);
		xhr.onload = function () {
			// do something to response
			console.log(this.responseText);
		};
		xhr.send('something=something');
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
