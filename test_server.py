#!/usr/bin/env python3
import flask
import time


HOST = '127.0.0.1'
PORT = 5000
DELAY = 2


with open('dummy_table.json', 'rb') as dummy_table_file:
	table = dummy_table_file.read()


app = flask.Flask(__name__)


@app.route('/request')
def request():
	res = flask.Response(table)
	time.sleep(DELAY)
	res.headers['Access-Control-Allow-Origin'] = '*'
	return res


app.run(host=HOST, port=PORT)


# import http.server

# class Handler(http.server.BaseHTTPRequestHandler):
# 	def do_GET(self):
# 		self.send_header('Access-Control-Allow-Origin', '*')
# 		self.send_header('Access-Control-Allow-Methods', 'POST, PUT, PATCH, GET, DELETE, OPTIONS')
# 		self.send_header('Access-Control-Allow-Headers', '*')
# 		self.end_headers()
		
# 		self.wfile.write(table)

# 		self.send_response(200)

# http.server.HTTPServer((HOST, PORT), Handler).serve_forever()


