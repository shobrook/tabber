/* GLOBALS */

// For calling GET and SET to the extension's local storage
var storage = chrome.storage.local;

/*
// Pulls user's unique authentication token
var oauth;
chrome.identity.getAuthToken({interactive: true}, function(token) {
	if (chrome.runtime.lastError) {
		console.log("Error retrieving authToken: " + chrome.runtime.lastError.message);
		return;
	}
	oauth = token;
	console.log(oauth);
});
*/

// Dev REST API endpoints
const NEW_USER = "http://localhost:5000/tabber/api/new_user";
const CHECK_USER = "http://localhost:5000/tabber/api/check_user";
const ADD_CONVERSATION = "http://localhost:5000/tabber/api/add_conversation";
const GET_FOLDERS = "http://localhost:5000/tabber/api/get_folders";
const GET_CONVERSATIONS = "http://localhost:5000/tabber/api/get_conversations";
const ADD_FOLDER = "http://localhost:5000/tabber/api/add_folder";
const RENAME_FOLDER = "http://localhost:5000/tabber/api/rename_folder";
const DELETE_FOLDER = "http://localhost:5000/tabber/api/delete_folder";

// Prod REST API endpoints
// const NEW_USER = "http://localhost:8080/tabber/api/new_user";
// const CHECK_USER = "http://localhost:8080/tabber/api/check_user";
// const ADD_CONVERSATION = "http://localhost:8080/tabber/api/add_conversation";
// const GET_FOLDERS = "http://localhost:8080/tabber/api/get_folders";
// const GET_CONVERSATIONS = "http://localhost:8080/tabber/api/get_conversations";
// const ADD_FOLDER = "http://localhost:8080/tabber/api/add_folder";
// const RENAME_FOLDER = "http://localhost:8080/tabber/api/rename_folder";
// const DELETE_FOLDER = "http://localhost:8080/tabber/api/delete_folder";

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
storage.set({"signup": true}, function() {
	console.log("Signup is set to true.");
});

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
		storage.set({"signup": true}, function() {
			console.log("Signup is set to true.");
		});
	} else if (details.reason == "update") {
		var thisVersion = chrome.runtime.getManifest().version;
		console.log("Updated from " + details.previousVersion + " to " + thisVersion + " :)");
	}
});

// Listens for the browser action to be clicked
chrome.browserAction.onClicked.addListener(function(tab) {
	storage.get("signup", function(signup) {
		if (signup["signup"]) { // If user hasn't signed up or logged in yet, prompt the register process
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
				storage.get("credentials", function(creds) {
					POST(GET_FOLDERS, {"email": creds["credentials"]["email"]}, saveDialog); // Pass user's folder references to the save dialog
				});
			});
		}
	});
});

// Creates "Save Messages" in context menu
chrome.contextMenus.create({
	title: "Save to Tabber",
	contexts: ["browser_action"],
	onclick: function () {
		storage.get("signup", function(signup) {
			if (!signup["signup"]) { // If user has signed up or logged in, prompt the "save" dialog
				chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
					var saveDialog = function(folders) {
						var activeTab = tabs[0];
						chrome.tabs.sendMessage(activeTab.id, {"message": "clicked-browser-action", "folders": JSON.parse(folders).folders});
						console.log("Passed folder references to save dialog.");
					}
					storage.get("credentials", function(creds) {
						POST(GET_FOLDERS, {"email": creds["credentials"]["email"]}, saveDialog); // Pass user's folder references to the save dialog
					});
				});
			} else { // If user hasn't signed up or logged in yet, prompt the register process
				chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
					var activeTab = tabs[0];
					chrome.tabs.sendMessage(activeTab.id, {"message": "prompt-signup"});
				});
			}
		});
	}
});

// Creates "Find Messages" in context menu
chrome.contextMenus.create({
	title: "Open Tabber",
	contexts: ["browser_action"],
	onclick: function () {
		storage.get("signup", function(signup) {
			if (!signup["signup"]) { // If user has signed up or logged in, prompt the file manager
				chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
					var activeTab = tabs[0];
					chrome.tabs.sendMessage(activeTab.id, {"message": "clicked_find_messages"}); // CHECK
				});
				storage.set({"onboarding": false}, function() {
					console.log("Onboarding set to false.");
				});
			} else { // If user hasn't signed up or logged in yet, prompt the register process
				chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
					var activeTab = tabs[0];
					chrome.tabs.sendMessage(activeTab.id, {"message": "prompt-signup"});
				});
			}
		});
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
					storage.set({"credentials": {"email": msg.email, "password": msg.password}}, function() {
						port.postMessage({type: "registered", value: true});
						storage.set({"onboarding": true}, function() {
							console.log("Onboarding set to true.");
						});
						storage.set({"signup": false}, function() {
							console.log("Signup set to false.");
						});
						chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
							var activeTab = tabs[0];
							chrome.tabs.sendMessage(activeTab.id, {"message": "first-signup"});
						});
					});
				} else if (!(JSON.parse(user).registered)) {
					console.log("Email is already in use. Try again.");
					port.postMessage({type: "registered", value: false});
				}
			}
			POST(NEW_USER, {"email": msg.email, "password": msg.password}, addUser);
		} else if (port.name == "login") { // Handles requests from the "login" port
			var updateUser = function(user) {
				if (JSON.parse(user).logged_in) {
					console.log("Valid credentials. Logging in user.");
					port.postMessage({type: "logged-in", value: true});
					storage.set({"signup": false}, function() {
						console.log("Signup set to false.");
					});
					storage.set({"onboarding": false}, function() {
						console.log("Onboarding set to false.");
					});
				} else if (!(JSON.parse(user).logged_in)) {
					console.log("Invalid credentials. Try again.");
					port.postMessage({type: "logged-in", value: false});
				}
			}
			POST(CHECK_USER, {"email": msg.email, "password": msg.password}, updateUser);
		} else if (port.name == "onboarding") { // Handles requests from the "onboarding" port
			if (msg.type == "understood" && msg.value) {
				storage.set({"onboarding": false}, function() {
					console.log("Onboarding set to false.");
				});
			} else if (msg.type == "understood" && !(msg.value)) {
				storage.set({"onboarding": true}, function() {
					console.log("Onboarding set to true.");
				});
			}
		} else if (port.name == "conversations") { // Handles requests from the "conversations" port
			var convoCheck = function(convoID) {
				console.log("Successfully added selected conversation.");
				storage.get("onboarding", function(onboarding) {
					if (onboarding["onboarding"]) {
						console.log("User's first time saving a conversation.");
						chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
							var activeTab = tabs[0];
							chrome.tabs.sendMessage(activeTab.id, {"message": "first-save"});
						});
					}
				});
				port.postMessage({type: "save-confirmation", value: true});
			}
			storage.get("credentials", function(creds) {
				POST(ADD_CONVERSATION, {"email": creds["credentials"]["email"], "path": msg.path, "messages": msg.messages}, convoCheck);
			});
		} else if (port.name == "get-conversations") {
			chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
				var fileManager = function(folderList) {
					var activeTab = tabs[0];
					chrome.tabs.sendMessage(activeTab.id, {"message": "tabber_folder_list", "folderList": JSON.parse(folderList)});
					console.log("Passed folder references to file manager.");
				}
				storage.get("credentials", function(creds) {
					POST(GET_CONVERSATIONS, {"email": creds["credentials"]["email"]}, fileManager);
				});
			});
		} else if (port.name == "add-folder") {
			chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
				var addedFolder = function() {
					// TODO: Send confirmation to the content scripts
					console.log("Folder was (supposedly) added to the database.");
				}
				storage.get("credentials", function(creds) {
					POST(ADD_FOLDER, {"email": creds["credentials"]["email"], "path": msg.path}, addedFolder);
				});
			});
		} else if (port.name == "rename-folder") {
			chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
				var renamedFolder = function() {
					// TODO: Send confirmation to the content scripts
					console.log("Folder was (supposedly) renamed.");
				}
				storage.get("credentials", function(creds) {
					POST(RENAME_FOLDER, {"email": creds["credentials"]["email"], "path": msg.path, "newName": msg.newName}, renamedFolder);
				});
			});
		} else if (port.name == "delete-folder") {
			chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
				var deletedFolder = function() {
					// TODO: Send confirmation to the content scripts
					console.log("Folder was (supposedly) deleted.");
				}
				storage.get("credentials", function(creds) {
					POST(DELETE_FOLDER, {"email": creds["credentials"]["email"], "path": msg.path}, deletedFolder);
				});
			});
		}
	});
});
