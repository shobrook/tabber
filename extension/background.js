// GLOBALS

/* Nothin' here yet */

// MAIN

// TODO: If user exits signup dialog, prompt dialog whenever user clicks browser action

// Listens for credentials and registers new user (or authenticates returning user)
chrome.runtime.onConnect.addListener(function(port) {
	// Handles new user
	if (port.name == "signup") {
		port.onMessage.addListener(function(msg) {
			var checkEmail = new XMLHttpRequest();
			checkEmail.open("POST", 'http://localhost:5000/tabber/api/validate_user', true);
			checkEmail.setRequestHeader("Content-type", "application/json");
			checkEmail.onreadystatechange = function() {
				if (checkEmail.readyState == XMLHttpRequest.DONE && checkEmail.status == 200) { // readyState == 4
					if (checkEmail.responseText) {
						// TODO: Send message to login.js confirming email invalidity
					} else if (checkEmail.responseText == false) {
						console.log("Email is valid. Registering user.")

						// TODO: Send message to login.js confirming email validity

						// Pulls current user's unique authToken
						chrome.identity.getAuthToken({interactive: true}, function(token) {
							if (chrome.runtime.lastError) {
								console.log("Error retrieving authToken: " + chrome.runtime.lastError.message);
								return;
							}

							var addUser = new XMLHttpRequest();
							addUser.open("POST", 'http://localhost:5000/tabber/api/new_user', true);
							addUser.setRequestHeader("Content-type", "application/json");
							addUser.onreadystatechange = function() {
								if (addUser.readyState == XMLHttpRequest.DONE && addUser.status == 200) { // readyState == 4
									console.log("User has successfully registered.");
									// TODO: Prompt the tutorial screen (send message to tutorial.js)
								}
							}
							addUser.send(JSON.stringify({authToken: [token], email: msg.email, password: msg.password})); // Adds new user to DB
						});
					}
				}
			}
			checkEmail.send(JSON.stringify({"email": msg.email})); // Checks if email is already in use
		});
	} else if (port.name == "login") { // Handles returning user
		port.onMessage.addListener(function(msg) {
			var checkCreds = new XMLHttpRequest();
			checkCreds.open("POST", 'http://localhost:5000/tabber/api/validate_user', true);
			checkCreds.setRequestHeader("Content-type", "application/json");
			checkCreds.onreadystatechange = function() {
				if (checkCreds.responseText) {
					// TODO: Send message to login.js confirming invalid credentials
				} else if (checkCreds.responseText == false) {
					console.log("Credentials are valid. Logging in user.");

					chrome.identity.getAuthToken({interactive: true}, function(token) {
						if (chrome.runtime.lastError) {
							console.log("Error retrieving authToken: " + chrome.runtime.lastError.message);
							return;
						}

						var updateToken = new XMLHttpRequest();
						updateToken.open("POST", 'http://localhost:5000/tabber/api/update_user', true);
						updateToken.setRequestHeader("Content-type", "application/json");
						updateToken.onreadystatechange = function() {
							if (updateToken.readyState == XMLHttpRequest.DONE && updateToken.status == 200) { // readyState == 4
								console.log("Successfully updated user's authentication tokens.");
								// TODO: Send success confirmation back to login.js
							}
						}
						updateToken.send(JSON.stringify({authToken: token, email: msg.email, password: msg.password})); // Updates user's auth tokens
					});
				}
			}
		});
	} else if (port.name == "saved-messages") { // Handles selected messages
		port.onMessage.addListener(function(msg) {
			chrome.identity.getAuthToken({interactive: true}, function(token) {
				if (chrome.runtime.lastError) {
					console.log("Error retrieving authToken: " + chrome.runtime.lastError.message);
					return;
				}

				var addConversation = new XMLHttpRequest();
				addConversation.open("POST", 'http://localhost:5000/tabber/api/add_conversation', true);
				addConversation.setRequestHeader("Content-type", "application/json");
				addConversation.onreadystatechange = function() {
					if (addConversation.readyState == XMLHttpRequest.DONE && addConversation.status == 200) { // readyState == 4
						console.log("Successfully added selected conversation.");
						// TODO: Send success confirmation back to save.js
					}
				}
				updateToken.send(JSON.stringify({authToken: token, "name": msg.name, "folder": msg.folder, "messages": msg.messages})); // Adds conversation to specified folder
			});
		});
	}
});

// Prompts the signup/login dialog on first install; logs on update
chrome.runtime.onInstalled.addListener(function(details) {
	if (details.reason == "install") {
		console.log("User's first time installing tabber.");
		chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
			var activeTab = tabs[0];
			chrome.tabs.sendMessage(activeTab.id, {"message": "first_install"});
		})
	} else if (details.reason == "update") {
		var thisVersion = chrome.runtime.getManifest().version;
		console.log("Updated from " + details.previousVersion + " to " + thisVersion + " :)");
	}
});

// Called when a user clicks the browser action
chrome.browserAction.onClicked.addListener(function(tab) {
	chrome.identity.getAuthToken({interactive: true}, function(token) {
		if (chrome.runtime.lastError) {
			console.log(chrome.runtime.lastError.message);
			return;
	  }

		var getFolders = new XMLHttpRequest();
		getFolders.open("POST", 'http://localhost:5000/tabber/api/get_folders', true);
		getFolders.setRequestHeader("Content-type", "application/json");
		getFolders.onreadystatechange = function() {
			if (getFolders.readyState == XMLHttpRequest.DONE && getFolders.status == 200) { // readyState == 4
				chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
					var activeTab = tabs[0];
					chrome.tabs.sendMessage(activeTab.id, {"message": "clicked_browser_action", "folders": JSON.parse(getFolders.responseText).folders});
					console.log(JSON.parse(getFolders.responseText).folders);
				});
			}
		}
		getFolders.send(JSON.stringify({"authToken": token}));
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
