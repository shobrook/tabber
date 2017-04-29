////PINNING A MESSAGE PSEUDOCODE////

// Listens for a page update (onMessageNew).
// Listens for a convo change (onSessionNew).

// On either event, scrape all loaded messages. 
// Messages with a 📌 emoji are chronologically
// appended to an array: [oldest ... mostRecent].

// TO-DO: Scrape a pinned message and the user 
// who sent it.

// Iterate through the array and query MongoDB
// for each element. If query returns true,
// break the iteration and return the (# of
// queries - 1) as Q. 

// Slice array from 0 to index Q, incl-excl.
// Starting w/ the last element, push each
// message to MongoDB. 

// TO-DO: After each push, the browser action 
// should animate (fuck).

////GLOBALS////

/* Nothin' here yet */

////HANDLERS////

// Scrapes pinned messages in main conversation
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
							// TO-DO: Detect if message is from friend or user
						}
					}
				}
			});
		}
	});
	/*
	var containerNode = document.getElementsByClassName('_3oh-\ _58nk');
	for (var i = 0; i < containerNode.length; i++) {
		containerNode[i].innerHTML = ...;
	}
	*/
	return pinnedMessages;
}

////LISTENERS////

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

////MAIN////

// Called when the user clicks on the browser action
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if(request.message === "clicked_browser_action") {
		// Initialize popup (background process?)
	}
});