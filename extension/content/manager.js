// GLOBALS

newInjected = false;

// MAIN

var newPayload = function() {
	console.log("Running file manager.");

	var canvas = document.createElement('div');
	var fileManager = document.createElement("div");

	var form_defs = `<form id="cancelForm">
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

	fileManager.innerHTML = form_defs;

	document.body.appendChild(canvas); // Imposes a low-opacity "canvas" on entire page
	document.body.appendChild(fileManager); // Prompts the "save" dialog

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
