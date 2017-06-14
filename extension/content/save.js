////GLOBALS////

injected = false;

////MAIN////

console.log("Initializing tabber.");
window.localStorage.setItem('tabber-id', chrome.runtime.id);
console.log("Extension ID: " + window.localStorage.getItem('tabber-id'));

var payload = function() {
	var scrapeAllMessages = function() {
		var scrapedMessages = []; // All loaded messages and their respective sender + coordinates, in chronological order

		var containerNode = document.getElementsByClassName('__i_')[0];
		containerNode.childNodes.forEach(function(child) {
			if (child.tagName == 'DIV' && child.id.length > 0) {
				child.childNodes.forEach(function(c) {
					if (c.tagName == 'DIV') {
						var msgWrapperNodes = c.childNodes[0].getElementsByClassName('clearfix');

						for (var i = 0; i < msgWrapperNodes.length; i++) {
							var msgNode = msgWrapperNodes[i].childNodes[0].childNodes[0];

							if (msgNode == undefined || msgNode == null) continue; // Detects if message is rich media content

							var messageContents = msgNode.textContent;
							var sender = 0; // 0 for sent, 1 for received
							if (window.getComputedStyle(msgWrapperNodes[i].childNodes[0], null).getPropertyValue("background-color") == "rgb(241, 240, 240)") {
								sender = 1;
							}
							var position = msgNode.getBoundingClientRect();

							scrapedMessages.push({"sender": sender, "message": messageContents, "coordinates": [position.left + window.pageXOffset, position.top + window.pageYOffset]});
						}
					}
				});
			}
		});

		console.log("Scraped all loaded messages.");
		return scrapedMessages;
	}

	var selectMessages = function(callback) {
		var region = {"initial": [], "final": []}; // Coordinate bounds of selection region
		var messages = []; // All loaded messages including sender and coordinates
		var tabber_svg, tabber_mask, tabber_clip; // Masking animation shared variables

		var initSVG = function() {
			console.log("Initializing canvas.");

			// NOTE: Change this to change where mask is placed
			var mask_target = document.body;

			var svg_defs = `<svg id="tabber_svg" width="100%" height="100%">
							<defs>
								<mask id="Mask">
									<rect width="100%" height="100%" fill="#fff" />
									<rect id="clip" x="0" y="0" width="0" height="0" fill="#000"></rect>
								</mask>
							</defs>
							<rect id="mask" x="0" y="0" width="100%" height="100%" fill="black" opacity =".5" mask="url(#Mask)"/>
							</svg>`;

			$(mask_target).insertAdjacentHTML("beforeend", svg_defs);
			tabber_svg = document.getElementById("tabber_svg");
			tabber_svg.style.position = "fixed";
			tabber_svg.style.top = "0";
			tabber_svg.style.left = "0";
			tabber_svg.style.zIndex = "2147483647";
			tabber_svg.style.cursor = "crosshair";

			tabber_mask = document.getElementById("mask");
			tabber_clip = document.getElementById("clip");

			// Allows user to interact with mask
			tabber_mask.addEventListener("mousedown", startMask, false);
			tabber_mask.addEventListener("mouseup", endMask, false);
		}

		var startMask = function(e) {
			region.initial = [e.pageX, e.pageY]; // Records initial coordinates in region array

			// Creates "hole" in mask and attaches resize listener
			tabber_clip.setAttribute("x", e.pageX);
			tabber_clip.setAttribute("y", e.pageY);
			tabber_clip.setAttribute("width", "0");
			tabber_clip.setAttribute("height", "0");
			tabber_mask.addEventListener("mousemove", resizeMask, false);
		}

		var resizeMask = function(e) {
			if (e.pageX - region.initial[0] > 0) tabber_clip.setAttribute("width", e.pageX - region.initial[0]);
			else {
				tabber_clip.setAttribute("x", e.pageX);
				tabber_clip.setAttribute("width", region.initial[0] - e.pageX);
			}

			if (e.pageY - region.initial[1] > 0) tabber_clip.setAttribute("height", e.pageY - region.initial[1]);
			else {
				tabber_clip.setAttribute("y", e.pageY);
				tabber_clip.setAttribute("height", region.initial[1] - e.pageY);
			}
		}

		var endMask = function(e) {
			region.final = [e.pageX, e.pageY]; // Records final coordinates in region array
			tabber_mask.removeEventListener("mousemove", resizeMask, false);

			// NOTE: Naive cleanup. More to do based on how we handle user actions
			// tabber_mask.parentNode.removeChild(tabber_mask);
			// tabber_clip.parentNode.removeChild(tabber_clip);
			tabber_svg.parentNode.removeChild(tabber_svg);

			filterMessages();
			console.log("Filtered scraped messages through selection bounds.")
		}

		initSVG();

		messages = scrapeAllMessages();
		var selectedMessages = []; // Selected messages distinguished by sender (ordered chronologically)

		// Filters messages through region bounds and append to selectedMessages
		var filterMessages = function() {
			// TODO: Should we grab messages that are partially within mask? Only works if message's top left is inside
			messages.forEach(function(m) {
				if (region.initial[0] < region.final[0] && region.initial[1] < region.final[1]) {
					if ((m.coordinates[0] >= region.initial[0] && m.coordinates[0] <= region.final[0]) &&
						(m.coordinates[1] >= region.initial[1] && m.coordinates[1] <= region.final[1])) {
						selectedMessages.push({"sender": m.sender, "message": m.message});
					}
				} else if (region.initial[0] < region.final[0] && region.initial[1] > region.final[1]) {
					if ((m.coordinates[0] >= region.initial[0] && m.coordinates[0] <= region.final[0]) &&
						(m.coordinates[1] <= region.initial[1] && m.coordinates[1] >= region.final[1])) {
						selectedMessages.push({"sender": m.sender, "message": m.message});
					}
				} else if (region.initial[0] > region.final[0] && region.initial[1] > region.final[1]) {
					if ((m.coordinates[0] <= region.initial[0] && m.coordinates[0] >= region.final[0]) &&
						(m.coordinates[1] <= region.initial[1] && m.coordinates[1] >= region.final[1])) {
						selectedMessages.push({"sender": m.sender, "message": m.message});
					}
				} else if (region.initial[0] > region.final[0] && region.initial[1] < region.final[1]) {
					if ((m.coordinates[0] <= region.initial[0] && m.coordinates[0] >= region.final[0]) &&
						(m.coordinates[1] >= region.initial[1] && m.coordinates[1] <= region.final[1])) {
						selectedMessages.push({"sender": m.sender, "message": m.message});
					}
				}
			});

			callback(selectedMessages);
		}
	}

	window.addEventListener('message', function(event) {
		if (event.data.type && event.data.type == "tabber_run") {
			console.log("JS injection received: " + event.data.text);

			selectMessages(function(selectedMessages) {
				// TODO: Pull folders with the most content from messages.json
				var folderHTML = "";
				event.data.contents.forEach(function(f) {
					folderHTML += "<option> " + f + " </option> ";
				});

				var canvas = document.createElement('div');
				var saveDialog = document.createElement("div");
				var form_defs = `<form id="saveForm">
									<label for="name"> Name: </label>
				    			<input type="text" id="nameInput" name="name" value="` + selectedMessages[0].message + `" autofocus="autofocus" onclick="this.select()" style="width: 100%; padding: 12px 15px; margin: 8px 0; display: inline-block; border: 1px solid #CCC; border-radius: 4px; box-sizing: border-box;">

				    			<label for="folder"> Folder: </label>
				    			<select id="folderInput" name="folder" style="width: 100%; padding: 12px 15px; margin: 8px 0; display: inline-block; border: 1px solid #CCC; border-radius: 4px; box-sizing: border-box;">` + folderHTML +

									`<input type="submit" value="Save" style="width: 100%; background-color: #2C9ED4; color: white; padding: 14px 20px; margin: 8px 0; border: none; border-radius: 4px; cursor: pointer;">
				    			<input id="cancelButton" type="button" value="Cancel" style="width: 100%; background-color: #FFF; color: #2C9ED4; padding: 14px 20px; margin: 8px 0; border-style: solid; border-color: #2C9ED4; border-radius: 4px; cursor: pointer;">
				  			</form>`;

				canvas.style = "background-color: rgba(0,0,0,.35); z-index: 2147483647; width: 100%; height: 100%; top: 0px; left: 0px; display: block; position: absolute;";

				saveDialog.style.position = "fixed";
				saveDialog.style.width = "50%";
				saveDialog.style.height = "400px";
				saveDialog.style.top = "15%";
				saveDialog.style.left = "25%";
				saveDialog.style.borderRadius = "5px";
				saveDialog.style.padding = "20px";
				saveDialog.style.backgroundColor = "#FFFFFF";
				//saveDialog.style.boxShadow = "0px 1px 4px #000000";
				saveDialog.style.zIndex = "2147483647";

				// HTML generator for selected messages preview
				var messagePreview = "";
				selectedMessages.forEach(function(m) {
					if (m.sender == 1) messagePreview += "<p style='color: #7B7F84; margin: 0;'> " + m.message + " </p>";
					else messagePreview += "<p style='color: #2C9ED4; margin: 0;'> " + m.message + " </p>";
				});
				messagePreview = "<div style='overflow-y: scroll; height: 100px;'> " + messagePreview + " </div>";

				saveDialog.innerHTML = messagePreview + form_defs;

				document.body.appendChild(canvas); // Imposes a low-opacity "canvas" on entire page
				document.body.appendChild(saveDialog); // Prompts the "save" dialog

				console.log("Prompted saved dialog.");

				var saveForm = document.getElementById("saveForm");
				var cancelForm = document.getElementById("cancelButton");

				saveForm.onsubmit = function() {
					var name = document.getElementById("saveForm").name.value;
					var folder = document.getElementById("saveForm").folder.value;

					// TODO: Detect whether user created new folder
					window.postMessage({type: "dialog_input", text: {"name": name, "folder": folder, "newFolder": 0, "messages": selectedMessages}}, '*');

					document.body.removeChild(saveDialog);
					document.body.removeChild(canvas);
				}

				cancelForm.onclick = function() {
					document.body.removeChild(saveDialog);
					document.body.removeChild(canvas);
				}
			});
		}
	});
}

// Prepares the JS injection
var inject = function() {
	var script = document.createElement('script');
	script.textContent = "(" + payload.toString() + ")();";
	document.head.appendChild(script);
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.message == "clicked_browser_action" && !injected) {
		console.log("User clicked browser action for first time. Injecting stuff.");
		injected = true;
		inject();
	}
	if (request.message == "clicked_browser_action")
		window.postMessage({type: 'tabber_run', text: 'Browser action clicked.', contents: request.folders}, '*' );
});

// Opens long-lived connection b/w content and background
var port = chrome.runtime.connect(window.localStorage.getItem('tabber-id'), {name: "saved-messages"});
window.addEventListener('message', function(event) {
	if (event.data.type && event.data.type == "dialog_input") {
		console.log("Messages, labeled '" + event.data.text.name + "', sent to '" + event.data.text.folder + "'");
		port.postMessage({messages: {name: event.data.text.name, folder: event.data.text.folder, content: event.data.text.messages}});
	}
});
