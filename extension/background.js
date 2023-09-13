importScripts('./common.js');

var Defs = {
	statuses: {
		extension: {
			MSG_NOT_WEBPAGE: {
				"name": "MSG_NOT_WEBPAGE",
				"title": "This is not a webpage",
				"body": "This tab is not a webpage of a website, so it has no privacy policy.",
				"cache": false,
				"update_all_tabs": false,
				"icon": "ok"
			},
			MSG_CONN_TIMEOUT: {
				"name": "MSG_CONN_TIMEOUT",
				"title": "Server connection timed out",
				"body": "We can't connect to the server to get the summary. Check your internet connection or try again later",
				"cache": false,
				"update_all_tabs": false,
				"icon": "error"
			},
			MSG_HTTP_ERR(http_code) {
				return {
					"name": "MSG_HTTP_ERR",
					"title": `Server responded with HTTP ${http_code}`,
					"body": "Please check if the extension is up to date. If the problem persists - please report it to the developers",
					"cache": false,
					"update_all_tabs": true,
					"icon": "error"
				}
			},
			MSG_UNKNOWN_STATUS: {
				"name": "MSG_UNKNOWN_STATUS",
				"title": "Server responded with an unknown error status",
				"body": "While the server was retrieving the privacy policy, it reported an error which we don't have details about. Please check if the extension is up to date.",
				"cache": false,
				"update_all_tabs": true,
				"icon": "error"
			},
		},
		// to be read from statuses.json
		server: new Map()
	},
	
	// 3 days (in seconds)
	CACHE_EXPIRY: (60 * 60 * 24) * 3,
	
	// 5 seconds (in ms)
	RETRY_DELAY: 5 * 1000,
	
	SERVER_ADDR: '127.0.0.1:5000',
	
	get_request_url(domain) {
		// return chrome.runtime.getURL('dummy_table.json');
		// return `https://google.com`;
		return `http://${this.SERVER_ADDR}/request?policy_url=${domain}`;
	},
	
	unix_time() {
		return Math.floor(Date.now() / 1000);
	},
	
	is_res_expired(res_json, settings) {
		if (res_json.cache_counter != settings['.cache_counter'])
			return true;
		else {
			var now = this.unix_time();
			return now - res_json.cache_time >= this.CACHE_EXPIRY;
		}
	},
	
	pack_uint32(num) {
		var bytes = [];
		for (let i = 0; i < 4; i++) {
			bytes.push(num % 0xFF);
			num = Math.floor(num / 0x100); 
		}
		return String.fromCharCode(...bytes);
	},
	
	get_icon_sizes(icon_name) {
		var sizes = ['256', '128', '48', '16'];
		var dict = {};
		for (let size of sizes)
			dict[size] = `icons/${icon_name}${size}.png`
		return dict;
	}
};

var Notifications = {
	all: {},
	
	should_notify(settings, grade) {
		var notif_cond = settings['.notif_cond'];
		var threshold = settings['.threshold'];
		
		switch (notif_cond) {
		case 'always':
			return true;
		case 'never':
			return false;
		case 'threshold':
			var grade_num = {'a': 0, 'b': 1, 'c': 2, 'd': 3};
			return grade_num[threshold] <= grade_num[grade];
		default:
			throw new Error("bad value for setting '.notif_cond'");
		}
	},
	
	create(settings, grade, domain) {
		return chrome.notifications.create('', {
			type: 'basic',
			iconUrl: `icons/${grade}128.png`,
			title: `New Grade ${grade.toUpperCase()} Policy - Policy Highlighters`,
			message: `There's a new privacy policy for ${domain}`,
			// contextMessage: "context!",
			buttons: [{title: "Go to tab"}],
			
			// image: null // image type only
			// items: null, // list type only
			// progress: null // progress type only
			
			priority: Number(settings['.priority']),
			silent: settings['.silent'],
			requireInteraction: false,
		}).then(notif_id => {
			Notifications.all[notif_id] = domain;
		});
	},
	
	init() {
		chrome.notifications.onButtonClicked.addListener((notif_id, button_index) => {
			var domain = Notifications.all[notif_id];
			chrome.notifications.clear(notif_id);
			
			// the notification is not for a specific tab, but for a
			// domain that a tab/tabs have opened, so we just choose
			// any tab with that domain to show.
			// of course, the user might have closed all tabs with the
			// domain by the time they clicked the button, in that case,
			// we open a new tab with that domain manually.
			Common.tabs_with_domain(domain).then(tabs => {
				if (tabs.length)
					return chrome.tabs.update(tabs[0].id, {
						active: true
					});
				else 
					return chrome.tabs.create({
						active: true,
						url: 'https://' + domain // TODO: add https://? http://?
					});
			}).then(tab => {
				return chrome.windows.update(tab.windowId, {
					// drawAttention: true,
					focused: true
				})
			});
			
		});
		
		chrome.notifications.onClosed.addListener((notif_id, by_user) => {
			delete Notifications.all[notif_id];
		});
	}
};





function TabClient(tab_id, tab) {
	this.tab_id = tab_id;
	this.tab = tab;
}

Object.assign(TabClient.prototype, {
	map_name: 'tabs',
	
	respond(req) {
		// TODO: can get the weights only once (when fetch() finishes)
		// and then pass it to all TabClient.respond()'s.
		// but its gonna oercomplicate the current implementation
		// and to be frank how many tabs are gonna be waiting for it?
		// not many lol
		chrome.action.setIcon({
			tabId: this.tab_id,
			path: req.icon
		})
	}
});

Object.assign(TabClient, {
	init() {

		
		chrome.tabs.onCreated.addListener(tab => {
			Tabs.url_switch(tab);
		});
		chrome.tabs.onUpdated.addListener((tab_id, changed_info, tab) => {
			// if (changed_info.url)
			if (changed_info.status == 'complete')
				Tabs.url_switch(tab);
			
			// TODO: cosider
			// https://stackoverflow.com/questions/26759279/refreshing-an-icon-change-for-chrome-extension
			// var nav_set_icon = details => {
			// 	if (details.frameId != 0)
			// 		return;
			// 	Tabs.url_switch(details.tabId);
			// 		chrome.browserAction.setIcon({
			// 			imageData: iconData,
			// 			tabId: ,
			// 		});
			// };
			// chrome.webNavigation.onCommitted.addListener(updateIcon);
			// chrome.webNavigation.onHistoryStateUpdated.addListener(updateIcon);
			// chrome.webNavigation.onBeforeNavigate.addListener(updateIcon);
		});
		
		chrome.tabs.onRemoved.addListener((tab_id, removed_info) => {
			Tabs.remove(tab_id);
		});
	}
});





function PortClient(tab_id, port) {
	this.tab_id = tab_id;
	this.port = port;
}

Object.assign(PortClient.prototype, {
	map_name: 'ports',
	
	respond(req) {
		try {
			this.port.postMessage({
				res_json: req.res_json,
				status: req.status
			});
			this.port.disconnect();
		}
		catch (e) {
			// port doesn't exist? too bad :P
		}
	},
});

Object.assign(PortClient, {
	init() {
		chrome.runtime.onConnect.addListener(port => {
			port.onMessage.addListener(params => {
				var port_client = new PortClient(params.tab_id, port);
				port.onDisconnect.addListener(() => {
					CarpoolRequest.cancel(port_client, domain);
				});
				
				var domain = Common.get_domain(params.url);
				CarpoolRequest.get(port_client, domain);
			})
		});
	}
});




/* TODO: if cache full, implement LRU:
oldest = []; // will contain K oldest non-expired entries
go over all keys. for each key:
	if expired: remove key
	else:
		insert key into `oldest` such that it remains
		sorted by expiration dates.
		if oldest.length > K: pop out oldest[-1]; 
remove all keys in `oldest` from cache.

problems:
*	deletion might be called by following threads, so we
	need to set up a flag to tell others, and keep them on
	standby until the deletion is complete.
*	we don't know how many entries we have to delete, since
	they're not all the same size: table sizes may have an
	upper bound, but domain lengths are unlimited...
	*	idea: use IP addresses for keys? nah this is useless

solution (making peace with it):
theres a minimal entry size, so if we delete N entries we
know that we freed at least N * MIN_ENTRY_SIZE bytes.
we don't care if after the deletion the cache is still too
full to be added 1 big entry, or if we freed too many
entries so now it's empty, since the cache is just to
optimize performance and it won't cause errors!
cuz if the cache is not functional (can't contain any
entries or can't store new entries) the implementation still
uses requests to get the tables.
	
idea: on extension initialization, delete all expired keys.
this shouldn't be so bad right? */

// create a new request to this domain.
// when done, it sends the response to all clients that requested it.
function CarpoolRequest(domain) {
	this.domain = domain;
	
	// resources that are waiting for this request to load
	this.tabs = new Map();
	this.ports = new Map();
	
	this.aborter = new AbortController();
	
	this.canceled = false;
	this.done = false;
	
	this.status = null;
	this.res_json = null;
}

Object.assign(CarpoolRequest.prototype, {
	respond_all() {
	    console.log(this.res_json)
		var self = this;
		
		if (this.res_json.table) {
			this.grade = Common.get_grade(
				Common.matrixfy_table(this.res_json.table),
				this.settings
			);
			this.icon = Defs.get_icon_sizes(this.grade);
		}
		else
			this.icon = Defs.get_icon_sizes(this.status.icon);
		
		// return chrome.action.openPopup({tabId: self.tab_id});
		// return chrome.action.setPopup({tabId: self.tab_id, popup: 'popup.html'});
		
		var tab_clients_promise = this.status.update_all_tabs ?
			Common.tabs_with_domain(this.domain).then(
				tabs => tabs.map(tab => new TabClient(tab.id, tab))
			)
			: Promise.resolve([...this.tabs.values()]);
		
		if (this.new) {
			// notify all tabs that have this domain loaded - even the
			// old ones that have already queried
			if (Notifications.should_notify(this.settings, this.grade))
				Notifications.create(
					this.settings,
					this.grade,
					this.res_json.domain,
				);
			
			// tab_clients_promise.then(tab_clients => {
			// 	for (let tab_client of tab_clients) {
			// 		chrome.action.setBadgeBackgroundColor({
			// 			color: '#FF0000',
			// 			tabId: tab_client.tab_id
			// 		});
			// 		chrome.action.setBadgeTextColor({
			// 			color: '#FFFFFF',
			// 			tabId: tab_client.tab_id
			// 		});
			// 		chrome.action.setBadgeText({
			// 			text: "!",
			// 			tabId: tab_client.tab_id
			// 		});
			// 	}
			// });
		}
		
		tab_clients_promise.then(tab_clients => {
			for (let tab_client of tab_clients)
				tab_client.respond(self);
		});
		
		
		for (let port_client of this.ports.values())
			port_client.respond(this);
	},
	
	start() {
		var self = this;
		
		if (!this.domain) {
			this.res_json = {};
			this.status = Defs.statuses.extension.MSG_NOT_WEBPAGE;
			this.done = true;
			this.respond_all();
			return;
		}
		
		Promise.all([
			chrome.storage.local.get(this.domain).then(
				items => items[self.domain]
			),
			Common.get_settings()
		]).then(([cache_json, settings]) => {
			self.settings = settings;
			
			if (self.canceled)
				return;
			
			// send request is json not found in cache, or it's expired.
			if (cache_json === undefined
				|| Defs.is_res_expired(cache_json, settings)) {
				self.cache_json = cache_json;
				return self.send_request();
			}
			// json in cahce and isn't expired
			else {
				self.res_json = cache_json;
				self.status = Defs.statuses.server.get(cache_json.code);
				self.done = true;
				self.respond_all();
				CarpoolRequest.all.delete(self.domain);
			}
		});
	},
	
	send_request() {
		var self = this;
		
		return fetch(Defs.get_request_url(this.domain), {
			method: 'GET',
			// mode: 'no-cors', // makes me unable to read response
			signal: this.aborter.signal,
			cache: 'default'
		}).then(
			// request canceled, or was responded to (2XX or otherwise)
			response =>
				self.canceled ? [{}, {}] : // <-- dummies
				!response.ok ? [{}, Defs.statuses.extension.MSG_HTTP_ERR(response.status)] :
				response.json().then(res_json => {
					var status = Defs.statuses.server.get(res_json.code);
					return status ? [res_json, status] :
						[{}, Defs.statuses.extension.MSG_UNKNOWN_STATUS];
				}),
			
			// timed out
			() => [{}, Defs.statuses.extension.MSG_CONN_TIMEOUT]
		).then(([res_json, status]) => {
			self.res_json = res_json;
			self.status = status;
		}).then(
			() => self.canceled ? Promise.resolve(null) : Common.get_settings()
		).then(settings => {
			if (self.canceled)
				return;
			
			if (self.status.retry) {
				setTimeout(() => self.send_request(), Defs.RETRY_DELAY);
				return;
			}
			
			var cache_promise;
			if (self.status.cache) {
				self.res_json.cache_time = Defs.unix_time();
				self.res_json.cache_counter = settings['.cache_counter'];
				
				// mark the summary as new (unseen) if it has a table,
				// and an old summary either isn't cached or is cached
				// but its cached but its policy creation time is
				// different or is cached but an its an error response
				// (which gives creation_time === undefined. no need to
				// test for it since we already asserted that res_json
				// has a table so it has a creation_time as well.) 
				self.new = (
					!!self.res_json.table // new json has a table
					&& (
						// we don't have an old version of the summar
						self.cache_json === undefined 
						|| self.res_json.creation_time != self.cache_json.creation_time
					)
				);
				
				// TODO: relevant for badges
				// self.res_json.unread = self.new;
				
				var entry = {};
				entry[self.domain] = self.res_json;
				cache_promise = chrome.storage.local.set(entry);
			}
			else
				cache_promise = Promise.resolve(null);

			self.settings = settings;
			self.done = true;
			self.respond_all();
			
			return cache_promise.then(() => {
				CarpoolRequest.all.delete(self.domain);
			});
		});
	},
	
	cancel() {
		this.aborter.abort();
		this.canceled = true;
	},
});


// for querying the server for tables for a certain domain.
// if a client requests a domain's table that there already is
// a request to, it joins in on it (if it's still pending),
// or takes the result directly (if it's finishied & is busy sending
// the result to others).
Object.assign(CarpoolRequest, {
	// holds all existing requests by requested domain.
	all: new Map(),
	
	get(client, domain) {
		var req = this.all.get(domain);
		
		if (req) {
			if (req.done)
				client.respond(req);
			else
				req[client.map_name].set(client.tab_id, client);
		}
		else {
			req = new CarpoolRequest(domain);
			this.all.set(domain, req);
			req[client.map_name].set(client.tab_id, client);
			req.start();
		}
	},
	
	// for when a client no longer wants a domain's table request
	cancel(client, domain) {
		var req = this.all.get(domain);
		
		if (!req)
			return;
		
		req[client.map_name].delete(client.tab_id);
		
		if (req.tabs.size == 0 && req.ports.size == 0) {
			this.all.delete(domain);
			req.cancel();
		}
	},
});





var Tabs = {
	// all open tab IDs and their current domains
	tab_domains: new Map(),
	
	url_switch(tab) {
		// also called when a new tab is created. in that case,
		// tab_domains[tab.id] doesn't exist (`undefined`).
		// the other case of `undefined` is when a tab is not a webpage.
		var old_domain = this.tab_domains.get(tab.id);
		var new_domain = Common.get_domain(tab.url);
		this.tab_domains.set(tab.id, new_domain)
		
		var tab_client = new TabClient(tab.id, tab);
		
		CarpoolRequest.cancel(tab_client, old_domain);
		CarpoolRequest.get(tab_client, new_domain);
	},
	
	remove(tab_id) {
		var old_domain = this.tab_domains.get(tab_id);
		this.tab_domains.delete(tab_id);
		if (old_domain) {
			var tab_client = new TabClient(tab_id, null);
			CarpoolRequest.cancel(tab_client, old_domain);
		}
	},
	
	init() {
		chrome.tabs.query({}).then(all_tabs => {
			for (var tab of all_tabs)
				Tabs.url_switch(tab);
		});
	}
};


function init_settings() {
	return Common.get_settings().then(
		settings => chrome.storage.local.set(settings)
	);
}

Common.init().then(() => Promise.all([
	Common.import_json('statuses.json').then(statuses_json => {
		for (let status of statuses_json.statuses)
			Defs.statuses.server.set(status.code, status);
	}),
	// chrome.storage.local.clear(),
	Common.clear_cache() // init_settings() // TODO: switch back
])).then(() => {
	TabClient.init();
	PortClient.init();
	Tabs.init();
	Notifications.init();
});

// prevents this page from going inactive after 30 seconds
function keep_alive() {
	setInterval(chrome.runtime.getPlatformInfo, 20 * 1000);
}
// chrome.runtime.onStartup.addListener(keep_alive);
keep_alive();
