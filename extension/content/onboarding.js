// TODO: Add a protip for seleting / saving conversations

/* GLOBALS */

// Nothin' here yet

/* MAIN */

var protipPayload = function() {
	console.log("Prompting post-save tutorial.");

	var canvas = document.createElement('div');
	var protip = document.createElement("div");

	// TODO: Update font-family with Neuzeit S LT Std
	// TODO: Polish the text padding and overflow behavior
	// TODO: Add in a picture of the extension icon
	var tip_defs = `<div id="contents" style="text-align: center; color: #7D848E; font-family: Helvetica; padding-top: 4%;">
										<h3 style="font-size: 15px; font-weight: 600;"> You just saved your first conversation! </h3>
										<p style="font-weight: 400; font-size: 14px; width: 79%; margin-left: auto; margin-right: auto;"> Right-click the extension icon and select "Find Messages" to access your saved conversations. </p>
										<input id="got-it" type="submit" value="Got it!" style="border: none; color: #FFFFFF; background-color: #2C9ED4; text-align: center; font-family: Helvetica; font-size: 14px; font-weight: 400; padding: 12px 10%; border-radius: 12px 2px 12px 2px; cursor: pointer; margin-top: 3.05%;">
									</div>`;

	canvas.style = "background-color: rgba(0,0,0,.35); z-index: 2147483647; width: 100%; height: 100%; top: 0px; left: 0px; display: block; position: absolute;";

	protip.style.position = "fixed";
	protip.style.width = "27%";
	protip.style.height = "190px";
	protip.style.top = "50%";
	protip.style.left = "36.5%";
	protip.style.transform = "translateY(-50%)";
	protip.style.borderRadius = "10px";
	protip.style.backgroundColor = "#FFFFFF";
	protip.style.zIndex = "2147483647";

	protip.innerHTML = tip_defs;

	document.body.appendChild(canvas); // Imposes a low-opacity "canvas" on entire page
	document.body.appendChild(protip); // Prompts the "sign up" dialog

	var confirm = document.getElementById("got-it");

	confirm.onmouseover = function() {
		this.style.backgroundColor = "#52AFDB";
	}

	confirm.onsubmit = function() {
		document.body.removeChild(protip);
		document.body.removeChild(canvas);
	}

	canvas.onclick = function() {
		document.body.removeChild(tutorial);
		document.body.removeChild(canvas);

		// TODO: When canvas is clicked, the protip should still display each time a conversation
		// is saved (until "Got It" is clicked)
	}

	console.log("Displayed an onboarding tooltip.");
}

// Prepares the JS injection
var protipInject = function() {
	var script = document.createElement('script');
	script.textContent = "(" + protipPayload.toString() + ")();";
	document.head.appendChild(script);
}

// Listens for the first "saved messages" event
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.message == "first_save") {
		console.log("User has saved a conversation for the first time.");
		protipInject();
	}
});
