####GLOBALS####


from bson.errors import InvalidId
from bson.objectid import ObjectId
from flask import Flask, jsonify, request, json, abort
from flask_pymongo import PyMongo

import utilities

DEBUG = True

app = Flask(__name__)

app.config['MONGO_DBNAME'] = 'tabberdb'
app.config['MONGO_URI'] = 'mongodb://localhost:27017/tabberdb'

mongo = PyMongo(app)

""" DATA MODEL
	Collections: users, folders, conversations
	User: {"_id": ObjectId("..."), "authToken": ["...", ...], "email": "...", "password": "...", "root": ObjectId("...")}
	Folder: {"_id": ObjectId("..."), "name": "...", "children": "...", "conversations": [ObjectId("..."), ...], "user_id": ObjectId("...")}
	Conversation: {"_id": ObjectId("..."), "name": "...", "messages": [{"author": "...", "content": ["...", ...]}, ...]}
"""


####ROUTING####


# Default response; return an empty string
@app.route("/")
def main():
	return 404

# Initializes and populates a new user's documents
@app.route("/tabber/api/new_user", methods=["POST"])
def new_user():
	# Request: {"authToken": "...", "email": "...", "password": "..."}
	if not request.json or not "authToken" in request.json:
		abort(400, "new_user(): request.json does not exist or does not contain 'authToken'")

	root_id = mongo.db.folders.insert({
		"name": "root",
		"children": [],
		"conversations": []
	})
	user_id = mongo.db.users.insert({
		"authToken": [request.json["authToken"]],
		"email": request.json["email"],
		"password": request.json["password"],
		"root": root_id
	})
	mongo.db.folders.update_one({
		"_id": root_id},
		{"$set": {"user_id": ObjectId(str(user_id))}
	}, upsert=False)

	return jsonify({"user_id": str(user_id)})

# Updates a user's authToken list with new device
@app.route("/tabber/api/update_user", methods=["POST"])
def update_user():
	# Request: {"authToken": "...", "email": "...", "password": "..."}
	if not request.json or not "authToken" in request.json:
		abort(400, "update_user(): request.json does not exist or does not contain 'authToken'")

	user = mongo.db.users.find_one({
		"email": request.json["email"],
		"password": request.json["password"]
	})
	if request.json["authToken"] in user["authToken"]:
		return jsonify({"updated": False})
	else:
		mongo.db.users.update_one({
			"email": request.json["email"],
			"password": request.json["password"]},
			{"$push": {"authToken": request.json["authToken"]}
		}, True)

	return jsonify({"updated": True})

# Checks if a given email or email/password combo is already registered
@app.route("/tabber/api/validate_user", methods=["POST"])
def validate_user():
	# Request: {"email": "..."} OR {"email": "...", "password": "..."}
	if not request.json or not "email" in request.json:
		return abort(400, "validate_user(): request.json does not exist or does not contain 'email'")

	if not "password" in request.json:
		for u in mongo.db.users.find():
			if u["email"] == request.json["email"]:
				return jsonify({"valid": False})
		return jsonify({"valid": True})

	for u in mongo.db.users.find():
		if u["email"] == request.json["email"] and u["password"] == request.json["password"]:
			return jsonify({"valid": True})
	return jsonify({"valid": False})

# Creates new conversation in specified folder; TODO: Fix this
@app.route("/tabber/api/add_conversation", methods=["POST"])
def add_conversation():
	# Request: {"authToken": "...", "name": "...", "folder": "...", "messages": [{"author": "...", "content": "..."}, ...]}
	if not request.json or not "authToken" in request.json:
		return abort(400, "add_conversation(): request.json does not exist or does not contain 'authToken'")

	user = mongo.db.users.find_one({"authToken": request.json["authToken"]})
	folder = mongo.db.folders.find_one({"name": request.json["folder"], "user_id": ObjectId(str(user["_id"]))})
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
	# Request: {"authToken": "...", "parent": "...", "name": "..."}
	if not request.json or not "authToken" in request.json:
		abort(400, "add_folder(): request.json does not exist or does not contain 'authToken'")

	user = mongo.db.users.find_one({"authToken": request.json["authToken"]})
	folder = mongo.db.folders.insert({
		"name": request.json["name"],
		"children": [],
		"conversations": [],
		"user_id": ObjectId(str(user["_id"]))
	})
	parentFolder = mongo.db.folders.update_one({
		"name": request.json["parent"],
		"user_id": ObjectId(str(user["_id"]))},
		{"$push": {"children": ObjectId(str(folder))}
	}, True)

	return jsonify({"folder_id": str(folder)})

# Returns user's folder names; TODO: Return top 10 most populated (or popular?) folders
@app.route("/tabber/api/get_folders", methods=["POST"])
def get_folders():
	# Request: {"authToken": "..."}
	if not request.json or not "authToken" in request.json:
		abort(400, "get_folders(): request.json does not exist or does not contain 'authToken'")

	print(request.json["authToken"])
	user = mongo.db.users.find_one({"authToken": request.json["authToken"]})
	print(user)
	content = utilities.get_all_content(mongo, user)

	return jsonify({"folders": content})

# Returns all database contents; for local testing only
@app.route("/tabber/api/get_database", methods=["GET"])
def get_database():
	users = []
	folders = []
	conversations = []

	for u in mongo.db.users.find():
		users.append({
			"_id": str(u["_id"]),
			"authToken": u["authToken"],
			"email": u["email"],
			"password": u["password"],
			"root": str(u["root"])
		})
	for f in mongo.db.folders.find():
		folders.append({
			"_id": str(f["_id"]),
			"user_id": str(f["user_id"]),
			"name": f["name"],
			"children": f["children"],
			"conversations": f["conversations"]
		})
	for c in mongo.db.conversations.find():
		conversations.append({
			"_id": str(c["_id"]),
			"name": c["name"],
			"messages": c["messages"]
		})

	return jsonify({"users": users, "folders": folders, "conversations": conversations})

# TODO: Add endpoints for renaming folders and conversations


####ERROR HANDLING####


def error_print(status_code, error):
	if DEBUG:
		print("------------")
		print("ERROR (" + str(status_code) + "): " + error)
		print("------------")

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
