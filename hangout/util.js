
// Detection used for Chrome-specific bug fixes
var util_is_chrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;

// Bug fix to allow scroll bars to work on mouse down events:
function util_is_in_scrollbar(event){
//	console.log(event.clientX + "," + event.clientY + "  " + $(window).width() + "," + $(window).height());
	if ((event.clientX > ($(window).width()-17)) ||
		(event.clientY > ($(window).height()-17))){
		return (true);
	}
	return (false);
}


// TODO: IMMEDIATE FIX THIS NAME TO POS AND REVIEW CHANGES
/*
 * util_page_to_board_coord - converts page to board coordinates based upon 
 * the current scrollbar location
 * 
 * @param page The (left, top) page coordinates
 * @return board The (left, top) board coordinates
 */
function util_page_to_board_coord(coord){
	var left = coord.left;
	var top = coord.top;
    left += $("#board").scrollLeft();
	top += $("#board").scrollTop();
	return ({left: left, top: top});
}

/*
 * util_board_to_page_coord - converts board to page coordinates based upon 
 * the current scrollbar location
 * 
 * @param page The (left, top) page coordinates
 * @return board The (left, top) board coordinates
 */
function util_board_to_page_coord(coord){
	var left = coord.left;
	var top = coord.top;
    left -= $("#board").scrollLeft();
	top -= $("#board").scrollTop();
	return ({left: left, top: top});
}

/*
 * util_is_touch_event - Helper function to determine if an event is a touch event
 * 
 * @param event The mouse or touch event
 */
function util_is_touch_event(event){
	return ((typeof event.touches != 'undefined') || (typeof event.changedTouches != 'undefined'));
}

/*
 * util_ignore_click_from_touch - An implementation of the Google "clickbuster"
 * to ignore clicks that result from touch events we have already handled
 * see http://code.google.com/mobile/articles/fast_buttons.html
 * 
 * Here we try a simpler implementation that ignores clicks for the next 0.5 seconds.
 */
function util_ignore_click_from_touch(){
	var ignore_callback = function(event){
		event.stopPropagation();
		event.preventDefault();
	};
	var remove_callback = function(){
		document.removeEventListener('click',ignore_callback,true);
	}
	document.addEventListener('click',ignore_callback,true);
	setTimeout(remove_callback, 1000);
}

/*
 * util_get_event_coordinates - Helper function to get the event coordinates for either a 
 * mouse or touch event
 * 
 * @param event The mouse or touch event
 * @return coord (x, y) coordinates for the event
 */
function util_get_event_coordinates(event){
	var coord;
	if (util_is_touch_event(event)){
		// If this is a touch event, use the first touch
		// TODO: LOW - Allow multiple touches and use the closest touch to the object (targetTouches)
		if (event.touches.length > 0){
			coord = {
				x: event.touches[0].pageX, 
				y: event.touches[0].pageY
			};
		} else {
			coord = {
				x: event.changedTouches[0].pageX, 
				y: event.changedTouches[0].pageY
			};			
		}
	} else {
		coord = {
			x: event.pageX, 
			y: event.pageY
		};
	}
	return (coord);
}

/*
 * util_get_event_board_coordinates - Helper function to get the event coordinates for either a 
 * mouse or touch event in relation to the top/left of the board
 * 
 * @param event The mouse or touch event
 * @return coord (x, y) coordinates for the event
 */
function util_get_event_board_coordinates(event){
	var coord = util_get_event_coordinates(event);
	return ({x: (coord.x += $("#board").scrollLeft()),
			 y: (coord.y += $("#board").scrollTop())});
}

/*
 * util_clone - Does a shallow clone of an object or array
 * 
 * @param orig Original object or array
 */
function util_clone(orig){
	if (orig instanceof Array){
		return orig.slice(0);
	} else {
		return ($.extend({},orig));
	}
}
/*
 * util_create_ui_overlay - Generates a ui-widget-overlay, sets the window resize
 * callback to manipulate it, and returns the DOM object
 *
 * @param click_callback Callback(event) for click event
 * @return ui_overlay DOM object
 */
function util_create_ui_overlay(click_callback){
	// Note: We append this to the body to ensure full coverage when the board resizes
	var js_overlay = $('<div class="ui-widget-overlay"></div>').css('opacity',0).appendTo('body');
	js_overlay.css('position','absolute');
	js_overlay.css('z-index',1002);
	js_overlay.width($(document).width());
	js_overlay.height($(document).height());
	var set_overlay_dimension = function (){
		js_overlay.width($(document).width());
		js_overlay.height($(document).height());
	}
	$(window).bind("resize",set_overlay_dimension);
	js_overlay.bind("click",function(event){
		$(window).unbind("resize",set_overlay_dimension);
		js_overlay.remove();
		if (click_callback){
			return (click_callback(event));
		}
		else {
			return true;
		}
	});
	return (js_overlay.get(0))
}

function util_ignore_event(event){
	event.preventDefault();
	return(false);
}


function util_get_browser_width(){
  if( typeof( window.innerWidth ) == 'number' ) {
    //Non-IE
    return window.innerWidth;
  } else if( document.documentElement && document.documentElement.clientWidth ) {
    //IE 6+ in 'standards compliant mode'
    return document.documentElement.clientWidth;
  } else {
    //IE 4 compatible
    return document.body.clientWidth;
  }
}

function util_set_position(piece, position){
	$(piece).css({'left': (position.left + "px"), 'top': (position.top + "px")});
}

function util_get_position(piece) {
	return ({
				'left': parseInt($(piece).css("left"),10),
				'top': parseInt($(piece).css("top"),10)
			});
}
