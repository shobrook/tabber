////GLOBALS////

/*
var mongodb = require('mongodb');

var MongoClient = mongodb.MongoClient;
var url = 'mongodb://localhost:27017/server'; // Temp
*/

////HANDLERS////

/* Nothin' here yet */

////LISTENERS////

// Called when the user clicks on the browser action.
chrome.browserAction.onClicked.addListener(function(tab) {
  // Sends a message to the content script (current tab)
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		var activeTab = tabs[0];
		chrome.tabs.sendMessage(activeTab.id, {"message": "clicked_browser_action"});
	});
});

////BRAINSTORMING////

/*
// Listens for a URL change (new convo)
chrome.tabs.onUpdated.addListener(function() {
	// Do something
});
*/

/*
// Establish connection to server
MongoClient.connect(url, function(err, db) {
	if (err) {
		ipcRenderer.send('mongodb', 'Unable to connect to MongoDB server. Error: ' + err); // Debugging
	} else {
		ipcRenderer.send('mongodb', 'Database connection established to: ' + url); // Debugging

		var collection = db.collection('pinnedMessages');
		//collection.find({fbid: FBID});

		db.close();
	}
});
*/