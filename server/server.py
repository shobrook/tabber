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

# Initializes and populates a new user's documents; also checks for valid email
@app.route("/tabber/api/new_user", methods=["POST"])
def new_user():
	# Request: {"authToken": "...", "email": "...", "password": "..."}
	if not request.json or not "authToken" in request.json:
		abort(400, "new_user(): request.json does not exist or does not contain 'authToken'")

	return jsonify({"registered": utilities.add_user(mongo, request.json)})

# Updates a user's authToken list with new device; checks for valid login credentials
@app.route("/tabber/api/update_user", methods=["POST"])
def update_user():
	# Request: {"authToken": "...", "email": "...", "password": "..."}
	if not request.json or not "authToken" in request.json:
		abort(400, "update_user(): request.json does not exist or does not contain 'authToken'")

	return jsonify({"logged_in": utilities.update_user(mongo, request.json)})

# Creates new conversation in specified folder; TODO: Fix this
@app.route("/tabber/api/add_conversation", methods=["POST"])
def add_conversation():
	# Request: {"authToken": "...", "name": "...", "folder": "...", "messages": [{"author": "...", "content": "..."}, ...]}
	if not request.json or not "authToken" in request.json:
		return abort(400, "add_conversation(): request.json does not exist or does not contain 'authToken'")

	return jsonify({"convo_id": utilities.add_conversation(mongo, request.json)})

# Creates new folder given a parent directory
@app.route("/tabber/api/add_folder", methods=["POST"])
def add_folder():
	# Request: {"authToken": "...", "parent": "...", "name": "..."}
	if not request.json or not "authToken" in request.json:
		abort(400, "add_folder(): request.json does not exist or does not contain 'authToken'")

	return jsonify({"folder_id": utilities.add_folder(mongo, request.json)})

# Returns user's folder names; TODO: Return top 10 most populated (or popular?) folders
@app.route("/tabber/api/get_folders", methods=["POST"])
def get_folders():
	# Request: {"authToken": "..."}
	if not request.json or not "authToken" in request.json:
		abort(400, "get_folders(): request.json does not exist or does not contain 'authToken'")

	return jsonify({"folders": utilities.get_folders(mongo, request.json)})

# Returns all of a user's conversations in a nester structure of folders
@app.route("/tabber/api/get_conversations", methods=["POST"])
def get_conversations():
	# Request: {"authToken": "..."}
	if not request.json or not "authToken" in request.json:
		abort(400, "get_conversations(): request.json does not exist or does not contain 'authToken'")

	return jsonify({"folders": utilities.get_all_content(mongo, request.json)})

# Renames the specified folder
@app.route("/tabber/api/rename_folder", methods=["POST"])
def rename_folder():
	# Request: {"authToken": "...", "name": "...", "newName": "..."}
	if not request.json or not "authToken" in request.json:
		abort(400, "rename_folder(): request.json does not exist or does not contain 'authToken'")

	return jsonify({"folders": utilities.rename_folder(mongo, request.json)})

# Renames the specified folder
@app.route("/tabber/api/delete_folder", methods=["POST"])
def delete_folder():
	# Request: {"authToken": "...", "name": "...", "parentName"}
	if not request.json or not "authToken" in request.json:
		abort(400, "delete_folder(): request.json does not exist or does not contain 'authToken'")

	return jsonify({"folders": utilities.delete_folder(mongo, request.json)})

# Returns all database contents; for local testing only
@app.route("/tabber/api/get_database", methods=["GET"])
def get_database():
	users, folders, conversations = utilities.get_database(mongo)
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
