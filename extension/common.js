var Common = {
	// palceholders
	row_order: null,
	col_order: null,
	
	get_domain(url_str) {
		try {
			var url = new URL(url_str);
		}
		catch (e) {
			return undefined;
		}
		
		if (['https:', 'http:', '', null, undefined].includes(url.protocol)
			&& !['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname))
			return url.hostname || undefined;
		else
			return undefined;
	},
	
	tabs_with_domain(domain) {
		return chrome.tabs.query({}).then(
			all_tabs => all_tabs.filter(
				tab => domain == Common.get_domain(tab.url)
			)
		);
	},
	
	sum(arr, f) {
		if (f === undefined)
			f = x => x;
		return arr.reduce((partial_sum, val) => partial_sum + f(val), 0);
	},
	
	get_max_table_sum(weights) {
		return this.sum(weights.rows) *
			this.sum(weights.cols) *
			weights.vals[3];
	},
	
	get_grade(table, settings) {
		var weights = settings['.weights'];
		var sum = 0;
		table.forEach((row, i) => {
			row.forEach((val, j) => {
				sum += weights.rows[i] * weights.cols[j] * weights.vals[val];
			});
		});
		var numeric_grade = sum / this.get_max_table_sum(weights);
		var grade = (
			numeric_grade < 0.25 ? 'a' :
			numeric_grade < 0.50 ? 'b' :
			numeric_grade < 0.75 ? 'c' :
			'd'
		);
		
		return grade;
	},
	
	matrixfy_table(table) {
		return Common.row_order.map(
			row => Common.col_order.map(
				col => table[row.key][col.key]
			)
		);
	},
	
	import_json(path) {
		return fetch(chrome.runtime.getURL(path), {method: 'GET'}).then(
			response => response.json()
		);
	},
	
	get_settings() {
		return chrome.storage.local.get({
			// explicit settings
			'.notif_cond': 'always',
			'.threshold': 'a',
			'.silent': false,
			'.priority': '0',
			
			// implicit settings
			'.legend': true,
			'.cache_counter': 0,
			'.weights': {
				'rows': Array(Common.row_order.length).fill(1),
				'cols': Array(Common.col_order.length).fill(1),
				'vals': [0, 0.2, 0.7, 1]
			}
		});
	},

	clear_cache() {
		var cur_settings;
		return this.get_settings().then(settings => {
			cur_settings = settings;
			return chrome.storage.local.clear();
		}).then(() => chrome.storage.local.set(cur_settings));
	},
	
	inc_cache_counter() {
		chrome.storage.local.get('.cache_counter').then(items => {
			var [cache_counter] = Object.values(items);
			var new_cache_counter = {'.cache_counter': cache_counter + 1};
			return chrome.storage.local.set(new_cache_counter);
		})
	},
	
	init() {
		return this.import_json('table_config.json').then(config_json => {
			for (let [key, val] of Object.entries(config_json))
				Common[key] = val;
		});
	}
};
