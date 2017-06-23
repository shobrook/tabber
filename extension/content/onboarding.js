/* GLOBALS */

injectedOnboarding = false;

/* MAIN */

var onboardingPayload = function() {
	console.log("Prompting post-save tutorial.");

	var canvas = document.createElement('div');
	var tutorial = document.createElement("div");

	var content_defs = `<div id="tooltip">
  								      <h3> You just saved your first conversation! </h3>
  									    <p> Right-click the extension icon and select "Find Messages" to access your saved conversations. </p>
  									    <input id="gotIt" type="submit" value="Got it!">
									    </div>`;

	canvas.style = "background-color: rgba(0,0,0,.35); z-index: 2147483647; width: 100%; height: 100%; top: 0px; left: 0px; display: block; position: absolute;";

	tutorial.style.position = "fixed";
	tutorial.style.width = "50%";
	tutorial.style.height = "400px";
	tutorial.style.top = "15%";
	tutorial.style.left = "25%";
	tutorial.style.borderRadius = "5px";
	tutorial.style.padding = "20px";
	tutorial.style.backgroundColor = "#FFFFFF";
	//tutorial.style.boxShadow = "0px 1px 4px #000000";
	tutorial.style.zIndex = "2147483647";

	tutorial.innerHTML = content_defs;

	document.body.appendChild(canvas); // Imposes a low-opacity "canvas" on entire page
	document.body.appendChild(tutorial); // Prompts the "sign up" dialog

	var confirm = document.getElementById("gotIt");

	confirm.onsubmit = function() {
		document.body.removeChild(tutorial);
		document.body.removeChild(canvas);
	}

	console.log("Displayed an onboarding tooltip.");
}

// Prepares the JS injection
var onboardingInject = function() {
	var script = document.createElement('script');
	script.textContent = "(" + onboardingPayload.toString() + ")();";
	document.head.appendChild(script);
}

// Listens for the "extension install" event
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.message == "first_save") {
		console.log("User has saved a conversation for the first time.");
		onboardingInject();
	}
});
