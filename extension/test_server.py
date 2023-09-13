#!/usr/bin/env python3
import flask
import time
import json

table = {
	"table": {
		"contacts":         { "service": 0, "maintenance": 1, "marketing": 2, "profiling": 3, "other_companies": 0, "public_forums": 0 },
		"cookies":          { "service": 0, "maintenance": 1, "marketing": 2, "profiling": 3, "other_companies": 0, "public_forums": 0 },
		"demographics":     { "service": 0, "maintenance": 1, "marketing": 2, "profiling": 3, "other_companies": 0, "public_forums": 0 },
		"financial_info":   { "service": 0, "maintenance": 1, "marketing": 2, "profiling": 3, "other_companies": 0, "public_forums": 0 },
		"health_info":      { "service": 0, "maintenance": 1, "marketing": 2, "profiling": 3, "other_companies": 0, "public_forums": 0 },
		"preferences":      { "service": 0, "maintenance": 1, "marketing": 2, "profiling": 3, "other_companies": 0, "public_forums": 0 },
		"purchases":        { "service": 0, "maintenance": 1, "marketing": 2, "profiling": 3, "other_companies": 0, "public_forums": 0 },
		"credit_card_info": { "service": 0, "maintenance": 1, "marketing": 2, "profiling": 3, "other_companies": 0, "public_forums": 0 },
		"social_security":  { "service": 0, "maintenance": 1, "marketing": 2, "profiling": 3, "other_companies": 0, "public_forums": 0 },
		"gov_id":           { "service": 0, "maintenance": 1, "marketing": 2, "profiling": 3, "other_companies": 0, "public_forums": 0 },
		"site_activity":    { "service": 0, "maintenance": 1, "marketing": 2, "profiling": 3, "other_companies": 0, "public_forums": 0 },
		"location":         { "service": 0, "maintenance": 1, "marketing": 2, "profiling": 3, "other_companies": 0, "public_forums": 0 }
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


