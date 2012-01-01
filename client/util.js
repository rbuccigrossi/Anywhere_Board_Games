/*
 * util_page_to_client_coord - converts page to client coordinates based upon 
 * the current scrollbar location
 * 
 * @param page The (left, top) page coordinates
 * @return client The (left, top) client coordinates
 */
function util_page_to_client_coord(page){
	var left = page.left;
	var top = page.top;
    if( document.body && ( document.body.scrollLeft || document.body.scrollTop ) ) {
      left -= document.body.scrollLeft;
      top -= document.body.scrollTop;
    } else if( document.documentElement && ( document.documentElement.scrollLeft || document.documentElement.scrollTop ) ) {
      left -= document.documentElement.scrollLeft;
      top -= document.documentElement.scrollTop;
	}
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
	setTimeout(remove_callback, 500);
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
