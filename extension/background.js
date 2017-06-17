// GLOBALS

var getFolders = function(url, callback) {
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	xhr.responseType = 'json';
	xhr.onload = function() {
		var status = xhr.status;
		if (status == 200)
			callback(null, xhr.response);
		else
			callback(status);
	};
	xhr.send();
};

// MAIN

// Called when a user clicks the browser action
chrome.browserAction.onClicked.addListener(function(tab) {
	var folderNames = [];
	getFolders("http://localhost:5000/tabber/api/get_folders", function(err, data) {
		if (err != null)
			console.log("Error retrieving folders: " + err);
		else
			folderNames = data.folders;
	});

	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		var activeTab = tabs[0];
		chrome.tabs.sendMessage(activeTab.id, {"message": "clicked_browser_action", "folders": folderNames});
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
