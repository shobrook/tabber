// GLOBALS

newInjected = false;

// MAIN

var newPayload = function() {
	console.log("Running file manager.");

	var getFolderTreeViewRecursive = function(folder) {
		console.log(folder);
		var folderListHTML = "<ul style='padding-left:15px;'>";
		for (var i = 0; i < folder["children"].length; i++) {
			folderListHTML += "<li class='tabberFolder' style='color: #7B7F84; margin: 0;'> " + folder["children"][i]["name"] + " </li>";
			if (folder["children"][i]["children"].length > 0) {
				console.log(folder["children"][i]["children"].length + " children found in folder: " + folder["children"][i]["name"]);
				folderListHTML += getFolderTreeViewRecursive(folder["children"][i]);
			}
		}
		return folderListHTML + "</ul>";
	}

	var getFolderTreeView = function(folderList) {
		console.log(folderList);
		var folderListHTML = "<ul><li class='tabberFolder' style='color: #7B7F84; margin: 0;'> " + folderList["folders"][0]["name"] + " </li>";
		if (folderList["folders"][0]["children"].length > 0) {
			console.log(folderList["folders"][0]["children"].length + " children found in folder: " + folderList["folders"][0]["name"]);
			folderListHTML += getFolderTreeViewRecursive(folderList["folders"][0]);
		}
		folderListHTML += "</ul>";

		return "<div style='overflow-y: scroll; height: 200px;'> " + folderListHTML + " </div>";
	}

	// TODO: Generate this via getFolders()
	// {"folders": [{"_id": "...", "conversations": [...], "name": "...", "children": [...], "user_id": "..."}]}
	var folderList = {"folders": [
									{"_id": 12345, "conversation": [], "name": "Everything", "children": [
										{"_id": 12346, "conversation": [], "name": "Folder 1", "children": [], "user_id": "test_id"},
										{"_id": 12347, "conversation": [], "name": "Folder 2", "children": [
											{"_id": 12348, "conversation": [], "name": "Folder 3", "children": [], "user_id": "test_id"},
											{"_id": 12349, "conversation": [], "name": "Folder 4", "children": [
												{"_id": 12350, "conversation": [], "name": "Folder 5", "children": [], "user_id": "test_id"}
											], "user_id": "test_id"}
										], "user_id": "test_id"}
									], "user_id": "test_id"},
								]};

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

	conversationText = "<div style='overflow-y: scroll; height: 100px;'> " + "Test Conversation" + " </div>";

	fileManager.innerHTML = folderTreeView + conversationText + formDefs;

	document.body.appendChild(canvas); // Imposes a low-opacity "canvas" on entire page
	document.body.appendChild(fileManager); // Prompts the "save" dialog

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

	var cancelForm = document.getElementById("cancelButton");

	cancelForm.onclick = function() {
		document.body.removeChild(fileManager);
		document.body.removeChild(canvas);
	}

	console.log("Displayed file manager.");
}

// Prepares the JS injection
var newInject = function() {
	var script = document.createElement('script');
	script.textContent = "(" + newPayload.toString() + ")();";
	document.head.appendChild(script);
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.message == "clicked_find_messages" && !newInjected) {
		console.log("User has clicked 'Find Messages' in the context menu.");
		newInjected = true;
		newInject();
	}
});
