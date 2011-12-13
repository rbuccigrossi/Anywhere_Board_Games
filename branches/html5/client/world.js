
var world_max_piece_index = -1;
var world_server_url = "../server/world.php";

/*
 * world_get_new_piece_index - Gets the index of the next piece to be added
 * to the world.
 * 
 * TODO: (LOW) There is a small race condition if two pieces are added simultaneously
 */
function world_get_new_piece_index(){
	world_max_piece_index ++;
	return world_max_piece_index;
}

/*
 * world_add_piece - Adds a piece to the world server
 * 
 * @param faces An array of image URLs
 * @param x The x location
 * @param y The y location
 */
function world_add_piece(faces,x,y){
	var piece_index = world_get_new_piece_index();
	var world_update = {
		"pieces": new Object()
		};
	world_update.pieces[piece_index] =  {
		"faces": faces, 
		"x": x, 
		"y": y
	};
	$.ajax({
		type: 'POST', 
		url: world_server_url, 
		data: {
			action: "update", 
			update: JSON.stringify(world_update)
			}, 
		dataType: "text"
	});
}

/*
 * world_move_piece - Updates the location of a piece with the world server.  It also
 * records a client string representing who is moving the piece so that the client
 * can ignore move updates that they themselves make.
 * 
 * @param piece_index The piece index
 * @param client The ID of the client that is moving the piece
 * @param x The x location (left)
 * @param y The y location (top)
 */
function world_move_piece(piece_index,client,x,y){
	// Check if we already are running (works since single threaded)
	var ajax_loop_running = (piece_index in world_move_piece);
	// Store the next move into the array (overwriting one if currently running)
	world_move_piece[piece_index] = {
		x: x, 
		y: y,
		pending: 1
	};
	// If we aren't running, start our ajax loop
	if (!ajax_loop_running){
		var call_next_move = function () {
			// Check if there is a move request pending
			if (world_move_piece[piece_index].pending) {
				// Mark that we are sending the request
				world_move_piece[piece_index].pending = 0;
				// Create the world update object
				var world_update = {
					"pieces": new Object()
				};
				world_update.pieces[piece_index] =  {
					"client": client,
					"x": world_move_piece[piece_index].x, 
					"y": world_move_piece[piece_index].y
				};
				// Send the ajax request, calling the next move on success
				$.ajax({
					type: 'POST', 
					url: world_server_url, 
					data: {
						action: "update", 
						update: JSON.stringify(world_update)
					}, 
					success: call_next_move, 
					dataType: "text"
				});
			} else {
				// We are out of requests, so delete the next move and terminate
				delete world_move_piece[piece_index];
			}
		}
		// Call our ajax loop on the new piece
		//		setTimeout(call_next_move,50);
		call_next_move();
	}
}

/*
 * world_piece_set_lock - Updates the lock state of a piece with the world server
 * 
 * @param piece_index The piece index
 * @param lock The boolean lock state
 */
function world_piece_set_lock(piece_index,lock){
	// Create the world update object
	var world_update = {
		"pieces": new Object()
	};
	world_update.pieces[piece_index] =  {
		"lock": lock
	};
	// Send the ajax request, calling the next move on success
	$.ajax({
		type: 'POST', 
		url: world_server_url, 
		data: {
			action: "update", 
			update: JSON.stringify(world_update)
		}, 
		dataType: "text"
	});
}

/*
 * world_on_new_piece_handler - This is a handler function(piece_index, piece_data)
 * that is set by the code interested in listening to piece additions to the world
 * When a new piece is added, the piece_index is set to the index used by the world
 * to reference changes (the index for the change handler in 
 * world_on_piece_change_handlers) and piece_data is an array holding any changed
 * data for the piece.
 */
var world_on_new_piece_handler = function(){};

/*
 *  world_on_piece_change_handlers - This is an array of change handlers 
 *  function(piece_data) that is set by the code interested in listening
 *  to piece changes.  The array is indexed by the piece_index (see
 *  world_on_new_piece_handler).
 */
var world_on_piece_change_handlers = {};

function execute_world_update(update){
	var piece_index;
	// Handle a new world
	if ((!(update instanceof Object)) || ("__new" in update)) {
		// Reset max piece index
		world_max_piece_index = -1;
		// Delete existing pieces
		for (piece_index in world_on_piece_change_handlers){
			world_on_piece_change_handlers[piece_index](null);
			// Unregister the handler
			delete world_on_piece_change_handlers[piece_index];
		}
		// Now add new pieces
		if ((update instanceof Object) && ("pieces" in update)){
			for (piece_index in update.pieces) {
				if (Number(piece_index) > world_max_piece_index){
					world_max_piece_index = Number(piece_index);
				}
				world_on_new_piece_handler(piece_index, update.pieces[piece_index]);
			}
		}
	} else if ("pieces" in update) {
		// Iterate pieces, looking for new, updates, or deletes
		// TODO: Support deletion of pieces by checking for null
		for (piece_index in update.pieces) {
			if ("__new" in update.pieces[piece_index]){
				if (Number(piece_index) > world_max_piece_index){
					world_max_piece_index = Number(piece_index);
				}
				world_on_new_piece_handler(piece_index, update.pieces[piece_index]);
			} else if (piece_index in world_on_piece_change_handlers){
				world_on_piece_change_handlers[piece_index](update.pieces[piece_index]);
				// Check if the piece was deleted
				if (update.pieces[piece_index] === null){
					// Unregister the handler
					delete world_on_piece_change_handlers[piece_index];
				}
			}
		}
	}
}

/*
 * world_listener_start - Implements an Ajax loop that checks for updates from
 * the world server.  It calls "execute_world_update" if there is an update.
 */
function world_listener_start(){
	// Holds the transaction stamp of the latest update
	var world_last_ts = 0;
	// When the Ajax call is successful, this handles the update data and 
	// then calls the listener again
	var world_update_handler = function(data){
		// TODO: Handle parse error
		data = JSON.parse(data);
		var update = data["update"];
		execute_world_update(update);
		world_last_ts = data["last_modify"];
		world_listener();
	}
	// If the Ajax failed, let's dislplay an error and exit
	var world_update_failure = function(data){
		alert("Error updating the World.  Please check your connection and press reload.");
	}
	// Make the ajax call for new data with our latest transaction stamp
	var world_listener = function() {
		$.ajax({
			type: 'POST', 
			url: world_server_url, 
			data: {
				action: "read", 
				last_modify: JSON.stringify(world_last_ts)
				}, 
			success: world_update_handler, 
			failure: world_update_failure, 
			dataType: "text"
		});
	}
	// Kick off our world listener loop
	world_listener();
}

// Start the world listener
$(document).ready(function(){
	// The delay lets the iPhone4 work in full screen mode
	setTimeout("world_listener_start()",1000);
});