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
	return (typeof event.touches != 'undefined');
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
		// TODO: Allow multiple touches and use the closest touch to the object (targetTouches)
		coord = {
			x: event.touches[0].pageX, 
			y: event.touches[0].pageY
		};
	} else {
		coord = {
			x: event.pageX, 
			y: event.pageY
		};
	}
	return (coord);
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
