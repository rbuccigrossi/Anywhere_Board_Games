

var world_max_piece_index = -1;
var world_server_url = "../server/world.php";

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
	console.log(JSON.stringify(world_update));
	$.post(world_server_url, { action: "update", update: JSON.stringify(world_update)}, showResult, "text");
}
