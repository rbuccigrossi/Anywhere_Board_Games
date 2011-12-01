
var piece_rotate = false;
var in_drag = false;
var in_rotate = false;
var rotate_orig_orientation = 0;
var drag_piece = false;
var drag_offset_x = 0;
var drag_offset_y = 0;
var piece_idx = 0;
	
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
	
function piece_start_drag(piece, x, y){
	in_drag = true;
	drag_piece = piece;
	var position = $(drag_piece).offset();
	drag_offset_x = x - position.left;
	drag_offset_y = y - position.top;
}
	
function rotate_mousedown(event){
	// START DRAG
	event.preventDefault();
	in_rotate = true;
	drag_piece = $(this).parent().get(0);
	if (!drag_piece.orientation){
		drag_piece.orientation = 0;
	}
	rotate_orig_orientation = drag_piece.orientation;
	var piece_face = $(drag_piece).find(".piece_face");
	var position = {
		left: drag_piece.offsetLeft + $(piece_face).width()/2,
		top: drag_piece.offsetTop + $(piece_face).height()/2
		};
	drag_offset_x = event.pageX - position.left;
	drag_offset_y = event.pageY - position.top;
	return false;
}
	
function board_mousemove(event){
	var position;
	if (in_drag){
		var position = {
			left: event.pageX - drag_offset_x,
			top: event.pageY - drag_offset_y
			}
		$(drag_piece).offset(position);
	}
	if (in_rotate){
		var piece_face = $(drag_piece).find(".piece_face");
		var position = {
			left: drag_piece.offsetLeft + $(piece_face).width()/2,
			top: drag_piece.offsetTop + $(piece_face).height()/2
			};
		var new_drag_offset_x = event.pageX - position.left;
		var new_drag_offset_y = event.pageY - position.top;
		if (new_drag_offset_x != 0 || new_drag_offset_y != 0){
			drag_piece.orientation = rotate_orig_orientation
			+ 360.0*(Math.atan2(new_drag_offset_x,-new_drag_offset_y)
				- Math.atan2(drag_offset_x,-drag_offset_y))/(2*3.14159);
		}
		drag_piece.orientation = ((Math.round(drag_piece.orientation / 5) * 5) + 360) % 360;
		var r = "rotate(" + drag_piece.orientation + "deg)";
		$("#info").html("" + position.left + ", " + position.top + " - " + new_drag_offset_x
			+  ", " + new_drag_offset_y + " ... "
			+  Math.atan2(new_drag_offset_x,new_drag_offset_y) + " ... "
			+ Math.atan2(drag_offset_x,drag_offset_y) + " ... " + r);
		$(piece_face).css("transform",r);
		$(piece_face).css("-webkit-transform",r);
		$(piece_face).css("-moz-transform",r);
		$(piece_face).css("-ms-transform",r);
	}
}
	
function board_mouseup(event){
	if (in_drag){
		in_drag = false;
		drag_piece = false;
	}
	if (in_rotate){
		in_rotate = false;
		drag_piece = false;
	}
}
	
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

function board_add_piece(img_url){
	var new_id = "piece_" + piece_idx;
	piece_idx ++;
	var piece = $('<span class="piece" id="' + new_id + '" style="position: absolute; left: 50px; top: 50px;">' +
		'<img class="piece_face" src="' + img_url + '">' +
		'<img class="piece_move" style="position:absolute; opacity: 0;" src="../images/transform-move.png">' +
		'<img class="piece_rotate" style="position:absolute; opacity: 0;" src="../images/transform-rotate.png">' +
		'</span>');
	$("#board").append(piece);
	piece.bind({
		mouseenter: function() { piece_show_action_icons(this); }, 
		mouseleave: function() { piece_hide_action_icons(this); },
		mousedown: function(event) { 
			event.preventDefault();  
			piece_start_drag(this,event.pageX,event.pageY);
			return false; 
		},
		contextmenu: function(){ return false; }
	});
	piece.find(".piece_rotate").bind({
		mousedown: rotate_mousedown
	});
}

$(document).ready(function() {
	board_add_piece("../images/piece.png");
	board_add_piece("../images/shape01.png");
	$(document).bind({
		mousemove: board_mousemove, 
		mouseup: board_mouseup
	});
});
	


