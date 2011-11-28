<!DOCTYPE html>
<html>
<head>
	<title>GBA</title>
  <link href="css/smoothness/jquery-ui.css" rel="stylesheet" type="text/css"/>
  <script src="js/jquery.min.js" type="text/javascript"></script>
  <script src="js/jquery-ui.min.js" type="text/javascript"></script>
  <style type="text/css">
    #draggable { width: 100px; height: 70px; background: silver; }
  </style>
  <script type="text/javascript">

var piece_rotate = false;
var in_drag = false;
var in_rotate = false;
var rotate_orig_orientation = 0;
var drag_piece = false;
var drag_offset_x = 0;
var drag_offset_y = 0;

function piece_mouseenter(event){
    var piece_move = $(this).find(".piece_move");
    var piece_rotate = $(this).find(".piece_rotate");
    var piece_face = $(this).find(".piece_face");
    var position = $(piece_face).offset();
//    piece_move.position({my: "top left", at: "top left", of: piece_face});
    position.left = this.offsetLeft + $(piece_face).width() / 2 - $(piece_move).width() - 8;
    position.top = this.offsetTop + $(piece_face).height() / 2 - $(piece_move).height() / 2;
    $(piece_move).offset(position);
    position.left = this.offsetLeft + $(piece_face).width() / 2 + 8;
    position.top = this.offsetTop + $(piece_face).height() / 2 - $(piece_rotate).height() / 2;
    $(piece_rotate).offset(position);
    piece_move.stop(true,true).animate({opacity:1},200);
    piece_rotate.stop(true,true).animate({opacity:1},200);
}

function piece_mouseleave(event){
    var piece_move = $(this).find(".piece_move");
    var piece_rotate = $(this).find(".piece_rotate");
    piece_move.stop(true,true).animate({opacity:0},200);
    piece_rotate.stop(true,true).animate({opacity:0},200);
}

function piece_mousedown(event){
    // START DRAG
    event.preventDefault();
    in_drag = true;
    drag_piece = this;
    var position = $(drag_piece).offset();
    drag_offset_x = event.pageX - position.left;
    drag_offset_y = event.pageY - position.top;
    return false;
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
    var position = {left: drag_piece.offsetLeft + $(piece_face).width()/2,
		    top: drag_piece.offsetTop + $(piece_face).height()/2};
    drag_offset_x = event.pageX - position.left;
    drag_offset_y = event.pageY - position.top;
    return false;
}

function board_mousemove(event){
    if (in_drag){
	var position = {left: event.pageX - drag_offset_x,
			top: event.pageY - drag_offset_y}
	$(drag_piece).offset(position);
    }
    if (in_rotate){
	var piece_face = $(drag_piece).find(".piece_face");
	var position = {left: drag_piece.offsetLeft + $(piece_face).width()/2,
			top: drag_piece.offsetTop + $(piece_face).height()/2};
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

$(document).ready(function() {
/*
  $(".draggable").draggable({ stack: ".draggable", scroll: false});
  $(".draggable")[0].oncontextmenu = function() {return false;}

  var piece = document.createElement('img');
  piece.setAttribute('src', 'shape03.png');
  piece.setAttribute('class', 'draggable');
  $("#board").append(piece);
  $(piece).draggable({ stack: ".draggable", scroll: false});
*/
    $(".piece").bind({mouseenter: piece_mouseenter, mouseleave: piece_mouseleave,
		      mousedown: piece_mousedown, contextmenu: function(){return false;}
			  });
    $(".piece_rotate").bind({mousedown: rotate_mousedown});
    $(document).bind({mousemove: board_mousemove, mouseup: board_mouseup});
});

/* CONTEXT MENU FUNCTIONALITY */
$.fn.setUpContextMenu = function() {
	$(this).dialog({
		dialogClass: 'popup bga_small_text_dialog',
		autoOpen: false,
		modal: true,
		resizable: false,
		width: 'auto',
		height: 'auto',
		minHeight: 'auto',
		minWidth: 'auto'
	});

	return $(this);
};

$.fn.openContextMenu = function(jsEvent) {
	var menu = $(this);
	menu.css('padding', 0);
	menu.dialog('option','position',[jsEvent.clientX, jsEvent.clientY]);
	menu.bind('dialogopen', function(event, ui) {
		$('.popup .ui-dialog-titlebar').hide();
		$('.ui-widget-overlay').unbind('click');
		$('.ui-widget-overlay').css('opacity',0);
		$('.ui-widget-overlay').bind('mousedown',function() {
			menu.dialog('close');
			return true;
		});
	});
	menu.bind('focus', function(event, ui){   // Remove first item being hovered
		menu.find('a').removeClass('ui-state-focus ui-state-hover');
	});
	menu.dialog('open');

	return menu;
};

$(document).ready(function() {
	$('.ContextMenu a').css('display','block').button();
	$('.ContextMenu').setUpContextMenu();
	$(document).bind('contextmenu', function(e) {
		$('#background_context_menu').openContextMenu(e);
		return false;
	});
});

$(document).ready(function() {
	$( "#create_piece_dialog" ).dialog({
		dialogClass: 'bga_dialog bga_small_text_dialog',
		autoOpen: false,
		height: 300,
		width: 350,
		modal: true,
		buttons: {
			"Create a piece": function() {
				$( this ).dialog( "close" );
			},
			Cancel: function() {
				$( this ).dialog( "close" );
			}
		}
	});
});


</script>
<style>
	.bga_small_text_dialog { font-size: 67.5%; }
	.bga_dialog label, .bga_dialog input { display:block; }
	.bga_dialog input.text { margin-bottom:12px; width:95%; padding: .4em; }
	.bga_dialog fieldset { padding:0; border:0; margin-top:25px; }

</style>
</head>
<body style="background-color:#A0A0A0;">
<!-- scrolling="no" -->
<div id="info"></div>
<div id="background_context_menu" class="ContextMenu">
	<a href="javascript:void(0);" onClick="$('#background_context_menu').dialog('close'); $( '#create_piece_dialog' ).dialog('open');" id="new_piece">New Piece</a>
	<a href="javascript:void(0)" onClick="$('#background_context_menu').dialog('close');" id="option2">Option 2</a>
	<a href="javascript:void(0)" id="option3">Option 3</a>
	<a href="javascript:void(0)" id="option4">Option 4</a>
</div>
<div id="create_piece_dialog" title="Create a New Piece">
	<form>
	<fieldset>
		<label for="url">Image URL</label>
		<input type="text" name="url" id="url" class="text ui-widget-content ui-corner-all" />
	</fieldset>
	</form>
</div>
<span class="piece" style="position: absolute; left: 50px; top: 50px;">
  <img class="piece_face" src="piece.png">
  <img class="piece_move" style="position:absolute; opacity: 0;" src="transform-move.png">
  <img class="piece_rotate" style="position:absolute; opacity: 0;" src="transform-rotate.png">
</span>
<span class="piece" style="position: absolute; left: 250px; top: 50px;">
 <img class="piece_face" src="shape01.png">
 <img class="piece_move" style="position:absolute; opacity: 0;" src="transform-move.png">
 <img class="piece_rotate" style="position:absolute; opacity: 0;" src="transform-rotate.png">
</span>
</body>
</html>
