
/* Once thing we don't really have here is an object representing the model of
 * the world. Right now we let the piece_ui utilize the piece objects that are
 * generated by the DOM to hold all of the model status.  If we start allowing
 * client side zooming, or other interesting changes, this could be a problem.
 * On the other hand, since z-indexing requires special care (to avoid long term
 * holes), we'd have to pick up that responsibility.
 * 
 * Another interesting issue is that we have specialized functions for moving,
 * locking, etc.  Moving was split out so that we could send multiple close 
 * move commands, and allow the resulting ajax not pile up.  Instead we could
 * replace almost all of these functions with a general world_piece_model_update
 * or even a world_model_update function that could take an array of the changes
 * and act accordingly.
 */

// Keep track of the largest index we use for a piece with the server
var world_max_piece_index = -1;

// For now, use the local PHP server to share world data
var world_server_url = "../server/world.php";

/*
 * world_get_new_piece_index - Gets the index of the next piece to be added
 * to the world.
 * 
 * TODO: LOW -  There is a small race condition if two pieces are added simultaneously
 * TODO: LOW - Fill in any null holes from previously deleted pieces first
 */
function world_get_new_piece_index(){
	world_max_piece_index ++;
	return world_max_piece_index;
}

/*
 * world_add_piece - Adds a piece to the world server
 * 
 * @param piece_data Object containing new piece data
 */
function world_add_piece(piece_data){
	var piece_index = world_get_new_piece_index();
	world_update_piece(piece_index,piece_data);
}

/*
 * world_update - Sends an update array to the world.  Any subsequent calls will be 
 * combined into a single update until the previous ajax call is completed.
 * 
 * @param update The update to implement in the world
 */
function world_update(update){
	// Do we already have a pending update?
	if ("pending_update" in world_update){
		// Merge the update into the existing pending update
		$.extend(true,world_update.pending_update, update);
	} else {
		// We don't have a pending update, so simply set it
		world_update.pending_update = update;
	}
	// If we aren't running, start our ajax loop
	if (!("ajax_loop_running" in world_update)){
		world_update.ajax_loop_running = true;
		var call_next_update = function (data) {
			if (data){
				// Check for an error in the data
				var response = $.parseJSON(data);
				if ((response instanceof Object) && ("error" in response)){
					alert(response.error);
					return;
				}
			}
			// Check if there is a move request pending
			if ("pending_update" in world_update) {
				// Copy the update and clear the pending one (so that
				// it can be assigned while the ajax is running)
				var update = world_update.pending_update;
				delete world_update.pending_update;
				// Send the ajax request, calling the next update on success
				$.ajax({
					type: 'POST', 
					url: world_server_url, 
					data: {
						action: "update", 
						update: JSON.stringify(update)
					}, 
					timeout: 5000,
					success: call_next_update, 
					error: function (){
						// On error, merge our update back into any pending update and retry
						if ("pending_update" in world_update){
							// Merge the update into the existing pending update
							var temp_update = world_update.pending_update;
							world_update.pending_update = update;
							update = temp_update;
							$.extend(true,world_update.pending_update, update);
						} else {
							// We don't have a pending update, so simply set it
							world_update.pending_update = update;
						}
						setTimeout(call_next_update,100);
					},
					dataType: "text"
				});
			} else {
				// We are out of requests, so mark that we are not running
				// and terminate
				delete world_update.ajax_loop_running;
			}
		}
		// Call our ajax loop on the new update
		call_next_update();
	}
}

/*
 * world_update_piece - Convenience function to update a piece given a piece
 * index and an array of attributes
 * 
 * @param piece_index Index of the peice to update
 * @param piece_update Object containing the attributes to update 
 */
function world_update_piece(piece_index, piece_update){
	var update = {
		"pieces": new Object()
	};
	update.pieces[piece_index] = piece_update;
	world_update(update);
}

/*
 * world_update_piece_accumulate - Accumulates piece updates until
 * world_update_piece_accumulate_flush is called.  This is useful for easily
 * updating many pieces at once.  Changes to the same piece will
 * completely overwrite old ones.
 * 
 * @param piece_index Index of the peice to update
 * @param piece_update Object containing the attributes to update 
 */
function world_update_piece_accumulate(piece_index, piece_update){
	if (!("update" in world_update_piece_accumulate)){
		world_update_piece_accumulate.update = {
			"pieces": new Object()
		};
	}
	world_update_piece_accumulate.update.pieces[piece_index] = piece_update;
}

/*
 * world_update_piece_accumulate_flush - Sends any accumulated piece updates
 * gathered in world_update_piece_accumulate() to the server.
 */
function world_update_piece_accumulate_flush(){
	if ("update" in world_update_piece_accumulate) {
		world_update(world_update_piece_accumulate.update);
		delete world_update_piece_accumulate.update;
	}
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
				// Add the piece if it isn't null
				if (update.pieces[piece_index] instanceof Object){
					world_on_new_piece_handler(piece_index, update.pieces[piece_index]);
				}
			}
		}
	} else if ("pieces" in update) {
		// Iterate pieces, looking for new, updates, or deletes
		for (piece_index in update.pieces) {
			if ((update.pieces[piece_index] instanceof Object) && 
				("__new" in update.pieces[piece_index])){
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
 * TODO: MEDIUM - Research use of polling instead of server-side wait (issues with iphone 4.2)
 */
function world_listener_start(){
	// Holds the transaction stamp of the latest update
	world_listener_start.world_last_ts = 0;
	// When the Ajax call is successful, this handles the update data and 
	// then calls the listener again
	var world_update_handler = function(data){
		// TODO: LOW - Handle parse error
		data = JSON.parse(data);
		var update = data["update"];
		execute_world_update(update);
		world_listener_start.world_last_ts = data["last_modify"];
		world_listener();
	}
	// If the Ajax failed, let's dislplay an error and exit
    var world_update_failure = function(data, textStatus, errorThrown){
// Don't alert the user since this seems to occur if the user leaves the page
//		alert("There was an error getting an update.  Please check your connection and press 'OK'.");
		setTimeout(world_listener,100);
	}
	// Make the ajax call for new data with our latest transaction stamp
	var world_listener = function() {
		$.ajax({
			type: 'POST', 
			url: world_server_url, 
			data: {
				action: "read", 
				last_modify: JSON.stringify(world_listener_start.world_last_ts)
				}, 
			timeout: 5000,
			success: world_update_handler, 
			error: world_update_failure, 
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