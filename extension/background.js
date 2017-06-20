/* GLOBALS */

// Pulls user's unique authentication token
var oauth;
chrome.identity.getAuthToken({interactive: true}, function(token) {
	if (chrome.runtime.lastError) {
		console.log("Error retrieving authToken: " + chrome.runtime.lastError.message);
		return;
	}
	oauth = token;
});

// REST API endpoints
const NEW_USER = "http://localhost:5000/tabber/api/new_user";
const UPDATE_USER = "http://localhost:5000/tabber/api/update_user";
const VALIDATE_USER = "http://localhost:5000/tabber/api/validate_user";
const ADD_CONVERSATION = "http://localhost:5000/tabber/api/add_conversation";
const GET_FOLDERS = "http://localhost:5000/tabber/api/get_folders";
const GET_CONVERSATIONS = "http://localhost:5000/tabber/api/get_conversations";

// Creates an HTTP POST request
var POST = function(url, payload, callback) {
	var xhr = new XMLHttpRequest();
	xhr.open("POST", url, true);
	xhr.setRequestHeader("Content-type", "application/json");
	xhr.onreadystatechange = function() {
		if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) // readyState == 4
			callback(xhr.responseText);
	}
	xhr.send(JSON.stringify(payload));
}

/* MAIN */

// TODO: If user exits signup dialog, prompt dialog whenever user clicks browser action
// TODO: Prompt login dialog only if on new device

// Prompts the onboarding dialog on "first-install"; provides handler for extension updates
chrome.runtime.onInstalled.addListener(function(details) {
	if (details.reason == "install") {
		console.log("User has installed tabber for the first time on this device.");
		chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
			var activeTab = tabs[0];
			chrome.tabs.sendMessage(activeTab.id, {"message": "first_install"});
		});
	} else if (details.reason == "update") {
		var thisVersion = chrome.runtime.getManifest().version;
		console.log("Updated from " + details.previousVersion + " to " + thisVersion + " :)");
	}
});

// Passes user's folder references to save.js and prompts "select messages" dialog on click of browser action
chrome.browserAction.onClicked.addListener(function(tab) {
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		var saveDialog = function(folders) {
			var activeTab = tabs[0];
			chrome.tabs.sendMessage(activeTab.id, {"message": "clicked_browser_action", "folders": JSON.parse(folders).folders});
			console.log("Passed folder references to save dialog.");
		}
		POST(GET_FOLDERS, {"authToken": oauth}, saveDialog);
	});
	// chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
	// 	var activeTab = tabs[0];
	// 	chrome.tabs.sendMessage(activeTab.id, {"message": "first_install"});
	// });
});

// Creates "Find Messages" in context menu and prompts file manager
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

// Listens for messages passed from all content scripts
chrome.runtime.onConnect.addListener(function(port) {
	port.onMessage.addListener(function(msg) {
		if (port.name == "register") {
			var addUser = function(emailCheck) {
				if (JSON.parse(emailCheck).valid) {
					console.log("Email is valid. Registering user.");
					// TODO: Send message to login.js confirming email validity
					var onBoarding = function(userID) {
						console.log("User has successfully registered.");
						// TODO: Prompt the tutorial screen (send message to tutorial.js)
					}
					POST(NEW_USER, {"authToken": oauth, "email": msg.email, "password": msg.password}, onBoarding);
				} else if (!(JSON.parse(emailCheck).valid)) {
					console.log("Email is invalid. Try again.");
					// TODO: Send message to login.js confirming email invalidity
				}
			}
			POST(VALIDATE_USER, {"email": msg.email}, addUser);
		} else if (port.name == "login") {
			var updateTokens = function(credCheck) {
				if (JSON.parse(credCheck).valid) {
					console.log("Valid credentials. Logging in user.");
					var deviceCheck = function(device) {
						if (JSON.parse(device).updated)
							console.log("User is logging in via a new device. Successfully updated user's authentication tokens.");
						else if (!(JSON.parse(device).updated))
							console.log("User is logging in via a known device.");
						// TODO: Send success confirmation back to login.js
					}
					POST(UPDATE_USER, {"authToken": oauth, "email": msg.email, "password": msg.password}, deviceCheck);
				} else if (!(JSON.parse(credCheck).valid)) {
					console.log("Invalid credentials.");
					// TODO: Send message to login.js confirming invalid credentials
				}
			}
			POST(VALIDATE_USER, {"email": msg.email, "password": msg.password}, updateTokens);
		} else if (port.name == "saved-messages") {
			var convoCheck = function(convoID) {
				console.log("Successfully added selected conversation.");
				// TODO: Send success confirmation back to save.js
			}
			POST(ADD_CONVERSATION, {"authToken": oauth, "name": msg.name, "folder": msg.folder, "messages": msg.messages}, convoCheck);
		}
		else if (port.name == "get-conversations") {
			// var sendFolders = function(folderList) {
				chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
					var fileManager = function(folderList) {
						var activeTab = tabs[0];
						chrome.tabs.sendMessage(activeTab.id, {"message": "tabber_folder_list", "folderList": JSON.parse(folderList)});
						console.log("Passed folder references to file manager.");
					}
					POST(GET_CONVERSATIONS, {"authToken": oauth}, fileManager);
				});
			// }
			// POST(GET_CONVERSATIONS, {"authToken": oauth}, sendFolders);
		}
	});
});
