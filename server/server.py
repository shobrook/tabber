from flask import Flask
from flask import render_template
import os
from flask import jsonify

app = Flask(__name__)



# Default response; return empty string
@app.route("/")
def main():
	return "Something"

# If user inputs two points, generates trip
# This method will be the main method. We will specify rules with more arguments later like <gas_stations> or <attractions> for custom trips
@app.route("/level-one/<var_a>")
def trip(var_a):
	return "Something else"



if __name__ == "__main__":
	app.run(debug=True)
