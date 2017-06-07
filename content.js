////GLOBALS////

injected = false;

////MAIN////

// TODO: Refactor so that when user clicks button again, they can select more messages but injection doesn't occur

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

							// Detects if message is rich media content
							if (msgNode == undefined || msgNode == null) continue;

							var messageContents = msgNode.innerHTML; // TODO: Get rid of <span> tags
							var sender = 0; // 0 for sent, 1 for received
							// TODO: Check previous div's backgroundColor attribute (#f1f0f0) and change sender accordingly
							var position = msgNode.getBoundingClientRect();

							scrapedMessages.push({"sender": sender, "message": messageContents, "coordinates": [position.left + window.pageXOffset, position.top + window.pageYOffset]});
						}
					}
				});
			}
		});
		return scrapedMessages;
	}

	var selectMessages = function(callback) {

		var region = {"initial": [], "final": []}; // Coordinate bounds of selection region
		var messages = []; // All loaded messages in the form [{"sender": sender, "message": messageContents, "coordinates": [x, y]}, ...]
		var tabber_svg, tabber_mask, tabber_clip; // Masking animation shared variables

		var initSVG = function() {
			console.log("initSVG");
			// NOTE: Change this to change where mask is placed
			var mask_target = document.body; // document.body for whole page

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
			// x
			if (e.pageX - region.initial[0] > 0) tabber_clip.setAttribute("width", e.pageX - region.initial[0]);
			else {
				tabber_clip.setAttribute("x", e.pageX);
				tabber_clip.setAttribute("width", region.initial[0] - e.pageX);
			}
			// y
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
		}

		initSVG();

		messages = scrapeAllMessages();

		// NOTE: Place this here for cumulative reselects
		var selectedMessages = []; // Selected messages distinguished by sender (ordered chronologically)

		var filterMessages = function() {

			// NOTE: Place this here for non-cumulative reselects
			// var selectedMessages = [];

			// Filter messages through region bounds and append to selectedMessages
			// TODO: Should we grab messages that are partially within mask? Only works if message's top left is inside
			messages.forEach(function(m) {

				if (region.initial[0] < region.final[0] && region.initial[1] < region.final[1]) {
					if ((m.coordinates[0] >= region.initial[0] && m.coordinates[0] <= region.final[0]) &&
						(m.coordinates[1] >= region.initial[1] && m.coordinates[1] <= region.final[1])) {
						selectedMessages.push(m.message);
					}
				} else if (region.initial[0] < region.final[0] && region.initial[1] > region.final[1]) {
					if ((m.coordinates[0] >= region.initial[0] && m.coordinates[0] <= region.final[0]) &&
						(m.coordinates[1] <= region.initial[1] && m.coordinates[1] >= region.final[1])) {
						selectedMessages.push(m.message);
					}
				} else if (region.initial[0] > region.final[0] && region.initial[1] > region.final[1]) {
					if ((m.coordinates[0] <= region.initial[0] && m.coordinates[0] >= region.final[0]) &&
						(m.coordinates[1] <= region.initial[1] && m.coordinates[1] >= region.final[1])) {
						selectedMessages.push(m.message);
					}
				} else if (region.initial[0] > region.final[0] && region.initial[1] < region.final[1]) {
					if ((m.coordinates[0] <= region.initial[0] && m.coordinates[0] >= region.final[0]) &&
						(m.coordinates[1] >= region.initial[1] && m.coordinates[1] <= region.final[1])) {
						selectedMessages.push(m.message);
					}
				}
			});
			callback(selectedMessages);
		}
	}

	window.addEventListener('message', function(event) {
		if (event.data.type && event.data.type == "tabber_run") {
			console.log("Content script received: " + event.data.text);
			selectMessages(function(selectedMessages) {
				// TODO: Next step goes here
				console.log(selectedMessages);
			});
		}
	});
}

// Prepares the JS injection
var inject = function() {
	var script = document.createElement('script');
	script.textContent = "(" + payload.toString() + ")();";
	// script.textContent = payload.toString() + "";
	document.head.appendChild(script);
}

// TODO: Handle on-click event for the browser action
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.message == "clicked_browser_action" && !injected) {
		console.log("User clicked browser action for first time. Injecting stuff.");
		injected = true;
		inject();
	}
	window.postMessage({type: 'tabber_run', text: 'run the damn script'}, '*' );
});

////BRAINSTORMING////

/*
// Sends pinned messages to background process
chrome.runtime.sendMessage(window.localStorage.getItem('pinheart-id'), {greeting: "pinned-messages", messages: pinnedMessages}, function(response) {
	console.log("Status: " + response.greeting);
});
*/

/*
port.postMessage({messages: pinnedMessages});
port.onMessage.addListener(function(response) {
	console.log("Status: " + response.status);
});
*/
