// TODO: Don't prompt signup dialog after login

/* GLOBALS */

// Pulls user's unique authentication token; TODO: Needs to be fixed!
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
const DELETE_FOLDER = "http://localhost:5000/tabber/api/delete_folder";

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

// Boolean for whether onboarding should be initiated
var onboarding;
// Boolean for whether signup should be initiated
var signup = false; // NOTE: Set as "true" for testing only

/* MAIN */

// Prompts the sign-up dialog on "first-install"; provides handler for extension updates
chrome.runtime.onInstalled.addListener(function(details) {
	if (details.reason == "install") {
		console.log("User has installed tabber for the first time on this device.");
		chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
			var activeTab = tabs[0];
			chrome.tabs.sendMessage(activeTab.id, {"message": "first_install"});
		});
		signup = true;
	} else if (details.reason == "update") {
		var thisVersion = chrome.runtime.getManifest().version;
		console.log("Updated from " + details.previousVersion + " to " + thisVersion + " :)");
	}
});

// Passes user's folder references to save.js and prompts "select messages" dialog on click of browser action
chrome.browserAction.onClicked.addListener(function(tab) {
	if (signup) {
		chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
			var activeTab = tabs[0];
			chrome.tabs.sendMessage(activeTab.id, {"message": "first_install"});
		});
	} else {
		chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
			var saveDialog = function(folders) {
				var activeTab = tabs[0];
				chrome.tabs.sendMessage(activeTab.id, {"message": "clicked_browser_action", "folders": JSON.parse(folders).folders});
				console.log("Passed folder references to save dialog.");
			}
			POST(GET_FOLDERS, {"authToken": oauth}, saveDialog); // TODO: Only pull the top 10 most popular folders
		});
	}
});

// Creates "Find Messages" in context menu and prompts file manager
chrome.contextMenus.create({
	title: "Open Tabber",
	contexts: ["browser_action"],
	onclick: function () {
		if (!signup) {
			chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
				var activeTab = tabs[0];
				chrome.tabs.sendMessage(activeTab.id, {"message": "clicked_find_messages"});
			});
			onboarding = false;
		} else {
			chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
				var activeTab = tabs[0];
				chrome.tabs.sendMessage(activeTab.id, {"message": "first_install"});
			});
		}
	}
});

// Creates "Sign In" in context menu and prompts file manager
// TODO: Eventually change this to "Log In" once we have a separate login dialog
chrome.contextMenus.create({
	title: "Sign Up",
	contexts: ["browser_action"],
	onclick: function () {
		chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
			var activeTab = tabs[0];
			chrome.tabs.sendMessage(activeTab.id, {"message": "first_install"});
		});
	}
});

// Content scripts --> here --> server.py --> here --> content scripts
chrome.runtime.onConnect.addListener(function(port) {
	port.onMessage.addListener(function(msg) {
		if (port.name == "register") {
			var addUser = function(emailCheck) {
				if (JSON.parse(emailCheck).valid) {
					console.log("Email is valid. Registering user.");
					var onBoarding = function(userID) {
						console.log("User has successfully registered.");
						port.postMessage({registered: true});
						onboarding = true;
						signup = false;
						chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
							var activeTab = tabs[0];
							chrome.tabs.sendMessage(activeTab.id, {"message": "first_signup"});
						});
					}
					POST(NEW_USER, {"authToken": oauth, "email": msg.email, "password": msg.password}, onBoarding);
				} else if (!(JSON.parse(emailCheck).valid)) {
					console.log("Email is invalid. Try again.");
					port.postMessage({registered: false});
				}
			}
			POST(VALIDATE_USER, {"email": msg.email}, addUser);
			// TODO: Comparmentalize email validation in the NEW_USER route in server.py
		} else if (port.name == "login") {
			var updateTokens = function(credCheck) {
				if (JSON.parse(credCheck).valid) {
					console.log("Valid credentials. Logging in user.");
					var deviceCheck = function(device) {
						if (JSON.parse(device).updated)
							console.log("User is logging in via a new device. Successfully updated user's authentication tokens.");
						else if (!(JSON.parse(device).updated))
							console.log("User is logging in via a known device.");
						port.postMessage({loggedIn: true});
						signup = false;
					}
					POST(UPDATE_USER, {"authToken": oauth, "email": msg.email, "password": msg.password}, deviceCheck);
				} else if (!(JSON.parse(credCheck).valid)) {
					console.log("Invalid credentials.");
					port.postMessage({loggedIn: false});
				}
			}
			POST(VALIDATE_USER, {"email": msg.email, "password": msg.password}, updateTokens);
		} else if (port.name == "conversations") {
			var convoCheck = function(convoID) {
				console.log("Successfully added selected conversation.");
				if (onboarding) {
					console.log("User's first time saving a conversation.");
					chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
						var activeTab = tabs[0];
						chrome.tabs.sendMessage(activeTab.id, {"message": "first_save"});
					});
				}
				port.postMessage({saved: true});
				// TODO: Send success confirmation back to save.js
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
		else if (port.name == "delete-folder") {
			chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
				var deletedFolder = function() {
					// TODO: Send confirmation to the content scripts
					console.log("Folder was (supposedly) deleted.");
				}
				POST(DELETE_FOLDER, {"authToken": oauth, "name": msg.name, "parent": msg.parent}, deletedFolder);
			});
		}
		else if (port.name == "invite-friend") {
			console.log("User wants to invite a friend");
		}
		else if (port.name == "onboarding") {
			onboarding = msg.submitted ? true : false
		}
		else if (port.name == "registered") {
			signup = msg.registered ? true : false
		}
	});
});
