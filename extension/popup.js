var Elems = {};

var legend_box_height = null;
var clear_cache_progress = null;
var clear_cache_timer = null;

var cur_tab_promise = chrome.tabs.query({
	active: true,
	currentWindow: true
}).then(tabs => tabs[0]);;

var settings_init_promise = null;



var Summary = {
	page_group: null, // placeholder
	edit_mode: false,
	res_json: null,
	status: null,
	
	ROW_OFFSET: 2,
	
	cell_classes: ['uncollected', 'unused', 'opt-in', 'opt-out', 'used'],
	
	cell_texts: {
		'uncollected': 'uncollected',
		'unused': '-',
		'opt-in': 'opt in',
		'opt-out': 'opt out',
		'used': 'used'
	},
	
	
	create_cell(cls, text, with_weight) {
		var cell = document.createElement('label');
		cell.classList.add('cell', cls);
		
		var text_cont = document.createElement('div');
		text_cont.classList.add('cell-content');
		text_cont.innerText = this.cell_texts[cls] || text;
		cell.append(text_cont);
		
		if (with_weight) {
			var textbox = document.createElement('input');
			textbox.type = 'text';
			var weight = document.createElement('div');
			weight.classList.add('weight-input', 'weight');
			weight.append(textbox);
			cell.append(weight);
		}
		
		return cell;
	},
	
	create_row(vals) {
		var row = document.createElement('div');
		row.classList.add('row');
		for (let val of vals)
			row.append(this.create_cell(this.cell_classes[val], '',  false));
		return row;
	},
	
	add_entry(vals) {
		row = this.create_row(vals.slice(0, 4));
		Elems.tables.children[1].append(row);
		
		row = this.create_row(vals.slice(4, 6));
		Elems.tables.children[2].append(row);
	},
	
	clear_table() {
		var table = Elems.tables.children[0];
		for (let row of [...table.children].slice(this.ROW_OFFSET))
			row.classList.remove('empty');
		
		for (let table of [...Elems.tables.children].slice(1, 3))
			for (let row of [...table.children].slice(this.ROW_OFFSET))
				row.remove();
	},

	show_message(title, body) {
		Elems.message_title.innerText = title;
		Elems.message_body.innerText = body;
		this.page_group.select(0);
	},
	
	show_table() {
		this.page_group.select(1);
	},
	
	init() {
		for (let {shown} of Common.row_order) {
			var row = this.create_row([]);
			row.append(this.create_cell('header', shown, true));
			Elems.tables.children[0].append(row);
		}
		
		var row = this.create_row([]);
		for (let {shown} of Common.col_order.slice(0, 4))
			row.append(this.create_cell('header', shown, true));
		Elems.tables.children[1].append(row);
		
		var row = this.create_row([]);
		for (let {shown} of Common.col_order.slice(4, 6))
			row.append(this.create_cell('header', shown, true));
		Elems.tables.children[2].append(row);
		
		var edit_mode_checkbox = document.querySelector('[name=edit_mode]');
		edit_mode_checkbox.addEventListener('change', () => {
			Summary.edit_mode = edit_mode_checkbox.checked;
			Summary.load();
			if (Summary.edit_mode) {
				Elems.edit_info_box.classList.remove('hidden');
				Elems.tables.classList.add('edited');
			}
			else {
				Elems.edit_info_box.classList.add('hidden');
				Elems.tables.classList.remove('edited');
			}
		});
	},
	
	get_table_weights(i) {
		return Elems.tables.children[i].querySelectorAll('.cell.header .weight-input input');
	},
	get_row_weights() {
		return [...this.get_table_weights(0)];
	},
	get_col_weights() {
		return [...this.get_table_weights(1), ...this.get_table_weights(2)];
	},
	get_val_weights() {
		return [...Elems.val_weights.querySelectorAll('.cell .weight-input input')];
	},
	
	init_weights(weights) {
		var pairs = [
			[this.get_row_weights(), weights.rows],
			[this.get_col_weights(), weights.cols],
			[this.get_val_weights(), weights.vals]
		];
		for (let [weight_elems, weight_vals] of pairs)
			weight_elems.forEach((weight_elem, i) => {
				weight_elem.value = weight_vals[i].toString();
				weight_elem.addEventListener('blur', () => {
					Summary.correct_weight(weight_elem);
					Summary.update_weights();
				});
			});
	},
	
	correct_weight(weight) {
		var num = Number(weight.value);
		if (isNaN(num) || num < 0)
			weight.value = '0';
	},
	
	update_weights() {
		Common.get_settings().then(settings => {
			settings['.weights'].rows = Summary.get_row_weights().map(
				weight => Number(weight.value)
			);
			settings['.weights'].cols = Summary.get_col_weights().map(
				weight => Number(weight.value)
			);
			settings['.weights'].vals = Summary.get_val_weights().map(
				weight => Number(weight.value)
			);
			Summary.set_grade(settings);
			return chrome.storage.local.set(settings);
		})
	},
	
	set_grade(settings) {
		var scores = Common.calc_scores(this.res_json.table, settings);
		
		Elems.grade.classList.remove('a', 'b', 'c', 'd');
		Elems.grade.classList.add(scores.grade);
		
		// print up to 3 decimal places, and trim trailing zeros.
		var repr = (Math.round(scores.max_score * 1000) / 1000).toFixed(3);
		for (let i = repr.length - 1; i >= 0 ; i--) {
			if (repr[i] == '0')
				continue;
			if (repr[i] == '.')
				repr = repr.slice(0, i);
			else
				repr = repr.slice(0, i + 1);
			break;
		}
		
		Elems.max_score.innerText = repr;
		Elems.norm_score.innerText = Math.round(100 * scores.norm_score) + '%';
	},
	
	load() {
		return settings_init_promise.then(() => {
			if (!Summary.res_json.table && !Summary.edit_mode)
				Summary.show_message(
					Summary.status.title,
					Summary.status.body
				);
			
			else {
				Summary.clear_table();
		
				var uncollected_list = [];
				var unused_list = [];
				Summary.res_json.table.forEach((row, i) => {
					Summary.add_entry(row);
					if (row.every(val => val < 2)) {
						if (row.every(val => val == 0))
							uncollected_list.push(Common.row_order[i].shown);
						else
							unused_list.push(Common.row_order[i].shown);
						for (let table of Elems.tables.children)
							table.children[Summary.ROW_OFFSET + i].classList.add('empty');
					}
				});
				
				Elems.uncollected.innerText = uncollected_list.length ?
					uncollected_list.join(', ') : '-';
				Elems.unused.innerText = unused_list.length ?
					unused_list.join(', ') : '-';
					
				if (unused_list.length == Common.row_order.length) {
					var wide_cell = this.create_cell('header', "");
					wide_cell.style.width = "100%";
					wide_cell.style.height = "100px";
					wide_cell.style.backgroundColor = "#181818";
					wide_cell.classList.add('dim');
					
					var wide_cell2 = wide_cell.cloneNode(true);
					wide_cell.innerText = "This website doesn't collect your data";
					
					var row = this.create_row([]);
					row.append(wide_cell);
					Elems.tables.children[1].append(row);
					
					var row = this.create_row([]);
					row.append(wide_cell2);
					Elems.tables.children[2].append(row);
					
				}
				Elems.confidence.innerText = Summary.res_json.confidence;
				
				return Common.get_settings().then(settings => {
					Summary.set_grade(settings);
					Summary.show_table();
					// 	Summary.show_message(
					// 		"This website doesn't collect your data",
					// 		"Your data is 100% safe!"
					// 	);
				});
			}
		});
	},
	
	fetch() {
		return cur_tab_promise.then(cur_tab => {
			var port = chrome.runtime.connect({name: 'table'});
	
			port.onMessage.addListener(summary => {
				// TODO: support new type of request, that marks new
				// policies as read. background.js will compare the
				// creation_time of the storage entry to verify.
				//
				// if (summary.res_json.new)
				// 	send_mark_as_read_request(
				// 	summary.res_json.domain,
				// 	summary.res_json.creation_time,
				// );
				Summary.res_json = summary.res_json;
				Summary.status = summary.status;
				settings_init_promise.then(() => {
					if (Summary.res_json.table)
						Summary.res_json.table = Common.matrixfy_table(Summary.res_json.table);
					Summary.load();
				});
			});
			
			cur_tab_promise.then(cur_tab => {
				port.postMessage({
					tab_id: cur_tab.id,
					url: cur_tab.url
				});
			});
		});
	}
};





// TODO: add badges later?
function remove_badge() {
	Promise.all([
		cur_tab_promise,
		chrome.tabs.query({})
	]).then(([cur_tab, all_tabs]) => {
		var promises = [];
		var cur_domain = Common.get_domain(cur_tab.url)
		
		return Promise.all(all_tabs.map(tab => {
			var domain = Common.get_domain(tab.url);
			if (domain == cur_domain)
				return chrome.action.setBadgeText({
					text: "",
					tabId: tab.id
				});
			else
				return null;
		}));
	})
}





function PageGroup(parent, initial_index) {
	this.pages = [...parent.children];
	this.sel_index = initial_index;
	// var max_width = 0;
	
	// this.pages.forEach(page => {
	// 	var rect = page.getBoundingClientRect();
	// 	max_width = Math.max(max_width, rect.width);
	// });
	
	this.pages.forEach((page, i) => {
		// page.style.width = max_width + 'px';
		if (i != initial_index)
			page.classList.add('hidden');
	});
}
Object.assign(PageGroup.prototype, {
	select(i) {
		if (this.sel_index == i)
			return;
		this.pages[this.sel_index].classList.add('hidden');
		this.pages[i].classList.remove('hidden');
		this.sel_index = i;
	}
});





function init_menu() {
	var page_group = new PageGroup(Elems.pages, 0);
	
	var menu_items = [...Elems.menu.children];
	menu_items[page_group.sel_index].classList.add('selected');
	
	// var MENU_X = Elems.menu.getBoundingClientRect().x;
	// function move_highlighter(button) {
	// 	var button_rect = button.getBoundingClientRect();
	// 	var left = button_rect.x - MENU_X;
	// 	Elems.selection_highlighter.style.left = left + 'px';
	// }

	menu_items.forEach((button, i) => {
		button.addEventListener('click', () => {
			if (i == page_group.sel_index)
				return;
			
			button.classList.add('selected');
			menu_items[page_group.sel_index].classList.remove('selected');
			
			page_group.select(i);
			
			// move_highlighter(button);
		});
	});
	
	// move_highlighter(menu_items[page_group.sel_index]);
}





// important! must be called at least once for initialization.
function toggle_legend() {
	Elems.legend_arrow.classList.toggle('up');
	Elems.legend_wings.classList.toggle('braces');
	
	var turning_open = Elems.legend_wings.classList.contains('braces');
	if (turning_open)
		// TODO: this wont work if the elements can change size
		Elems.legend_box.style.height = legend_box_height + 'px';
	else
		Elems.legend_box.style.height = '0px';
	
	return chrome.storage.local.set({'.legend': turning_open});
}





function settings_init(settings) {
	function legend_init(value) {
		// legend starts open. if value == true, keep open,
		// toggle_legend() must still be called for initialization.
		if (value) {
			toggle_legend();
			toggle_legend();
		}
		// if value == false, close
		else
			toggle_legend();
	}
	
	function ckeckbox_init(setting, value) {
		var name = setting.substring(1); // remove dot
		var checkbox = document.querySelector(`input[name=${name}]`);
		checkbox.checked = value;
		
		checkbox.addEventListener('change', () => {
			var entry = {};
			entry[setting] = checkbox.checked;
			chrome.storage.local.set(entry);
		});
	}
	function radio_init(setting, value) {
		var name = setting.substring(1); // remove dot
		var radios = document.querySelectorAll(`input[name=${name}]`);
		
		[...radios].forEach((radio, i) => {
			// initialize to saved config value
			if (radio.value == value)
				radio.checked = true;
			// fires only when radio becomes checked
			radio.addEventListener('change', () => {
				var entry = {};
				entry[setting] = radio.value;
				chrome.storage.local.set(entry);
			});
		});
	}
	
	for (let [setting, value] of Object.entries(settings))
		if (setting == '.silent')
			ckeckbox_init(setting, value);
		else if (['.notif_cond', '.threshold', '.priority'].includes(setting))
			radio_init(setting, value);
		else if (setting == '.legend')
			legend_init(value);
		else if (setting == '.weights')
			Summary.init_weights(value);
}





function clear_cache_button_init() {
	function cancel() {
		Elems.clear_cache.classList.remove('held');
		Elems.clear_cache_time.innerText = "click & hold";
		
		// in case the user is being a smartass
		if (!clear_cache_progress)
			return;
		
		clearTimeout(clear_cache_timer);
		clear_cache_timer = null;
		var progress = clear_cache_progress;
		clear_cache_progress = null;
		
		progress.style.opacity = '0';
		setTimeout(() => progress.remove(), 2000);
	}
	
	Elems.clear_cache.addEventListener('mousedown', () => {
		cancel();
		
		var progress = clear_cache_progress = document.createElement('div');
		progress.classList.add('clear_cache_progress');
		Object.assign(progress.style, {
			'position': 'absolute',
			'top': '0',
			'left': '0',
			'height': '100%',
			'width': '0%',
			'opacity': '0',
		});
		requestAnimationFrame(() => {
			Object.assign(progress.style, {
				'transition': 'width 2s linear, opacity 0.2s linear, background-color 0.5s linear',
				'width': '100%',
				'opacity': '1'
			});
		});
		
		Elems.clear_cache_progress_cont.append(progress);
		Elems.clear_cache.classList.add('held');
		
		var i = 20;
		function update_timer() {
			if (i > 0) {
				var secs = Math.floor(i / 10);
				var tenths = i % 10;
				Elems.clear_cache_time.innerText = `${secs}.${tenths}s`;
				i--;
			}
			else {
				Common.inc_cache_counter();
				cancel();
				
				Elems.cache_cleared_message.style.transition = 'none';
				requestAnimationFrame(() => {
					Elems.cache_cleared_message.style.opacity = '1';
					setTimeout(() => {
						requestAnimationFrame(() => {
							Elems.cache_cleared_message.style.transition = '1s';
							requestAnimationFrame(() => {
								Elems.cache_cleared_message.style.opacity = '0';
							});
						});
					}, 500);
				});
			}
		}
		
		update_timer();
		clear_cache_timer = setInterval(update_timer, 100);
	});
	
	Elems.clear_cache.addEventListener('mouseup', cancel);
	Elems.clear_cache.addEventListener('mouseleave', cancel);
	cancel();
}

function onload() {
	for (let elem of document.querySelectorAll('[id]'))
		Elems[elem.id] = elem;
	
	Summary.page_group = new PageGroup(Elems.summary_pages, 1);
	init_menu();
	clear_cache_button_init();
	
	legend_box_height = Elems.legend_box.getBoundingClientRect().height;
	Elems.legend_button.addEventListener('click', toggle_legend);
	
	Summary.show_message(
		"Loading...",
		"We're extracting the summary of this website's privacy policy"
	);
	
	settings_init_promise = Common.init().then(() => {
		Summary.init()
		return Common.get_settings();
	}).then(settings => {
		settings_init(settings);
		Elems.legend_button.classList.add('trans');
		Elems.legend_arrow.classList.add('trans');
		Elems.legend_box.classList.add('trans');
	});
	
	Summary.fetch();
}

// using 'DOMContentLoaded' gives wrong dimensions for some elements...
window.addEventListener('load', onload, false);
