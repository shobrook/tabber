/* GLOBALS */

var registerPort = chrome.runtime.connect(window.localStorage.getItem('tabber-id'), {name: "register"});
var loginPort = chrome.runtime.connect(window.localStorage.getItem('tabber-id'), {name: "login"});
var onboardingPort = chrome.runtime.connect(window.localStorage.getItem('tabber-id'), {name: "onboarding"});

injectedRegisterDialog = false;

/* MAIN */

var registerPayload = function() {
	console.log("Prompting sign-up dialog.");

	var canvas = document.createElement('div');
	var signUpDialog = document.createElement("div");

	var formDefs = `<div id="registerWrapper" style="margin: auto;">
							      <div class="dialogTabs">
							        <h3 id="signUpTab">SIGN UP</h3>
							        <h3 id="loginTab">LOGIN</h3>
							      </div><!--dialogTabs-->

							      <hr id="divisor">
							      <hr id="selector">

							      <div id="tabContent">
							        <div id="signUpTabContent">
							          <form id="signUpForm">
							            <input type="email" class="inputFields" id="tabberEmail" autocomplete="false" placeholder="Email Address">
							            <input type="password" class="inputFields" id="tabberPass" autocomplete="false" placeholder="Password">
							            <input id="signUpButton" class="signUpLoginButton" type="submit" value="Get Started">
							            <div id="passwordHelpText">
							              <p>Passwords must be at least 6 characters long.</p>
							            </div><!--passwordHelpText-->
							          </form><!--signUpForm-->
							        </div><!--signUpTabContent-->
							        <div id="loginTabContent" style="display: none;">
							          <form id="loginForm">
							            <input type="email" class="inputFields" id="tabberEmail" autocomplete="false" placeholder="Email Address">
							            <input type="password" class="inputFields" id="tabberPass" autocomplete="false" placeholder="Password">
							            <input id="loginButton" type="submit" class="signUpLoginButton" value="Continue">
							            <div id="forgotYourPassword">
							              <p>Forgot your password?</p>
							            </div><!--forgotYourPassword-->
							          </form><!--loginForm-->
							      </div><!--tabContent-->
							    </div><!--registerWrapper-->`;

	canvas.style.backgroundColor = "rgba(0,0,0,.35)";
	canvas.style.zIndex = "2147483647";
	canvas.style.width = "100%";
	canvas.style.height = "100%";
	canvas.style.top = "0px";
	canvas.style.left = "0px";
	canvas.style.display = "block";
	canvas.style.position = "absolute";

	signUpDialog.style.position = "fixed";
	signUpDialog.style.width = "558px";
	signUpDialog.style.height = "287px";
	signUpDialog.style.top = "50%";
	signUpDialog.style.left = "50%";
	signUpDialog.style.marginLeft = "-279px";
	signUpDialog.style.transform = "translateY(-50%)";
	signUpDialog.style.borderRadius = "10px";
	signUpDialog.style.backgroundColor = "#FFFFFF";
	signUpDialog.style.zIndex = "2147483647";

	signUpDialog.innerHTML = formDefs;

	document.getElementsByTagName('style')[0].innerHTML = `.dialogTabs {
																												  overflow: hidden;
																												  font-family: Helvetica;
																												  margin-left: 40px;
																												}

																												#signUpTab {
																												  float: left;
																												  width: 239px;
																												  padding: 1.8em 0;
																												  display: block;
																												  text-align: center;
																												  font-size: 13px;
																												  font-weight: 600;
																												  color: rgb(44,158,212);
																												  cursor: pointer;
																												}

																												#loginTab {
																												  float: left;
																												  width: 239px;
																												  padding: 1.8em 0;
																												  display: block;
																												  text-align: center;
																												  font-size: 13px;
																												  font-weight: 600;
																												  color: rgb(195,208,225);
																												  cursor: pointer;
																												}

																												#signUpTab:hover {
																												  color: rgb(44,158,212);
																												}

																												#loginTab:hover {
																												  color: rgb(44,158,212);
																												}

																												#divisor {
																												  background-color: #F5F7F9;
																												  height: 1px;
																												  border: none;
																												  margin-top: -3px;
																												}

																												#selector {
																												  background-color: #2C9ED4;
																												  height: 1px;
																												  border: none;
																												  width: 239px;
																												  margin-top: -7px;
																												  margin-left: 40px;
																												}

																												#tabContent {
																												  position: relative;
																												  top: 30px;
																												  left: 40px;
																												}

																												.inputFields {
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

																												#tabberEmail::-webkit-input-placeholder {
																												  color: #CDD8E6;
																												}

																												#tabberPass::-webkit-input-placeholder {
																												  color: #CDD8E6;
																												}

																												#passwordHelpText {
																												  position: relative;
																												  top: -53px;
																												  display: inline-block;
																												  font-family: Helvetica;
																												  font-weight: 500;
																												  font-size: 11px;
																												  color: rgb(44,158,212);
																												}

																												#forgotYourPassword {
																												  position: relative;
																												  top: -53px;
																												  display: inline-block;
																												  font-family: Helvetica;
																												  font-weight: 500;
																												  font-size: 11px;
																												  color: rgb(44,158,212);
																												  text-decoration: underline;
																												  cursor: pointer;
																												}

																												.signUpLoginButton {
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

																												.signUpLoginButton:hover {
																												  background-color: rgb(101,184,203);
																												}`;

	document.body.appendChild(canvas); // Imposes a low-opacity "canvas" on entire page
	document.body.appendChild(signUpDialog); // Prompts the "sign up" dialog

	canvas.onclick = function() {
		window.postMessage({type: "registered", value: false}, '*');
		document.body.removeChild(signUpDialog);
		document.body.removeChild(canvas);
		console.log("User clicked canvas.");
	}

	var signUpTab = document.getElementById("signUpTab");
	var loginTab = document.getElementById("loginTab");

	var loginTabContent = document.getElementById("loginTabContent");
	var signUpTabContent = document.getElementById("signUpTabContent");
	var selector = document.getElementById("selector");

	loginTab.onclick = function() {
	  signUpTab.style.color = "rgb(195,208,225)";
	  loginTab.style.color = "rgb(44,158,212)";
	  selector.style.marginLeft = "279px";
	  signUpTabContent.style.display = "none";
	  loginTabContent.style.display = "initial";
	}

	signUpTab.onclick = function() {
	  signUpTab.style.color = "rgb(44,158,212)";
	  loginTab.style.color = "rgb(195,208,225)";
	  selector.style.marginLeft = "40px";
	  loginTabContent.style.display = "none";
	  signUpTabContent.style.display = "initial";
	}

	var signUpForm = document.getElementById("signUpForm");
	var loginForm = document.getElementById("loginForm");

	signUpForm.onsubmit = function() {
		var email = (this).tabberEmail.value;
		var password = (this).tabberPass.value;

		window.postMessage({type: "signup_credentials", text: {"email": email, "password": password}}, '*');
	}

	loginForm.onclick = function() {
		var email = (this).tabberEmail.value;
		var password = (this).tabberPass.value;

		// console.log(email + " " + password);
		window.postMessage({type: "login_credentials", text: {"email": email, "password": password}}, '*');
	}

	window.addEventListener('message', function(event) {
		if (event.data.type == "signUpValidation" && event.data.value) {
			document.body.removeChild(signUpDialog);
			document.body.removeChild(canvas);
			console.log("User successfully registered.");
		}
		else if (event.data.type == "signUpValidation" && !(event.data.value)) {
			signUpForm.reset();
			console.log("User tried signing up with invalid email.");
		}
		else if (event.data.type == "loginValidation" && event.data.value) {
			document.body.removeChild(signUpDialog);
			document.body.removeChild(canvas);
			console.log("User successfully logged in.");
		}
		else if (event.data.type == "loginValidation" && !(event.data.value)) {
			signUpForm.reset();
			console.log("User inputted incorrect login credentials.");
		}
	});

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
	if (event.data.type == "signup_credentials") registerPort.postMessage({email: event.data.text.email, password: event.data.text.password});
	else if (event.data.type == "login_credentials") loginPort.postMessage({email: event.data.text.email, password: event.data.text.password});
	else if (event.data.type == "registered") onboardingPort.postMessage({registered: event.data.value});
});

// Background script --> here --> injected JS
registerPort.onMessage.addListener(function(msg) {
	if (msg.registered == true || msg.registered == false) window.postMessage({type: "signUpValidation", value: msg.registered}, '*');
});

loginPort.onMessage.addListener(function(msg) {
	if (msg.loggedIn) window.postMessage({type: "loginValidation", value: msg.loggedIn}, '*');
});
