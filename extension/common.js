var Common = {
	// palceholders, will be read from table_config.json
	row_order: null,
	col_order: null,
	val_nums: null,
	
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
	
	sum(arr) {
		var s = 0;
		for (let val of arr)
			s += val;
		return s;
	},
	
	max(arr) {
		var m = -Infinity;
		for (let val of arr)
			m = Math.max(m, val);
		return m;
	},
	
	get_max_score(weights) {
		return this.sum(weights.rows) *
			this.sum(weights.cols) *
			this.max(weights.vals);
	},
	
	calc_scores(table, settings) {
		// copy. if all weights are zeros replace then with ones
		var weights = {};
		for (let key of ['rows', 'cols', 'vals']) {
			weights[key] = settings['.weights'][key];
			if (weights[key].every(w => w == 0))
				 weights[key] = weights[key].map(w => 1);
		}
		
		var score = 0;
		table.forEach((row, i) => {
			row.forEach((val, j) => {
				score += weights.rows[i] * weights.cols[j] * weights.vals[val];
			});
		});
		var max_score = this.get_max_score(weights);
		var norm_score = score / max_score;
		var grade = (
			norm_score < 0.25 ? 'a' :
			norm_score < 0.50 ? 'b' :
			norm_score < 0.75 ? 'c' :
			'd'
		);
		
		return {
			score: score,
			max_score: max_score,
			norm_score: norm_score,
			grade: grade
		};
	},
	
	matrixfy_table(table) {
		return Common.row_order.map(
			row => Common.col_order.map(
				col => Common.val_nums[table[row.key][col.key]]
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
				'rows': Common.row_order.map(({weight}) => weight), // Array(Common.row_order.length).fill(1),
				'cols': Common.col_order.map(({weight}) => weight), // Array(Common.col_order.length).fill(1),
				'vals': [0, 0.2, 0.3, 0.7, 1]
			}
		});
	},

	clear_cache() {
		// this also initializes settings
		var cur_settings;
		return this.get_settings().then(settings => {
			cur_settings = settings;
			return chrome.storage.local.clear();
		}).then(() => chrome.storage.local.set(cur_settings));
	},
	
	init_settings() {
		return this.get_settings().then(
			settings => chrome.storage.local.set(settings)
		);
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
