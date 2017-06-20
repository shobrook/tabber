from bson.errors import InvalidId
from bson.objectid import ObjectId
from flask import Flask, jsonify, request, json, abort
from flask_pymongo import PyMongo


# TODO: Make this not atrociously inefficient
def get_all_content(mongo, user):
	output = []
	for folder in mongo.db.folders.find():
		if folder["user_id"] == ObjectId(str(user["_id"])):

			# Gathers all conversations in the folder
			conversation_list = []
			all_conversations = mongo.db.conversations.find()
			for conversation in all_conversations:
				if conversation["_id"] in folder["conversations"]:
					conversation_list.append({"name": conversation["name"], "messages": conversation["messages"]})

			output.append({"name": folder["name"], "conversations": conversation_list, "children": []})

	return output



if __name__ == "__main__":

	app = Flask(__name__)
	app.config['MONGO_DBNAME'] = 'tabberdb'
	app.config['MONGO_URI'] = 'mongodb://localhost:27017/tabberdb'
	mongo = PyMongo(app)

	with app.app_context():
		user = mongo.db.users.find_one({"authToken": "ya29.GltuBP75YTa9HheZl_ruf9MOFLUkbsk5tfeLAJk-4u_ZJrF2LiGrtZnMSrDF2a7rIPD1ndiXb6o-kMnUMIkPk3c_iW7jPq7LYlp7lBfqjJzGhkh1Ee790wyxOTrB"})
		print(get_all_content(mongo, user))
