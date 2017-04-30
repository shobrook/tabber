////GLOBALS////

/* Nothin' here yet */

////MAIN////

console.log("Initializing pinheart.");
window.localStorage.setItem('pinheart-id', chrome.runtime.id);
console.log("Extension ID: " + window.localStorage.getItem('pinheart-id'));

// Listeners, handlers. and functions for retrieving pinned messages
var payload = function() {
	// Scrapes pinned messages in main conversation and sends to the extension
	var scrape = function() {
		var pinnedMessages = []; // In order from oldest to newest
	
		var containerNode = document.getElementsByClassName('__i_')[0];
		containerNode.childNodes.forEach(function(child) {
			if (child.tagName == 'DIV' && child.id.length > 0) {
				child.childNodes.forEach(function(c) {
					if (c.tagName == 'DIV') {
						var msgWrapperNodes = c.childNodes[0].getElementsByClassName('clearfix');
						for (var i = 0; i < msgWrapperNodes.length; i++) {
							var msgNode = msgWrapperNodes[i].childNodes[0].childNodes[0];
							
							// Detects if message is rich media content
							if (msgNode == undefined || msgNode == null) {
								continue;
							}
	
							// Detects if message includes a 📌
							if (msgNode.innerHTML.includes("📌")) {
								pinnedMessages.push(msgNode.innerHTML);
								console.log(msgNode.innerHTML); // Temp, for debugging
								// TO-DO: Detect if message is from friend or user
							}
						}
					}
				});
			}
		});

		console.log(pinnedMessages);

		// Sends pinned messages to background process
		chrome.runtime.sendMessage(window.localStorage.getItem('pinheart-id'), {'greeting': "pinnedMessages"/*, 'messages': pinnedMessages*/}, function(response) {
			console.log("Status: " + response.status);
		});
	}

	/*
	// Listens for a new message in main conversation
	var onMessageNew = function() {
		if (newMessage) {
			scrape(); // Scrapes pinned messages and sends to background process
		}
	}
	*/

	// Listens for session change (new convo) and calls necessary handlers
	/*
	var newSession = new MutationObserver(function(muts) {
		muts.forEach(function(mut) {
			if (mut.attributeName == 'aria-relevant') {
				var id = mut.target.firstChild.id.split(':')[1];
				if (id != window.yourFBID) {
					scrape(); // Returns pinned messages
				}
			}
		});
	});
	*/

	scrape(); // Called on first pageload
	/*
	onMessageNew(); // Deploys event listener
	*/
}

// Prepares the JS injection
var inject = function() {
	var script = document.createElement('script');
	script.textContent = "(" + payload.toString() + ")();";
	document.head.appendChild(script);
}

// Injects payload
window.onload = function() {
	setTimeout(inject, 1000);
}