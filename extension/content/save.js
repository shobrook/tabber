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
		if (event.data.type == "tabber-run") {
			console.log("Browser action has been clicked.");

			selectMessages(function(selectedMessages) {
				// HTML generator for the folder dropdown
				var folderHTML = "";
				var count = 0;
				event.data.value.forEach(function(f) {
					if (count == 0)
						folderHTML += "<option selected>" + f + "</option>";
					else
						folderHTML += "<option>" + f + "</option>";
				});

				// HTML generator for selected messages preview
				var messagePreview = "";
				selectedMessages.forEach(function(m) {
					if (m.author == 0) messagePreview += "<p class='messageLines' style='color: #2C9ED4; margin: 0;'><strong>Me:</strong> " + m.message + " </p>";
					else messagePreview += "<p class='messageLines' style='color: #7B7F84; margin: 0;'><strong>" + m.author + ":</strong> " + m.message + " </p>";
				});

				var canvas = document.createElement('div');
				var saveDialog = document.createElement("div");

				var formDefs = `<div id="tabberHeader">
										      <img id="tabberWordmark" src="https://image.ibb.co/jKYbpa/Save_to_Tabber_WORDMARK.png">
										      <img id="registerExit" src="https://image.ibb.co/drrQfF/Exit_Button.png">
										    </div><!--#tabberHeader-->

										    <div class="convoWrapper">
										        <div class="convoPreviewWrapper">
										          <div id="convoPreview">` +
																messagePreview +
										          `</div><!--#convoPreview-->
										        </div><!--.convoPreviewWrapper-->
										      </div><!--.convoWrapper-->

										    <div id="saveConvoWrapper" style="margin: auto;">
										      <div id="saveContent">
										          <form id="saveForm">
										            <input type="text" class="saveInputFields" id="convoName" autocomplete="off" placeholder="Conversation Name">
										            <select id="folderDropdown">` +
																	folderHTML +
																`</select>
										            <input id="saveConvoButton" class="saveConvoButton" type="submit" value="Save">
										            <div id="createNewFolder">
										              <p>Create a new folder.</p>
										          </div><!--#createNewFolder-->
										          </form><!--saveForm-->
										      </div><!--saveContent-->
										    </div><!--saveConvoWrapper-->`;

				// Assigns CSS attributes to the canvas and save dialog container
				canvas.style.backgroundColor = "rgba(0,0,0,.35)";
				canvas.style.zIndex = "2147483647";
				canvas.style.width = "100%";
				canvas.style.height = "100%";
			  canvas.style.top = "0px";
				canvas.style.left = "0px";
				canvas.style.display = "block";
				canvas.style.position = "absolute";

				saveDialog.style.position = "fixed";
				saveDialog.style.width = "538px";
				saveDialog.style.height = "349px";
				saveDialog.style.top = "50%";
				saveDialog.style.left = "50%";
				saveDialog.style.borderRadius = "10px";
				saveDialog.style.backgroundColor = "#FFFFFF";
				saveDialog.style.marginLeft = "-269px";
				saveDialog.style.transform = "translateY(-50%)";
				saveDialog.style.zIndex = "2147483647";

				saveDialog.innerHTML = formDefs; // Wraps the save form and message preview with the dialog container

				document.getElementsByTagName('style')[0].innerHTML = `#convoPreview::-webkit-scrollbar {
																															    width: 5px;
																															}

																															#convoPreview::-webkit-scrollbar-thumb {
																															    background: #7D848E;
																															}

																															#convoPreview::-webkit-scrollbar-thumb:window-inactive {
																															    background: #7D848E;
																															}

																															#tabberHeader {
																															  background-color: #2C9ED4;
																															  position: relative;
																															  height: 42px;
																															  margin-top: -19px;
																															  border-radius: 10px 10px 0px 0px;
																															}

																															#tabberWordmark {
																															  position: relative;
																															  height: 16px;
																															  margin-top: 12px;
																															  margin-left: 30px;
																															  pointer-events: none;
																															}

																															#registerExit {
																															  position: relative;
																															  height: 15px;
																															  margin-left: 346px;
																															  cursor: pointer;
																															}

																															.convoWrapper {
																															  overflow-x: hidden;
																															  padding-bottom: 10px;
																															}

																															.convoPreviewWrapper {
																															  height: 120px;
																															  font-family: Helvetica;
																															  overflow: hidden;
																															  box-shadow: 0px 1px 3px #D9D9D9;
																															  font-size: 13px;
																															}

																															#convoPreview {
																															  height: 75px;
																															  margin-top: 18px;
																															  overflow-y: scroll;
																															  margin-left: 30px;
																															}

																															.messageLines {
																															  line-height: 150%;
																															}

																															#saveContent {
																															  position: relative;
																															  top: 20px;
																															  left: 30px;
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
																															  background-color: #2890C1;
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

																															#createNewFolder {
																															  display: inline-block;
																															  position: relative;
																															  top: -53px;
																															  font-family: Helvetica;
																															  font-weight: 600;
																															  font-size: 11px;
																															  color: #2C9ED4;
																															  cursor: pointer;
																															}

																															#createNewFolder:hover {
																															  text-decoration: underline;
																															}

																															#folderDropdown {
																															  cursor: pointer;
																															  border-radius: 1px;
																															  color: #7D848E;
																															  width: 478px;
																															  height: 42px;
																															  padding: 0px 52px;
																															  font-size: 13px;
																															  font-weight: 500;
																															  font-family: Helvetica;
																															  border: none;
																															  outline: none;
																															  -webkit-appearance: none;
																															  -moz-appearance: none;
																															  appearance: none;
																															  box-shadow: 0px 1px 3px #D9D9D9;
																															  background: url("https://preview.ibb.co/dqMMNv/Dropdown_BG.png") 0% / 100%;
																															  position: relative;
																															  margin: 0 0 15px 0;
																															}`;

				document.body.appendChild(canvas); // Imposes a low-opacity "canvas" on entire page
				document.body.appendChild(saveDialog); // Prompts the "save" dialog

				var saveForm = document.getElementById("saveForm");
				var exitButton = document.getElementById("registerExit");

				var selected = document.getElementById("folderDropdown");

				canvas.onclick = function() {
					document.body.removeChild(saveDialog);
					document.body.removeChild(canvas);
				}

				exitButton.onclick = function() {
					document.body.removeChild(saveDialog);
					document.body.removeChild(canvas);
				}

				saveForm.onsubmit = function() {
					var name = (this).convoName.value;
					var folder = selected.options[selected.selectedIndex].text;

					window.postMessage({type: "save-input", value: {"name": name, "folder": folder, "messages": selectedMessages}}, '*');
					window.addEventListener('message', function(event) {
						if (event.data.type == 'save-confirmation' && event.data.value) {
							document.body.removeChild(saveDialog);
							document.body.removeChild(canvas);
						}
					});
				}

				console.log("Prompted dialog for saving conversations.");
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

// Listens for "clicked-browser-action" event from background script
chrome.runtime.onMessage.addListener(function(request, author, sendResponse) {
	if (request.message == "clicked-browser-action" && !injectedSaveConversation) {
		console.log("User clicked browser action for first time. Injecting stuff.");
		injectedSaveConversation = true;
		injectSaveConversation();
	}
	if (request.message == "clicked-browser-action")
		window.postMessage({type: 'tabber-run', value: request.folders}, '*' );
});

// Pulls conversation payload from JS injection and passes to background script
window.addEventListener('message', function(event) {
	if (event.data.type == "save-input") {
		console.log("Messages labeled '" + event.data.value.path + " were sent.");
		conversationPort.postMessage({path: event.data.value.path, messages: event.data.value.messages});
	}
});

// Listens for "saved conversation" confirmation from background script
conversationPort.onMessage.addListener(function(msg) {
	if (msg.type == "save-confirmation")
		window.postMessage({type: 'save-confirmation', value: msg.value}, '*');
});
