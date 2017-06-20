from bson.errors import InvalidId
from bson.objectid import ObjectId
from flask import Flask, jsonify, request, json, abort
from flask_pymongo import PyMongo


def get_all_content_recursive(mongo, folder):
	# Gathers all conversations in the folder
	conversation_list = []
	all_conversations = mongo.db.conversations.find()
	for conversation in all_conversations:
		if conversation["_id"] in folder["conversations"]:
			conversation_list.append({"name": conversation["name"], "messages": conversation["messages"]})

	# Recursively traverses subfolders
	children_list = []
	for subfolder in folder["children"]:
		# print("subfolder: " + str(subfolder))
		children_list.append(get_all_content_recursive(mongo, mongo.db.folders.find_one({"_id": subfolder})))

	return {"name": folder["name"], "conversations": conversation_list, "children": children_list}

# TODO: Make this not atrociously inefficient
def get_all_content(mongo, request_json):
	user = mongo.db.users.find_one({"authToken": request_json["authToken"]})

	# TODO: Add "root" as a property for folders so that we can rename the top-level folder
	root_folder = mongo.db.folders.find_one({"user_id": user["_id"], "name": "root"})
	
	if root_folder:
		return [get_all_content_recursive(mongo, root_folder)]

	abort(500, "get_all_content(): root folder for user " + user["email"] + " doesn't exist")
	return None

# Adds folder under a specified parent folder
def add_folder(mongo, request_json):
	user = mongo.db.users.find_one({"authToken": request_json["authToken"]})

	folder = mongo.db.folders.insert({
		"name": request_json["name"],
		"children": [],
		"conversations": [],
		"user_id": ObjectId(str(user["_id"]))
	})
	parentFolder = mongo.db.folders.update_one({
		"name": request_json["parent"],
		"user_id": ObjectId(str(user["_id"]))},
		{"$push": {"children": ObjectId(str(folder))}
	}, True)

	return folder



if __name__ == "__main__":

	import pprint
	pp = pprint.PrettyPrinter(indent=2)

	app = Flask(__name__)
	app.config['MONGO_DBNAME'] = 'tabberdb'
	app.config['MONGO_URI'] = 'mongodb://localhost:27017/tabberdb'
	mongo = PyMongo(app)

	with app.app_context():
		request_json = {u'authToken': u'ya29.GlxvBDhyqdSqjKZTF9nI-eqm7x0nMl3Fj7_UNZ3hlhWxkRL0JyzQFT8nx_ZDZqJaWJMEGoU8dR2kEw5TcJoxMyiPe8rqu5C3sqnCchzV4jOaJvlpK0cakcGLDjWD9g'}
		pp.pprint(get_all_content(mongo, request_json))

		# request_json = {u'parent': 'root', u'name': 'New Folder', u'authToken': u'ya29.GlxvBDhyqdSqjKZTF9nI-eqm7x0nMl3Fj7_UNZ3hlhWxkRL0JyzQFT8nx_ZDZqJaWJMEGoU8dR2kEw5TcJoxMyiPe8rqu5C3sqnCchzV4jOaJvlpK0cakcGLDjWD9g'}
		# pp.pprint(add_folder(mongo, request_json))
