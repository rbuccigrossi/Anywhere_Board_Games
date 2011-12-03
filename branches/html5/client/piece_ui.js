	
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

function set_piece_location(piece, position){
	world_move_piece(piece.world_piece_index,position.left,position.top);
	$(piece).offset(position);
}

function piece_start_drag(piece, x, y){
	var piece_offset = $(piece).offset();
	var position_on_piece = {
		x: (x - piece_offset.left),
		y: (y - piece_offset.top)
	};
	var board = $(document); // The #board object may not extend to the whole area
	var drag_function = function (event) {
		event.preventDefault();
		var position = {
			left: event.pageX - position_on_piece.x,
			top: event.pageY - position_on_piece.y
		}
		set_piece_location(piece,position);
		return(false);
	};
	var stop_drag_function = function (event) {
		event.preventDefault();
		board.unbind("mousemove.drag");
		board.unbind("mouseup.drag");
		return(false);
	};
	board.bind("mousemove.drag",drag_function);
	board.bind("mouseup.drag",stop_drag_function);
	return(false);
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
	var piece_idx = world_get_new_piece_index();
	var new_id = "piece_" + piece_idx;
	world_add_piece(piece_idx,[img_url],50,50);
	var piece = $('<span class="piece" id="' + new_id + '" style="position: absolute; left: 50px; top: 50px;">' +
		'<img class="piece_face" src="' + img_url + '">' +
		'<img class="piece_move" style="position:absolute; opacity: 0;" src="../images/transform-move.png">' +
		'<img class="piece_rotate" style="position:absolute; opacity: 0;" src="../images/transform-rotate.png">' +
		'</span>');
	$("#board").append(piece);
	// Record the piece index
	piece.get(0).world_piece_index = piece_idx;
	piece.bind({
		mouseenter: function() {piece_show_action_icons(this);}, 
		mouseleave: function() {piece_hide_action_icons(this);},
		mousedown: function(event) { 
			event.preventDefault();  
			piece_start_drag(this,event.pageX,event.pageY);
			return false; 
		},
		contextmenu: function(){return false;}
	});
	piece.find(".piece_rotate").bind({
		mousedown: function(event) { 
			event.preventDefault();  
			piece_start_rotate(piece.get(0),event.pageX,event.pageY);
			return false; 
		}
	});
}

$(document).ready(function() {
	board_add_piece("../images/piece.png");
	board_add_piece("../images/shape01.png");
});


// TODO: Set up touch version 
/*
function piece_start_drag(piece, x, y){
	var piece_offset = $(piece).offset();
	var position_on_piece = {
		x: (x - piece_offset.left),
		y: (y - piece_offset.top)
	};
	var board = $(document); // The #board object may not extend to the whole area
	var drag_function = function (event) {
		event.preventDefault();
		var pageX = event.pageX;
		var pageY = event.pageY;
		if (event.touches && (event.touches.length > 0)){
			pageX = event.touches[0].pageX;
			pageY = event.touches[0].pageY;
		}
		var position = {
			left: pageX - position_on_piece.x,
			top: pageY - position_on_piece.y
		}
		$(piece).offset(position);
		return(false);
	};
	var stop_drag_function = function (event) {
		event.preventDefault();
		board.unbind("mousemove.drag");
		board.unbind("mouseup.drag");
		board.get(0).removeEventListener("touchmove", drag_function, false)
		board.get(0).removeEventListener("touchend",stop_drag_function, false);
		board.get(0).removeEventListener("touchcancel",stop_drag_function, false);
		return(false);
	};
	board.bind("mousemove.drag",drag_function);
	board.bind("mouseup.drag",stop_drag_function);
	board.get(0).addEventListener("touchmove",drag_function,false);
	board.get(0).addEventListener("touchend",stop_drag_function,false);
	board.get(0).addEventListener("touchcancel",stop_drag_function,false);
	return(false);
}
*/

// TODO: Add touch event listeners
/*
 	piece.get(0).addEventListener("touchstart",function(event){
		event.preventDefault();
		piece_start_drag(piece.get(0),event.touches[0].pageX,event.touches[0].pageY);
		return false;
	},false);
 */

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
