<!DOCTYPE html>
<html>
	<head>
		<meta name="apple-mobile-web-app-capable" content="yes" />
		<title>GBA</title>
		<link href="../css/smoothness/jquery-ui.css" rel="stylesheet" type="text/css"/>
		<script src="../js/jquery.min.js" type="text/javascript"></script>
		<script src="../js/jquery-ui.min.js" type="text/javascript"></script>
		<style type="text/css">
			#draggable { width: 100px; height: 70px; background: silver; }
		</style>
		<script src="world.js" type="text/javascript"></script>
		<script src="piece_ui.js" type="text/javascript"></script>
		<script type="text/javascript">

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
	
			// TODO: Add error checking from http://jqueryui.com/demos/dialog/modal-form.html
			$(document).ready(function() {
				$( "#create_piece_dialog" ).dialog({
					dialogClass: 'bga_dialog bga_small_text_dialog',
					autoOpen: false,
					height: 300,
					width: 350,
					modal: true,
					buttons: {
						"OK": function() {
							var image_url = $("#create_piece_url").val();
							if (!image_url){
								alert("Please enter an image URL");
							} else {
								board_add_piece(image_url);
								$( this ).dialog( "close" );
							}
						},
						Cancel: function() {
							$( this ).dialog( "close" );
						}
					}
				});
				// Bind enter to OK to avoid submitting the form to the script
				$( "#create_piece_dialog" ).bind("keydown", function(e){
					if (e.keyCode == 13){
						e.preventDefault();
						$(':button:contains("OK")').click();
						return false;
					}
				})
			});
	

		</script>
		<style>
			.bga_small_text_dialog { font-size: 67.5%; }
			.bga_dialog label, .bga_dialog input { display:block; }
			.bga_dialog input.text { margin-bottom:12px; width:95%; padding: .4em; }
			.bga_dialog fieldset { padding:0; border:0; margin-top:25px; }
		</style>
	</head>
	<body id="board" style="background-color:#A0A0A0;">
		<!-- scrolling="no" -->
		<div id="info"></div>
		<div id="background_context_menu" class="ContextMenu">
			<a href="javascript:void(0);" onClick="$('#background_context_menu').dialog('close'); $( '#create_piece_dialog' ).dialog('open');" 
			   id="new_piece">New Piece</a>
			<a href="javascript:void(0)" onClick="$('#background_context_menu').dialog('close');" id="option2">Option 2</a>
			<a href="javascript:void(0)" id="option3">Option 3</a>
			<a href="javascript:void(0)" id="option4">Option 4</a>
		</div>
		<div id="create_piece_dialog" title="Create a New Piece">
			<form>
				<fieldset>
					<label for="url">Image URL</label>
					<input type="text" name="url" id="create_piece_url" class="text ui-widget-content ui-corner-all" />
				</fieldset>
			</form>
		</div>
	</body>
</html>
