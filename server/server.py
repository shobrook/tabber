from flask import Flask, jsonify, request, json
from flask_pymongo import PyMongo

app = Flask(__name__)

app.config['MONGO_DBNAME'] = 'tabberdb'
app.config['MONGO_URI'] = 'mongodb://localhost:27017/tabberdb'

mongo = PyMongo(app)



# DATA MODEL
# 3 entities: users, folders, and conversations
# User: {"chromeID": "...", "email": "...", "password": "...", "rootFolder": "..."}
# Folder: {"name": "...", "subfolders": "...", "conversations": "..."}
# Conversation: {"name": "...", "messages": [{"author": "...", "content": "..."}, ...]}



# Default response; return an empty string
@app.route("/")
def main():
	return

# Initializes the database with sample folders; for local testing only
@app.route("/tabber/api/initialize", methods=["POST"])
def initialize():
	user = {"chromeID": "", "email": "example@example.com", "password": "example_pass", "rootFolder": ""}
	mongo.db.users.insert(user)
	rootFolder = {"name": "example root folder", "subfolders": [], "conversations": []}
	mongodb.folders.insert(rootFolder)
	return "success"

# Returns all database contents; for local testing only
@app.route("/tabber/api/get_messages", methods=["GET"])
def get_messages():
	output = []
	for c in mongo.db.conversations.find():
		output.append({"name": c["name"], "messages": [c["messages"]]})
	return jsonify({"conversations": output})

# TODO: Iterate through ALL folders and return top 10 most populated ones
# Returns a list of root folders
@app.route("/tabber/api/get_folders", methods=["GET"])
def get_folders():
	output = []
	for f in mongo.db.folders.find():
		output.append(f["name"])
	return jsonify({"folders": output})

# TODO: Targets folder given path, appends new file
# Targets given folder in root, appends new file
@app.route("/tabber/api/add_message", methods=["POST"])
def add_conversation():
	# TODO: Check this
	if not request.json or not "name" in request.json:
		abort(400)
	convo = {
		"name": request.json["name"],
		"messages": request.json["messages"]
	}
	# TODO: Change this
	output = mongo.db.messages.update_one(
		{"type": "folder", "name": request.json["folder"]},
		{"$push": {"content": message}}
	)
	return "success"

# TODO: Targets folder given path, appends new folder
# TODO: Targets folder given path, appends new file
# Targets given folder in root, appends new file
@app.route("/tabber/api/add_folder", methods=["POST"])
def add_conversation():
	# TODO: Check this
	if not request.json or not "name" in request.json:
		abort(400)
	folder = {
		"name": request.json["name"]
	}
	return "success"



if __name__ == "__main__":
	app.run(debug=True)
