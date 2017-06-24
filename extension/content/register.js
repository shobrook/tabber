// TODO: Stylize the sign-up and login dialogs

/* GLOBALS */

var registerPort = chrome.runtime.connect(window.localStorage.getItem('tabber-id'), {name: "register"});
var loginPort = chrome.runtime.connect(window.localStorage.getItem('tabber-id'), {name: "login"});

injectedRegisterDialog = false;

/* MAIN */

var registerPayload = function() {
	console.log("Prompting sign-up dialog.");

	var canvas = document.createElement('div');
	var signUpDialog = document.createElement("div");

	var form_defs = `<form id="signUpForm">
							<label for="usr"> Email: </label>
							<input type="text" name="usr" style="width: 100%; padding: 12px 15px; margin: 8px 0; display: inline-block; border: 1px solid #CCC; border-radius: 4px; box-sizing: border-box;"">
							<label for="pword"> Password: </label>
							<input type="text" name="pword" style="width: 100%; padding: 12px 15px; margin: 8px 0; display: inline-block; border: 1px solid #CCC; border-radius: 4px; box-sizing: border-box;"">
							<input type="submit" value="Sign up" style="width: 100%; background-color: #2C9ED4; color: white; padding: 14px 20px; margin: 8px 0; border: none; border-radius: 4px; cursor: pointer;">
						</form>
						<h3 id="option"> Already using tabber? <a id="loginLink"> Login.</a> </h3>`;

	canvas.style = "background-color: rgba(0,0,0,.35); z-index: 2147483647; width: 100%; height: 100%; top: 0px; left: 0px; display: block; position: absolute;";

	signUpDialog.style.position = "fixed";
	signUpDialog.style.width = "50%";
	signUpDialog.style.height = "400px";
	signUpDialog.style.top = "15%";
	signUpDialog.style.left = "25%";
	signUpDialog.style.borderRadius = "5px";
	signUpDialog.style.padding = "20px";
	signUpDialog.style.backgroundColor = "#FFFFFF";
	//signUpDialog.style.boxShadow = "0px 1px 4px #000000";
	signUpDialog.style.zIndex = "2147483647";

	signUpDialog.innerHTML = form_defs;

	document.body.appendChild(canvas); // Imposes a low-opacity "canvas" on entire page
	document.body.appendChild(signUpDialog); // Prompts the "sign up" dialog

	var signUp = document.getElementById("signUpForm");
	var login = document.getElementById("loginLink");

	signUp.onsubmit = function() {
		var email = (this).usr.value;
		var password = (this).pword.value;

		window.postMessage({type: "signup_credentials", text: {"email": email, "password": password}}, '*');

		window.addEventListener('message', function(event) {
			if (event.data.type == "register") {
				if (event.data.value) {
					document.body.removeChild(signUpDialog);
					document.body.removeChild(canvas);
					console.log("User successfully registered.");
				} else if (!(event.data.value)) {
					// TODO: Update sign-up dialog with error message
					console.log("User unsuccessfully registered.");
				}
			}
		});
	}

	login.onclick = function() {
		var email = signUp.usr.value;
		var password = signUp.pword.value;

		window.postMessage({type: "login_credentials", text: {"email": email, "password": password}}, '*');

		// TODO: Verify email and password; if incorrect, reprompt

		document.body.removeChild(signUpDialog);
		document.body.removeChild(canvas);
	}

	console.log("Displayed sign-up dialog.");
}

// Prepares the JS injection
var registerInject = function() {
	var script = document.createElement('script');
	script.textContent = "(" + registerPayload.toString() + ")();";
	document.head.appendChild(script);
}

// Listens for the "extension install" event
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.message == "first_install") {
		console.log("User has installed tabber for the first time.");
		registerInject();
	}
});

// Injected JS --> here --> background script
window.addEventListener('message', function(event) {
	if (event.data.type && event.data.type == "signup_credentials")
		registerPort.postMessage({email: event.data.text.email, password: event.data.text.password});
	else if (event.data.type && event.data.type == "login_credentials")
		loginPort.postMessage({email: event.data.text.email, password: event.data.text.password});
});

// Background script --> here --> injected JS
registerPort.onMessage.addListener(function(msg) {
	if (msg.validEmail == true || msg.validEmail == false)
		window.postMessage({type: "validEmail", value: msg.validEmail});
	else if (msg.registered == true || msg.registered == false)
		window.postMessage({type: "registered", value: msg.registered});
});
