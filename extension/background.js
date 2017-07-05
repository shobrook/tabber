// TODO: Don't prompt signup dialog after login

/* GLOBALS */

// Pulls user's unique authentication token; TODO: Needs to be fixed using localStorage
var oauth;
chrome.identity.getAuthToken({interactive: true}, function(token) {
	if (chrome.runtime.lastError) {
		console.log("Error retrieving authToken: " + chrome.runtime.lastError.message);
		return;
	}
	oauth = token;
	console.log(oauth);
});

// REST API endpoints
const NEW_USER = "http://localhost:5000/tabber/api/new_user";
const UPDATE_USER = "http://localhost:5000/tabber/api/update_user";
const VALIDATE_USER = "http://localhost:5000/tabber/api/validate_user";
const ADD_CONVERSATION = "http://localhost:5000/tabber/api/add_conversation";
const GET_FOLDERS = "http://localhost:5000/tabber/api/get_folders";
const GET_CONVERSATIONS = "http://localhost:5000/tabber/api/get_conversations";
const ADD_FOLDER = "http://localhost:5000/tabber/api/add_folder";
const RENAME_FOLDER = "http://localhost:5000/tabber/api/rename_folder";

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

// Boolean for whether onboarding should be initiated; TODO: Put in localStorage
var onboarding;
// Boolean for whether signup should be initiated; TODO: Put in localStorage
var signup = true; // NOTE: Set as "true" for testing only

/* MAIN */

// Prompts the sign-up dialog on "first-install"; provides handler for extension updates
// QUESTION: Is a listener for a "first-load" of messenger.com needed? The "onInstalled" event
// probably fires before a user visits messenger
chrome.runtime.onInstalled.addListener(function(details) {
	if (details.reason == "install") {
		console.log("User has installed tabber for the first time on this device.");
		chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
			var activeTab = tabs[0];
			chrome.tabs.sendMessage(activeTab.id, {"message": "prompt-signup"});
		});
		signup = true;
	} else if (details.reason == "update") {
		var thisVersion = chrome.runtime.getManifest().version;
		console.log("Updated from " + details.previousVersion + " to " + thisVersion + " :)");
	}
});

// Listens for the browser action to be clicked
chrome.browserAction.onClicked.addListener(function(tab) {
	if (signup) { // If user hasn't signed up or logged in yet, prompt the register process
		chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
			var activeTab = tabs[0];
			chrome.tabs.sendMessage(activeTab.id, {"message": "prompt-signup"});
		});
	} else { // If user has signed up or logged in, prompt the select messages canvas
		chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
			var saveDialog = function(folders) {
				var activeTab = tabs[0];
				chrome.tabs.sendMessage(activeTab.id, {"message": "clicked-browser-action", "folders": JSON.parse(folders).folders});
				console.log("Passed folder references to save dialog.");
			}
			POST(GET_FOLDERS, {"authToken": oauth}, saveDialog); // Pass user's folder references to the save dialog
		});
	}
});

// Creates "Find Messages" in context menu
chrome.contextMenus.create({
	title: "Open Tabber",
	contexts: ["browser_action"],
	onclick: function () {
		if (!signup) { // If user has signed up or logged in, prompt the file manager
			chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
				var activeTab = tabs[0];
				chrome.tabs.sendMessage(activeTab.id, {"message": "clicked_find_messages"}); // CHECK
			});
			onboarding = false; // CHECK
		} else { // If user hasn't signed up or logged in yet, prompt the register process
			chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
				var activeTab = tabs[0];
				chrome.tabs.sendMessage(activeTab.id, {"message": "prompt-signup"});
			});
		}
	}
});

// Creates "Sign In" in context menu and prompts file manager; NOTE: Testing only
// TODO: Replace this with "Log Out" in the context menu
chrome.contextMenus.create({
	title: "Sign Up",
	contexts: ["browser_action"],
	onclick: function () {
		chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
			var activeTab = tabs[0];
			chrome.tabs.sendMessage(activeTab.id, {"message": "prompt-signup"});
		});
	}
});

// Listens for long-lived port connections (from content scripts)
chrome.runtime.onConnect.addListener(function(port) {
	port.onMessage.addListener(function(msg) {
		if (port.name == "register") { // Handles requests from the "register" port
			var addUser = function(user) {
				if (JSON.parse(user).registered) {
					console.log("Email is valid. Registering user.");
					port.postMessage({type: "registered", value: true});
					onboarding = true;
					signup = false;
					chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
						var activeTab = tabs[0];
						chrome.tabs.sendMessage(activeTab.id, {"message": "first-signup"});
					});
				} else if (!(JSON.parse(user).registered)) {
					console.log("Email is already in use. Try again.");
					port.postMessage({type: "registered", value: false});
				}
			}
			POST(NEW_USER, {"authToken": oauth, "email": msg.email, "password": msg.password}, addUser);
		} else if (port.name == "login") { // Handles requests from the "login" port
			var updateUser = function(user) {
				if (JSON.parse(user).logged_in) {
					console.log("Valid credentials. Logging in user.");
					port.postMessage({type: "logged-in", value: true});
					signup = false;
					onboarding = false;
				} else if (!(JSON.parse(user).logged_in)) {
					console.log("Invalid credentials. Try again.");
					port.postMessage({type: "logged-in", value: false});
				}
			}
			POST(UPDATE_USER, {"authToken": oauth, "email": msg.email, "password": msg.password}, updateUser);
		} else if (port.name == "onboarding") { // Handles requests from the "onboarding" port
			if (msg.type == "understood" && msg.value)
				onboarding = false;
			else if (msg.type == "understood" && !(msg.value))
				onboarding = true;
		} else if (port.name == "conversations") { // Handles requests from the "conversations" port
			var convoCheck = function(convoID) {
				console.log("Successfully added selected conversation.");
				if (onboarding) {
					console.log("User's first time saving a conversation.");
					chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
						var activeTab = tabs[0];
						chrome.tabs.sendMessage(activeTab.id, {"message": "first-save"});
					});
				}
				port.postMessage({type: "save-confirmation", value: true});
			}
			POST(ADD_CONVERSATION, {"authToken": oauth, "name": msg.name, "folder": msg.folder, "messages": msg.messages}, convoCheck);
		} else if (port.name == "get-conversations") {
			chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
				var fileManager = function(folderList) {
					var activeTab = tabs[0];
					chrome.tabs.sendMessage(activeTab.id, {"message": "tabber_folder_list", "folderList": JSON.parse(folderList)});
					console.log("Passed folder references to file manager.");
				}
				POST(GET_CONVERSATIONS, {"authToken": oauth}, fileManager);
			});
		} else if (port.name == "add-folder") {
			chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
				var addedFolder = function() {
					// TODO: Send confirmation to the content scripts
					console.log("Folder was (supposedly) added to the database.");
				}
				POST(ADD_FOLDER, {"authToken": oauth, "parent": msg.parent, "name": msg.name}, addedFolder);
			});
		} else if (port.name == "rename-folder") {
			chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
				var renamedFolder = function() {
					// TODO: Send confirmation to the content scripts
					console.log("Folder was (supposedly) renamed.");
				}
				POST(RENAME_FOLDER, {"authToken": oauth, "name": msg.name, "newName": msg.newName}, renamedFolder);
			});
		}
	});
});
