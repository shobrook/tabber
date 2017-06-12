import json
from flask import Flask, jsonify, request

app = Flask(__name__)

# TODO: Set up a messages.json file pipeline
messages = [
	{
		"id": 1,
		"type": u"folder",
		"name": u"Protips",
		"content": [
			{
				"type": u"file",
				"name": u"Importance of Stories",
				"content": [
					{
						"sender": 1,
						"message": u"Stories from others give you world knowledge, different perspectives, and lessons to reiterate to others"
					}
				]
			}
		]
	},
	{
		"id": 2,
		"type": u"folder",
		"name": u"App Ideas",
		"content": []
	},
	{
		"id": 3,
		"type": u"folder",
		"name": u"One-liners",
		"content": []
	}
]

# Default response; return empty string
@app.route("/")
def main():
	return ""

# Testing only
@app.route("/tabber/api/get_messages", methods=["GET"])
def get_messages():
	return jsonify({"messages": messages})

@app.route("/tabber/api/get_folders", methods=["GET"])
def get_folders():
	folders = []
	for i in messages:
		if i["type"] == "folder": folders.append(i["name"])
	return jsonify({"folders": folders})

@app.route("/tabber/api/add_message", methods=["POST"])
def add_message():
	if not request.json or not "name" in request.json:
		abort(400)
	message = {
		"type": u"file",
		"name": request.json["name"],
		"content": request.json["content"]
	}
	for i in messages:
		if i["type"] == "folder" and i["name"] == request.json["folder"]:
			i["content"].append(message)
	return jsonify({"folder": request.json["folder"], "message": message}), 201

if __name__ == "__main__":
	app.run(debug=True)
