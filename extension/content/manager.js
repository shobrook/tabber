// TODO: Stylize the file manager

/* GLOBALS */

injectedFileManager = false;
getFoldersPort = chrome.runtime.connect(window.localStorage.getItem('tabber-id'), {name: "get-folders"});

/* MAIN */

var fileManager = function() {
	var openFileManager = function(folderList) {
		console.log("Running file manager.");

		var getFolderTreeViewRecursive = function(folder) {
			var folderListHTML = "<ul style='padding-left: 15px;'>";
			// NOTE: Switch the order of these loops to change whether conversations or subfolders come first
			for (var i = 0; i < folder["children"].length; i++) {
				folderListHTML += "<li class='tabberFolder' style='color: #7B7F84; margin: 0;'>" + folder["children"][i]["name"] + "</li>";
				folderListHTML += getFolderTreeViewRecursive(folder["children"][i]);
			}
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
			return folderListHTML + "</ul>";
		}

		var getFolderTreeView = function(folderList) {
			var folderListHTML = "<ul><li class='tabberFolder' style='color: #7B7F84; margin: 0;'>" + folderList["folders"][0]["name"] + "</li>";
			folderListHTML += getFolderTreeViewRecursive(folderList["folders"][0]) + "</ul>";
			return "<div style='overflow-y: scroll; height: 200px;'> " + folderListHTML + " </div><br>";
		}

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

		console.log(folderList);

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

		var folderTreeView = getFolderTreeView(folderList);
		var conversationView = "<div id='conversationDisplay' style='overflow-y: scroll; height: 200px;'>" + "Test Conversation" + "</div>";

		fileManager.innerHTML = folderTreeView + conversationView + formDefs;

		document.body.appendChild(canvas); // Imposes a low-opacity "canvas" on entire page
		document.body.appendChild(fileManager); // Prompts the "save" dialog

		// Toggles folder expand / collapse when clicked
		var tabberFolders = document.getElementsByClassName("tabberFolder");
		for (var i = 0; i < tabberFolders.length; i++) {
			if (tabberFolders[i].nextSibling && tabberFolders[i].nextSibling.tagName.toLowerCase() == "ul") {
				tabberFolders[i].addEventListener("click", function() {
					if (this.nextSibling.style.display == "none") {
						this.nextSibling.style.display = "";
					}
					else this.nextSibling.style.display = "none";
				}, false);
			}
		}

		// Displays a conversation when clicked
		var conversationDisplay = document.getElementById("conversationDisplay");
		var tabberConversations = document.getElementsByClassName("tabberConversation");
		for (var i = 0; i < tabberConversations.length; i++) {
			tabberConversations[i].addEventListener("click", function() {
				conversationDisplay.innerHTML = "";
				for (var j = 0; j < this.nextSibling.childNodes.length; j++) {
					var message = document.createElement('p');
					message.innerHTML = this.nextSibling.childNodes[j].getAttribute("data-author") + ": " + this.nextSibling.childNodes[j].innerHTML;
					conversationDisplay.appendChild(message);
				}
			});
		}

		var cancelForm = document.getElementById("cancelButton");

		cancelForm.onclick = function() {
			document.body.removeChild(fileManager);
			document.body.removeChild(canvas);
		}

		console.log("Displayed file manager.");
	}

	window.addEventListener('message', function(event) {
		if (event.data.type && event.data.type == "tabber_file_manager") {
			console.log("JS injection received: " + event.data.text);
			window.postMessage({type: "get_folders", text: {}}, '*');
		}
	});

	window.addEventListener('message', function(event) {
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

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.message == "clicked_find_messages" && !injectedFileManager) {
		console.log("User has clicked 'Find Messages' in the context menu.");
		injectedFileManager = true;
		injectFileManager();
	}
	if (request.message == "clicked_find_messages")
		window.postMessage({type: 'tabber_file_manager', text: 'Find messages clicked.', contents: request.folders}, '*' );
	if (request.message == "tabber_folder_list") {
		console.log("Sent folderList to injected file manager")
		window.postMessage({type: 'tabber_folder_list', text: 'folderList sent.', contents: request.folderList}, '*' );
	}
});

// Passes get_folders request to background script
window.addEventListener('message', function(event) {
	if (event.data.type && event.data.type == "get_folders")
		getFoldersPort.postMessage();
});
