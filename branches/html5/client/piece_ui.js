/*
 *	piece_ui.js is responsible for displaying and allowing the user to
 *	manipulate the pieces on the board.
 *	
 *	It requires:
 *	 - The world javascript functions (world.js)
 *	 - A #board defined in HTML to add elements
 */

/**
 * on_new_piece_handler - Callback for when a new piece is added to the world
 * 
 * @param piece_idx The index of the piece in the world (needed for world update calls)
 * @param piece_data Data about the newly added piece
 */
function on_new_piece_handler(piece_idx, piece_data){
	// Create piece HTML in the proper location
	var jq_piece = $('<span class="piece" id="piece_' + piece_idx + 
		'" style="position: absolute; left: ' + piece_data.x + 'px; top: ' + piece_data.y + 'px;">' +
		'<img class="piece_face" src="' + piece_data.faces[0] + '">' +
		'</span>');
	// Add to the board
	$("#board").append(jq_piece);
	// Get the object for the piece itself
	var piece = jq_piece.get(0);
	// Record the piece index into the piece object
	piece.world_piece_index = piece_idx;
	// Record the lock state into the piece object
	piece.lock = piece_data.lock;
	// Add the move and context menu handlers
	$(piece).bind({
		mousedown: on_piece_touch_start,
		contextmenu: function(){
			return false;
		}
	});
	// Add mouse touch event (for mobile devices)
	if (piece.addEventListener){
		piece.addEventListener("touchstart",on_piece_touch_start,false);
	}
	// Set up change handler for piece
	world_on_piece_change_handlers[piece_idx] = function(piece_data){
		if (piece_data === null){
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
 * This is a unique client ID that can be used to ignore update messages
 * that we generated and have already displayed (like moves)
 *
 * TODO: make it truly unique (currently low probability of hitting another client)
 */
var g_client_id = (""+Math.random()).split(".").pop();

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
		world_move_piece(piece.world_piece_index, g_client_id, 
			position.left, position.top);
		$(piece).offset(position);
	}
}

/*
 * is_touch_event - Helper function to determine if an event is a touch event
 * 
 * @param event The mouse or touch event
 */
function is_touch_event(event){
	return (typeof event.touches != 'undefined');
}

/*
 * get_event_coordinates - Helper function to get the event coordinates for either a 
 * mouse or touch event
 * 
 * @param event The mouse or touch event
 */
function get_event_coordinates(event){
	var coord;
	if (is_touch_event(event)){
		// If this is a touch event, use the first touch
		// TODO: Allow multiple touches and use the closest touch to the object (targetTouches)
		coord = {
			x: event.touches[0].pageX, 
			y: event.touches[0].pageY
		};
	} else {
		coord = {
			x: event.pageX, 
			y: event.pageY
		};
	}
	return (coord);
}

/*
 * show_piece_popup_menu - Generates the pop-up menu for the given piece at the given
 * coordinates.  The contents of the pop-up menu are based upon the state of the piece.
 * 
 * @param piece The piece DOM object
 * @param position (left, top) position for the piece
 */
function show_piece_popup_menu(piece, position){
	var menu_items = [];
	if (piece.lock){
		menu_items.push({label: "Unlock", callback: function(){
				world_piece_set_lock(piece.world_piece_index,0);
			}, args: null});
	} else {
		menu_items.push({label: "Rotate", callback: function(){}, args: null});
		menu_items.push({label: "Lock", callback: function(){
				world_piece_set_lock(piece.world_piece_index,1);
			}, args: null});
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
	if (is_touch_event(event) && (event.touches.length != 1)){
		return true; // Allow event to propogate
	}
	// Record the piece we are manipulating for use in new event handlers we'll define
	var piece = this;
	// Store where on the piece we clicked (for use with dragging)
	var piece_offset = $(piece).offset();
	var start_click = get_event_coordinates(event);
	var position_on_piece = {
		x: (start_click.x - piece_offset.left),
		y: (start_click.y - piece_offset.top)
	};
	// Holds if we are clicking or dragging
	var do_click = 1;
	// For click-drag we'll use the document for mouse move and mouse up events
	var board = $(document).get(0);
	// Now register the drag function
	var drag_function = function (event) {
		var click = get_event_coordinates(event);
		var new_offset = {
			left: click.x - position_on_piece.x,
			top: click.y - position_on_piece.y
		}
		var current_piece_offset = $(piece).offset();
		if ((current_piece_offset.left != new_offset.left) || 
			(current_piece_offset.top != new_offset.top)){
			do_click = 0; // We moved, so this is a drag, not a click
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
	var stop_drag_function = function (event) {
		$(piece).css("opacity",1);
		// We are done, so unregister listeners
		if (is_touch_event(event)){
			board.removeEventListener("touchmove", drag_function, false);
			board.removeEventListener("touchend", stop_drag_function, false);
			board.removeEventListener("touchcancel", stop_drag_function, false);
		} else {
			$(board).unbind("mousemove.drag");
			$(board).unbind("mouseup.drag");
		}
		// If we haven't moved, propogate a click event
		// TODO: Allow event propogation and use a regular click...
		if (do_click){
			show_piece_popup_menu(piece,{
				left: start_click.x-10,
				top: start_click.y-10
			});
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
	// Add the events to monitor drags and releases to the board (since can drag off the piece)
	// We do this even if the piece is locked so that we can handle regular clicks
	if (is_touch_event(event)){
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

function set_piece_orientation(item, degrees){
	var r = "rotate(" + degrees + "deg)";
	$(item).css("transform",r);
	$(item).css("-webkit-transform",r);
	$(item).css("-moz-transform",r);
	$(item).css("-ms-transform",r);
}

function piece_start_rotate(piece, x, y){
	// Initialize the object orientation if not set
	if (!piece.orientation){
		piece.orientation = 0;
	}
	var rotate_orig_orientation = piece.orientation;
	var piece_face = $(piece).find(".piece_face");
	var piece_center = {
		left: piece.offsetLeft + $(piece_face).width()/2,
		top: piece.offsetTop + $(piece_face).height()/2
	};
	var original_position_from_center = {
		x: (x - piece_center.left),
		y: (y - piece_center.top)
	};
	var board = $(document); // The #board object may not extend to the whole area
	var drag_function = function (event) {
		var piece_center = {
			left: piece.offsetLeft + $(piece_face).width()/2,
			top: piece.offsetTop + $(piece_face).height()/2
		};
		var new_position_from_center = {
			x: (event.pageX - piece_center.left),
			y: (event.pageY - piece_center.top)
		};
		if (new_position_from_center.x != 0 || new_position_from_center.y != 0){
			piece.orientation = rotate_orig_orientation
			+ 360.0 * (Math.atan2(new_position_from_center.x,-new_position_from_center.y)
				- Math.atan2(original_position_from_center.x,-original_position_from_center.y))/(2*3.14159);
		}
		piece.orientation = ((Math.round(piece.orientation / 5) * 5) + 360) % 360;
		set_piece_orientation(piece_face,piece.orientation);
	}
	var stop_drag_function = function () {
		board.unbind("mousemove.rotatedrag");
		board.unbind("mouseup.rotatedrag");
	};
	board.bind("mousemove.rotatedrag",drag_function);
	board.bind("mouseup.rotatedrag",stop_drag_function);
}
	
function board_add_piece(img_url){
	world_add_piece([img_url],50,50);
}

// TODO: Keyboard interactions
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

// The original idea was to display icons on hover...

/*  
		'<img class="piece_move" style="position:absolute; opacity: 0;" src="../images/transform-move.png">' +
		'<img class="piece_rotate" style="position:absolute; opacity: 0;" src="../images/transform-rotate.png">' +

	$(piece).find(".piece_rotate").bind({
		mousedown: function(event) { 
			event.preventDefault();  
			piece_start_rotate(piece,event.pageX,event.pageY);
			return false; 
		}
	});


function piece_show_action_icons(piece){
	var piece_move = $(piece).find(".piece_move");
	var piece_rotate = $(piece).find(".piece_rotate");
	var piece_face = $(piece).find(".piece_face");
	var position = $(piece_face).offset();
	//    piece_move.position({my: "top left", at: "top left", of: piece_face});
	position.left = piece.offsetLeft + $(piece_face).width() / 2 - $(piece_move).width() - 8;
	position.top = piece.offsetTop + $(piece_face).height() / 2 - $(piece_move).height() / 2;
	$(piece_move).offset(position);
	position.left = piece.offsetLeft + $(piece_face).width() / 2 + 8;
	position.top = piece.offsetTop + $(piece_face).height() / 2 - $(piece_rotate).height() / 2;
	$(piece_rotate).offset(position);
	piece_move.stop(true,true).animate({
		opacity:1
	},200);
	piece_rotate.stop(true,true).animate({
		opacity:1
	},200);
}
	
function piece_hide_action_icons(piece){
	var piece_move = $(piece).find(".piece_move");
	var piece_rotate = $(piece).find(".piece_rotate");
	piece_move.stop(true,true).animate({
		opacity:0
	},200);
	piece_rotate.stop(true,true).animate({
		opacity:0
	},200);
}


 */