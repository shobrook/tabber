from flask import Flask, jsonify, request, json
from flask_pymongo import PyMongo

app = Flask(__name__)

app.config['MONGO_DBNAME'] = 'tabberdb'
app.config['MONGO_URI'] = 'mongodb://localhost:27017/tabberdb'

mongo = PyMongo(app)

# Default response; return an empty string
@app.route("/")
def main():
	return ""

# Returns all database contents; for local testing only
@app.route("/tabber/api/get_messages", methods=["GET"])
def get_messages():
	messages = mongo.db.messages
	output = []
	for m in messages.find():
		output.append(m)
	return jsonify({"messages": output})

# TODO: Iterate through ALL folders and return top 10 most populated ones
# Returns a list of root folders
@app.route("/tabber/api/get_folders", methods=["GET"])
def get_folders():
	messages = mongo.db.messages
	output = []
	for m in messages.find():
		if m["type"] == "folder": output.append(m["name"])
	return jsonify({"folders": output})

# TODO: Targets folder given path, appends new file
# Targets given folder in root, appends new file
@app.route("/tabber/api/add_message", methods=["POST"])
def add_message():
	if not request.json or not "name" in request.json:
		abort(400)
	message = {
		"type": u"file",
		"name": request.json["name"],
		"content": request.json["content"]
	}
	messages = mongo.db.messages
	mongo.db.messages.insert(message)
	#folder = messages.find_one({"type": "folder", "name": request.json["folder"]})
	#output = {"folder": request.json["folder"], "message": message}
	#return jsonify({"response": output})
	#for m in messages.find():
		#if m["type"] == "folder" and m["name"] == request.json["folder"]:
	return ""

# TODO: Targets folder given path, appends new folder

if __name__ == "__main__":
	app.run(debug=True)
