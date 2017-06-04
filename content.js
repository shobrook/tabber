////GLOBALS////

/* Nothin' here yet */

////MAIN////

console.log("Initializing messagebook.");
window.localStorage.setItem('messagebook-id', chrome.runtime.id);
console.log("Extension ID: " + window.localStorage.getItem('messagebook-id'));

var payload = function() {

	var scrapeMessages = function() {
	
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
		
							var messageContents = msgNode.innerHTML; // TO-DO: Get rid of <span> tags
							var sender = 0; // 0 for sent, 1 for received
							// TO-DO: Check previous div's backgroundColor attribute (#f1f0f0) and change sender accordingly
							var position = msgNode.getBoundingClientRect();

							scrapedMessages.push({"sender": sender, "message": messageContents, "coordinates": [position.left, position.top]});
						}
					}
	
				});
			}

		});
		
		return scrapedMessages;
	
	}

	var selectMessages = function() {
		
		var region = []; // Coordinate bounds of selection region
		var messages = []; // All loaded messages in the form [{"sender": sender, "message": messageContents, "coordinates": [x, y]}, ...]

		var onMouseDown = function(e) {

			region.push([e.pageX, e.pageY]); // Pushes initial coordinates to region array
	
			// TO-DO: Create a selection div using clip-path somehow (good luck @Matthew)
			// TO-DO: Update width and height of selection div as mouse moves
	
		}
	
		var toggle = false;
		var onMouseUp = function(e) {
	
			region.push([e.pageX, e.pageY]); // Pushes final coordinates to region array

			// TO-DO: Remove selection div
	
			messages = scrapeMessages();
			toggle = true;
	
		}
	
		var div = document.createElement('div'); div.id = "wrapper";
		div.style = "background-color: rgba(0,0,0,.35); z-index: 2147483647; width: 100%; height: 100%; top: 0px; left: 0px; display: block; position: absolute; cursor: crosshair;";
		div.addEventListener("mousedown", function(e) { onMouseDown(e); }, false);
		div.addEventListener("mouseup", function(e) { onMouseUp(e); }, false);
		document.body.appendChild(div); // Imposes a low-opacity "canvas" on entire page

		// Testing purposes only (TO-DO: Call the below code once toggle is true)
		setTimeout(function() {

			if (toggle) {
				var selectedMessages = []; // Selected messages distinguished by sender (ordered chronologically)
			
				var child = document.getElementById("wrapper");
				document.body.removeChild(child);
			
				// Filter messages through region bounds and append to selectedMessages (TO-DO: Fix this)
				messages.forEach(function(m) {

					console.log(m.coordinates); // Testing
					console.log(region); // Testing

					if (region[0][0] < region[1][0] && region[0][1] > region[1][1]) {
						if ((m.coordinates[0] >= region[0][0] && m.coordinates[0] <= region[1][0]) &&
							(m.coordinates[1] <= region[0][1] && m.coordinates[1] >= region[1][1])) {
							selectedMessages.push(m);
						}
					} else if (region[0][0] < region[1][0] && region[0][1] < region[1][1]) {
						if ((m.coordinates[0] >= region[0][0] && m.coordinates[0] <= region[1][0]) &&
							(m.coordinates[1] >= region[0][1] && m.coordinates[1] <= region[1][1])) {
							selectedMessages.push(m);
						}
					} else if (region[0][0] > region[1][0] && region[0][1] < region[1][1]) {
						if ((m.coordinates[0] >= region[1][0] && m.coordinates[0] <= region[0][0]) &&
							(m.coordinates[1] <= region[1][1] && m.coordinates[1] >= region[0][1])) {
							selectedMessages.push(m);
						}
					} else if (region[0][0] > region[1][0] && region[0][1] > region[1][1]) {
						if ((m.coordinates[0] >= region[1][0] && m.coordinates[0] <= region[0][0]) &&
							(m.coordinates[1] >= region[1][1] && m.coordinates[1] <= region[0][1])) {
							selectedMessages.push(m);
						}
					}

				});

				return selectedMessages;
			}

		}, 10000);
	
	}

	var selection = selectMessages();

	// Opens long-lived channel b/w content script and extension
	var port = chrome.runtime.connect(window.localStorage.getItem('messagebook-id'), {name: "selected-messages"});
	port.postMessage({messages: selection});
	port.onMessage.addListener(function(response) {

  		console.log("Status: " + response.status);
	
	});

}

// Prepares the JS injection
var inject = function() {

	var script = document.createElement('script');
	script.textContent = "(" + payload.toString() + ")();";
	document.head.appendChild(script);

}

// TO-DO: Handle on-click event for the browser action

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

	if (request.message == "clicked_browser_action") {
		console.log("Browser action has been clicked.");
		inject();
	}

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