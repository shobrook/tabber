// TODO: Stylize the file manager

/* GLOBALS */

injectedFileManager = false;
getConversationsPort = chrome.runtime.connect(window.localStorage.getItem('tabber-id'), {name: "get-conversations"});
addFolderPort = chrome.runtime.connect(window.localStorage.getItem('tabber-id'), {name: "add-folder"});
renameFolderPort = chrome.runtime.connect(window.localStorage.getItem('tabber-id'), {name: "rename-folder"});
deleteFolderPort = chrome.runtime.connect(window.localStorage.getItem('tabber-id'), {name: "delete-folder"});
inviteFriendPort = chrome.runtime.connect(window.localStorage.getItem('tabber-id'), {name: "invite-friend"});

/* MAIN */

var fileManager = function() {

	// Keeps track of the currently selected folder / conversation
	CUR_SELECTED = "";

	var openFileManager = function(folderList) {
		console.log("Running file manager.");

		var getFolderTreeViewRecursive = function(folder) {
			var folderListHTML = "<ul style='margin-left: 15px;'>";
			// NOTE: Switch the order of these loops to change whether conversations or subfolders come first
			for (var i = 0; i < folder["conversations"].length; i++) {
				folderListHTML += "<li class='tabberConversation' style='color: #2C9ED4; margin: 0;'>" + folder["conversations"][i]["name"] + "</li>";
				// Adds conversation messages as hidden list elements under the conversation name
				if (folder["conversations"][i]["messages"].length > 0) {
					folderListHTML += "<ul style='display: none'>";
					for (var j = 0; j < folder["conversations"][i]["messages"].length; j++) {
						folderListHTML += "<li data-author='" + folder["conversations"][i]["messages"][j]["author"] + "'>" + folder["conversations"][i]["messages"][j]["message"] + "</li>";
					}
					folderListHTML += "</ul>"
				}
			}
			for (var i = 0; i < folder["children"].length; i++) {
				folderListHTML += "<li class='tabberFolder' style='color: #7B7F84; margin: 0;'>" + folder["children"][i]["name"] + "</li>";
				folderListHTML += getFolderTreeViewRecursive(folder["children"][i]);
			}
			return folderListHTML + "</ul>";
		}

		var getFolderTreeView = function(folderList) {
			var folderListHTML = "<ul><li class='tabberFolder' style='color: #7B7F84; margin: 0;'>" + folderList["folders"][0]["name"] + "</li>";
			folderListHTML += getFolderTreeViewRecursive(folderList["folders"][0]) + "</ul>";
			return "<div style='overflow-y: auto; height: 200px; border: 1px solid #333;'> " + folderListHTML + " </div><br>";
		}

		// Adds event listeners for folders for left and double left click
		var addFolderListeners = function(folder) {
			// Left click toggles folder expand / collapse when clicked
			folder.addEventListener("click", function() {
				var currentFolder = document.getElementById("currentFolderDisplay");
				currentFolder.value = this.innerHTML;
				// TODO: Efficientize all of this (store highlighted element as prev or something)
				for (var i = 0; i < tabberFolders.length; i++) {
					tabberFolders[i].style.backgroundColor = "";
					// tabberFolders[i].classList.remove("tabberSelected");
				}
				for (var i = 0; i < tabberConversations.length; i++) {
					tabberConversations[i].style.backgroundColor = "";
					// tabberConversations[i].classList.remove("tabberSelected");
				}
				this.style.backgroundColor = "#CCC";
				// this.classList.add("tabberSelected");
				CUR_SELECTED = this;
			}, false);
			// Left click toggles folder expand / collapse when clicked
			folder.addEventListener("dblclick", function() {
				if (this.nextSibling.style.display == "none") {
					this.nextSibling.style.display = "";
				}
				else this.nextSibling.style.display = "none";
			}, false);
		}

		// Adds event listeners for conversations for left click
		var addConversationListeners = function(conversation) {
			// Left click updates conversation view text
			conversation.addEventListener("click", function() {
				conversationDisplay.innerHTML = "";
				for (var j = 0; j < this.nextSibling.childNodes.length; j++) {
					var message = document.createElement('p');
					message.innerHTML = this.nextSibling.childNodes[j].getAttribute("data-author") + ": " + this.nextSibling.childNodes[j].innerHTML;
					conversationDisplay.appendChild(message);
				}
				// TODO: Efficientize all of this (store highlighted element as prev or something)
				for (var i = 0; i < tabberFolders.length; i++) {
					tabberFolders[i].style.backgroundColor = "";
					// tabberFolders[i].classList.remove("tabberSelected");
				}
				for (var i = 0; i < tabberConversations.length; i++) {
					tabberConversations[i].style.backgroundColor = "";
					// tabberConversations[i].classList.remove("tabberSelected");
				}
				this.style.backgroundColor = "#CCC";
				// this.classList.add("tabberSelected");
				CUR_SELECTED = this;
			});
		}

		// Example nested structure: Use for testing
		// TODO: Change "folders" to be the root folder instead of a list of folders

		// {"folders": [{"_id": "...", "conversations": [...], "name": "...", "children": [...], "user_id": "..."}]}
		// var folderList = {"folders": [
		// 								{"_id": 12345, "conversations": [], "name": "Everything", "children": [
		// 									{"_id": 12346, "conversations": [
		// 										{"name": "Conversation 1", "messages": [
		// 											{"author": "Matthew", "message": "Message 1"},
		// 											{"author": "Jon", "message": "Message 2"},
		// 											{"author": "Matthew", "message": "Message 3"},
		// 										]},
		// 										{"name": "Conversation 2", "messages": [
		// 											{"author": "Matthew", "message": "Message 1"},
		// 											{"author": "Jon", "message": "Message 2"},
		// 										]}
		// 									], "name": "Folder 1", "children": [], "user_id": "test_id"},
		// 									{"_id": 12347, "conversations": [], "name": "Folder 2", "children": [
		// 										{"_id": 12348, "conversations": [], "name": "Folder 3", "children": [], "user_id": "test_id"},
		// 										{"_id": 12349, "conversations": [], "name": "Folder 4", "children": [
		// 											{"_id": 12350, "conversations": [
		// 												{"name": "Conversation 3", "messages": [
		// 													{"author": "Matthew", "message": "Message 1"},
		// 													{"author": "Jon", "message": "Message 2"},
		// 													{"author": "Matthew", "message": "Message 3"},
		// 													{"author": "Michael", "message": "Message 4"},
		// 												]}
		// 											], "name": "Folder 5", "children": [], "user_id": "test_id"}
		// 										], "user_id": "test_id"}
		// 									], "user_id": "test_id"}
		// 								], "user_id": "test_id"},
		// 							]};

		// console.log(folderList);

		var canvas = document.createElement('div');
		var fileManager = document.createElement("div");

		var formDefs = `<form id="cancelForm">
							<input id="cancelButton" type="button" value="Cancel" style="width: 100%; background-color: #FFF; color: #2C9ED4; padding: 14px 20px; margin: 8px 0; border-style: solid; border-color: #2C9ED4; border-radius: 4px; cursor: pointer;">
						</form>`;

		canvas.style = "background-color: rgba(0,0,0,.35); z-index: 2147483647; width: 100%; height: 100%; top: 0px; left: 0px; display: block; position: absolute;";

		fileManager.style.position = "fixed";
		fileManager.style.width = "50%";
		fileManager.style.height = "600px";
		fileManager.style.top = "10%";
		fileManager.style.left = "25%";
		fileManager.style.borderRadius = "5px";
		fileManager.style.padding = "20px";
		fileManager.style.backgroundColor = "#FFFFFF";
		fileManager.style.zIndex = "2147483647";

		var currentFolderView = "<div style='height: 50px;'>\
									<input type='text' id='currentFolderDisplay' placeholder='" + folderList["folders"][0]["name"] + "'>\
									<input type='button' id='tabberAddFolder' value='+'>\
									<input type='button' id='tabberRenameFolder' value='/'>\
									<input type='button' id='tabberRemoveFolder' value='-'>\
									<input type='button' id='tabberInviteFriends' value='i'>\
								</div>";
		var folderTreeView = getFolderTreeView(folderList);
		var conversationView = "<div id='conversationDisplay' style='overflow-y: auto; height: 200px; border: 1px solid #333;'></div>";

		fileManager.innerHTML = currentFolderView + folderTreeView + conversationView + formDefs;

		document.body.appendChild(canvas); // Imposes a low-opacity "canvas" on entire page
		document.body.appendChild(fileManager); // Prompts the "save" dialog

		var tabberFolders = document.getElementsByClassName("tabberFolder");
		var tabberConversations = document.getElementsByClassName("tabberConversation");

		// Folder event listeners
		for (var i = 0; i < tabberFolders.length; i++) {
			if (tabberFolders[i].nextSibling && tabberFolders[i].nextSibling.tagName.toLowerCase() == "ul") {
				addFolderListeners(tabberFolders[i]);
			}
		}

		// Displays a conversation when clicked
		var conversationDisplay = document.getElementById("conversationDisplay");
		for (var i = 0; i < tabberConversations.length; i++) {
			addConversationListeners(tabberConversations[i]);
		}

		// Adds a subfolder under the currently selected folder
		var addFolderButton = document.getElementById("tabberAddFolder");
		addFolderButton.addEventListener("click", function() {
			currentFolderChildren = CUR_SELECTED.nextSibling.childNodes; // List of following <ul> which has folder contents

			// Traverse until just before first conversation (currently we append to end instead)
			// NOTE: Each conversation / folder has 2 corresponding elements: the <li> and the <ul> following it
			// var i;
			// for (i = 0; i < currentFolderChildren.length; i += 2) {
			// 	// First folder is detected; break
			// 	if (currentFolderChildren[i].classList.contains("tabberConversation")) break;
			// }

			// New folder <li>
			var newFolder = document.createElement("li");
			newFolder.classList.add("tabberFolder");
			newFolder.innerHTML = "New Folder";
			newFolder.style.color = "#7B7F84";
			newFolder.contentEditable = "true";
			var parentName = CUR_SELECTED.innerHTML;
			newFolder.addEventListener("keydown", function(e) {
				if (e.key == "Enter") {
					this.contentEditable = false;
					window.postMessage({type: "add_folder", text: {name: this.innerText, parent: parentName}}, '*');
					console.log("Added folder to database");
				}
			});
			addFolderListeners(newFolder);

			// New folder <ul> element
			var newFolderList = document.createElement("ul");
			newFolderList.style.marginLeft = "15px";

			// If we want to insert before a certain element, use the commented line
			// CUR_SELECTED.nextSibling.insertBefore(newFolderList, currentFolderChildren[i]);
			CUR_SELECTED.nextSibling.appendChild(newFolderList);
			CUR_SELECTED.nextSibling.insertBefore(newFolder, newFolderList);

			// Set cursor to end
			var range = document.createRange();
			var sel = window.getSelection();
			range.setStart(newFolder, 1);
			sel.removeAllRanges();
			sel.addRange(range);
			newFolder.focus();
		});

		// Renames the currently selected folder
		var renameFolderButton = document.getElementById("tabberRenameFolder");
		renameFolderButton.addEventListener("click", function() {
			CUR_SELECTED.contentEditable = true;
			var oldName = CUR_SELECTED.innerText;
			CUR_SELECTED.addEventListener("keydown", function(e) {
				if (e.key == "Enter") {
					this.contentEditable = false;
					window.postMessage({type: "rename_folder", text: {name: oldName, newName: this.innerText}}, '*');
					console.log("Renamed folder in database")
				}
			})

			// Set cursor to end
			var range = document.createRange();
			var sel = window.getSelection();
			range.setStart(CUR_SELECTED, 1);
			sel.removeAllRanges();
			sel.addRange(range);
			CUR_SELECTED.focus();
		});

		// Removes the currently selected folder (and everything in it)
		// TODO: Add confirmation dialog
		var removeFolderButton = document.getElementById("tabberRemoveFolder");
		removeFolderButton.addEventListener("click", function() {
			console.log("Removing folder");
			// Sends delete folder request to server
			window.postMessage({type: "delete_folder", text: {name: CUR_SELECTED.innerText, parentName: CUR_SELECTED.parentNode.previousSibling.innerText}}, '*');

			CUR_SELECTED.nextSibling.parentNode.removeChild(CUR_SELECTED.nextSibling);
			CUR_SELECTED.parentNode.removeChild(CUR_SELECTED);
		});

		// Opens the referral dialog
		// TODO: The referral dialog
		var inviteFriendButton = document.getElementById("tabberInviteFriends");
		inviteFriendButton.addEventListener("click", function() {
			console.log("Opening referral dialog");
			// Sends request to open the referral dialog to the background script
			window.postMessage({type: "invite_friend", text: {}}, '*');
		});


		var cancelForm = document.getElementById("cancelButton");

		cancelForm.onclick = function() {
			document.body.removeChild(fileManager);
			document.body.removeChild(canvas);
		}

		console.log("Displayed file manager.");
	}

	// Content scripts --> here --> injected JS
	window.addEventListener('message', function(event) {
		if (event.data.type && event.data.type == "tabber_file_manager") {
			console.log("JS injection received: " + event.data.text);
			// Sends request to get all conversations once file manager is opened
			window.postMessage({type: "get_conversations", text: {}}, '*');
		}
		if (event.data.type && event.data.type == "tabber_folder_list") {
			console.log("Folder list received: " + event.data.contents);
			openFileManager(event.data.contents);
		}
	});
}

// Prepares the JS injection
var injectFileManager = function() {
	var script = document.createElement('script');
	script.textContent = "(" + fileManager.toString() + ")();";
	document.head.appendChild(script);
}

// Background script --> here --> injected JS
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.message == "clicked_find_messages" && !injectedFileManager) {
		console.log("Sent request to inject file manager.");
		injectedFileManager = true;
		injectFileManager();
	}
	if (request.message == "clicked_find_messages") {
		console.log("Sent request to open injected file manager")
		window.postMessage({type: 'tabber_file_manager', text: 'Find messages clicked.', contents: request.folders}, '*' );
	}
	if (request.message == "tabber_folder_list") {
		console.log("Sent folderList to injected file manager")
		window.postMessage({type: 'tabber_folder_list', text: 'folderList sent.', contents: request.folderList}, '*' );
	}
});

// Injected JS --> here --> background script
window.addEventListener('message', function(event) {
	if (event.data.type && event.data.type == "get_conversations")
		getConversationsPort.postMessage();
	if (event.data.type && event.data.type == "add_folder")
		addFolderPort.postMessage({parent: event.data.text.parent, name: event.data.text.name});
	if (event.data.type && event.data.type == "rename_folder")
		renameFolderPort.postMessage({name: event.data.text.name, newName: event.data.text.newName});
	if (event.data.type && event.data.type == "delete_folder")
		deleteFolderPort.postMessage({name: event.data.text.name, parentName: event.data.text.parentName});
	if (event.data.type && event.data.type == "invite_friend")
		inviteFriendPort.postMessage();
});
