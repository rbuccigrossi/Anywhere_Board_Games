

var world_max_piece_index = -1;
var world_server_url = "../server/world.php";
var world_last_ts = 0;

// TODO: We may have a race condition if two pieces are added simultaneously
function world_get_new_piece_index(){
	world_max_piece_index ++;
	return world_max_piece_index;
}

function showResult(res)
{
	console.log(res);
}

/*
 * faces - an array of image URLS
 */
function world_add_piece(index,faces,x,y){
	var world_update = {
		"pieces": new Object()
		};
	world_update.pieces[index] =  {
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
		success: showResult, 
		dataType: "text"
	});
}

function world_move_piece(index,x,y){
	// Check if we already are running (works since single threaded)
	var ajax_loop_running = (index in world_move_piece);
	// Store the next move into the array (overwriting one if currently running)
	world_move_piece[index] = {
		x: x, 
		y: y,
		pending: 1
	};
	// If we aren't running, start our ajax loop
	if (!ajax_loop_running){
		var call_next_move = function () {
			// Check if there is a move request pending
			if (world_move_piece[index].pending) {
				// Mark that we are sending the request
				world_move_piece[index].pending = 0;
				// Create the world update object
				var world_update = {
					"pieces": new Object()
				};
				world_update.pieces[index] =  {
					"x": world_move_piece[index].x, 
					"y": world_move_piece[index].y
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
				delete world_move_piece[index];
			}
		}
		// Call our ajax loop on the new piece
		call_next_move();
	}
}

function world_listener_start(){
	var world_update_handler = function(data){
		console.log(data);
		data = JSON.parse(data);
		var update = data["update"];
		world_last_ts = data["last_modify"];
		world_listener();
	}
	var world_update_failure = function(data){
		alert("Error updating the World.  Please check your connection and press reload.");
	}
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
	world_listener();
}

$(document).ready(function(){
	world_listener_start();
});