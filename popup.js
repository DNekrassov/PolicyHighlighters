const Elems = {};
var summary_page_group = null;
var legend_box_height = null;
var clear_cache_progress = null;
var clear_cache_timer = null;





const Table = {
	create_cell(cls, text) {
		var cell = document.createElement('div');
		cell.classList.add('cell', cls);
		cell.innerText = text;
		return cell;
	},
	create_row(values) {
		var row = document.createElement('div');
		row.classList.add('row');
		for (let val of values)
			row.append(this.create_cell(val, ''));
		return row;
	},
	add_entry(data_name, values) {
		var row = this.create_row([]);
		row.append(this.create_cell('header', data_name));
		Elems.tables.children[0].append(row);
		
		row = this.create_row(values.slice(0, 4));
		Elems.tables.children[1].append(row);
		
		row = this.create_row(values.slice(4, 6));
		Elems.tables.children[2].append(row);
		return true;
	},
	
	clear_table() {
		for (let table of Elems.tables.children)
			while (table.children.length > 2)
				Elems.table.lastChild.remove();
	},
	
	
	
	


	show_table() {
		summary_page_group.select(0);
	},
	show_message(title, body) {
		summary_page_group.select(1);
		Elems.message_title.innerText = title;
		Elems.message_body.innerText = body;
	},
	
	
	load(entries) {
		this.clear_table();
		
		var unused = [];
		for (let [data_name, values] of entries)
			if (values.every(val => val == 'unused'))
				unused.push(data_name);
			else
				this.add_entry(data_name, values)
		
		Elems.unused.innerText = unused.length > 0 ? unused.join(', ') : '-';
		
		if (unused.length < entries.length)
			this.show_table();
		else
			this.show_message(
				"This website doesn't collect your data",
				"Your data is 100% safe!"
			);
	}
};

// function build_summary() {
// 	// read more abt chrome's tab api
// 	// https://developer.chrome.com/docs/extensions/reference/tabs/
// 	chrome.tabs.query(
// 		{active: true},
// 		tabs => {
// 			Table.load([
// 				['Contact Info', ['unused', 'opt-out', 'opt-out', 'opt-out', 'opt-in', 'used']],
// 				['Cookies', ['opt-out', 'opt-out', 'used', 'opt-out', 'unused', 'used']],
// 				['Preferences', ['unused', 'unused', 'unused', 'unused', 'unused', 'unused']],
// 				['Purchases', ['unused', 'unused', 'unused', 'unused', 'unused', 'unused']],
// 				['Activity', ['unused', 'unused', 'unused', 'unused', 'unused', 'unused']],
// 			]);
// 			return;
// 			var url = new URL(tabs[0].url);
// 			if (!['http:', 'https:', ''].includes(url.protocol)) {
// 				Table.show_message(
// 					"This page is not a website",
// 					"It doesn't have a privacy policy!"
// 				);
// 				return;
// 			}
			
// 			var req = new XMLHttpRequest();
// 			req.open('GET', REQUEST_FORMAT + url.hostname);
// 			req.responseType = 'json';
			
// 			req.onload = () => {
// 				if (req.response.response_type == 'Fail')
// 					Table.show_message(
// 						"Server error: Invalid request",
// 						"Reason: " + req.response.message
// 					);
// 				else
// 					//Table.load(req.response.result_json);
// 					Table.load([
// 						['Contact Info', ['unused', 'opt-out', 'opt-out', 'opt-out', 'opt-in', 'used']],
// 						['Cookies', ['opt-out', 'opt-out', 'used', 'opt-out', 'unused', 'used']],
// 						['Preferences', ['unused', 'unused', 'unused', 'unused', 'unused', 'unused']],
// 						['Purchases', ['unused', 'unused', 'unused', 'unused', 'unused', 'unused']],
// 						['Activity', ['unused', 'unused', 'unused', 'unused', 'unused', 'unused']],
// 					]);
// 			};
			
// 			req.onerror = () => Table.show_message(
// 				"Server error: Not responding",
// 				"We can't get the privacy policy without the server"
// 			);
			
// 			req.send();
// 		}
// 	);
// }


function fetch_table() {
	chrome.tabs.query({active: true}, tabs => {
		const tab = tabs[0];
		const port = chrome.runtime.connect({name: 'table'});
		port.onMessage.addListener(table => Table.load(table));
		port.postMessage({
			tab_id: tab.id,
			url: tab.url
		});
	});
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
	
	// const MENU_X = Elems.menu.getBoundingClientRect().x;
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


function toggle_legend() {
	Elems.legend_arrow.classList.toggle('up');
	Elems.legend_button.classList.toggle('braces');
	
	if (Elems.legend_button.classList.contains('braces'))
		// TODO: this wont work if the elements can change size
		Elems.legend_box.style.height = legend_box_height + 'px';
	else
		Elems.legend_box.style.height = '0px';
}

function settings_init() {
	chrome.storage.local.get(['.open', '.threshold']).then(items => {
		for (let [setting, value] of Object.entries(items)) {
			console.log(setting);
			// initialize to saved config value
			var name = setting.substring(1); // remove dot
			var radios = document.querySelectorAll(`[name=${name}]`);
			radios[value].checked = true;
			
			// save on change
			[...radios].forEach((radio, i) => {
				var entry = {};
				entry[setting] = i;
				
				// fires only when radio becomes checked
				radio.addEventListener('change', () => {
					chrome.storage.local.set(entry);
				});
			});
		}
	});
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
		setTimeout(() => {
			Object.assign(progress.style, {
				'transition': 'width 2s linear, opacity 0.5s linear, background-color 0.5s linear',
				'width': '100%',
				'opacity': '1'
			});
		}, 0);
		
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
	
	summary_page_group = new PageGroup(Elems.summary_pages, 0);
	
	init_menu();
	
	legend_box_height = Elems.legend_box.getBoundingClientRect().height;
	Elems.legend_button.addEventListener('click', toggle_legend);
	toggle_legend();
	Elems.legend_button.classList.add('trans');
	Elems.legend_box.classList.add('trans');
	Elems.legend_arrow.classList.add('trans');
	
	settings_init();
	clear_cache_button_init();
	
	
	
	Table.show_message(
		"Loading...",
		"We're extracting the summary of this website's privacy policy"
	);
	fetch_table();
}

// using 'DOMContentLoaded' gives wrong dimensions for some elements...
window.addEventListener('load', onload, false);
