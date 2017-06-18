from bson.errors import InvalidId
from bson.objectid import ObjectId
from flask import Flask, jsonify, request, json, abort
from flask_pymongo import PyMongo



# GLOBALS

DEBUG = True

app = Flask(__name__)

app.config['MONGO_DBNAME'] = 'tabberdb'
app.config['MONGO_URI'] = 'mongodb://localhost:27017/tabberdb'

mongo = PyMongo(app)

"""
DATA MODEL
	Collections: users, folders, conversations
	User: {"chromeID": "...", "email": "...", "password": "...", "root": "..."}
	Folder: {"name": "...", "children": "...", "conversations": "..."}
	Conversation: {"name": "...", "messages": [{"author": "...", "content": "..."}, ...]}
"""



# ROUTING

# Default response; return an empty string
@app.route("/")
def main():
	return 404

# Initializes a new user's documents
@app.route("/tabber/api/populate", methods=["POST"])
def populate():
	# Request: {"chromeID": "...", "email": "...", "password": "..."}
	if not request.json or not "chromeID" in request.json:
		abort(400, "populate(): request.json does not exist or does not contain 'id'")

	root_id = mongo.db.folders.insert({
		"name": "root",
		"children": [],
		"conversations": []
	})
	user_id = mongo.db.users.insert({
		"chromeID": request.json["chromeID"],
		"email": request.json["email"],
		"password": request.json["password"],
		"root": root_id
	})
	mongo.db.folders.update_one({
		"_id": root_id},
		{"$set": {"user_id": ObjectId(str(user_id))}
	}, upsert=False)

	return jsonify({"user_id": str(user_id)})

# Creates new conversation in specified folder; TODO: Fix this
@app.route("/tabber/api/add_conversation", methods=["POST"])
def add_conversation():
	# Request: {"id": "...", "name": "...", "folder": "...", "messages": [{"author": "...", "content": "..."}, ...]}
	if not request.json or not "id" in request.json:
		return abort(400, "add_conversation(): request.json does not exist or does not contain 'id'")

	folder = mongo.db.folders.find_one({"name": request.json["folder"], "user_id": ObjectId(request.json["id"])})
	convo = {
		"name": request.json["name"],
		"messages": request.json["messages"],
		"folder": folder["_id"]
	}
	convo_id = mongo.db.conversations.insert(convo)
	mongo.db.folders.update_one({
		"_id": folder["_id"]},
		{"$push": {"conversations": ObjectId(str(convo_id))}
	}, True)
	return jsonify({"convo_id": str(convo_id)})

# Creates new folder given a parent directory
@app.route("/tabber/api/add_folder", methods=["POST"])
def add_folder():
	# Request: {"id": "...", "parent": "...", "name": "..."}
	if not request.json or not "id" in request.json:
		abort(400, "add_folder(): request.json does not exist or does not contain 'id'")

	folder = mongo.db.folders.insert({
		"name": request.json["name"],
		"children": [],
		"conversations": [],
		"user_id": ObjectId(str(request.json["id"]))
	})
	parentFolder = mongo.db.folders.update_one({
		"name": request.json["parent"],
		"user_id": request.json["id"]},
		{"$push": {"children": ObjectId(str(folder))}
	}, True)

	return jsonify({"folder_id": str(folder)})

# Returns user's folder names
# TODO: Return top 10 most populated (or popular?) folders
# TODO: Change this to access parameters, not request.json
@app.route("/tabber/api/get_folders", methods=["GET"])
def get_folders():
	# Request: {"id": "..."}
	if not request.json or not "id" in request.json:
		abort(400, "get_folders(): request.json does not exist or does not contain 'id'")

	output = []
	for f in mongo.db.folders.find():
		if f["user_id"] == ObjectId(str(request.json["id"])):
			output.append(f["name"])

	return jsonify({"folders": output})

# Returns all database contents; for local testing only
@app.route("/tabber/api/get_database", methods=["GET"])
def get_database():
	users = []
	folders = []
	conversations = []

	for u in mongo.db.users.find():
		users.append({"_id": str(u["_id"]), "chromeID": u["chromeID"], "email": u["email"], "password": u["password"], "root": str(u["root"])})
	for f in mongo.db.folders.find():
		folders.append({"_id": str(f["_id"]), "user_id": str(f["user_id"]), "name": f["name"], "children": f["children"]})
	for c in mongo.db.conversations.find():
		conversations.append({"_id": str(c["_id"]), "name": c["name"], "messages": c["messages"]})

	return jsonify({"users": users, "folders": folders, "conversations": conversations})

# TODO: Add endpoints for renaming folders and conversations



# ERROR HANDLING

def error_print(status_code, error):
	if DEBUG:
		print "------------"
		print "ERROR (" + str(status_code) + "): " + error
		print "------------"

@app.errorhandler(400)
def bad_request(error):
	error_print(400, error.description)
	return "Bad Request", 400

@app.errorhandler(500)
def internal_error(error):
	error_print(500, error.description)
	return "Internal Error", 500




if __name__ == "__main__":
	app.run(debug=True)
