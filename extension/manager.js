////GLOBALS////

newInjected = false;

////MAIN////

var newPayload = function() {
	console.log("Running file manager.");
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
