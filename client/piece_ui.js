/*
 *	piece_ui.js is responsible for displaying and allowing the user to
 *	manipulate the pieces on the board.
 *	
 *	It requires:
 *	 - The world javascript functions (world.js)
 *	 - A #board defined in HTML to add elements
 */

// All of the current pieces
var g_pieces = [];

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


// Register our new piece handler (make sure it is registered before document load)
world_on_new_piece_handler = on_new_piece_handler; 

/*
 * This is a unique client ID that can be used to ignore update messages
 * that we generated and have already displayed (like moves)
 *
 * TODO: LOW - Make the client ID truly unique (currently low probability of hitting another client)
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
				board_start_area_highlight(event);
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
	// Now register the drag function
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
		// If we haven't moved, propogate a click event
		if (do_click){
			show_piece_popup_menu(piece,util_page_to_client_coord({
				left: start_click.x-10,
				top: start_click.y-10
			}));
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

/**
 * piece_start_rotate - Initiate the rotation of a piece
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
	var piece_face = $(piece).find(".piece_face");
	var piece_center = {
		left: piece.offsetLeft + $(piece_face).width()/2,
		top: piece.offsetTop + $(piece_face).height()/2
	};
	var original_position_from_center = {
		x: (start_click.x - piece_center.left),
		y: (start_click.y - piece_center.top)
	};
	// Add an overlay we'll use for down, move, and up events
	var overlay = util_create_ui_overlay();
	// Register a move function
	var drag_function = function (event) {
		var click = util_get_event_coordinates(event);
		var piece_center = {
			left: piece.offsetLeft + $(piece_face).width()/2,
			top: piece.offsetTop + $(piece_face).height()/2
		};
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
	var stop_drag_function = function (event) {
		// Click on the overlay to destroy it (and remove listeners)
		$(overlay).trigger('click');
		// We do not want regular event processing
		event.preventDefault(); 
		return(false);
	};
	if (overlay.addEventListener){
		overlay.addEventListener("touchstart",util_ignore_event,false);
		overlay.addEventListener("touchmove",drag_function,false);
		overlay.addEventListener("touchend",stop_drag_function,false);
		overlay.addEventListener("touchcancel",stop_drag_function,false);
	}
	$(overlay).bind("mousedown.rotatedrag",util_ignore_event);
	$(overlay).bind("mousemove.rotatedrag",drag_function);
	$(overlay).bind("mouseup.rotatedrag",stop_drag_function);
}

/**
 * board_start_area_highlight - Initiate highlight of a region of the desktop
 * TODO: HIGH - set alrea_select_callback parameters
 * 
 * @param event The initiating event
 * @param area_select_callback Callback (param TBD) when area is highlighted 
 */
function board_start_area_highlight(event, area_select_callback){
	var start_click = util_get_event_coordinates(event);
	var highlight_offset = {left: start_click.x, top: start_click.y};
	var highlight_dimensions = {width: 10, height: 10};
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
	
	// Register a move function
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
		if (area_select_callback){
			area_select_callback();
		}
		// Click on the overlay to destroy it (and remove listeners)
		$(overlay).trigger('click');
		// We do not want regular event processing
		event.preventDefault(); 
		return(false);
	};
	if (overlay.addEventListener){
		overlay.addEventListener("touchstart",util_ignore_event,false);
		overlay.addEventListener("touchmove",drag_function,false);
		overlay.addEventListener("touchend",stop_drag_function,false);
		overlay.addEventListener("touchcancel",stop_drag_function,false);
	}
	$(overlay).bind("mousedown.rotatedrag",util_ignore_event);
	$(overlay).bind("mousemove.rotatedrag",drag_function);
	$(overlay).bind("mouseup.rotatedrag",stop_drag_function);
}


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
			board_start_area_highlight(event);
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
		return (false);
	}
	return (true);
}

// Register popup menu on board click
$(document).ready(function(){
	$(document).bind("click", on_board_click);
});

// Function create new piece dialog
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