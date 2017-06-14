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

# Initializes the database with sample folders; for local testing only
@app.route("/tabber/api/populate", methods=["GET"])
def initialize():
	documents = [{"type": u"folder", "name": u"Protips", "content": []}, {"type": u"folder", "name": u"App Ideas", "content": []}, {"type": u"folder", "name": "One-liners", "content": []}]
	mongo.db.messages.insert(documents)
	return ""

# Returns all database contents; for local testing only
@app.route("/tabber/api/get_messages", methods=["GET"])
def get_messages():
	output = []
	for m in mongo.db.messages.find():
		output.append({"type": m["type"], "name": m["name"], "content": m["content"]})
	return jsonify({"messages": output})

# TODO: Iterate through ALL folders and return top 10 most populated ones
# Returns a list of root folders
@app.route("/tabber/api/get_folders", methods=["GET"])
def get_folders():
	output = []
	for m in mongo.db.messages.find():
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
	output = mongo.db.messages.update_one(
		{"type": "folder", "name": request.json["folder"]},
		{"$push": {"content": message}}
	)
	return ""

# TODO: Targets folder given path, appends new folder

if __name__ == "__main__":
	app.run(debug=True)
