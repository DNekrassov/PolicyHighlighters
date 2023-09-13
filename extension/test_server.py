#!/usr/bin/env python3
import flask
import time
import json

table = {
	
	
	# "table": {
	# 	"contacts": {"service": "unused", "maintenance": "used", "marketing": "used", "profiling": "used", "other_companies": "used", "public_forums": "used"},
	# 	"cookies": {"service": "uncollected", "maintenance": "uncollected", "marketing": "uncollected", "profiling": "uncollected", "other_companies": "uncollected", "public_forums": "uncollected"},
	# 	"demographics": {"service": "uncollected", "maintenance": "uncollected", "marketing": "uncollected", "profiling": "uncollected", "other_companies": "uncollected", "public_forums": "uncollected"},
	# 	"health_info": {"service": "uncollected", "maintenance": "uncollected", "marketing": "uncollected", "profiling": "uncollected", "other_companies": "uncollected", "public_forums": "uncollected"},
	# 	"preferences": {"service": "uncollected", "maintenance": "uncollected", "marketing": "uncollected", "profiling": "uncollected", "other_companies": "uncollected", "public_forums": "uncollected"},
	# 	"purchases": {"service": "uncollected", "maintenance": "uncollected", "marketing": "uncollected", "profiling": "uncollected", "other_companies": "uncollected", "public_forums": "uncollected"},
	# 	"credit_card_info": {"service": "uncollected", "maintenance": "uncollected", "marketing": "uncollected", "profiling": "uncollected", "other_companies": "uncollected", "public_forums": "uncollected"},
	# 	"social_security": {"service": "uncollected", "maintenance": "uncollected", "marketing": "uncollected", "profiling": "uncollected", "other_companies": "uncollected", "public_forums": "uncollected"},
	# 	"site_activity": {"service": "uncollected", "maintenance": "uncollected", "marketing": "uncollected", "profiling": "uncollected", "other_companies": "uncollected", "public_forums": "uncollected"}
	# },
	
	# facebook!
	"table": {"contacts": {"service": "used", "maintenance": "used", "marketing": "used", "profiling": "used", "other_companies": "used", "public_forums": "used"}, "cookies": {"service": "used", "maintenance": "used", "marketing": "used", "profiling": "used", "other_companies": "used", "public_forums": "used"}, "demographics": {"service": "used", "maintenance": "used", "marketing": "used", "profiling": "used", "other_companies": "used", "public_forums": "used"}, "health_info": {"service": "unused", "maintenance": "opt out", "marketing": "used", "profiling": "used", "other_companies": "used", "public_forums": "unused"}, "preferences": {"service": "opt out", "maintenance": "used", "marketing": "used", "profiling": "opt out", "other_companies": "opt out", "public_forums": "opt in"}, "purchases": {"service": "used", "maintenance": "used", "marketing": "used", "profiling": "used", "other_companies": "used", "public_forums": "used"}, "credit_card_info": {"service": "used", "maintenance": "used", "marketing": "used", "profiling": "used", "other_companies": "used", "public_forums": "used"}, "social_security": {"service": "used", "maintenance": "used", "marketing": "unused", "profiling": "used", "other_companies": "used", "public_forums": "used"}, "site_activity": {"service": "used", "maintenance": "used", "marketing": "used", "profiling": "used", "other_companies": "used", "public_forums": "used"}},
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


