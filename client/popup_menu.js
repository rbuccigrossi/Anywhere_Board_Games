/*
 * Creates a simple pop-up menu.
 *
 * @param menu_items_config Array of (label, callback, args) to create the menu items
 * @param parent DOM object into which the pop-up menu is placed
 * @param position Client position (top, left) pair for the placement of the menu
 * @param cancel_callback A callback if the menu is closed by clicking the overlay
 * @return menu The jQuery dialog object
 */

function create_popup_menu(menu_items_config, parent, position, cancel_callback){
	var i, menu, menu_item;
	// Create and add the menu items
	menu = $('<div style="display:none;"></div>');
	// Add to the parent
	parent.append(menu);
	// Given a menu config, this creates a hander to call the callback and close the dialog
	function popup_callback_maker(config){
		return function(event) { 
			menu.dialog('close');
			menu.remove();
			return config.callback(event,config.args);
		};		
	}
	// Now create the menu items with the appropriate callback
	for( i in menu_items_config){
		menu_item = $('<a href="javascript: void(0);">' +
			menu_items_config[i].label + '</a>');
		menu_item.num = i;
		menu_item.bind('click',popup_callback_maker(menu_items_config[i]));
		menu.append(menu_item);
	}
	// Style the menu
	menu.css('padding', 0);
	// Turn links unto jquery ui buttons
	menu.find('a').css('display','block').button();
	// Set up the dialog box
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
	menu.dialog('option','position',[position.left, position.top]);
	// When the dialog opens, set the overlay to close the dialog if you click elsewhere
	menu.bind('dialogopen', function(event, ui) {
		$('.popup .ui-dialog-titlebar').hide();
		$('.ui-widget-overlay').unbind('click');
		$('.ui-widget-overlay').css('opacity',0);
		$('.ui-widget-overlay').bind('mousedown',function(event) {
			menu.dialog('close');
			menu.remove();
			if (cancel_callback){
				cancel_callback(event);
			}
			event.preventDefault();
			return false;
		});
		// Unset the hover that the jquery dialog places on the first item
		menu.find('a').removeClass('ui-state-focus ui-state-hover');
	});
	// Now open the dialog
	menu.dialog('open');
	return(menu);
}
