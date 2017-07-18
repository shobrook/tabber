from bson.errors import InvalidId
from bson.objectid import ObjectId
from flask import Flask, jsonify, request, json, abort
from flask_pymongo import PyMongo
import sys

# TODO: Use a decorator to check if the user exists



# GETTING

def get_all_content_recursive(mongo, folder):
	if folder is None:
		return

	# Gathers all conversations in the folder
	conversation_list = []
	for conversation_id in folder["conversations"]:
		conversation = mongo.db.conversations.find_one({"_id": conversation_id})
		conversation_list.append({"name": conversation["name"], "messages": conversation["messages"]})

	# Recursively traverses subfolders
	children_list = []
	for subfolder in folder["children"]:
		subfolder_id = mongo.db.folders.find_one({"_id": subfolder})
		children_list.append(get_all_content_recursive(mongo, subfolder_id))

	return {"name": folder["name"], "conversations": conversation_list, "children": children_list}


# TODO: Make this not atrociously inefficient
def get_all_content(mongo, request_json):
	user = mongo.db.users.find_one({"email": request_json["email"]})
	if not user_exists(user): return None

	# TODO: Add "root" as a property for folders so that we can rename the top-level folder
	root_folder = mongo.db.folders.find_one({"user_id": user["_id"], "root": True})

	if root_folder:
		return [get_all_content_recursive(mongo, root_folder)]

	abort(500, "get_all_content(): root folder for user " + user["email"] + " doesn't exist")
	return None


def get_folders(mongo, request_json):
	user = mongo.db.users.find_one({"email": request_json["email"]})
	if not user_exists(user): return None

	folder_name_list = []
	for folder in mongo.db.folders.find({"user_id": user["_id"]}):
		folder_name_list.append(folder["name"])
	return folder_name_list


def get_database(mongo):
	users = []
	folders = []
	conversations = []

	for u in mongo.db.users.find():
		users.append({
			"_id": str(u["_id"]),
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

	return users, folders, conversations



# ADDING

def add_user(mongo, request_json):
	for u in mongo.db.users.find():
		if u["email"] == request_json["email"]:
			return False;

	user_id = mongo.db.users.insert({
		"email": request_json["email"],
		"password": request_json["password"],
		"root": root_id
	})
	root_id = mongo.db.folders.insert({
		"name": "Everything",
		"root": True,
		"children": [],
		"conversations": [],
		"user_id": user_id
	})
	mongo.db.folders.update_one({
		"_id": root_id},
		{"$set": {"user_id": ObjectId(str(user_id))}
	}, upsert=False)

	return True;


# Adds folder under a specified parent folder
# TODO: Check that we don't add duplicate folders
def add_folder(mongo, request_json):
	user = mongo.db.users.find_one({"email": request_json["email"]})
	if not user_exists(user): return None

	# TODO: Check for duplicates in parent
	parent = find_folder(user["_id"], "/".join(request_json["path"].split("/")[:-1]), parent=False)
	if parent is None:
		return None

	convo_name = request_json["path"].split("/")[-1]

	for subfolder_id in parent["children"]:
		subfolder = mongo.db.folders.find_one({"_id": subfolder_id})
		if subfolder["name"] == convo_name:
			print("ERROR: Attempted to add a duplicate folder.")
			return None

	folder_id = mongo.db.folders.insert({
		"name": convo_name,
		"root": False,
		"children": [],
		"conversations": [],
		"user_id": user["_id"]
	})
	parentFolder = mongo.db.folders.update_one({
		"_id": parent["_id"]},
		{"$push": {"children": folder_id}
	}, upsert=False)

	return str(folder_id)


def add_conversation(mongo, request_json):
	user = mongo.db.users.find_one({"email": request_json["email"]})
	if not user_exists(user): return None

	folder = find_folder(user["_id"], "/".join(request_json["path"].split("/")[:-1]), parent=False)
	if folder is None:
		return None

	convo = {
		"name": request_json["path"].split("/")[-1],
		"messages": request_json["messages"],
		"folder": folder["_id"]
	}
	convo_id = mongo.db.conversations.insert(convo)
	mongo.db.folders.update_one({
		"_id": folder["_id"]},
		{"$push": {"conversations": ObjectId(str(convo_id))}
	}, True)

	return str(convo_id)



# EDITING

def rename_folder(mongo, request_json):
	user = mongo.db.users.find_one({"email": request_json["email"]})
	if not user_exists(user): return None

	folder = find_folder(user["_id"], request_json["path"], parent=False)
	if folder is None:
		return None

	mongo.db.folders.update_one({
		"_id": folder["_id"]},
		{"$set": {"name": request_json["newName"]}
		}, True)
	return True

def move_folder(mongo, request_json):
	user = mongo.db.users.find_one({"email": request_json["email"]})
	if not user_exists(user): return None

	folder, parent = find_folder(user["_id"], request_json["path"], parent=True)
	new_parent = find_folder(user["_id"], request_json["newParentPath"])
	if folder == None or parent == None or new_parent == None:
		return False

	new_parent = mongo.db.folders.update_one({"_id": new_parent["_id"]},
		{"$push": {"children": ObjectId(str(folder["_id"]))}
	}, True)
	parent = mongo.db.folders.update_one({"_id": parent["_id"]},
		{"$pull": {"children": ObjectId(str(folder["_id"]))}
	}, True)

	return True

def move_conversation(mongo, request_json):
	user = mongo.db.users.find_one({"email": request_json["email"]})
	if not user_exists(user): return None



# DELETING

# TODO: Also remove from parent folder's conversations list
# TODO: Use email to filter results
def delete_conversation(mongo, request_json):
	user = mongo.db.users.find_one({"email": request_json["email"]})
	if not user_exists(user): return None

	# TODO: Remove reference in parent folder
	convo = find_conversation(user["_id"], request_json[""], parent=False)
	if convo is not None:
		mongo.db.conversations.remove(conversation["_id"])

	return True


def delete_folder(mongo, request_json):
	user = mongo.db.users.find_one({"email": request_json["email"]})
	if not user_exists(user): return None

	folder, parent = find_folder(user["_id"], request_json["path"])
	if folder is not None and parent is not None:
		mongo.db.folders.remove(folder["_id"])
		mongo.db.folders.update({"_id": parent["_id"]}, {"$pull": {"children": folder["_id"]}})
	return True



# MISCELLANEOUS

# Authenticates a user
def check_user(mongo, request_json):
	for u in mongo.db.users.find():
		if u["email"] == request_json["email"] and u["password"] == request_json["password"]:
			return True
	return False


# Gets rid of some boilerplate I didn't want to write for each function
def user_exists(user):
	if not user:
		abort(401, str(sys._getframe(1).f_code.co_name) + "(): user doesn't exist or isn't logged in")
		return False
	return True


# Retrieves the final folder object in a filepath and, if specified, its parent
def find_folder(user_id, path, parent=True):
	print(path)
	root_folder = mongo.db.folders.find_one({"user_id": user_id, "root": True})
	cur_folder = root_folder
	prev = root_folder
	# NOTE: Assumes root folder is correctly placed as first in path
	for folder_name in path.split("/")[1:]:
		child_found = False
		for subfolder_id in cur_folder["children"]:
			subfolder = mongo.db.folders.find_one({"user_id": user_id, "_id": subfolder_id, "name": folder_name})
			if subfolder is not None:
				prev = cur_folder
				cur_folder = subfolder
				child_found = True
				break
		if not child_found:
			print("ERROR: Could not find specified folder. Last correct folder name was " + str(cur_folder["name"]))
			if parent: return None, None
			return None
	if parent: return cur_folder, prev
	return cur_folder

# Retrieves the final folder object in a filepath and, if specified, its parent
def find_conversation(user_id, path, parent=False):
	convo_name = path.split("/")[-1]
	parent_name = path.split("/")[-2]
	potential_convos = mongo.db.conversations.find({"user_id": user_id, "name": True})
	for convo in potential_convos:
		folder = mongo.db.folders.find_one({
			"_id": convo["parent"]
		})
		if folder["name"] == parent_name:
			if parent:
				return convo, folder
			return convo
	if parent:
		return None, None
	return None




# TODO: Remove authToken from these tests
if __name__ == "__main__":

	AUTH_ID = u'ya29.Glx6BP2MHLV0xcegcsPzy378uZmJo4kgygGturW8jrGCC80ygI8BcxhezpQhAXFjd4pK6Z1sDdHWq8N1P04DSh2H1zOJ18uvLyNAX3u50fCEdPufK7R5eXIkiyUP7g'
	EMAIL = "matthewrastovac@gmail.com"

	import pprint
	pp = pprint.PrettyPrinter(indent=2)

	app = Flask(__name__)
	app.config['MONGO_DBNAME'] = 'tabberdb'
	app.config['MONGO_URI'] = 'mongodb://localhost:27017/tabberdb'
	mongo = PyMongo(app)

	with app.app_context():
		# request_json = {"email": EMAIL}
		# pp.pprint(get_all_content(mongo, request_json))

		# request_json = {"path": "Every/Sub2/SubSub1", "email": EMAIL}
		# print("Added folder: " + str(add_folder(mongo, request_json)))

		# request_json = {"path": "Every/Sub3", "messages": [{"author": "Matthew", "message": "Test"}], "email": EMAIL}
		# print("Added conversation: " + str(add_conversation(mongo, request_json)))

		# request_json = {"path": "Every/Sub2", "newName": "Renamed Folder", "email": EMAIL}
		# print("Renamed folder status: " + str(rename_folder(mongo, request_json)))

		# request_json = {"path": "Every/Works for me", "email": EMAIL}
		# print("Removed conversation status: " + str(delete_conversation(mongo, request_json)))

		request_json = {"path": "Every/Renamed Folder", "email": EMAIL}
		print("Removed folder status: " + str(delete_folder(mongo, request_json)))

		# request_json = {"path": "Every/SubSub1", "newPath": "Every/Sub2", "email": EMAIL}
		# print("Moved folder status: " + str(move_folder(mongo, request_json)))
