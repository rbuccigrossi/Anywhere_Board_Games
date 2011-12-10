/*
 * Creates a simple pop-up menu.
 *
 * @param menu_items_config Array of (label, callback, args) to create the menu items
 * @param parent DOM object into which the pop-up menu is placed
 * @param offset offset (top, left) pair for the placement of the menu
 */

function create_popup_menu(menu_items_config, parent, offset){
	var i, menu, menu_item;
	// Create and add the menu items
	menu = $('<div></div>');
	for( i in menu_items_config){
		menu_item = $('<a href="javascript: void(0);">' +
			menu_items_config[i].label + '</a>');
		menu.append(menu_item);
	}
	parent.append(menu);
	menu.css('padding', 0);
	menu.find('a').css('display','block').button();
	menu.dialog({
		dialogClass: 'popup bga_small_text_dialog',
		autoOpen: false,
		modal: true,
		resizable: false,
		width: 'auto',
		height: 'auto',
		minHeight: 'auto',
		minWidth: 'auto'
	});
	menu.dialog('option','position',[offset.left,offset.top]);
	menu.bind('dialogopen', function(event, ui) {
		$('.popup .ui-dialog-titlebar').hide();
		$('.ui-widget-overlay').unbind('click');
		$('.ui-widget-overlay').css('opacity',0);
		$('.ui-widget-overlay').bind('mousedown',function() {
			menu.dialog('close');
			return true;
		});
	});
	menu.bind('focus', function(event, ui){   // Remove first item being hovered
		menu.find('a').removeClass('ui-state-focus ui-state-hover');
	});
	menu.dialog('open');
}

