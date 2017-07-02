/* GLOBALS */

var conversationPort = chrome.runtime.connect(window.localStorage.getItem('tabber-id'), {name: "conversations"});
injectedSaveConversation = false;

/* MAIN */

console.log("Initializing tabber.");
window.localStorage.setItem('tabber-id', chrome.runtime.id);
console.log("Extension ID: " + window.localStorage.getItem('tabber-id'));

var saveConversation = function() {
	var scrapeLoadedMessages = function() {
		var scrapedMessages = []; // All loaded messages and their respective author + coordinates, in chronological order
		var recipient = document.getElementsByClassName("_3oh-")[1].textContent;

		var containerNode = document.getElementsByClassName('__i_')[0];
		containerNode.childNodes.forEach(function(child) {
			if (child.tagName == 'DIV' && child.id.length > 0) {
				child.childNodes.forEach(function(c) {
					if (c.tagName == 'DIV') {
						var msgWrapperNodes = c.childNodes[0].getElementsByClassName('clearfix');

						for (var i = 0; i < msgWrapperNodes.length; i++) {
							var msgNode = msgWrapperNodes[i].childNodes[0].childNodes[0];

							if (msgNode == undefined || msgNode == null) continue; // Detects if message is rich media content

							var author = 0; // 0 for sent, 1 for received
							if (window.getComputedStyle(msgWrapperNodes[i].childNodes[0], null).getPropertyValue("background-color") == "rgb(241, 240, 240)")
								author = recipient;
							var position = msgNode.getBoundingClientRect();

							scrapedMessages.push({"author": author, "message": msgNode.textContent, "coordinates": [position.left + window.pageXOffset, position.top + window.pageYOffset]});
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
		var messages = []; // All loaded messages including author and coordinates
		var tabber_svg, tabber_mask, tabber_clip; // Masking animation shared variables

		var initSVG = function() {
			console.log("Initializing canvas.");

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

		messages = scrapeLoadedMessages();
		var selectedMessages = []; // Selected messages distinguished by author (ordered chronologically)

		// Filters messages through region bounds and append to selectedMessages
		var filterMessages = function() {
			// TODO: Should we grab messages that are partially within mask? Only works if message's top left is inside
			messages.forEach(function(m) {
				if (region.initial[0] < region.final[0] && region.initial[1] < region.final[1]) {
					if ((m.coordinates[0] >= region.initial[0] && m.coordinates[0] <= region.final[0]) &&
						(m.coordinates[1] >= region.initial[1] && m.coordinates[1] <= region.final[1])) {
						selectedMessages.push({"author": m.author, "message": m.message});
					}
				} else if (region.initial[0] < region.final[0] && region.initial[1] > region.final[1]) {
					if ((m.coordinates[0] >= region.initial[0] && m.coordinates[0] <= region.final[0]) &&
						(m.coordinates[1] <= region.initial[1] && m.coordinates[1] >= region.final[1])) {
						selectedMessages.push({"author": m.author, "message": m.message});
					}
				} else if (region.initial[0] > region.final[0] && region.initial[1] > region.final[1]) {
					if ((m.coordinates[0] <= region.initial[0] && m.coordinates[0] >= region.final[0]) &&
						(m.coordinates[1] <= region.initial[1] && m.coordinates[1] >= region.final[1])) {
						selectedMessages.push({"author": m.author, "message": m.message});
					}
				} else if (region.initial[0] > region.final[0] && region.initial[1] < region.final[1]) {
					if ((m.coordinates[0] <= region.initial[0] && m.coordinates[0] >= region.final[0]) &&
						(m.coordinates[1] >= region.initial[1] && m.coordinates[1] <= region.final[1])) {
						selectedMessages.push({"author": m.author, "message": m.message});
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
				// TODO: Implement an option to display an expanded file view

				// HTML generator for the folder dropdown
				var folderHTML = "";
				var count = 0;
				event.data.contents.forEach(function(f) {
					if (count == 0)
						folderHTML += "<input class='selectOption' type='radio' id='opt" + count + "' checked><label for='opt" + count + "' class='folderOption'>" + f + "</label>"
					else
						folderHTML += "<input class='selectOption' type='radio' id='opt" + count + "'><label for='opt" + count + "' class='folderOption'>" + f + "</label>"
					count++;
				});

				// HTML generator for selected messages preview
				var messagePreview = "";
				selectedMessages.forEach(function(m) {
					if (m.author == 0) messagePreview += "<p class='messageLines' style='color: #2C9ED4; margin: 0;'><strong>Me:</strong> " + m.message + " </p>";
					else messagePreview += "<p class='messageLines' style='color: #7B7F84; margin: 0;'><strong>" + m.author + ":</strong> " + m.message + " </p>";
				});

				var canvas = document.createElement('div');
				var saveDialog = document.createElement("div");

				var formDefs = `<div id="saveConvoWrapper" style="margin: auto;">
										      <div class="convoWrapper">
										        <div id="convoPreview">` +
															messagePreview +
										        `</div><!--#convoPreview-->
										      </div><!--.convoWrapper-->

										      <hr id="convoDivisor">

										      <div id="saveContent">
										          <form id="saveForm">
										            <input type="text" class="saveInputFields" id="convoName" autocomplete="off" placeholder="Conversation Name">
										            <div class="selectFolders" tabindex="1">` +
																	folderHTML +
										            `</div>
										            <input id="saveConvoButton" class="saveConvoButton" type="submit" value="Save">
										            <div id="cancelSaveConvo">
										              <p>Cancel</p>
										            </div>
										          </form><!--#saveForm-->
										      </div><!--#saveContent-->
										    </div><!--#saveConvoWrapper-->`;

				canvas.style.backgroundColor = "rgba(0,0,0,.35)";
				canvas.style.zIndex = "2147483647";
				canvas.style.width = "100%";
				canvas.style.height = "100%";
			  canvas.style.top = "0px";
				canvas.style.left = "0px";
				canvas.style.display = "block";
				canvas.style.position = "absolute";

				saveDialog.style.position = "fixed";
				saveDialog.style.width = "50%";
				saveDialog.style.height = "400px";
				saveDialog.style.top = "15%";
				saveDialog.style.left = "25%";
				saveDialog.style.borderRadius = "5px";
				saveDialog.style.padding = "20px";
				saveDialog.style.backgroundColor = "#FFFFFF";
				saveDialog.style.zIndex = "2147483647";

				saveDialog.innerHTML = formDefs;

				// TODO: Slim down and reorganized all of this CSS
				document.getElementsByTagName('style')[0].innerHTML = `.convoWrapper {
																															  overflow: hidden;
																															  height: 145px;
																															  width: 478px;
																															  font-family: Helvetica;
																															  font-size: 13px;
																															  margin-left: 40px;
																															}

																															#convoPreview {
																															  height: 87px;
																															  margin-top: 30px;
																															  overflow-y: scroll;
																															}

																															#convoDivisor {
																															  background-color: #F5F7F9;
																															  height: 1px;
																															  border: none;
																															  margin-top: -3px;
																															}

																															#saveContent {
																															  position: relative;
																															  top: 30px;
																															  left: 40px;
																															}

																															.saveInputFields {
																															  box-sizing: border-box;
																															  width: 478px;
																															  padding: 14px 20px;
																															  outline: none;
																															  display: inline-block;
																															  margin: 0 0 15px 0;
																															  border: none;
																															  border-radius: 1px;
																															  box-shadow: 0px 1px 3px #D9D9D9;
																															  color: #7D858E;
																															  font-family: Helvetica;
																															  font-weight: 400;
																															  font-size: 13px;
																															}

																															#convoName::-webkit-input-placeholder {
																															  color: #CDD8E6;
																															}

																															.saveConvoButton {
																															  position: relative;
																															  background-color: #2C9ED4;
																															  text-align: center;
																															  width: 135px;
																															  height: 42px;
																															  border: none;
																															  color: #FFFFFF;
																															  font-family: Helvetica;
																															  font-weight: 600;
																															  font-size: 13px;
																															  cursor: pointer;
																															  border-radius: 10px 1px 10px 1px;
																															  margin-left: 343px;
																															  margin-top: 0px;
																															  float: left;
																															  overflow: hidden;
																															  display: inline-block;
																															  border: none;
																															  outline: none;
																															}

																															.saveConvoButton:hover {
																															  background-color: rgb(101,184,203);
																															}

																															.selectFolders {
																															  display: flex;
																															  flex-direction: column;
																															  position: relative;
																															  width: 478px;
																															  height: 42px;
																															  outline: none;
																															  cursor: pointer;
																															  color: #7D848E;
																															  box-shadow: 0px 1px 3px #D9D9D9;
																															  border-radius: 1px;
																															  margin: 0 0 15px 0;
																															}

																															.folderOption {
																															  padding: 0 30px 0 20px;
																															  min-height: 42px;
																															  display: flex;
																															  align-items: center;
																															  background-color: #FFF;
																															  border-top: #F5F7F9 solid 1px;
																															  position: absolute;
																															  top: 0;
																															  width: 100%;
																															  pointer-events: none;
																															  order: 2;
																															  z-index: 1;
																															  transition: background 0s ease-in-out;
																															  box-sizing: border-box;
																															  overflow: hidden;
																															  white-space: nowrap;
																															  font-family: Helvetica;
																															  font-size: 13px;
																															  cursor: pointer;
																															}

																															.folderOption:hover {
																															  background: rgb(44,158,212);
																															  color: #FFF;
																															}

																															.selectFolders:focus .folderOption {
																															  position: relative;
																															  pointer-events: all;
																															}

																															.selectOption {
																															  opacity: 0;
																															  position: absolute;
																															  left: -99999px;
																															}

																															.selectOption:checked + .folderOption {
																															  order: 1;
																															  z-index: 2;
																															  background: #FFF;
																															  border-top: none;
																															  position: relative;
																															}

																															.selectOption:checked + .folderOption:after {
																															  content: '';
																															  width: 0;
																																height: 0;
																																border-left: 5px solid transparent;
																																border-right: 5px solid transparent;
																																border-top: 5px solid #7D848E;
																															  position: absolute;
																															  right: 10px;
																															  top: calc(50% - 2.5px);
																															  pointer-events: none;
																															  z-index: 3;
																															}

																															.selectOption:checked + .folderOption:before {
																															  position: absolute;
																															  right: 0;
																															  height: 40px;
																															  width: 40px;
																															  content: '';
																															  background: #FFF;
																															}

																															::-webkit-scrollbar {
																															  display: none;
																															}

																															#cancelSaveConvo {
																															  position: relative;
																															  float: left;
																															  display: inline-block;
																															  font-family: Helvetica;
																															  font-weight: 600;
																															  font-size: 13px;
																															  color: #7D848E;
																															  cursor: pointer;
																															  margin-left: -198px;
																															}

																															#cancelSaveConvo:hover {
																															  color: #BEC1C6;
																															}

																															.messageLines {
																															  line-height: 150%;
																															}`;

				document.body.appendChild(canvas); // Imposes a low-opacity "canvas" on entire page
				document.body.appendChild(saveDialog); // Prompts the "save" dialog

				console.log("Prompted dialog for saving conversations.");

				var saveForm = document.getElementById("saveForm");
				var cancelButton = document.getElementById("cancelSaveConvo");

				canvas.onclick = function() {
					document.body.removeChild(signUpDialog);
					document.body.removeChild(canvas);
				}

				cancelButton.onclick = function() {
					document.body.removeChild(saveDialog);
					document.body.removeChild(canvas);
				}

				saveForm.onsubmit = function() {
					var name = (this).name.value;
					//var folder = (this).folder.value; // Needs to be fixed

					window.postMessage({type: "dialog_input", text: {"name": name, "folder": folder, "messages": selectedMessages}}, '*');
					window.addEventListener('message', function(event) {
						if (event.data.type == 'save-confirmation' && event.data.value) {
							// TODO: Implement a sweet alert notification for successfully saved convos
							document.body.removeChild(saveDialog);
							document.body.removeChild(canvas);
						}
					})
				}
			});
		}
	});
}

// Prepares the JS injection
var injectSaveConversation = function() {
	var script = document.createElement('script');
	script.textContent = "(" + saveConversation.toString() + ")();";
	document.head.appendChild(script);
}

// Listens for browser action click
chrome.runtime.onMessage.addListener(function(request, author, sendResponse) {
	if (request.message == "clicked_browser_action" && !injectedSaveConversation) {
		console.log("User clicked browser action for first time. Injecting stuff.");
		injectedSaveConversation = true;
		injectSaveConversation();
	}
	if (request.message == "clicked_browser_action")
		window.postMessage({type: 'tabber_run', text: 'Browser action clicked.', contents: request.folders}, '*' );
});

// Passes conversation payload to background script
window.addEventListener('message', function(event) {
	if (event.data.type && event.data.type == "dialog_input") {
		console.log("Messages, labeled '" + event.data.text.name + "', sent to '" + event.data.text.folder + "'");
		conversationPort.postMessage({name: event.data.text.name, folder: event.data.text.folder, messages: event.data.text.messages});
	}
});

// Receives "saved conversation" confirmation from background script
conversationPort.onMessage.addListener(function(msg) {
	if (msg.saved)
		window.postMessage({type: 'save-confirmation', value: msg.saved}, '*');
});
