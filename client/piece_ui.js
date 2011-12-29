/*
 *	piece_ui.js is responsible for displaying and allowing the user to
 *	manipulate the pieces on the board.
 *	
 *	It requires:
 *	 - The world javascript functions (world.js)
 *	 - A #board defined in HTML to add elements
 *	 
 *	NOTE ON BACKGROUND CLICK-AND-DRAG:
 *	With this code, we work hard to support both mouse and touch events.  In
 *	most cases, single touch events are treated identically to the mouse
 *	down and move events with one key exception: what to do when the background
 *	or locked pieces are dragged.  For touch devices, users expect the screen
 *	to pan and pinches to zoom.  For mouse devices, users expect multi-select
 *	to occur when the background or locked pieces are clicked and dragged.
 */

/*
 * g_pieces - This array holds all of the pieces on the board.  This is useful
 * for multi-select collision determiniation and z-index maintenance (to avoid
 * gaps in the z-index when a piece is moved to the bottom or top).
 */
var g_pieces = [];

/*
 * g_client_id - A unique client ID that can be used to ignore update messages
 * that we generated and have already displayed (like piece move and rotate)
 *
 * TODO: LOW - Make the client ID truly unique (currently low probability of hitting another client)
 */
var g_client_id = (""+Math.random()).split(".").pop();

/**
 * on_new_piece_handler - Callback for when a new piece is added to the world
 * 
 * @param piece_idx The index of the piece in the world (needed for world update calls)
 * @param piece_data Data about the newly added piece
 */
function on_new_piece_handler(piece_idx, piece_data){
	// Set some defaults if not there
	if (!("z" in piece_data)){
		piece_data.z = 0;
	}
	if (!("face_showing" in piece_data)){
		piece_data.face_showing = 0;
	}
	// Create piece HTML in the proper location
	var jq_piece = $('<span class="piece" id="piece_' + piece_idx + 
		'" style="position: absolute; left: ' + piece_data.x + 'px; top: ' + piece_data.y + 'px;">' +
		'<img class="piece_face" src="' + piece_data.faces[piece_data.face_showing] + '">' +
		'</span>');
	// Add to the board
	$("#board").append(jq_piece);
	// Get the object for the piece itself
	var piece = jq_piece.get(0);
	// Add the piece to our global list
	g_pieces.push(piece);
	// Record the piece index into the piece object
	piece.world_piece_index = piece_idx;
	// Record the lock state into the piece object
	piece.lock = piece_data.lock ? piece_data.lock : 0;
	// Record the faces
	piece.faces = piece_data.faces;
	// Initialize the z index
	set_piece_z_index(piece, piece_data.z);
	// Set the face
	set_piece_face_showing(piece,piece_data.face_showing);
	// Record the orientation
	piece.orientation = piece_data.orientation ? piece_data.orientation : 0;
	set_piece_orientation(piece,piece.orientation);
	// Add the move handler
	$(piece).bind({
		mousedown: on_piece_touch_start
	});
	// Add mouse touch event (for mobile devices)
	if (piece.addEventListener){
		piece.addEventListener("touchstart",on_piece_touch_start,false);
	}
	// Set up change handler for piece
	world_on_piece_change_handlers[piece_idx] = function(piece_data){
		if (piece_data === null){
			// Remove the piece from our global list
			g_pieces.splice(g_pieces.indexOf(piece),1);
			// If piece_data is null, then the piece is removed, so get rid of it
			$(piece).remove();
		} else {
			// Move the piece (as long as we didn't move it initially)
			if (("x" in piece_data) && ("y" in piece_data)){
				if (!("client" in piece_data) || (piece_data.client != g_client_id)) {
					$(piece).offset({
						left: piece_data.x, 
						top: piece_data.y
					});	
				}
			}
			// Rotate the piece (as long as we didn't rotate it initially)
			if ("orientation" in piece_data){
				if (!("client" in piece_data) || (piece_data.client != g_client_id)) {
					piece.orientation = piece_data.orientation;
					set_piece_orientation(piece,piece.orientation);
				}
			}
			// Set z index
			if ("z" in piece_data){
				set_piece_z_index(piece, piece_data.z);
			}
			// Set the face that's showing
			if ("face_showing" in piece_data){
				set_piece_face_showing(piece,piece_data.face_showing);
			}
			// Set the lock status
			if ("lock" in piece_data) {
				piece.lock = piece_data.lock;
			}
		}
	}
}

// Register our new piece handler (make sure it is registered before document load)
world_on_new_piece_handler = on_new_piece_handler; 

/*
 * compare_piece_z_indices - Compares the z-index for two pieces, returning
 * -1 if a.z < b.z, 1 if a.z > b.z, and 0 if a.z = b.z
 * 
 * @param a The first piece
 * @param b the second piece
 * @return comparison_value
 */
function compare_piece_z_indices(a,b){
	if (a.z < b.z){
		return (-1);
	} else if (a.z > b.z){
		return (1);
	} else {
		return (0);
	}
}

/*
 * correct_piece_z_indices - Iterates through all pieces, updating the z-indices so that
 * they are positive and there are no gaps, and then updates the world and the local
 * client for any piece that is moved
 */
function correct_piece_z_indices(){
	// First, sort the pieces by the z-index
	g_pieces.sort(compare_piece_z_indices);
	var z = 0;
	var i;
	var piece_updates = {};
	var piece;
	for (i in g_pieces){
		piece = g_pieces[i];
		if (piece.z != z){
			piece_updates[piece.world_piece_index] = {"z": z};
			set_piece_z_index(piece, z);
		}
		z++;
	}
	if (piece_updates){
		world_update({"pieces": piece_updates});
	}
}

/*
 * move_piece_to_front - moves the piece to the top, and updates the
 * z-indices for all pieces
 * 
 * @param piece The piece DOM object
 */
function move_piece_to_front(piece){
	piece.z = 100000; // Assume we don't have that many pieces
	correct_piece_z_indices();
}

/*
 * move_piece_to_back - moves the piece to the back, and updates the
 * z-indices for all pieces
 * 
 * @param piece The piece DOM object
 */
function move_piece_to_back(piece){
	piece.z = -1; // Assume we don't have any negative z indices
	correct_piece_z_indices();
}

/*
 * set_piece_location - moves the piece to the given position visibly and
 * calls the world update for the piece
 * 
 * @param piece The piece DOM object
 * @param position (left, top) position for the piece
 */
function set_piece_location(piece, position){
	var offset = $(piece).offset();
	// Make sure that the piece actually moved before we update the world
	if ((offset.left != position.left) || (offset.top != position.top)){
		// Update the world (setting the client so we can ignore return messages)
		world_update_piece(piece.world_piece_index,{
			"client": g_client_id,
			"x": position.left,
			"y": position.top
		});
		// Move the piece locally
		$(piece).offset(position);
	}
}

/*
 * show_piece_popup_menu - Generates the pop-up menu for the given piece at the given
 * coordinates.  The contents of the pop-up menu are based upon the state of the piece.
 * TODO: MEDIUM - Combine background and locked piece menus
 * 
 * @param piece The piece DOM object
 * @param position (left, top) position for the piece
 */
function show_piece_popup_menu(piece, position){
	var menu_items = [];
	if (piece.lock){
		menu_items.push({
			label: "Multi-select", 
			callback: function(event){
				board_start_multi_select(event);
			}, 
			args: null
		});
		menu_items.push({
			label: "Unlock", 
			callback: function(){
				world_update_piece(piece.world_piece_index,{"lock": 0});
			}, 
			args: null
		});
	} else {
		menu_items.push({
			label: "Rotate", 
			callback: function(event){
				piece_start_rotate(piece, event);
			}, 
			args: null
		});
		if (piece.faces.length > 2){
			menu_items.push({
				label: "Roll", 
				callback: function(){
					piece.face_showing = Math.floor(Math.random() * piece.faces.length);
					set_piece_face_showing(piece,piece.face_showing);
					world_update_piece(piece.world_piece_index,{
						"face_showing": piece.face_showing
					});
				}, 
				args: null
			});
		}
		if (piece.faces.length > 1){
			menu_items.push({
				label: "Flip", 
				callback: function(){
					piece.face_showing ++;
					if (piece.face_showing >= piece.faces.length){
						piece.face_showing = 0;
					}
					set_piece_face_showing(piece,piece.face_showing);
					world_update_piece(piece.world_piece_index,{
						"face_showing": piece.face_showing
					});
				}, 
				args: null
			});
		}
		menu_items.push({
			label: "Send to back", 
			callback: function(){
				move_piece_to_back(piece);
			}, 
			args: null
		});
		menu_items.push({
			label: "Lock", 
			callback: function(){
				world_update_piece(piece.world_piece_index,{"lock": 1});
			}, 
			args: null
		});
		menu_items.push({
			label: "Clone", 
			callback: function(){
				piece_clone(piece);
			}, 
			args: null
		});
		menu_items.push({
			label: "Delete", 
			callback: function(){
				// Setting the piece to null deletes it
				world_update_piece(piece.world_piece_index,null); 
			}, 
			args: null
		});
	}
	create_popup_menu(menu_items, $('#board'),position);
}

/*
 * on_piece_touch_start - Handles a mouse down or touch event upon a piece
 * 
 * If a user clicks down upon a piece, we want to be able to do different things
 * depending upon if the user presses and drags or  presses and releases (single click)
 * 
 * If a user presses and drags, we move the piece
 * If a user presses and releases without moving (a click), we display a context menu
 *
 * For touch support, we treat single touch events almost exactly like mouse events.
 * 
 * @param event The mouse down or touch start event
 */
function on_piece_touch_start(event){
	// Ignore multi-touch or no-touch
	if (util_is_touch_event(event) && (event.touches.length != 1)){
		return true; // Allow event to propogate
	}
	// Record the piece we are manipulating for use in new event handlers we'll define
	var piece = this;
	// Store where on the piece we clicked (for use with dragging)
	var piece_offset = $(piece).offset();
	var start_click = util_get_event_coordinates(event);
	var position_on_piece = {
		x: (start_click.x - piece_offset.left),
		y: (start_click.y - piece_offset.top)
	};
	// Holds if we are clicking or dragging
	var do_click = 1;
	// For click-drag we'll use the document for mouse move and mouse up events
	var board = $(document).get(0);
	// Handle a click (no drag), by showing the piece menu
	var click_function = function () {
		show_piece_popup_menu(piece,util_page_to_client_coord({
			left: start_click.x-10,
			top: start_click.y-10
		}));
	}
	// Handle drag by moving the piece if not locked
	var drag_function = function (event) {
		var click = util_get_event_coordinates(event);
		var new_offset = {
			left: click.x - position_on_piece.x,
			top: click.y - position_on_piece.y
		}
		var current_piece_offset = $(piece).offset();
		if ((current_piece_offset.left != new_offset.left) || 
			(current_piece_offset.top != new_offset.top)){
			if (do_click){
				do_click = 0; // We moved, so this is a drag, not a click
				if (! piece.lock){
					// If not locked and we started dragging, raise the piece to the top
					move_piece_to_front(piece);
				}
			}
			if (! piece.lock){
				// If not locked, allow the piece to be dragged
				set_piece_location(piece,new_offset);
			}
		}
		if (piece.lock){
			// If locked, let the event propogate
			return(true);
		} else {
			// We do not want regular event processing
			event.preventDefault(); 
			return(false);
		}
	};
	// Handle stop drag by unregistering events and clicking if we haven't moved
	var stop_drag_function = function (event) {
		$(piece).css("opacity",1);
		// We are done, so unregister listeners
		if (util_is_touch_event(event)){
			board.removeEventListener("touchmove", drag_function, false);
			board.removeEventListener("touchend", stop_drag_function, false);
			board.removeEventListener("touchcancel", stop_drag_function, false);
		} else {
			$(board).unbind("mousemove.drag");
			$(board).unbind("mouseup.drag");
		}
		// If we haven't moved, call our click function to display the menu
		if (do_click){
			click_function();
			// We do not want regular event processing
			event.preventDefault(); 
			return(false);
		} else {
			if (piece.lock){
				// If locked, let the event propogate
				return(true);
			} else {
				// We do not want regular event processing
				event.preventDefault(); 
				return(false);
			}
		}
	};
	// If the piece is locked and we are a mouse event, start a multi-select drag event
	if (!util_is_touch_event(event) && piece.lock){
		board_start_multi_select(event, click_function);
		event.preventDefault();
		return false;
	}
	// Add the events to monitor drags and releases to the board (since can drag off the piece)
	// We do this even if the piece is locked so that we can handle regular clicks
	if (util_is_touch_event(event)){
		board.addEventListener("touchmove",drag_function,false);
		board.addEventListener("touchend",stop_drag_function,false);
		board.addEventListener("touchcancel",stop_drag_function,false);
	} else {
		$(board).bind("mousemove.drag",drag_function);
		$(board).bind("mouseup.drag",stop_drag_function);
	}
	if (piece.lock){
		// If locked, let the event propogate
		return(true);
	} else {
		// We do not want regular event processing
		event.preventDefault();
		// Make the piece transparent to note we are dragging or clicking on it
		$(piece).css("opacity",0.5);
		return(false);
	}
}

/*
 * piece_clone - Creates a new piece in the world that is a copy of the given piece
 * TODO: HIGH - Make sure that new features (like z index) are added to this function
 * 
 * @param piece The piece to clone
 */
function piece_clone(piece){
	var offset = $(piece).offset();
	world_add_piece({
		"faces": piece.faces, 
		"x": (offset.left + 10), 
		"y": (offset.top + 10),
		"z": g_pieces.length
	});
}

/*
 * set_piece_face_showing - Sets the object member face_showing and updates
 * the visible face showing
 *
 * @param piece The piece to update
 * @param face_showing The face index to display
 */
function set_piece_face_showing(piece, face_showing){
	piece.face_showing = face_showing;
	$(piece).find('img').attr('src',piece.faces[piece.face_showing]);
}

/*
 * set_piece_z_index - Sets the object member z and updates the CSS
 *
 * @param piece The piece to update
 * @param z_index The new z-index
 */
function set_piece_z_index(piece, z_index){
	piece.z = z_index;
	$(piece).css("z-index",z_index);
}

/*
 * set_piece_orientation - Sets the piece orientation through CSS
 * TODO: HIGH - Move setting object member "orientation" here as well
 *
 * @param piece The piece to update
 * @param orientation The orientation in degrees
 */
function set_piece_orientation(piece, orientation){
	var r = "rotate(" + orientation + "deg)";
	var piece_face = $(piece).find(".piece_face");
	$(piece_face).css("transform",r);
	$(piece_face).css("-webkit-transform",r);
	$(piece_face).css("-moz-transform",r);
	$(piece_face).css("-ms-transform",r);
}
/*
 * get_piece_center(piece) - returns the center coordinates (left, top) of the piece.
 * It relies on finding "piece_face" for now.
 * 
 * @param piece The piece object
 */
function get_piece_center(piece){
	return ({
		left: piece.offsetLeft + $(piece).width()/2,
		top: piece.offsetTop + $(piece).height()/2
	});
}

/**
 * piece_start_rotate - Initiate the rotation of a piece.  We treat mouse slightly differently
 * than touch, in that for mouse we can sense mouse movements without them pressing the button,
 * so we base the original orientation from the menu click.  For touch, we reset the start
 * orientation when they touch the screen.
 * 
 * @param piece The piece object to be rotated
 * @param event The initiating event
 */
function piece_start_rotate(piece, event){
	// Initialize the object orientation if not set
	if (!piece.orientation){
		piece.orientation = 0;
	}
	var start_click = util_get_event_coordinates(event);
	var start_orientation = piece.orientation;
	var piece_center = get_piece_center(piece);
	var original_position_from_center = {
		x: (start_click.x - piece_center.left),
		y: (start_click.y - piece_center.top)
	};
	// Add an overlay we'll use for down, move, and up events
	var overlay = util_create_ui_overlay();
	// Handle start drag events by resetting location for rotation calculations
	var start_drag_function = function (event){
		start_click = util_get_event_coordinates(event);
		original_position_from_center = {
			x: (start_click.x - piece_center.left),
			y: (start_click.y - piece_center.top)
		};
		event.preventDefault(); 
		return(false);
	}
	// Handle drag events by calculating and executing new piece orientation
	var drag_function = function (event) {
		var click = util_get_event_coordinates(event);
		var new_position_from_center = {
			x: (click.x - piece_center.left),
			y: (click.y - piece_center.top)
		};
		if (new_position_from_center.x != 0 || new_position_from_center.y != 0){
			piece.orientation = start_orientation
				+ 360.0 * (Math.atan2(new_position_from_center.x,-new_position_from_center.y)
				- Math.atan2(original_position_from_center.x,-original_position_from_center.y))/(2*3.14159);
		}
		piece.orientation = ((Math.round(piece.orientation / 5) * 5) + 360) % 360;
		// Update the world, setting the client so we can ignore the events
		world_update_piece(piece.world_piece_index,{
			"client": g_client_id,
			"orientation": piece.orientation
		})
		// Update locally
		set_piece_orientation(piece,piece.orientation);
		// We do not want regular event processing
		event.preventDefault(); 
		return(false);
	}
	// Handle the end of dragging by removing the overlay (deleting events)
	var stop_drag_function = function (event) {
		// Click on the overlay to destroy it (and remove listeners)
		$(overlay).trigger('click');
		// We do not want regular event processing
		event.preventDefault(); 
		return(false);
	};
	if (overlay.addEventListener){
		overlay.addEventListener("touchstart",start_drag_function,false);
		overlay.addEventListener("touchmove",drag_function,false);
		overlay.addEventListener("touchend",stop_drag_function,false);
		overlay.addEventListener("touchcancel",stop_drag_function,false);
	}
	$(overlay).bind("mousedown.rotatedrag",util_ignore_event); // For mouse ignore down click
	$(overlay).bind("mousemove.rotatedrag",drag_function);
	$(overlay).bind("mouseup.rotatedrag",stop_drag_function);
}

/**
 * board_start_area_highlight - Initiate highlight of a region of the desktop
 * Like the other drag events, for mouse we ignore additional mouse-down, while for
 * touch, we reset the location of the highlight area on a touch start.
 * 
 * @param event The initiating event
 * @param area_select_callback Callback (rect,event) when area is highlighted 
 */
function board_start_area_highlight(event, area_select_callback){
	var start_click = util_get_event_coordinates(event);
	var highlight_offset = {left: start_click.x, top: start_click.y};
	var highlight_dimensions = {width: 0, height: 0};
	// Add an overlay we'll use for down, move, and up events
	var overlay = util_create_ui_overlay();
	// Add a highlight div
	var jq_highlight = $('<div class="abg_highlight"></div>');
	$('#board').append(jq_highlight);
	jq_highlight.css('background-color','#0000FF');
	jq_highlight.css('opacity',0.5);
	jq_highlight.css('z-index','999'); // Below overlay but above pieces
	jq_highlight.css('border','1px dashed #A0A0FF');
	jq_highlight.offset(highlight_offset);
	jq_highlight.width(highlight_dimensions.width);
	jq_highlight.height(highlight_dimensions.height);	
	// Handle a starting touch by restarting the highlight area there
	var start_drag_function = function (event){
		start_click = util_get_event_coordinates(event);
		highlight_offset = {left: start_click.x, top: start_click.y};
		highlight_dimensions = {width: 0, height: 0};
		jq_highlight.offset(highlight_offset);
		jq_highlight.width(highlight_dimensions.width);
		jq_highlight.height(highlight_dimensions.height);	
		// We do not want regular event processing
		event.preventDefault(); 
		return(false);
	}
	// Handle a drag by highlighting the area
	var drag_function = function (event) {
		var click = util_get_event_coordinates(event);
		highlight_offset = {left: Math.min(click.x, start_click.x),
							top: Math.min(click.y, start_click.y)};
		highlight_dimensions = {width: Math.abs(click.x - start_click.x),
								height: Math.abs(click.y - start_click.y)};		
		jq_highlight.offset(highlight_offset);
		jq_highlight.width(highlight_dimensions.width);
		jq_highlight.height(highlight_dimensions.height);	
		// We do not want regular event processing
		event.preventDefault(); 
		return(false);
	}
	var stop_drag_function = function (event) {
		jq_highlight.remove();
		// Click on the overlay to destroy it (and remove listeners)
		$(overlay).trigger('click');
		// Call our callback
		if (area_select_callback){
			area_select_callback({
				x: highlight_offset.left,
				y: highlight_offset.top,
				width: highlight_dimensions.width,
				height: highlight_dimensions.height
				},event);
		}
		// We do not want regular event processing
		event.preventDefault(); 
		return(false);
	};
	if (overlay.addEventListener){
		overlay.addEventListener("touchstart",start_drag_function,false);
		overlay.addEventListener("touchmove",drag_function,false);
		overlay.addEventListener("touchend",stop_drag_function,false);
		overlay.addEventListener("touchcancel",stop_drag_function,false);
	}
	$(overlay).bind("mousedown.rotatedrag",util_ignore_event);
	$(overlay).bind("mousemove.rotatedrag",drag_function);
	$(overlay).bind("mouseup.rotatedrag",stop_drag_function);
}

/*
 * piece_in_rect - returns true if the given piece's center is in the rect (x,y,width,height)
 * 
 * @param piece
 * @param rect
 */
function piece_in_rect(piece, rect){
	var center = get_piece_center(piece);
	return ((center.left >= rect.x) && (center.left <= (rect.x + rect.width))
	&& (center.top >= rect.y) && ((center.top <= (rect.y + rect.height))));
}

/*
 * show_multiselect_popup_menu - Generates the pop-up menu for the given pieces.
 * 
 * @param pieces The selected pieces
 * @param position (left, top) position for the pop-up
 */
function show_multiselect_popup_menu(pieces, position){
	var menu_items = [];
	var locked_pieces = [];
	var unlocked_pieces = [];
	// Figure out which pieces are locked, and which are unlocked
	$.each(pieces, function (index,piece){
		if (piece.lock){
			locked_pieces.push(piece);
		} else {
			unlocked_pieces.push(piece);
		}
	});
	// Highlight the unlocked pieces
	$.each(unlocked_pieces, function (index,piece){$(piece).css("opacity",0.5);});
	if (unlocked_pieces.length > 0){
		menu_items.push({
			label: "Move", 
			callback: function(event){
			}, 
			args: null
		});
		menu_items.push({
			label: "Rotate", 
			callback: function(event){
			}, 
			args: null
		});
		menu_items.push({
			label: "Lock", 
			callback: function(event){
			}, 
			args: null
		});
	}
	if (locked_pieces.length > 0){
		menu_items.push({
			label: "Unlock", 
			callback: function(event){
			}, 
			args: null
		});
	}
	create_popup_menu(menu_items, $('#board'), position, function(){
		$.each(unlocked_pieces, function (index,piece){$(piece).css("opacity",1);});
	});
}

/*
 * board_start_multi_select - Allows the user to highlight a region and then
 * depicts a pop-up menu for multi-selected items.  If the highlighted region
 * is zero size, the user did a click without a drag, so we allow the caller
 * to specify a click callback to handle that event.
 * TODO: IMMEDIATE - Handle successful highlight and create highlight menu
 * 
 * @param event The event that initiated the multi-select
 * @param click_callback A callback in case the user did not drag
 */
function board_start_multi_select(event, click_callback){
	board_start_area_highlight(event, function(rect){
		// If rect is empty, do a click event
		if (rect.width == 0 || rect.height == 0){
			if (click_callback){
				click_callback(event);
			}
		} else {
			var highlighted_pieces = [];
			$.each(g_pieces, function (index,value){
				if (piece_in_rect(value,rect)) {
					highlighted_pieces.push(value);
				}
			});
			if (highlighted_pieces.length > 0){
				show_multiselect_popup_menu(highlighted_pieces, util_page_to_client_coord({
					left: Math.floor(rect.x + (rect.width / 2)),
					top: Math.floor(rect.y + (rect.height / 2))
				}));
			}
		}
	});
}

/*
 * board_add_piece - A convenience function to add a piece to the world given an array of
 * image urls.
 * 
 * @param faces Array of image URLs
 */
function board_add_piece(faces){
	world_add_piece({
		"faces": faces,
		"x": 50,
		"y": 50,
		"z": g_pieces.length
	});
}

/*
 * show_board_popup_menu - Generates the pop-up menu for the board.
 * 
 * @param position (left, top) position for the piece
 */
function show_board_popup_menu(position){
	var menu_items = [];
	menu_items.push({
		label: "Multi-select", 
		callback: function(event){
			board_start_multi_select(event);
		}, 
		args: null
	});
	menu_items.push({
		label: "Add Piece...", 
		callback: function(){
			open_new_piece_dialog();
		}, 
		args: null
	});
	menu_items.push({
		label: "Download Board", 
		callback: function(){
			window.open(world_server_url + "?action=download");
		}, 
		args: null
	});
	menu_items.push({
		label: "Upload Board", 
		callback: function(){
			$( '#upload_board_dialog' ).dialog('open');
		}, 
		args: null
	});
	menu_items.push({
		label: "Clear Board", 
		callback: function(){
			world_update(0); // Updating the world to 0 clears it
		}, 
		args: null
	});
	create_popup_menu(menu_items, $('#board'),position);
}

/*
 * on_board_click - handler for board click events. If we are the destination of
 * the click, then pop-up the menu.
 *
 * @param event Click event
 */
function on_board_click(event){
	if (event.target.nodeName == "HTML"){
		show_board_popup_menu(util_page_to_client_coord({
			left: event.pageX-10,
			top: event.pageY-10
		}));
		event.preventDefault();
		return false;
	}
	return true;
}

/*
 * on_board_touch_event - event handler for mouse or touch events on the board
 *  - If we are a touch device, then we ignore touches and make sure that click events
 *    are appropriately registered.
 *  - If we are a mouse device, then we initiate a multi-select drag event and call our
 *    click handler the mouse wasn't dragged before mouse-up.
 *
 * @param event
 */
function on_board_touch_start(event){
	if (event.target.nodeName == "HTML"){
		if (util_is_touch_event(event)){
			// If we're a touch device, ignore the touch and register the click event
			if (!("registered" in on_board_click)){
				on_board_click.registered = true;
				$(document).bind("click", on_board_click);
			}
			return true; // Let the event propogate
		} else {
			// We are a mouse device, so initiate a multi-select highlight
			board_start_multi_select(event, on_board_click);
			event.preventDefault();
			return false;
		}
		return true;
	}
	return (true);
}

// Register popup menu on board click
$(document).ready(function(){
	// For mouse-driven browsers, make mousedown do multi-select
	$(document).bind("mousedown", on_board_touch_start);
});

/*
 * open_new_piece_dialog - Creates a jquery dialog to get the data necessary
 * to add a new piece to the board.  This includes the ability to add a dynamic
 * number of faces (image URLs).
 */
function open_new_piece_dialog(){
	var dialog = $('<div title="Add a New Piece"><form><fieldset>' +
		'<label style="width: 20%;">Face URL: </label>' +
		'<input style="width: 75%;" type="text" name="face_url[]" id="create_piece_url" class="text ui-widget-content ui-corner-all" />' +
		'</fieldset></form></div>');
	// Add to the board
	$("#board").append(dialog);
	dialog.dialog({
		dialogClass: 'bga_dialog bga_small_text_dialog',
		autoOpen: false,
		height: 300,
		width: 350,
		modal: true,
		buttons: {
			"Add a face": function() {
				var new_url = $('<br/><label style="width: 20%;">Face URL:</label> ' +
					'<input style="width: 75%;" type="text" name="face_url[]" class="text ui-widget-content ui-corner-all" />');
				dialog.find("fieldset").append(new_url);
			},
			"OK": function() {
				// Accumulate the face URLs
				var faces = [];
				dialog.find('input[name="face_url[]"]').each(function(idx,item){
					if ($(item).val()){
						faces.push($(item).val());
					}
				});
				if (faces.length == 0){
					alert("Please enter an image URL");
				} else {
					board_add_piece(faces);
					$(this).dialog( "close" );
					$(this).remove();
				}
			},
			Cancel: function() {
				$(this).dialog( "close" );
				$(this).remove();
			}
		}
	});
	// Bind enter to OK to avoid submitting the form to the script
	dialog.bind("keydown", function(e){
		if (e.keyCode == 13){
			e.preventDefault();
			$(':button:contains("OK")').click();
			return false;
		}
		return true;
	});
	dialog.dialog('open');
}

// TODO: LOW - Keyboard interactions
/*
	  function board_keypress(event){
		  if ((event.which == 43) || (event.which == 45) || (event.which == 48)){
		  event.preventDefault();
		  if (!this.zoom_level){
			  this.zoom_level = 1;
		  }
		  if (event.which == 45){
			  this.zoom_level = this.zoom_level * 0.9;
		  }
		  if (event.which == 43){
			  this.zoom_level = this.zoom_level / 0.9;
		  }
		  if (event.which == 48){
			  this.zoom_level = 1;
		  }
		  var r = "scale(" + this.zoom_level + ")";
		  $("body").css("transform",r);
		  $("body").css("transform-origin","0% 0%");
		  $("body").css("-webkit-transform",r);
		  $("body").css("-webkit-transform-origin","0% 0%");
		  $("body").css("-moz-transform",r);
		  $("body").css("-moz-transform-origin","0% 0%");
		  $("body").css("-ms-transform",r);
		  $("body").css("-ms-transform-origin","0% 0%");
		  }
	  }
 */
