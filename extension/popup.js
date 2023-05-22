const ELEMS = {};
var summary_page_group = null;



function create_cell(innerText, ...classes) {
	var cell = document.createElement('div');
	cell.classList.add('cell', ...classes);
	cell.innerText = innerText;
	return cell;
}

function create_row(values) {
	var row = document.createElement('div');
	row.classList.add('row');
	
	if (values !== undefined)
		for (let val of values)
			row.append(create_cell('', val));
	return row;
}

function build_table(rows) {
	for (let table of ELEMS.tables.children)
		while (table.children.length > 2)
			ELEMS.table.lastChild.remove();
	
	var unused = [];
	for (let [name, values] of rows) {
		var all_unused = values.every(val => val == 'unused');
		if (all_unused) {
			unused.push(name);
			continue;
		}
		
		var row = create_row();
		row.append(create_cell(name, 'header'));
		ELEMS.tables.children[0].append(row);
		
		row = create_row(values.slice(0, 4));
		ELEMS.tables.children[1].append(row);
		
		row = create_row(values.slice(4, 6));
		ELEMS.tables.children[2].append(row);
	}
	ELEMS.unused.innerText = unused.length > 0 ? unused.join(', ') : 'None';
	
	if (unused.length < rows.length)
		summary_page_group.select(0);
	else {
		summary_page_group.select(1);
		ELEMS.message_title.innerText = "This website doesn't collect your data";
		ELEMS.message_body.innerText = "Your data is 100% safe!";
	}
		
}

function build_summary(rows) {
	// read more abt chrome's tab api
	// https://developer.chrome.com/docs/extensions/reference/tabs/
	chrome.tabs.query(
		{active: true},
		tabs => {
				build_table(rows);
				return;
			var url = new URL(tabs[0].url);
			if (url.protocol != 'http:' && url.protocol != 'https:' && url.protocol != '') {
				summary_page_group.select(1);
				ELEMS.message_title.innerText = "This page doesn't belong to a website";
				ELEMS.message_body.innerText = "We have no privacy policy to show!";
			}
			else {
				build_table(rows);
			}
		}
	);
}

function PageGroup(parent, initial_index) {
	this.pages = [...parent.children];
	this.sel_index = initial_index;
	var max_width = 0;
	
	this.pages.forEach(page => {
		var rect = page.getBoundingClientRect();
		max_width = Math.max(max_width, rect.width);
	});
	
	this.pages.forEach((page, i) => {
		page.style.width = max_width + 'px';
		if (i != initial_index)
			page.classList.add('hidden');
	});
}
PageGroup.prototype.select = function(i) {
	if (this.sel_index == i)
		return;
	this.pages[this.sel_index].classList.add('hidden');
	this.pages[i].classList.remove('hidden');
	this.sel_index = i;
}


function init_menu() {
	var page_group = new PageGroup(ELEMS.pages, 0);
	var menu_items = ELEMS.menu.children;
	menu_items[page_group.sel_index].classList.add('selected');
	var menu_x = ELEMS.menu.getBoundingClientRect().x;
	
	function move_highlighter(button) {
		var left = button.getBoundingClientRect().x - menu_x;
		ELEMS.selection_highlighter.style.left = left + 'px';
	}
	
	[...ELEMS.menu.children].forEach((button, i) => {
		button.addEventListener('click', () => {
			if (i == page_group.sel_index)
				return;
			
			button.classList.add('selected');
			menu_items[page_group.sel_index].classList.remove('selected');
			
			page_group.select(i);
			
			move_highlighter(button);
		});
	});
	
	move_highlighter(menu_items[page_group.sel_index]);
}

var legend_box_height = null;
function toggle_legend() {
	ELEMS.legend_arrow.classList.toggle('up');
	ELEMS.legend_button.classList.toggle('braces');
	
	if (ELEMS.legend_button.classList.contains('braces'))
		// TODO: this wont work if the elements can change size
		ELEMS.legend_box.style.height = legend_box_height + 'px';
	else
		ELEMS.legend_box.style.height = '0px';
}
function onload() {
	for (let elem of document.querySelectorAll('[id]'))
		ELEMS[elem.id] = elem;
	
	summary_page_group = new PageGroup(ELEMS.summary_pages, 0);
	
	init_menu();
	
	legend_box_height = ELEMS.legend_box.getBoundingClientRect().height;
	ELEMS.legend_button.addEventListener('click', toggle_legend);
	toggle_legend();
	ELEMS.legend_button.classList.add('trans');
	ELEMS.legend_box.classList.add('trans');
	
	build_summary([
		['Contact Info', ['unused', 'opt-out', 'opt-out', 'opt-out', 'opt-in', 'used']],
		['Cookies', ['opt-out', 'opt-out', 'used', 'opt-out', 'unused', 'used']],
		['Preferences', ['unused', 'unused', 'unused', 'unused', 'unused', 'unused']],
		['Purchases', ['unused', 'unused', 'unused', 'unused', 'unused', 'unused']],
		['Activity', ['unused', 'unused', 'unused', 'unused', 'unused', 'unused']],
	]);
}

// using 'DOMContentLoaded' gives wrong element dimension sometimes...
window.addEventListener('load', onload, false);
