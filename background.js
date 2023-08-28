var Defs = {
	// to be read from statuses.json
	STATUSES: [],
	
	ROW_ORDER: [
		"Contact info",
		"Cookies",
		"Preferences",
		"Purchases",
		"Activity"
	],
	
	VALUE_WEIGHTS: {
		'unused': 0,
		'opt-in': 0,
		'opt-out': 0.7,
		'used': 0.7,
	},
	
	get_grade(response_json) {
		var table = response_json.table;
		var rows = Object.values(table);
		
		var sum = 0;
		for (let row of rows)
			for (let val of row)
				sum += this.WEIGHTS[val];
		
		var grade = sum / (rows.length * 6);
		
		var grade_id = (
			grade > 0.7 ? 3 :
			grade > 0.5 ? 2 :
			grade > 0.2 ? 1 :
			0
		);
		
		grade_id = _COUNTER < 1 ? 0 : 3;
		_COUNTER++;
		return grade_id;
	},
	
	INVALID_RESPONSE: {
		"table": {
			"Contact info": ["opt-in", "opt-in", "opt-in", "opt-in", "opt-in", "opt-in"],
			"Cookies": ["opt-in", "opt-in", "opt-in", "opt-in", "opt-in", "opt-in"],
			"Preferences": ["opt-in", "opt-in", "opt-in", "opt-in", "opt-in", "opt-in"],
			"Purchases": ["opt-in", "opt-in", "opt-in", "opt-in", "opt-in", "opt-in"],
			"Activity": ["opt-in", "opt-in", "opt-in", "opt-in", "opt-in", "opt-in"],
		},
		"code": 0
	},
	
	// 3 days (in seconds)
	CACHE_EXPIRY: (60 * 60 * 24) * 3,
	
	SERVER_ADDR: '127.0.0.1:5000',
	
	get_request_url(domain) {
		// return chrome.runtime.getURL('dummy_table.json');
		// return `https://google.com`;
		return `http://${this.SERVER_ADDR}/request?policy_url=${domain}`;
	},
	
	get_domain(url_str) {
		try {
			var url = new URL(url_str);
		}
		catch (e) {
			return undefined;
		}
		
		if (['https:', 'http:', '', null, undefined].includes(url.protocol))
			return url.hostname || undefined;
		else
			return undefined;
	},
	
	unix_time() {
		return Math.floor(Date.now() / 1000);
	},
	
	import_json(path) {
		return fetch(chrome.runtime.getURL(path), {method: 'GET'}).then(
			response => response.json()
		);
	}
};





function TabClient(tab_id, tab) {
	this.tab_id = tab_id;
	this.tab = tab;
}

var _COUNTER = 0;
Object.assign(TabClient.prototype, {
	map_name: 'tabs',
	
	respond(response_json) {
		var grade_id = Defs.get_grade(response_json);
		
		// var details = {
		// 	tabId: tab.id,
		// 	color: '#FFFFFF',
		// 	text: "!"
		// };
		// chrome.action.setBadgeBackgroundColor(details, () => { });
		// chrome.action.setBadgeText(details, () => { });
		try {
			chrome.action.setIcon({
				tabId: this.tab_id,
				path: `icons/icon${grade_id}.png`
			});
		}
		catch (e) {
			// tab doesn't exist? too bad :P
		}
		
		// TODO: chrome.action.openPopup() optional
	}
});

Object.assign(TabClient, {
	init() {
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
		
		chrome.tabs.onCreated.addListener(tab => {
			Tabs.url_switch(tab);
		});
		chrome.tabs.onUpdated.addListener((tab_id, changed_info, tab) => {
			if (changed_info.url)
				Tabs.url_switch(tab);
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
	
	respond(response_json) {
		var table = response_json.table;
		
		var ordered_table = Defs.ROW_ORDER.map(
			data_name => [data_name, table[data_name]]
		);
		
		try {
			this.port.postMessage(ordered_table);
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
					Tables.cancel(port_client, domain);
				});
				
				var domain = Defs.get_domain(params.url);
				if (domain === undefined)
					port_client.respond(Defs.INVALID_RESPONSE)
				else
					Tables.get(port_client, domain);
			})
		});
	}
});





// create a new request to this domain and send it right away.
// when done, it sends the response to all clients & updates the cache.
function CarpoolRequest(domain) {
	this.domain = domain;
	
	// resources that are waiting for this request to load
	this.tabs = new Map();
	this.ports = new Map();
	
	this.aborter = new AbortController();
}

Object.assign(CarpoolRequest.prototype, {
	respond_all() {
		for (let [tab_id, tab_client] of this.tabs)
			tab_client.respond(this.response_json);
		
		for (let [tab_id, port_client] of this.ports)
			port_client.respond(this.response_json);
	},
	
	handle_response(response) {
		if (response.ok)
			response.json().then(response_json => {
				this.response_json = response_json;
				this.respond_all();
				// the request is deleted at the end, so that others may
				// still take its value manually and use it.
				Tables.cache.set(this.domain, this.response_json).then(() => {
					delete Tables.requests.all[this.domain];
				});
			});
		
		else {
			this.response_json = Defs.INVALID_RESPONSE;
			this.respond_all();
			delete Tables.requests.all[this.domain];
		}
	},
	
	start() {
		var self = this;
		return fetch(Defs.get_request_url(domain), {
			method: 'GET',
			// mode: 'no-cors',//  makes me unable to read response
			signal: this.aborter.signal,
			cache: 'default'
		}).then(response => self.handle_response(response));
	},
	
	cancel() {
		this.aborter.abort();
	},
});





var Tables = {
	// for querying the server for tables for a certain domain.
	// if a client requests a domain's table that there already is
	// a request to, it joins in on it (if it's still pending),
	// or takes the result directly (if it's finishied & is busy sending
	// the result to others).
	requests: {
		// holds all existing requests by requested domain.
		all: {},
		
		// for when a client wants a domain's table via a request.
		get(client, domain) {
			var req = this.all[domain];
			if (req) {
				if (this.response_json === undefined)
					req[client.map_name].set(client.tab_id, client);
				else
					client.respond(this.response_json);
			}
			else {
				req = this.all[domain] = new CarpoolRequest(domain);
				req[client.map_name].set(client.tab_id, client);
				req.start();
			}
		},
		
		// for when a client no longer wants a domain's table request
		cancel(client, domain) {
			var req = this.all[domain];
			if (!req)
				return;
			
			req[client.map_name].delete(client.tab_id);
			
			if (req.tabs.size == 0 && req.ports.size == 0) {
				delete this.all[domain];
				req.cancel();
			}
		},
	},
	
	
	
	// past requests results
	cache: {
		encode(table) {
			return {
				table: table,
				time: Defs.unix_time()
			};
		},
		
		decode(encoding) {
			return encoding.table;
		},
		
		has_expired(encoding) {
			return encoding.time - Defs.unix_time() >= Defs.CACHE_EXPIRY;
		},
		
		get(domain) {
			return chrome.storage.local.get(domain).then(items => {
				var encoding = items[domain];
				if (encoding === undefined)
					return undefined;
				
				if (Tables.cache.has_expired(encoding))
					// DON'T REMOVE this domain from the cache!
					// since it's a cache miss, a request will be sent
					// to get this domain's table, which then will be
					// cached & overwrite the expired entry anyway.
					// besides, cache.remove() would cause a race
					// condition between itself and the request!
					return undefined;
				
				var table = Tables.cache.decode(encoding);
				return table;
			});
		},
		
		set(domain, table) {
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
			this shouldn't be so bad right?
			
			*/
			var entry = {};
			entry[domain] = Tables.cache.encode(table);
			return chrome.storage.local.set(entry);
		},
		
		cancel(domain) {
			/* not too important for now, can do without it */
		},
		
		remove_expired() {
			return chrome.storage.local.get(null).then(all_entries => {
				var expired_domains = [];
				for (let domain in all_entries)
					if (Tables.cache.has_expired(all_entries[domain]))
						expired_domains.push(domain);
				return chrome.storage.local.remove(expired_domains);
			});
		},
		
		clear() {
			return chrome.storage.local.clear();
		},
	},
	
	
	
	// for when a client wants a domain's table. involves cache checking
	get(client, domain) {
		// first, try to find an existing request to hop on.
		// because if so, it means the cache doesn't have it.
		var req = this.requests[domain];
		if (req) {
			this.requests.get(client, domain);
			return;
		}
		
		// if didn't find an existing request, try the cache
		this.cache.get(domain).then(table => {
			if (table !== undefined)
				client.respond(table);
			// if didn't find in chace either, subscribe: create a new
			// request, or join an existing one (which might exist now)
			else
				this.requests.get(client, domain);
		});
	},
	
	cancel(client, domain) {
		this.requests.cancel(client, domain);
		this.cache.cancel(domain);
	}
};





var Tabs = {
	tab_domains: [],
	
	url_switch(tab) {
		// also called when a new tab is created. in that case,
		// tab_domains[tab.id] doesn't exist (`undefined`).
		// the other case of `undefined` is when a tab is not a webpage.
		var old_domain = this.tab_domains[tab.id];
		var new_domain = this.tab_domains[tab.id] = Defs.get_domain(tab.url);
		
		var tab_client = new TabClient(tab.id, tab);
		
		if (old_domain == new_domain)
			return;
		if (old_domain)
			Tables.cancel(tab_client, old_domain);
		if (new_domain)
			Tables.get(tab_client, new_domain);
	},
	
	remove(tab_id) {
		var old_domain = this.tab_domains[tab_id];
		delete this.tab_domains[tab_id];
		if (old_domain) {
			var tab_client = new TabClient(tab_id, null);
			Tables.cancel(tab_client, old_domain);
		}
	},
	
	init() {
		chrome.tabs.query({}, all_tabs => {
			for (var tab of all_tabs)
				Tabs.url_switch(tab);
		});
	}
};



function get_settings() {
	return chrome.storage.local.get({'.open': 0, '.threshold': 0});
}

function init_settings() {
	return get_settings().then(items => chrome.storage.local.set(items));
}

Promise.all([
	Defs.import_json('statuses.json').then(statuses_json => {
		for (let status of statuses_json.statuses)
			Defs.STATUSES[status.code] = status.message;
	}),
	Tables.cache.clear(), // TODO: delete this
	Tables.cache.remove_expired(),
	init_settings()
]).then(() => {
	TabClient.init();
	PortClient.init();
	Tabs.init();
});
