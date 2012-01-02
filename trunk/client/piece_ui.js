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

/*
 * g_is_touch_device - if we encounter a touch device, we know to ignore some
 * keey events.  This is set when we encounter a touch event
 */
var g_is_touch_device = 0;

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
	// Record if the piece is a shield
	piece.shield = piece_data.shield ? piece_data.shield : 0;
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
			// Set the shield status
			if ("shield" in piece_data){
				piece.shield = piece_data.shield;
			}
			// Set z index
			if ("z" in piece_data){
				set_piece_z_index(piece, piece_data.z);
			}
			// Updated the faces
			if ("faces" in piece_data){
				piece.faces = piece_data.faces;
				set_piece_face_showing(piece,piece.face_showing);
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
	var z = 1; 	// Start at 1 to let shields be in the back
	var i;
	var piece_updates = {};
	var piece;
	$.each(g_pieces, function (i,piece){
		if (!piece.shield){ // Don't reorder shields
			if (piece.z != z){
				piece_updates[piece.world_piece_index] = {
					"z": z
				};
				set_piece_z_index(piece, z);
			}
			z++;
		}
	});
	if (piece_updates){
		world_update({
			"pieces": piece_updates
		});
	}
}

/*
 * pieces_highlight - Highlights pieces for movement, multi-select, etc.
 * 
 * @param pieces Array of pieces to highlight
 */
function pieces_highlight(pieces){
	$(pieces).css("opacity",0.5);
}

/*
 * pieces_unhighlight - Restores pieces from being highlighted
 * 
 * @param pieces Array of pieces to restore
 */
function pieces_unhighlight(pieces){
	$(pieces).css("opacity",1);
}

/*
 * pieces_roll - Flips each piece to a random side
 * 
 * @param pieces Array of pieces to roll
 */
function pieces_roll(pieces){
	// For each piece update the face showing to a random face
	$.each(pieces,function(i,piece){
		piece.face_showing = Math.floor(Math.random() * piece.faces.length);
		set_piece_face_showing(piece,piece.face_showing);
		world_update_piece_accumulate(piece.world_piece_index,{
			"face_showing": piece.face_showing
		});
	});
	// Flush accumulated piece updates
	world_update_piece_accumulate_flush();
}

/*
 * pieces_flip - Flips each piece to the next side in order
 * 
 * @param pieces Array of pieces to roll
 */
function pieces_flip(pieces){
	// For each piece update the face showing to a random face
	$.each(pieces,function(i,piece){
		piece.face_showing ++;
		if (piece.face_showing >= piece.faces.length){
			piece.face_showing = 0;
		}
		set_piece_face_showing(piece,piece.face_showing);
		world_update_piece_accumulate(piece.world_piece_index,{
			"face_showing": piece.face_showing
		});
	});
	// Flush accumulated piece updates
	world_update_piece_accumulate_flush();
}

/*
 * pieces_flip_to_first_side - Flips each piece to the first side
 * 
 * @param pieces Array of pieces to roll
 */
function pieces_flip_to_first_side(pieces){
	// For each piece update the face showing to a random face
	$.each(pieces,function(i,piece){
		piece.face_showing = 0;
		set_piece_face_showing(piece,piece.face_showing);
		world_update_piece_accumulate(piece.world_piece_index,{
			"face_showing": piece.face_showing
		});
	});
	// Flush accumulated piece updates
	world_update_piece_accumulate_flush();
}

/*
 * pieces_stack - Stacks the pieces at a point and sets the orientation to 0
 * 
 * @param pieces Array of pieces to roll
 * @param event The event with the coordinates at which to stack
 */
function pieces_stack(pieces, event){
	var coord = util_get_event_coordinates(event);
	$.each(pieces,function(i,piece){
		set_piece_orientation(piece,0);
		$(piece).offset({
			left: coord.x, 
			top: coord.y
			});
		world_update_piece_accumulate(piece.world_piece_index,{
			"client": g_client_id,
			"x": coord.x,
			"y": coord.y,
			"orientation": 0
		});
	});
	// Flush accumulated piece updates
	world_update_piece_accumulate_flush();
}


/*
 * pieces_shuffle - Shuffles a stack of pieces, by switching the location and orientation
 * of the pieces randomly
 * 
 * @param pieces Array of pieces to shuffle
 */
function pieces_shuffle(pieces){
	var o = util_clone(pieces);
	/* Fisher-Yates-like shuffle the copy of pieces */
	var j;
	var num_pieces = pieces.length;
	var temp = {};
	// Iterate over every piece in order (i=0,...,length-1)
	$.each(pieces,function(i,piece){
		// Randomly choose an index from i to pieces.length to swap
		j = Math.floor(Math.random() * (num_pieces - i)) + i;
		// Swap the offset
		temp.offset = util_clone($(piece).offset());
		$(piece).offset($(pieces[j]).offset());
		$(pieces[j]).offset(temp.offset);
		// Swap the orientation
		temp.orientation = piece.orientation;
		piece.orientation = pieces[j].orientation;
		pieces[j].orientation = temp.orientation;
		// Swap the z-index
		temp.z = piece.z;
		piece.z = pieces[j].z;
		pieces[j].z = temp.z;
	});
	// Now do the update on the server
	$.each(pieces,function(i,piece){
		set_piece_orientation(piece,piece.orientation);
		set_piece_z_index(piece, piece.z);
		var offset = $(piece).offset();
		world_update_piece_accumulate(piece.world_piece_index,{
			"client": g_client_id,
			"x": offset.left,
			"y": offset.top,
			"z": piece.z,
			"orientation": piece.orientation
		});
	});
	// Flush accumulated piece updates
	world_update_piece_accumulate_flush();
}


/*
 * move_pieces_to_front - moves an array of pieces to the top, and then updates the
 * z-indices for all pieces to fill gaps
 * 
 * @param pieces The array of pieces
 */
function move_pieces_to_front(pieces){
	var arr = util_clone(pieces); // Copy the array so we don't mess up the order'
	arr.sort(compare_piece_z_indices);
	var new_z = 100000; // Start at a really high index
	$.each(arr,function(i,p){ // Move each piece to the top and increase the z index
		if (!p.shield){ // Ignore shields
			p.z = new_z;
			new_z ++;
		}
	});
	correct_piece_z_indices();
}

/*
 * move_pieces_to_back - moves an array of piece to the back, and updates the
 * z-indices for all pieces to fill gapes
 * 
 * @param pieces The piece DOM object
 */
function move_pieces_to_back(pieces){
	var arr = util_clone(pieces); // Copy the array so we don't mess up the order'
	arr.sort(compare_piece_z_indices);
	var new_z = 0 - arr.length; // Start at a big enough negative index
	$.each(arr,function(i,p){ // Move each piece to the top and increase the z index
		if (!p.shield){ // Ignore shields
			p.z = new_z;
			new_z ++;
		}
	});
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
 * TODO: MEDIUM - General organization of menu (maybe board edit mode?)
 * TODO: MEDIUM - Combine background and locked piece menus
 * TODO: MEDIUM - Combine single and multiselect popup menus
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
				world_update_piece(piece.world_piece_index,{
					"lock": 0
				});
			}, 
			args: null
		});
	} else {
		if (piece.faces.length > 1){
			menu_items.push({
				label: "Flip", 
				callback: function(){
					pieces_flip([piece]);
				}, 
				args: null
			});
			menu_items.push({
				label: "Random Flip (Roll)", 
				callback: function(){
					pieces_roll([piece]);
				}, 
				args: null
			});
		}
		menu_items.push({
			label: "Move", 
			callback: function(event){
				pieces_start_move([piece], event, 1);
			}, 
			args: null
		});
		menu_items.push({
			label: "Rotate", 
			callback: function(event){
				pieces_start_rotate([piece], event);
			}, 
			args: null
		});
		menu_items.push({
			label: "Lock", 
			callback: function(){
				world_update_piece(piece.world_piece_index,{
					"lock": 1
				});
			}, 
			args: null
		});
		menu_items.push({
			label: "Edit...", 
			callback: function(){
				open_add_edit_piece_dialog(piece);
			}, 
			args: null
		});
		menu_items.push({
			label: "Clone", 
			callback: function(){
				// Clone the piece
				piece_clone(piece,10);
				// Start a move on the old clone
				pieces_start_move([piece], event, 1);
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
	if (!piece.shield){
		menu_items.push({
			label: "Turn into hand shield", 
			callback: function(){
				// Turn into a shield and bring to front
				world_update_piece(piece.world_piece_index,{
					"shield": 1,
					"lock": 1,
					"z": 980
				});
				set_piece_z_index(piece, 980);
				piece.shield = 1;
				piece.lock = 1;
			}, 
			args: null
		});
	} else {
		menu_items.push({
			label: "Turn off shield", 
			callback: function(){
				// Turn off the shield and push to back
				world_update_piece(piece.world_piece_index,{
					"shield": 0,
					"lock": 0,
					"z": 0
				});
				set_piece_z_index(piece, 0);
				piece.shield = 0;
				piece.lock = 0;
			}, 
			args: null
		});
	}
	if (!piece.shield){
		menu_items.push({
			label: "Send to back", 
			callback: function(){
				move_pieces_to_back([piece]);
			}, 
			args: null
		});
	} else {
		if (piece.z == 0){
			menu_items.push({
				label: "Send shield to front locally", 
				callback: function(){
					set_piece_z_index(piece, 980);
				}, 
				args: null
			});
		} else {
			menu_items.push({
				label: "Send shield to back locally", 
				callback: function(){
					set_piece_z_index(piece, 0);
				}, 
				args: null
			});
		}
	}
	create_popup_menu(menu_items, $('#board'),position);
}

/*
 * on_piece_touch_start - Handles a mouse down or touch event upon a piece
 * 
 * If a user clicks down upon a piece, we want to be able to do different things
 * depending upon if the user presses and drags or presses and releases (single click)
 * 
 * If a user presses and drags, we move the piece
 * If a user presses and releases without moving (a click):
 *
 * For touch support, we treat single touch events almost exactly like mouse events.
 * TODO: MEDIUM - Consider using middle or right mouse for flip and rotate
 * TODO: MEDIUM - Consider separating touch and mouse event handlers
 * 
 * @param event The mouse down or touch start event
 */
function on_piece_touch_start(event){
	// Bug fix for chrome scroll bar
	if (util_is_in_chrome_scrollbar()) return (true);
	// Is this a touch event?
	var is_touch_event = util_is_touch_event(event);
	// Ignore multi-touch or no-touch
	if (is_touch_event && (event.touches.length != 1)){
		return(true); // Allow event to propogate
	}
	// Record the piece we are manipulating for use in new event handlers we'll define
	var piece = this;
	var start_click = util_get_event_coordinates(event);
	// Handle a click (no drag movement), by showing the piece menu
	var click_function = function () {
		show_piece_popup_menu(piece,util_page_to_client_coord({
			left: start_click.x-10,
			top: start_click.y-10
		}));
	}
	// If a piece is not locked, start a move, calling the click function if no movement made
	if (! piece.lock){
		pieces_start_move([piece], event, false, click_function);
		event.preventDefault(); 
		return(false);
	}
	// At this point, we know we're dealing with a locked piece.  
	// If the piece is locked and we are a mouse event, start a multi-select drag event
	if (!util_is_touch_event(event)){
		board_start_multi_select(event, click_function);
		event.preventDefault();
		return(false);
	}
	// At this point, we know we are dealing with a locked piece and we are a touch event.
	var touch_moved = 0;
	// For touch move events, note if we have moved
	var touch_move_callback = function (event) {
		touch_moved = 1;
		return(true); // Let the event propogate
	};
	// For touch stop events - check to see if we have moved and display the piece menu if not
	var touch_stop_callback = function (event) {
		// We are done, so unregister listeners
		// TODO MEDIUM - Switch to jQuery bind for touch events
		document.removeEventListener("touchmove", touch_move_callback, false);
		document.removeEventListener("touchend", touch_stop_callback, false);
		document.removeEventListener("touchcancel", touch_stop_callback, false);
		if (!touch_moved){
			util_ignore_click_from_touch();
			click_function();
			event.preventDefault(); 
			return(false);
		} else {
			return(true); // Let the event propogate
		}
	};
	// Notice that we let touchmove events propogate so the user can pan
	document.addEventListener("touchmove",touch_move_callback,false);
	document.addEventListener("touchend",touch_stop_callback,false);
	document.addEventListener("touchcancel",touch_stop_callback,false);
	return(true); // Let the touchstart event propogate
/*
	// At this point, we know we're dealing with a locked piece.  
	// If the piece is locked and we are a mouse event, start a multi-select drag event
	if (!is_touch_event){
		board_start_multi_select(event, click_function);
		event.preventDefault(); 
		return(false);
	} else {
		// We are a touch event on a locked piece, so let it through
		return(true);
	}
*/
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
		"x": (offset.left), 
		"y": (offset.top),
		"z": piece.z,
		"lock": piece.lock,
		"shield": piece.shield,
		"orientation": piece.orientation,
		"face_showing": piece.face_showing
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
 *
 * @param piece The piece to update
 * @param orientation The orientation in degrees
 */
function set_piece_orientation(piece, orientation){
	var r = "rotate(" + orientation + "deg)";
	var piece_face = $(piece).find(".piece_face");
	piece.orientation = orientation;
	$(piece_face).css("transform",r);
	$(piece_face).css("-webkit-transform",r);
	$(piece_face).css("-moz-transform",r);
	$(piece_face).css("-o-transform",r);
	$(piece_face).css("-ms-transform",r);
}

/*
 * get_piece_center(piece) - returns the center coordinates (left, top) of the piece.
 * 
 * @param piece The piece object
 */
function get_piece_center(piece){
	return ({
		left: piece.offsetLeft + $(piece).width()/2,
		top: piece.offsetTop + $(piece).height()/2
	});
}

/*
 * get_pieces_center(piece) - returns the center coordinates (left, top) of a group of
 * pieces.
 * 
 * @param pieces The array of pieces
 */
function get_pieces_center(pieces){
	var left_min = 0, left_max = 0, top_min = 0, top_max = 0;
	var center;
	$.each(pieces, function(i,piece){
		center = get_piece_center(piece);
		if (i == 0) {
			left_min = center.left;left_max = center.left;top_min = center.top;top_max = center.top;
		}
		if (left_min > center.left) {left_min = center.left;}
		if (left_max < center.left) {left_max = center.left;}
		if (top_min > center.top) {top_min = center.top;}
		if (top_max < center.top) {top_max = center.top;}
	});
	return ({
		left: Math.floor((left_min + left_max)/2),
		top: Math.floor((top_min + top_max)/2)
	});
}

/**
 * pieces_start_rotate - Rotates a set of pieces around its global center.
 * We treat mouse slightly differently
 * than touch, in that for mouse we can sense mouse movements without them pressing the button,
 * so we base the original orientation from the menu click.  For touch, we reset the start
 * orientation when they touch the screen.
 * 
 * @param pieces The set of pieces to be rotated
 * @param event The initiating event
 */
function pieces_start_rotate(pieces, event){
	var start_click = util_get_event_coordinates(event);
	// Find the center of the group of pieces
	var pieces_center = get_pieces_center(pieces);
	// Get the starting orientation and centers of the pieces
	var start_orientations = [];
	var start_centers = [];
	$.each(pieces, function(i,piece){
		start_orientations.push(piece.orientation);
		start_centers.push(get_piece_center(piece));
	});
	// Remeber the move angle so we update only when the angle changes
	var move_angle = 0;
	var original_position_from_center = {
		x: (start_click.x - pieces_center.left),
		y: (start_click.y - pieces_center.top)
	};
	// Add an overlay we'll use for down, move, and up events
	var overlay = util_create_ui_overlay();
	// Handle start drag events by resetting location for rotation calculations
	var start_drag_function = function (event){
		start_click = util_get_event_coordinates(event);
		original_position_from_center = {
			x: (start_click.x - pieces_center.left),
			y: (start_click.y - pieces_center.top)
		};
		event.preventDefault(); 
		return(false);
	}
	// Handle drag events by calculating and executing new piece orientation
	var drag_function = function (event) {
		var click = util_get_event_coordinates(event);
		var new_position_from_center = {
			x: (click.x - pieces_center.left),
			y: (click.y - pieces_center.top)
		};
		var new_move_angle = move_angle;
		if (new_position_from_center.x != 0 || new_position_from_center.y != 0){
			new_move_angle = 
				360.0 * (Math.atan2(new_position_from_center.x,-new_position_from_center.y)
				- Math.atan2(original_position_from_center.x,-original_position_from_center.y))/(2*3.14159);
			new_move_angle = ((Math.round(new_move_angle / 5) * 5) + 360) % 360;
		}
		if (new_move_angle != move_angle){
			move_angle = new_move_angle;
			var cos_a = Math.cos(move_angle * 2 * Math.PI / 360);
			var sin_a = Math.sin(move_angle * 2 * Math.PI / 360);
			$.each(pieces, function (i,piece){
				// First update the orientation, then update location
				piece.orientation = start_orientations[i] + move_angle;
				// Update the world, setting the client so we can ignore the events
				world_update_piece(piece.world_piece_index,{
					"client": g_client_id,
					"orientation": piece.orientation
				});
				// Update locally
				set_piece_orientation(piece,piece.orientation);
				// Now calculate and update location (once piece is turned to avoid location issues)
				var new_center_left = ((start_centers[i].left - pieces_center.left) * cos_a -
									   (start_centers[i].top - pieces_center.top) * sin_a) + pieces_center.left;
				var new_center_top = ((start_centers[i].left - pieces_center.left) * sin_a +
									  (start_centers[i].top - pieces_center.top) * cos_a) + pieces_center.top;
				set_piece_location(piece,{left: new_center_left - $(piece).width()/2,
										  top: new_center_top - $(piece).height()/2});
			});
		}
		// We do not want regular event processing
		event.preventDefault(); 
		return(false);
	}
	// Handle the end of dragging by removing the overlay (deleting events)
	var stop_drag_function = function (event) {
		// Unhlight pieces
		pieces_unhighlight(pieces);
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
 * pieces_start_move - Initiate the moving of a set of pieces.  
 * 
 * We optionally allow the use of an overlay, which is useful when we start
 * a move activity from a menu.  For mouse movements we can move the pieces
 * immediately from the menu click.  For touch, however, the finger is lifted 
 * up after a menu click, so we want for the next touch to determine our basis
 * of motion.  If the overlay is not used, we assume that the finger is already
 * down.
 * 
 * We assume the piece is not locked or we some permission to move it.
 * 
 * @param pieces An array of pieces to be moved
 * @param event The initiating event
 * @param use_overlay Create an overlay to capture new mouse event
 * @param no_move_callback A callback if the piece was not moved
 */
function pieces_start_move(pieces, event, use_overlay, no_move_callback){
	// Check if mouse is moved while dragging
	var mouse_moved = 0;
	// Highlight the piece
	pieces_highlight(pieces);
	// Store where on the piece we clicked (for use with dragging)
	var start_coord = util_get_event_coordinates(event);
	var last_coord = util_clone(start_coord);
	var start_offsets = [];
	$.each(pieces, function (i,p){start_offsets[i] = $(p).offset();});
	var overlay = 0;
	if (use_overlay){
		// Add an overlay to capture a new mouse/touch down event (in case we started touch up)
		overlay = util_create_ui_overlay();
	}
	// Handle start drag events by resetting location for rotation calculations
	var start_drag_function = function (event){
		start_coord = util_get_event_coordinates(event);
		last_coord = util_clone(start_coord);
		// We do not want regular event processing
		event.preventDefault(); 
		return(false);
	}
	// Handle drag events by calculating and executing new piece orientation
	var drag_function = function (event) {
		var coord = util_get_event_coordinates(event);
		if ((coord.x != last_coord.x) || (coord.y != last_coord.y)){
			if (!mouse_moved){
				mouse_moved = 1; // We moved, so this is a drag, not a click
				// If we started dragging the pieces, move them to the top
				move_pieces_to_front(pieces);
			}
		}
		$.each(pieces, function(i, piece){ 
			// TODO MEDIUM - define set_piece_location_accumulate
			set_piece_location(piece, {
				left: start_offsets[i].left - start_coord.x + coord.x,
				top: start_offsets[i].top - start_coord.y + coord.y
			});
		});
		// We do not want regular event processing
		event.preventDefault(); 
		return(false);
	}
	// Handle the end of dragging by removing events, and calling no_move_callback if needed
	var stop_drag_function = function (event) {
		// Remove Highlight
		pieces_unhighlight(pieces);
		if (use_overlay){
			// Click on the overlay to destroy it (and remove listeners)
			$(overlay).trigger('click');
		}
		// Remove the document event listeners
		if (document.removeEventListener){
			document.removeEventListener("touchmove",drag_function,false);
			document.removeEventListener("touchend",stop_drag_function,false);
			document.removeEventListener("touchcancel",stop_drag_function,false);
		}
		$(document).unbind("mousemove",drag_function);
		$(document).unbind("mouseup",stop_drag_function);
		if ((!mouse_moved) && (no_move_callback)){
			no_move_callback();
		}
		// We do not want regular event processing
		event.preventDefault(); 
		return(false);
	};
	if (document.addEventListener){
		if (use_overlay){
			overlay.addEventListener("touchstart",start_drag_function,false);
		}
		document.addEventListener("touchmove",drag_function,false);
		document.addEventListener("touchend",stop_drag_function,false);
		document.addEventListener("touchcancel",stop_drag_function,false);
	}
	$(document).bind("mousemove",drag_function);
	$(document).bind("mouseup",stop_drag_function);
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
	var highlight_offset = {
		left: start_click.x, 
		top: start_click.y
		};
	var highlight_dimensions = {
		width: 0, 
		height: 0
	};
	// Add an overlay we'll use for down, move, and up events
	var overlay = util_create_ui_overlay();
	// Add a highlight div
	var jq_highlight = $('<div class="abg_highlight"></div>');
	$('#board').append(jq_highlight);
	jq_highlight.css('background-color','#0000FF');
	jq_highlight.css('opacity',0.5);
	jq_highlight.css('position','absolute');
	jq_highlight.css('z-index','999'); // Below overlay but above pieces
	jq_highlight.css('border','1px dashed #A0A0FF');
	jq_highlight.css('left',highlight_offset.left).css('top',highlight_offset.top);
	jq_highlight.width(highlight_dimensions.width);
	jq_highlight.height(highlight_dimensions.height);	
	// Handle a starting touch by restarting the highlight area there
	var start_drag_function = function (event){
		start_click = util_get_event_coordinates(event);
		highlight_offset = {
			left: start_click.x, 
			top: start_click.y
			};
		highlight_dimensions = {
			width: 0, 
			height: 0
		};
		jq_highlight.css('left',highlight_offset.left).css('top',highlight_offset.top);
		jq_highlight.width(highlight_dimensions.width);
		jq_highlight.height(highlight_dimensions.height);	
		// We do not want regular event processing
		event.preventDefault(); 
		return(false);
	}
	// Handle a drag by highlighting the area
	var drag_function = function (event) {
		var click = util_get_event_coordinates(event);
		highlight_offset = {
			left: Math.min(click.x, start_click.x),
			top: Math.min(click.y, start_click.y)
			};
		highlight_dimensions = {
			width: Math.abs(click.x - start_click.x),
			height: Math.abs(click.y - start_click.y)
			};
		jq_highlight.css('left',highlight_offset.left).css('top',highlight_offset.top);
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
	$(overlay).bind("mousedown",util_ignore_event);
	$(overlay).bind("mousemove",drag_function);
	$(overlay).bind("mouseup",stop_drag_function);
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
	if (unlocked_pieces.length > 0){
		// Highlight the unlocked pieces
		pieces_highlight(unlocked_pieces);
		// Calculate the max sides for the unlocked pieces
		var max_sides = 1;
		$.each(unlocked_pieces, function (i,piece){
			if (piece.faces.length > max_sides) {
				max_sides = piece.faces.length;
			}
		});
		if (max_sides > 1){
			menu_items.push({
				label: "Flip", 
				callback: function(event){
					pieces_flip(unlocked_pieces);
					pieces_unhighlight(unlocked_pieces);
				}, 
				args: null
			});
			menu_items.push({
				label: "Random Flip (Roll)", 
				callback: function(event){
					pieces_roll(unlocked_pieces);
					pieces_unhighlight(unlocked_pieces);
				}, 
				args: null
			});
		}
		if (max_sides > 1){
			menu_items.push({
				label: "Flip to first side", 
				callback: function(event){
					pieces_flip_to_first_side(unlocked_pieces);
					pieces_unhighlight(unlocked_pieces);
				}, 
				args: null
			});
		}
		if (unlocked_pieces.length > 1){
			menu_items.push({
				label: "Shuffle", 
				callback: function(event){
					pieces_shuffle(unlocked_pieces, event);
					pieces_unhighlight(unlocked_pieces);
				}, 
				args: null
			});
		}
		if (unlocked_pieces.length > 1){
			menu_items.push({
				label: "Stack", 
				callback: function(event){
					pieces_stack(unlocked_pieces, event);
					pieces_start_move(unlocked_pieces, event, 1);
				}, 
				args: null
			});
		}
		menu_items.push({
			label: "Move", 
			callback: function(event){
				pieces_start_move(unlocked_pieces, event, 1);
			}, 
			args: null
		});
		menu_items.push({
			label: "Rotate", 
			callback: function(event){
				pieces_start_rotate(unlocked_pieces, event);
			}, 
			args: null
		});
		menu_items.push({
			label: "Send to back", 
			callback: function(event){
				move_pieces_to_back(unlocked_pieces);
				pieces_unhighlight(unlocked_pieces);
			}, 
			args: null
		});
		menu_items.push({
			label: "Lock", 
			callback: function(){
				$.each(unlocked_pieces,function(i,piece){
					world_update_piece_accumulate(piece.world_piece_index,{
						"lock": 1
					});
					piece.lock = 1;
				});
				world_update_piece_accumulate_flush();
				pieces_unhighlight(unlocked_pieces);
			}, 
			args: null
		});
		menu_items.push({
			label: "Clone", 
			callback: function(event){
				// Copy all the pieces and start a move on the original copies
				$.each(unlocked_pieces,function(i,piece){piece_clone(piece);});
				pieces_start_move(unlocked_pieces, event, 1);
			}, 
			args: null
		});
		menu_items.push({
			label: "Delete", 
			callback: function(){
				// Set the piece to null to delete it
				$.each(unlocked_pieces,function(i,piece){ 
					world_update_piece_accumulate(piece.world_piece_index, null);
				});
				world_update_piece_accumulate_flush();
			}, 
			args: null
		});
	}
	if (locked_pieces.length > 0){
		menu_items.push({
			label: "Unlock", 
			callback: function(){
				$.each(locked_pieces,function(i,piece){
					world_update_piece_accumulate(piece.world_piece_index,{
						"lock": 0
					});
					piece.lock = 0;
				});
				world_update_piece_accumulate_flush();
				pieces_unhighlight(unlocked_pieces);
			}, 
			args: null
		});
	}
	create_popup_menu(menu_items, $('#board'), position, function(){
		// For mouse, we can allow click-drag anywhere on the board to move the pieces
		pieces_start_move(unlocked_pieces, event, 0);
	});
}

/*
 * board_start_multi_select - Allows the user to highlight a region and then
 * depicts a pop-up menu for multi-selected items.  If the highlighted region
 * is zero size, the user did a click without a drag, so we allow the caller
 * to specify a click callback to handle that event.
 * 
 * @param event The event that initiated the multi-select
 * @param click_callback A callback in case the user did not drag
 */
function board_start_multi_select(event, click_callback){
	board_start_area_highlight(event, function(rect, e){
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
				var coord = util_get_event_coordinates(e);
				show_multiselect_popup_menu(highlighted_pieces, util_page_to_client_coord({
					left: coord.x-10,
					top: coord.y-10
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
			open_add_edit_piece_dialog();
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
 * on_board_mouse_down - event handler for mouse on the board
 *  - This will kick off a multi-select which if empty will result in on_board_click
 *    to be called
 *
 * @param event
 */
function on_board_mouse_down(event){
	if (event.target.nodeName == "HTML"){
		if (util_is_in_chrome_scrollbar()) return (true); // Bug fix for chrome scroll bar
		// For touch devices, this will always be empty and call on_board_click
		board_start_multi_select(event, on_board_click);
		event.preventDefault(); 
		return (false);
	}
	return (true);
}

// Register popup menu on board click
$(document).ready(function(){
	$(document).bind("mousedown", on_board_mouse_down);
});

/*
 * open_add_edit_piece_dialog - Creates a jquery dialog to get the data necessary
 * to add or edit a piece on the board.  This includes the ability to add a dynamic
 * number of faces (image URLs).
 *
 * @param piece If specified, the existing piece will be modified
 */
function open_add_edit_piece_dialog(piece){
	var dialog = $('<div title="Add a New Piece"><form><fieldset>' +
		'</fieldset></form></div>');
	if (piece){
		$.each(piece.faces,function(i,face){
				var new_url = $('<br/><label style="width: 20%;">Face URL:</label> ' +
								'<input style="width: 75%;" type="text" name="face_url[]" ' +
								'class="text ui-widget-content ui-corner-all" value="' + face + '"/>');
				dialog.find("fieldset").append(new_url);
			});
	} else {
		var new_url = $('<br/><label style="width: 20%;">Face URL:</label> ' +
						'<input style="width: 75%;" type="text" name="face_url[]" ' +
						'class="text ui-widget-content ui-corner-all" />');
		dialog.find("fieldset").append(new_url);
	}
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
								'<input style="width: 75%;" type="text" name="face_url[]" ' +
								'class="text ui-widget-content ui-corner-all" />');
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
					if (piece){
						world_update_piece(piece.world_piece_index,{
							"faces": faces
						});
					} else {
						board_add_piece(faces);
					}
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
			$(dialog).parent().find(':button:contains("OK")').click();
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
