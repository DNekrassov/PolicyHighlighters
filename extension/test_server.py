#!/usr/bin/env python3
import flask
import time
import json

table = {
	"table": {
		"contacts":         { "service": "uncollected", "maintenance": "unused", "marketing": "opt in", "profiling": "opt out", "other_companies": "used", "public_forums": "used" },
		"cookies":          { "service": "uncollected", "maintenance": "unused", "marketing": "opt in", "profiling": "opt out", "other_companies": "used", "public_forums": "used" },
		"demographics":     { "service": "uncollected", "maintenance": "unused", "marketing": "opt in", "profiling": "opt out", "other_companies": "used", "public_forums": "used" },
		"financial_info":   { "service": "uncollected", "maintenance": "unused", "marketing": "opt in", "profiling": "opt out", "other_companies": "used", "public_forums": "used" },
		"health_info":      { "service": "uncollected", "maintenance": "unused", "marketing": "opt in", "profiling": "opt out", "other_companies": "used", "public_forums": "used" },
		"preferences":      { "service": "uncollected", "maintenance": "unused", "marketing": "opt in", "profiling": "opt out", "other_companies": "used", "public_forums": "used" },
		"purchases":        { "service": "uncollected", "maintenance": "unused", "marketing": "opt in", "profiling": "opt out", "other_companies": "used", "public_forums": "used" },
		"credit_card_info": { "service": "uncollected", "maintenance": "unused", "marketing": "opt in", "profiling": "opt out", "other_companies": "used", "public_forums": "used" },
		"social_security":  { "service": "uncollected", "maintenance": "unused", "marketing": "opt in", "profiling": "opt out", "other_companies": "used", "public_forums": "used" },
		"gov_id":           { "service": "uncollected", "maintenance": "unused", "marketing": "opt in", "profiling": "opt out", "other_companies": "used", "public_forums": "used" },
		"site_activity":    { "service": "uncollected", "maintenance": "unused", "marketing": "opt in", "profiling": "opt out", "other_companies": "used", "public_forums": "used" },
		"location":         { "service": "uncollected", "maintenance": "unused", "marketing": "opt in", "profiling": "opt out", "other_companies": "used", "public_forums": "used" },
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


