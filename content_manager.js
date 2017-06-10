////GLOBALS////

newInjected = false;

////MAIN////

console.log("Initializing tabber content manager.");
//window.localStorage.setItem('tabber-id', chrome.runtime.id);
console.log("Extension ID: " + window.localStorage.getItem('tabber-id'));

var newPayload = function() {
	console.log("Payload :)");
}

// Prepares the JS injection
var newInject = function() {
	var script = document.createElement('script');
	script.textContent = "(" + newPayload.toString() + ")();";
	document.head.appendChild(script);
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.message == "clicked_find_messages" && !newInjected) {
		console.log("User has clicked Find Messages in the context menu.");
		newInjected = true;
		newInject();
	}
});
