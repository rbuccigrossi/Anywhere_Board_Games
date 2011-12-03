

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
	var world_update = {"pieces": new Object()};
	world_update.pieces[index] =  {"faces": faces, "x": x, "y": y};
	$.ajax({type: 'POST', url: world_server_url, 
		data: { action: "update", update: JSON.stringify(world_update)}, 
		success: showResult, dataType: "text"});
}

// TODO: QUEUE THE PIECE UPDATES...
function world_move_piece(index,x,y){
	var world_update = {"pieces": new Object()};
	world_update.pieces[index] =  {"x": x, "y": y};
	$.ajax({type: 'POST', url: world_server_url, 
		data: { action: "update", update: JSON.stringify(world_update)}, 
		success: showResult, dataType: "text"});
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
		$.ajax({type: 'POST', url: world_server_url, 
			data: { action: "read", last_modify: JSON.stringify(world_last_ts)}, 
			success: world_update_handler, failure: world_update_failure, dataType: "text"});
	}
	world_listener();
}

$(document).ready(function(){
	world_listener_start();
});