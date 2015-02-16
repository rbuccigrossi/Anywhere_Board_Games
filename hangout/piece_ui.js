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
	var source = "";
	// Set some defaults if not there (this allows pieces to be split across multiple updates)
	if (!("z" in piece_data)){
		piece_data.z = 0;
	}
	if (!("x" in piece_data)){
		piece_data.x = 0;
	}
	if (!("y" in piece_data)){
		piece_data.y = 0;
	}
	if (!("face_showing" in piece_data)){
		piece_data.face_showing = 0;
	}
	if (!("faces_array" in piece_data)){
		piece_data.faces = [];
	} else {
		piece_data.faces = JSON.parse(piece_data.faces_array);
		source = piece_data.faces[piece_data.face_showing];
	}
	// TODO: Handle both "faces" and "faces_array" for backwards compatibility with save files
	// Unparse the face array

	// Create piece HTML in the proper location
	var jq_piece = $('<span class="piece" id="piece_' + piece_idx + 
		'" style="position: absolute; left: ' + piece_data.x + 'px; top: ' + piece_data.y + 'px;">' +
		'<img class="piece_face" src="' + source + '">' +
		'<div class="custom_html"></div></span>');
	// Add to the board
	$("#board").append(jq_piece);
	// Get the object for the piece itself
	var piece = jq_piece.get(0);
	// Add the piece to our global list
	g_pieces.push(piece);
	// Record the piece index into the piece object
	piece.world_piece_index = piece_idx;
	// Record the lock state into the piece object
	piece.lock = Number(piece_data.lock) ? piece_data.lock : 0;
	// Record if the piece is a shield
	piece.shield = Number(piece_data.shield) ? piece_data.shield : 0;
	// Record the faces
	piece.faces = piece_data.faces;
	// Set the piece face's width
	piece.face_width = "";
	if ("face_width" in piece_data){
		piece.face_width = piece_data.face_width;
		if (Number(piece_data.face_width) > 0){
			$(piece).find('.piece_face').attr('width',piece.face_width);
		} else {
			$(piece).find('.piece_face').removeAttr('width');
		}
	}
	// Initialize the z index
	set_piece_z_index(piece, Number(piece_data.z));
	// Set the face
	set_piece_face_showing(piece,piece_data.face_showing);
	// Record the orientation
	piece.orientation = piece_data.orientation ? Number(piece_data.orientation) : 0;
	set_piece_orientation(piece,piece.orientation);
	// Add the move handler
	$(piece).bind({
		mousedown: on_piece_touch_start
	});
	// Add mouse touch event (for mobile devices)
	if (piece.addEventListener){
		piece.addEventListener("touchstart",on_piece_touch_start,false);
	}
	// Set the piece CSS classes
	piece.css_class = piece_data.css_class ? piece_data.css_class : "";
	if (piece.css_class){
		$(piece).addClass(piece.css_class);
	}
	// Set the piece callback
	piece.event_callback = piece_data.event_callback ? piece_data.event_callback : "";
	// Set up custom HTML
	piece.custom_html = "";
	if ("custom_html" in piece_data){
		piece.custom_html = unescape(piece_data.custom_html);
		$(piece).find('.custom_html').html(piece.custom_html);
	}
	// Set up change handler for piece
	world_on_piece_change_handlers[piece_idx] = function(piece_data){
		if (piece_data === null){
			// Remove the piece from our global list
			g_pieces.splice($.inArray(piece,g_pieces),1);
			// If piece_data is null, then the piece is removed, so get rid of it
			$(piece).remove();
		} else {
			if ("client" in piece_data){
				piece.client = piece_data.client;
			}
			// Move the piece (as long as we didn't move it initially)
			if (("x" in piece_data) && ("y" in piece_data)){
				if (piece.client != g_client_id) {
					util_set_position(piece,{
						left: Number(piece_data.x), 
						top: Number(piece_data.y)
					});	
				}
			}
			// Rotate the piece (as long as we didn't rotate it initially)
			if ("orientation" in piece_data){
				if (piece.client != g_client_id) {
					piece.orientation = Number(piece_data.orientation);
					set_piece_orientation(piece,piece.orientation);
				}
			}
			// Set the shield status
			if ("shield" in piece_data){
				piece.shield = Number(piece_data.shield);
			}
			// Set z index
			if ("z" in piece_data){
				set_piece_z_index(piece, Number(piece_data.z));
			}
			// Update the faces
			if ("faces_array" in piece_data){
				piece.faces = JSON.parse(piece_data.faces_array);
				set_piece_face_showing(piece,piece.face_showing);
			}
			// Update he image width
			if ("face_width" in piece_data){
				piece.face_width = piece_data.face_width;
				if (Number(piece_data.face_width) > 0){
					$(piece).find('.piece_face').attr('width',piece.face_width);
				} else {
					$(piece).find('.piece_face').removeAttr('width');
				}
			}
			// Set the face that's showing
			if ("face_showing" in piece_data){
				set_piece_face_showing(piece,piece_data.face_showing);
			}
			// Set the lock status
			if ("lock" in piece_data) {
				piece.lock = Number(piece_data.lock);
			}
			// Set the piece CSS classes
			if ("css_class" in piece_data) {
				piece.css_class = piece_data.css_class;
				$(piece).attr('class','piece')
				if (piece.css_class){
					$(piece).addClass(piece.css_class);
				}
			}
			// Set the piece callback
			if ("event_callback" in piece_data) {
				piece.event_callback = piece_data.event_callback;
			}
			// Update the custom HTML
			if ("custom_html" in piece_data){
				piece.custom_html = unescape(piece_data.custom_html);
				$(piece).find('.custom_html').html(piece.custom_html);
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
				world_update_piece_accumulate(piece.world_piece_index, {
					"z": z
				});
				set_piece_z_index(piece, z);
			}
			z++;
		}
	});
	world_update_piece_accumulate_flush();
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
 * pieces_call_event_callback - Calls the event callback for the pieces
 * 
 * @param pieces Array of pieces to execute the callback
 * @param event_name String name of the event
 */
function pieces_call_event_callback(pieces, event_name){
	var callback = 0;
	$.each(pieces,function(i,piece){
		if (piece.event_callback && (piece.event_callback in window)) {
			callback = window[piece.event_callback];
			callback(piece, event_name);
		}
	});
}

/*
 * pieces_roll - Flips each piece to a random side
 * 
 * @param pieces Array of pieces to roll
 * @param count Number of times to roll
 */
function pieces_roll(pieces, count){
	// For each piece update the face showing to a random face
	$.each(pieces,function(i,piece){
		if ((count > 0) && (piece.faces.length == 2)){
			// For a 2 sided piece, simply flip it until the last count
			piece.face_showing = (piece.face_showing + 1) % 2;
		} else {
			piece.face_showing = Math.floor(Math.random() * piece.faces.length);
		}
		set_piece_face_showing(piece,piece.face_showing);
		world_update_piece_accumulate(piece.world_piece_index,{
			"face_showing": piece.face_showing
		});
	});
	// Flush accumulated piece updates
	world_update_piece_accumulate_flush();
	if (count > 0){
		setTimeout(function(){
			pieces_roll(pieces,count-1)
			},200)
	}
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
 * pieces_stack - Stacks the pieces at the location of the lowest piece
 * 
 * @param pieces Array of pieces to roll
 */
function pieces_stack(pieces){
	var lowest_piece = null;
	$.each(pieces,function(i,piece){
		if ((!lowest_piece) || (lowest_piece.z > piece.z)){
			lowest_piece = piece;
		}
	});
	if (lowest_piece){
        var position = util_get_position(lowest_piece);
		$.each(pieces,function(i,piece){
			set_piece_orientation(piece,0);
			util_set_position(piece,position);
			world_update_piece_accumulate(piece.world_piece_index,{
				"client": g_client_id,
				"x": position.left,
				"y": position.top,
				"orientation": 0
			});
		});
	}

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
		// Swap the position
		temp.position = util_clone(util_get_position(piece));
		util_set_position(piece, util_get_position(pieces[j]));
		util_set_position(pieces[j], temp.position);
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
		var position = util_get_position(piece);
		world_update_piece_accumulate(piece.world_piece_index,{
			"client": g_client_id,
			"x": position.left,
			"y": position.top,
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
	var arr = util_clone(pieces); // Copy the array so we don't mess up the order
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
 * @param send_update boolean - if we actually send the update
 */
function set_piece_location(piece, position, send_update){
	// Move the piece locally
	util_set_position(piece, position);
	if (send_update){
		// Update the world (setting the client so we can ignore return messages)
		world_update_piece(piece.world_piece_index,{
		   "client": g_client_id,
		   "x": position.left,
		   "y": position.top
	   });
	}
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
 * TODO: MEDIUM - Consider separating touch and mouse event handlers
 * 
 * @param event The mouse down or touch start event
 */
function on_piece_touch_start(event){
	// Bug fix for scroll bar
	if (util_is_in_scrollbar(event)) return (true);
	// For custom HTML, make sure the target does not have its own events
	if ($(event.target).hasClass('own_events')) return (true);
	// Is this a touch event?
	var is_touch_event = util_is_touch_event(event);
	// Ignore multi-touch or no-touch
	if (is_touch_event && (event.touches.length != 1)){
		return(true); // Allow event to propogate
	}
	// Record the piece we are manipulating for use in new event handlers we'll define
	var start_click = util_get_event_board_coordinates(event);
	var pieces = [this];
	// If shift is held, grab all pieces
	if (event.shiftKey){
		pieces = find_pieces_at_coord(start_click);
	}
	// Handle a click (no drag movement), by showing the piece menu
	var click_function = function () {
		show_board_popup_menu(pieces,{
			left: start_click.x-10,
			top: start_click.y-10
		});
	}
	var unlocked_pieces = [];
	$.each(pieces, function(i,p){
		if (!p.lock){
			unlocked_pieces.push(p);
		}
	});
	// If shift is held, stack all the unlocked pieces
	if (event.shiftKey){
		pieces_stack(unlocked_pieces);
	}
	// If a piece is not locked, start a flip, rotate, move or popup depending upon
	// the button pressed
	if (unlocked_pieces.length > 0){
		if (event.which && (event.which == 2)){ // Middle mouse button, flip and start move
			pieces_flip(unlocked_pieces);
			pieces_start_move(unlocked_pieces, event, null);
		} else if (event.which && (event.which == 3)){ // Right mouse button, rotate
			pieces_start_rotate(unlocked_pieces, event);
		} else { // Left mouse button or touch, move with possible pop-up menu
			pieces_start_move(unlocked_pieces, event, click_function);
		}
		event.preventDefault(); 
		return(false);
	}
	// At this point, we know we're dealing with a locked piece. - start a multi-select event  
	board_start_multi_select(event, click_function, 0);
	event.preventDefault(); 
	return(false);
}

/*
 * piece_clone - Creates a new piece in the world that is a copy of the given piece
 * TODO: HIGH - Make sure that new features (like z index) are added to this function
 * TODO: LOW - Get setting of attributes here the same order as in creating and updating pieces
 * 
 * @param piece The piece to clone
 */
function piece_clone(piece){
	var position = util_get_position(piece);
	world_add_piece({
		"faces_array": JSON.stringify(piece.faces),
		"face_width": piece.face_width,
		"x": (position.left), 
		"y": (position.top),
		"z": piece.z,
		"lock": piece.lock,
		"shield": piece.shield,
		"orientation": piece.orientation,
		"face_showing": piece.face_showing,
		"css_class": piece.css_class,
		"event_callback": piece.event_callback,
		"custom_html": escape(piece.custom_html)
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
	$(piece).find('.piece_face').attr('src',piece.faces[piece.face_showing]);
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
	$(piece_face).css("ms-transform",r);
}

/*
 * get_piece_center(piece) - returns the center coordinates (left, top) of the piece.
 * 
 * @param piece The piece object
 */
function get_piece_center(piece){
	var position = util_get_position(piece);
	return ({
		left: position.left + $(piece).width()/2,
		top: position.top + $(piece).height()/2
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
			left_min = center.left;
			left_max = center.left;
			top_min = center.top;
			top_max = center.top;
		}
		if (left_min > center.left) {
			left_min = center.left;
		}
		if (left_max < center.left) {
			left_max = center.left;
		}
		if (top_min > center.top) {
			top_min = center.top;
		}
		if (top_max < center.top) {
			top_max = center.top;
		}
	});
	return ({
		left: Math.floor((left_min + left_max)/2),
		top: Math.floor((top_min + top_max)/2)
	});
}

/**
 * piece_see_detil - Zooms into a piece so that we can see the detail.
 * It uses an overlay, centering the current image and scaling to cover
 * the full window.
 * 
 * @param piece The piece of which we wish to see the detail
 */
function piece_see_detail(piece){
	// Add an overlay we'll use for down, move, and up events
	var overlay = util_create_ui_overlay();
	var img_url = $(piece).find('.piece_face').attr('src');
	$(overlay).css("opacity",0.9);
	$(overlay).css('background','#000 url('+encodeURI(img_url)+') center center fixed no-repeat');
	$(overlay).css('-moz-background-size','contain');
	$(overlay).css('background-size','contain');
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
	// Check if mouse is moved while dragging
	var mouse_moved = 0;
	var start_coord = util_get_event_board_coordinates(event);
	var last_coord = util_clone(start_coord);
	// Add an overlay we'll use for down, move, and up events
	var overlay = util_create_ui_overlay();
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
		x: (start_coord.x - pieces_center.left),
		y: (start_coord.y - pieces_center.top)
	};
	// Handle start drag events by resetting location for rotation calculations
	var start_drag_function = function (event){
		start_coord = util_get_event_board_coordinates(event);
		last_coord = util_clone(start_coord);
		original_position_from_center = {
			x: (start_coord.x - pieces_center.left),
			y: (start_coord.y - pieces_center.top)
		};
		event.preventDefault(); 
		return(false);
	}
	var move_pieces = function(coord, final_send){
		var new_position_from_center = {
			x: (coord.x - pieces_center.left),
			y: (coord.y - pieces_center.top)
		};
		var new_move_angle = move_angle;
		if (new_position_from_center.x != 0 || new_position_from_center.y != 0){
			new_move_angle = 
			360.0 * (Math.atan2(new_position_from_center.x,-new_position_from_center.y)
				- Math.atan2(original_position_from_center.x,-original_position_from_center.y))/(2*3.14159);
			new_move_angle = ((Math.round(new_move_angle / 5) * 5) + 360) % 360;
		}
		move_angle = new_move_angle;
		var cos_a = Math.cos(move_angle * 2 * Math.PI / 360);
		var sin_a = Math.sin(move_angle * 2 * Math.PI / 360);
		$.each(pieces, function (i,piece){
			var send_update = final_send;
			if (pieces.length == 1){ // Visibly send an update for single moves
				send_update = 1;
		    }
		    // First update the orientation, then update location
		    piece.orientation = start_orientations[i] + move_angle;
		    if (send_update){
			    // Update the world, setting the client so we can ignore the events
			    world_update_piece(piece.world_piece_index,{
				    "client": g_client_id,
				    "orientation": piece.orientation
			    });
		    }
		    // Update locally
		    set_piece_orientation(piece,piece.orientation);
		    // Now calculate and update location (once piece is turned to avoid location issues)
		    var new_center_left = ((start_centers[i].left - pieces_center.left) * cos_a -
			    (start_centers[i].top - pieces_center.top) * sin_a) + pieces_center.left;
		    var new_center_top = ((start_centers[i].left - pieces_center.left) * sin_a +
			    (start_centers[i].top - pieces_center.top) * cos_a) + pieces_center.top;
		    set_piece_location(piece,{
				left: new_center_left - $(piece).width()/2,
				top: new_center_top - $(piece).height()/2
		    },send_update);
		});
	}
	// Handle drag events by calculating and executing new piece orientation
	var drag_function = function (event) {
		var coord = util_get_event_board_coordinates(event);
		if ((coord.x != last_coord.x) || (coord.y != last_coord.y)){
			if (!mouse_moved){
				mouse_moved = 1; // We moved, so this is a drag, not a click
			}
			// Remember the last_coordinates again
			last_coord = util_clone(coord);
			move_pieces(coord,0);
		}
		// We do not want regular event processing
		event.preventDefault(); 
		return(false);
	}
	// Handle the end of dragging by removing the overlay (deleting events)
	var stop_drag_function = function (event) {
		// Send update to server
		if (mouse_moved) {
			move_pieces(last_coord,1);
		}
		// Remove Highlight
		pieces_unhighlight(pieces);
		// Click on the overlay to destroy it (and remove listeners)
		$(overlay).trigger('click');
		// Call our piece callbacks
		pieces_call_event_callback(pieces, "rotate");
		// We do not want regular event processing
		event.preventDefault(); 
		return(false);
	};
	// TODO: HIGH - The use of the overlay won't behave correctly on touch devices
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
 * @param no_move_callback A callback if the piece was not moved
 */
function pieces_start_move(pieces, event, no_move_callback){
	// Check if mouse is moved while dragging
	var mouse_moved = 0;
	// Highlight the pieces
	pieces_highlight(pieces);
	// Store where on the piece we clicked (for use with dragging)
	var start_coord = util_get_event_board_coordinates(event);
	var last_coord = util_clone(start_coord);
	var start_positions = [];
	$.each(pieces, function (i,p){
		start_positions[i] = util_get_position(p);
	});
	// Add an overlay we'll use for down, move, and up events
	var	overlay = util_create_ui_overlay();
	// Function to add a piece starting at a specific coordinate (stacking if necessary)
	var add_piece_starting_at_coord = function(p,coord){
		// If we have more than one piece, stack the new one below the top
		if (pieces.length > 0) {
			start_positions.push(util_clone(start_positions[0]));
			set_piece_orientation(p,0);
		} else {
			var pos = util_get_position(p);
			start_positions.push({left: pos.left + start_coord.x - coord.x,
								  top: pos.top + start_coord.y - coord.y});
		}
		// Now push the piece on our list
		pieces.push(p);
	}
	// Function to pick up new unlocked pieces at a specific coordinate and return true if found
	var grab_all_pieces_at_coord = function(coord){
		var found_piece = 0;
		// Find new pieces and scoop them into our pile
		var newpieces = find_pieces_at_coord(coord);
		$.each(newpieces,function(i,p){
			if ((!p.lock) && ($.inArray(p,pieces) < 0)){
				add_piece_starting_at_coord(p,coord);
				found_piece = 1;
			}
		});
		// If we find a new piece, move everything to the front
		if (found_piece){
			move_pieces_to_front(pieces);
		}
	}
	// Handle start drag events by resetting location for rotation calculations
	var start_drag_function = function (event){
		start_coord = util_get_event_board_coordinates(event);
		last_coord = util_clone(start_coord);
		// We do not want regular event processing
		event.preventDefault(); 
		return(false);
	}
	// Avoid repeated events by recording keys that are down
	var keydown = {};
	var keydown_function = function (event){
		if(keydown[event.which] == null){
			keydown[event.which] = 1;
			if (event.which == 16) { // Shift is pressed so add pieces underneath
				grab_all_pieces_at_coord(last_coord);
				event.preventDefault(); 
			} else if (event.which == 17) { // CTRL is pressed so grab top piece
				var newpieces = find_pieces_at_coord(last_coord);
				var toppiece = null;
				// Get the top piece we don't already have
				$.each(newpieces,function(i,p){
					if ((!p.lock) && ($.inArray(p,pieces) < 0)){
						if ((toppiece == null) || (p.z > toppiece.z)){
							toppiece = p;
						}
					}
				});
				if (toppiece != null){
					add_piece_starting_at_coord(toppiece,last_coord);
					move_pieces_to_front(pieces);
				}
				event.preventDefault(); 
			} else if (event.which == 32) { // Space is pressed so drop bottom piece
				// Send a piece update
				move_pieces(last_coord,1);
				if (pieces.length > 0){
					// Remove the piece and the starting offset
					var p = pieces.pop();
					start_positions.pop();
					// Unhighlight it (in case it was)
					pieces_unhighlight([p]);
					// TODO: Execute Callback on dropped piece
				}
				event.preventDefault(); 
			}
		}
	}
	var keyup_function = function (event){
		keydown[event.which] = null;
	}
	var move_pieces = function(coord, final_send){
		$.each(pieces, function(i, piece){ 
			var send_update = final_send;
		    if (pieces.length == 1){ // Visibly send an update for single moves
				send_update = 1;
			}
			set_piece_location(piece, {
		       left: start_positions[i].left - start_coord.x + coord.x,
		       top: start_positions[i].top - start_coord.y + coord.y
	        },send_update); // Only send movement of top piece to server every half second
	   });
	}
	// Handle drag events by calculating and executing new piece orientation
	var drag_function = function (event) {
		var coord = util_get_event_board_coordinates(event);
		if ((coord.x != last_coord.x) || (coord.y != last_coord.y)){
			if (!mouse_moved){
				mouse_moved = 1; // We moved, so this is a drag, not a click
				// If we started dragging the pieces, move them to the top
				move_pieces_to_front(pieces);
			}
			// Remember the last_coordinates again
			last_coord = util_clone(coord);
			// If the shift key is down while dragging, pick up new pieces we go over
			if (event.shiftKey){
				grab_all_pieces_at_coord(coord);
			}
			move_pieces(coord,0);
		}
		// We do not want regular event processing
		event.preventDefault(); 
		return(false);
	}
	// Handle the end of dragging by removing events, and calling no_move_callback if needed
	var stop_drag_function = function (event) {
		// Send update to server
		if (mouse_moved) {
			move_pieces(last_coord,1);
		}
		// Remove Highlight
		pieces_unhighlight(pieces);
		// Click on the overlay to destroy it (and remove listeners)
		$(overlay).trigger('click');
		$(document).unbind("keydown",keydown_function);
		$(document).unbind("keyup",keyup_function);
		if ((!mouse_moved) && (no_move_callback)){
			// Call our callback if we clicked (didn't move)
			no_move_callback();
		} else {
			// Call our piece callbacks
			pieces_call_event_callback(pieces,"move");
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
	$(overlay).bind("mousedown.movedrag",util_ignore_event); // For mouse ignore down click
	$(overlay).bind("mousemove.movedrag",drag_function);
	$(overlay).bind("mouseup.movedrag",stop_drag_function);
	$(document).bind("keydown",keydown_function);
	$(document).bind("keyup",keyup_function);
	$("#board").focus();
}

/**
 * board_start_area_highlight - Initiate highlight of a region of the desktop
 * Like the other drag events, for mouse we ignore additional mouse-down, while for
 * touch, we reset the location of the highlight area on a touch start.
 * 
 * @param event The initiating event
 * @param area_select_callback Callback (rect,event) when area is highlighted 
 * @param use_overlay Create an overlay to capture new mouse event
 */
function board_start_area_highlight(event, area_select_callback, use_overlay){
	var start_click = util_get_event_board_coordinates(event);
	var highlight_position = {
		left: start_click.x, 
		top: start_click.y
	};
	var highlight_dimensions = {
		width: 0, 
		height: 0
	};
	var overlay = 0;
	if (use_overlay){
		// Add an overlay we'll use for down, move, and up events
		overlay = util_create_ui_overlay();
	}
	// Add a highlight div
	var jq_highlight = $('<div class="abg_highlight"></div>');
	$('#board').append(jq_highlight);
	jq_highlight.css('background-color','#0000FF');
	jq_highlight.css('opacity',0.5);
	jq_highlight.css('position','absolute');
	jq_highlight.css('z-index','999'); // Below overlay but above pieces
	jq_highlight.css('border','1px dashed #A0A0FF');
	jq_highlight.css('left',highlight_position.left).css('top',highlight_position.top);
	jq_highlight.width(highlight_dimensions.width);
	jq_highlight.height(highlight_dimensions.height);	
	// Handle a starting touch by restarting the highlight area there
	var start_drag_function = function (event){
		start_click = util_get_event_board_coordinates(event);
		highlight_position = {
			left: start_click.x, 
			top: start_click.y
		};
		highlight_dimensions = {
			width: 0, 
			height: 0
		};
		jq_highlight.css('left',highlight_position.left).css('top',highlight_position.top);
		jq_highlight.width(highlight_dimensions.width);
		jq_highlight.height(highlight_dimensions.height);	
		// We do not want regular event processing
		event.preventDefault(); 
		return(false);
	}
	// Handle a drag by highlighting the area
	var drag_function = function (event) {
		var click = util_get_event_board_coordinates(event);
		highlight_position = {
			left: Math.min(click.x, start_click.x),
			top: Math.min(click.y, start_click.y)
		};
		highlight_dimensions = {
			width: Math.abs(click.x - start_click.x),
			height: Math.abs(click.y - start_click.y)
		};
		jq_highlight.css('left',highlight_position.left).css('top',highlight_position.top);
		jq_highlight.width(highlight_dimensions.width);
		jq_highlight.height(highlight_dimensions.height);	
		// We do not want regular event processing
		event.preventDefault(); 
		return(false);
	}
	var stop_drag_function = function (event) {
		jq_highlight.remove();
		if (overlay){
			// Click on the overlay to destroy it (and remove listeners)
			$(overlay).trigger('click');
		}
		// Remove the document event listeners
		if ($("#board").get(0).removeEventListener){
			$("#board").get(0).removeEventListener("touchmove",drag_function,false);
			$("#board").get(0).removeEventListener("touchend",stop_drag_function,false);
			$("#board").get(0).removeEventListener("touchcancel",stop_drag_function,false);
		}
		$("#board").unbind("mousemove",drag_function);
		$("#board").unbind("mouseup",stop_drag_function);
		// Call our callback
		if (area_select_callback){
			area_select_callback({
				x: highlight_position.left,
				y: highlight_position.top,
				width: highlight_dimensions.width,
				height: highlight_dimensions.height
			},event);
		}
		// We do not want regular event processing
		event.preventDefault(); 
		return(false);
	};
	if ($("#board").get(0).addEventListener){
		if (overlay){
			overlay.addEventListener("touchstart",start_drag_function,false);
		}
		$("#board").get(0).addEventListener("touchmove",drag_function,false);
		$("#board").get(0).addEventListener("touchend",stop_drag_function,false);
		$("#board").get(0).addEventListener("touchcancel",stop_drag_function,false);
	}
	$("#board").bind("mousemove",drag_function);
	$("#board").bind("mouseup",stop_drag_function);
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
 * point_in_piece - returns true if the point is in the piece
 * @param piece
 * @param point (x,y)
 */
function point_in_piece(piece, point){
	var position = util_get_position(piece);
	return ((position.left <= point.x) && 
			((position.left + $(piece).width()) >= point.x) &&
			(position.top <= point.y) && 
			((position.top + $(piece).height()) >= point.y));
}

/*
 * find_pieces_at_coord - returns all pieces that hit a specific point
 * @param point (x,y)
 */
function find_pieces_at_coord(coord){
	var pieces = [];
	$.each(g_pieces,function(i,p){
			   if (point_in_piece(p,coord)){
				   pieces.push(p);
			   }
		   });
	return pieces;
}

/*
 * show_board_popup_menu - Generates the pop-up menu for the given pieces.
 * 
 * @param pieces The selected pieces (potentially empty)
 * @param position (left, top) position for the pop-up
 */
function show_board_popup_menu(pieces, position){
	var menu_items = [];
	var locked_pieces = [];
	var unlocked_pieces = [];
	var piece = null;
	var max_sides = 1;
	if (pieces.length == 1){
		piece = pieces[0];
	}
	// Figure out which pieces are locked, and which are unlocked
	$.each(pieces, function (index,piece){
		if (piece.lock){
			locked_pieces.push(piece);
		} else {
			unlocked_pieces.push(piece);
		}
	});
	// If we have unlocked pieces, highlight them and calculate the max sides
	if (unlocked_pieces.length > 0){
		// Highlight the unlocked pieces
		pieces_highlight(unlocked_pieces);
		// Calculate the max sides for the unlocked pieces
		max_sides = 1;
		$.each(unlocked_pieces, function (i,piece){
			if (piece.faces.length > max_sides) {
				max_sides = piece.faces.length;
			}
		});
	}
	// Now add the menu items
	// ----- Piece manipulation for unlocked pieces
	if (unlocked_pieces.length > 0){
		if (max_sides > 2){
			menu_items.push({
				label: "Roll", 
				callback: function(event){
					pieces_roll(unlocked_pieces,5);
					pieces_unhighlight(unlocked_pieces);
				}, 
				args: null
			});
		}
		if (max_sides > 1){
			menu_items.push({
				label: "Flip", 
				callback: function(event){
					pieces_flip(unlocked_pieces);
					pieces_unhighlight(unlocked_pieces);
				}, 
				args: null
			});
		}
		if (max_sides == 2){
			menu_items.push({
				label: "Random Flip", 
				callback: function(event){
					pieces_roll(unlocked_pieces,5);
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
					pieces_stack(unlocked_pieces);
					pieces_unhighlight(unlocked_pieces);
				}, 
				args: null
			});
		}
		menu_items.push({
			label: "Rotate", 
			callback: function(event){
				pieces_start_rotate(unlocked_pieces, event);
			}, 
			args: null
		});
		menu_items.push({
			label: "Move", 
			callback: function(event){
				pieces_start_move(unlocked_pieces, event);
			}, 
			args: null
		});
		// Allow multiple pieces or non shields to be sent to the back
		if (!piece || !piece.shield){ 
			menu_items.push({
				label: "Send to back", 
				callback: function(event){
					move_pieces_to_back(unlocked_pieces);
					pieces_unhighlight(unlocked_pieces);
				}, 
				args: null
			});
		}
		// Menu items for a single-selected unlocked piece
		if (piece){
			menu_items.push({
				label: "View Detail", 
				callback: function(event){
					piece_see_detail(piece, event);
					pieces_unhighlight(unlocked_pieces);
				}, 
				args: null
			});
			menu_items.push({
				label: "Edit...", 
				callback: function(){
					open_add_edit_piece_dialog(piece);
					pieces_unhighlight(unlocked_pieces);
				}, 
				args: null
			});
		}
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
				$.each(unlocked_pieces,function(i,piece){
					piece_clone(piece);
				});
				pieces_start_move(unlocked_pieces, event);
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
	// ----- Piece manipulation for shields
	// If we selected one piece and it is a shield, allow the user to manipulate it
	if (piece && piece.shield){
		if (piece.z == 0){
			menu_items.push({
				label: "Let another player use this shield", 
				callback: function(){
					set_piece_z_index(piece, 980);
					pieces_unhighlight(unlocked_pieces);
				}, 
				args: null
			});
		} else {
			menu_items.push({
				label: "Use this shield for your hand", 
				callback: function(){
					set_piece_z_index(piece, 0);
					pieces_unhighlight(unlocked_pieces);
				}, 
				args: null
			});
		}
	}
	// ----- Piece manipulation for locked pieces
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
	// ----- Board menu items
	if (unlocked_pieces.length == 0) {
		menu_items.push({
			label: "Add Piece...", 
			callback: function(){
				open_add_edit_piece_dialog();
			}, 
			args: null
		});
		menu_items.push({
			label: "Open Board...", 
			callback: function(){
				$( '#upload_board_dialog' ).dialog('open');
			}, 
			args: null
		});
		menu_items.push({
			label: "Save Board...", 
			callback: function(){
				world_save_world();
			}, 
			args: null
		});
		menu_items.push({
			label: "Clear Board", 
			callback: function(){
				if (confirm("Are you sure you wish to clear the board?")){
					world_update(0); // Updating the world to 0 clears it
				}
			}, 
			args: null
		});
		menu_items.push({
			label: "Redirect to URL...", 
			callback: function(){
				s = prompt('Enter a URL to which all players will be redirected:','');
				if (s){
					var piece_data = {
						"faces_array": JSON.stringify(["about:blank"]),
						"face_width": 1,
						"custom_html": '%3Cscript%3E' + escape('if(confirm(\'The board is redirecting to the URL '+s+'. Is that OK?\')) { window.location = "'+encodeURI(s)+'";}') + '%3C/script%3E'
					};
					world_add_piece(piece_data);
				}
			}, 
			args: null
		});
		menu_items.push({
			label: "Help", 
			callback: function(){
				window.open("http://www.anywhereboardgames.com/help/");
			}, 
			args: null
		});
	}
	create_popup_menu(menu_items, $('#board'), util_board_to_page_coord(position), function(event){
		pieces_unhighlight(unlocked_pieces);
	//		pieces_start_move(unlocked_pieces, event, 0);
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
 * @param use_overlay Create an overlay to capture new mouse event
 */
function board_start_multi_select(event, click_callback, use_overlay){
	board_start_area_highlight(event, function(rect, e){
		var highlighted_pieces = [];
		$.each(g_pieces, function (index,value){
			if (piece_in_rect(value,rect)) {
				highlighted_pieces.push(value);
			}
		});
		if (highlighted_pieces.length > 0){
			var coord = util_get_event_board_coordinates(e);
			show_board_popup_menu(highlighted_pieces, {
				left: coord.x-10,
				top: coord.y-10
			});
		} else {
			// If rect is empty, do a click event
			if (click_callback){
				click_callback(e);
			}
		}
	}, use_overlay);
}

/*
 * on_board_click - handler for board click events. If we are the destination of
 * the click, then pop-up the menu.
 *
 * @param event Click event
 */
function on_board_click(event){
	var click = util_get_event_board_coordinates(event);
	/*
	if (event.target.nodeName == "HTML"){
		show_board_popup_menu([],{
			left: click.x-10,
			top: click.y-10
		});
		event.preventDefault(); 
		return false;
	}
	*/
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
	if ($(event.target).is("#board")){
		// Make sure click isn't on a scroll bar
		if (util_is_in_scrollbar(event)) return (true);
		// For touch devices, this will always be empty and call on_board_click
		board_start_multi_select(event, 
			function(event){
				var click = util_get_event_board_coordinates(event);
				show_board_popup_menu([],{
					left: click.x-10,
					top: click.y-10
				});
				event.preventDefault(); 
				return false;
			}, 0);
		event.preventDefault(); 
		return (false);
	}
	return (true);
}

// Register multi-select on touch down (empty multi-select brings up pop-up menu)
$(document).ready(function(){
	$("#board").bind("mousedown", on_board_mouse_down);
	// Add mouse touch event (for mobile devices)
	if ($("#board").get(0).addEventListener){
		$("#board").get(0).addEventListener("touchstart",on_board_mouse_down);
	}
});

/*
 * open_add_edit_piece_dialog - Creates a jquery dialog to get the data necessary
 * to add or edit a piece on the board.  This includes the ability to add a dynamic
 * number of faces (image URLs).
 *
 * @param piece If specified, the existing piece will be modified
 */
function open_add_edit_piece_dialog(piece){
	var dialog = $('<div title="Add a New Piece"><form><fieldset id="faces_fields">' +
		'</fieldset><fieldset id="other_fields"></fieldset></form></div>');
	if (piece){
		$.each(piece.faces,function(i,face){
			var new_url = $('<br/><label>Face URL:</label> ' +
				'<input style="width: 75%;" type="text" name="face_url[]" ' +
				'title="The URL of an image to use as the piece\'s face" ' +
				'class="text ui-widget-content ui-corner-all" value="' + face + '"/>');
			dialog.find("#faces_fields").append(new_url);
		});
	} else {
		var new_url = $('<br/><label>Face URL:</label> ' +
			'<input style="width: 75%;" type="text" name="face_url[]" ' +
			'title="The URL of an image to use as the piece\'s face" ' +
			'class="text ui-widget-content ui-corner-all" />');
		dialog.find("#faces_fields").append(new_url);
	}
	// Add width
	dialog.find("#other_fields").append(
		$('<br/><label>Width:</label> ' +
			'<input style="width: 75%;" type="text" name="face_width" ' +
			'title="The piece will be scaled to this width in pixels." ' +
			((piece && piece.face_width)?('value="'+piece.face_width+'"'):"") +
			'class="text ui-widget-content ui-corner-all" />'));
	// Add shield checkbox
	dialog.find("#other_fields").append(
		$('<br/><label> </label><input type="checkbox" name="shield" value="1" ' + 
			'title="If checked, the piece will stay in front of other pieces, hiding them except for the player who claims the shield." ' +
			((piece && piece.shield)?('checked="true"'):"") +
			"/><span> Use piece as a player's hand shield</span>"));
	// Add CSS Class
	dialog.find("#other_fields").append(
		$('<br/><label>CSS Class:</label> ' +
			'<input style="width: 75%;" type="text" name="css_class" ' +
			'title="The piece is assigned the given CSS classes, which is useful for styling or JavaScript coding." ' +
			((piece && piece.css_class)?('value="'+piece.css_class+'"'):"") +
			'class="text ui-widget-content ui-corner-all" />'));
	// Add Event Callback
	dialog.find("#other_fields").append(
		$('<br/><label>Callback:</label> ' +
			'<input style="width: 75%;" type="text" name="event_callback" ' +
			'title="When the piece is moved or rotated this event callback is called: callback(piece_object, event_type)" ' +
			((piece && piece.event_callback)?('value="'+piece.event_callback+'"'):"") +
			'class="text ui-widget-content ui-corner-all" />'));
	// Add Custom HTML textarea
	dialog.find("#other_fields").append(
		$('<br/><span><label style="vertical-align: top; margin-top: 10px;">Custom HTML:</label> ' +
			'<textarea rows="3" style="width: 75%;" name="custom_html" ' +
			'title="This custom HTML is placed in the piece (and can be used to add HTML elements and JavaScript)" ' +
			'>' + 
			((piece)?(piece.custom_html):"") +
			"</textarea></span>"));
	// Add to the board
	$("#board").append(dialog);
	// Open the dialog
	dialog.dialog({
		dialogClass: 'bga_dialog bga_small_text_dialog',
		autoOpen: false,
		height: 300,
		width: 350,
		modal: true,
		buttons: {
			"Add a face": function() {
				var new_url = $('<br/><label>Face URL:</label> ' +
					'<input style="width: 75%;" type="text" name="face_url[]" ' +
					'title="The URL of an image to use as the piece\'s face" ' +
					'class="text ui-widget-content ui-corner-all" />');
				dialog.find("#faces_fields").append(new_url);
			},
			"OK": function() {
				// Get dialog values
				var face_width = dialog.find('input[name="face_width"]').val();
				var shield = dialog.find('input[name="shield"]').get(0).checked;
				var css_class = dialog.find('input[name="css_class"]').val();
				var event_callback = dialog.find('input[name="event_callback"]').val();
				var custom_html = dialog.find('textarea[name="custom_html"]').val();
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
					var piece_data = {
						"faces_array": JSON.stringify(faces),
						"face_width": face_width,
						"css_class": css_class,
						"event_callback": event_callback,
						"custom_html": escape(custom_html)
					};
					if (piece){
						world_update_piece(piece.world_piece_index, piece_data);
						// Update shield state
						// TODO: LOW - Why do we do this here and not in the update function?
						if (shield != piece.shield){
							if (shield){
								// Turn into a shield and bring to front
								world_update_piece(piece.world_piece_index,{
									"shield": 1,
									"z": 980
								});
								set_piece_z_index(piece, 980);
								piece.shield = 1;
							} else {
								// Turn off the shield and push to back
								world_update_piece(piece.world_piece_index,{
									"shield": 0,
									"z": 0
								});
								set_piece_z_index(piece, 0);
								piece.shield = 0;
							}
						}
					} else {
						piece_data.x = 50;
						piece_data.y = 50;
						piece_data.z = g_pieces.length;
						// If the new piece is a shield, move it up front
						piece_data.shield = shield ? shield : 0;
						if (shield){
							piece_data.z = 980;
						}
						world_add_piece(piece_data);
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
	/*
	dialog.bind("keydown", function(e){
		if (e.keyCode == 13){
			e.preventDefault();
			$(dialog).parent().find(':button:contains("OK")').click();
			return false;
		}
		return true;
	});
	*/
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
