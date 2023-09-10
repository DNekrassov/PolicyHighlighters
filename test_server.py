#!/usr/bin/env python3
import flask
import time
import json


with open('table_config.json') as table_config_json:
	table_config = json.loads(table_config_json.read())

def row(*vals):
	return {
		col['key']: val
		for col, val in zip(table_config['col_order'], vals)
	}
	
table = {
	"table": [
		[1, 1, 1, 1, 1, 1],
		[1, 1, 1, 1, 1, 1],
		[3, 3, 3, 3, 3, 3],
		[3, 3, 3, 3, 3, 3],
		[0, 0, 0, 0, 0, 0],
	],
	"table": {
		"contacts":         row(0, 1, 2, 3, 0, 1),
		"cookies":          row(0, 1, 2, 3, 0, 1),
		"demographics":     row(0, 1, 2, 3, 0, 1),
		"financial_info":   row(0, 1, 2, 3, 0, 1),
		"health_info":      row(0, 1, 2, 3, 0, 1),
		"preferences":      row(0, 1, 2, 3, 0, 1),
		"purchases":        row(0, 1, 2, 3, 0, 1),
		"credit_card_info": row(0, 1, 2, 3, 0, 1),
		"social_security":  row(0, 1, 2, 3, 0, 1),
		"gov_id":           row(0, 1, 2, 3, 0, 1),
		"site_activity":    row(0, 1, 2, 3, 0, 1),
		"location":         row(0, 1, 2, 3, 0, 1),
	},
	"domain": "web.whatsapp.com",
	"creation_time": "1970-01-01 00:00:00",
	"code": 0,
	"confidence": 60
}


app = flask.Flask(__name__)

@app.route('/request')
def request():
	res = flask.Response(json.dumps(table))
	time.sleep(2)
	res.headers['Access-Control-Allow-Origin'] = '*'
	return res


app.run(host='127.0.0.1', port=5000)























# counter = 0
# @app.route('/trap')
# def trap():
# 	global counter
# 	counter += 1
# 	print(f"handling {counter}")
# 	time.sleep(10000000)



import threading
ongoing = set()
ongoing_lock = threading.Lock()

def gpt_wrapper(policy):
	ongoing_lock.aqcuire()
	
	if policy.domain in cache:
		result = cache[policy.domain]
		ongoing_lock.release()
		return result
	
	elif policy.domain in ongoing:
		ongoing_lock.release()
		return statuses.COME_BACK_LATER
	
	else:
		ongoing.add(policy.domain)
		ongoing_lock.release()
	
		result = gpt(policy)
		
		ongoing_lock.aqcuire()
		cache[policy.domain] = result
		ongoing.remove(policy.domain)
		ongoing_lock.release()



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


