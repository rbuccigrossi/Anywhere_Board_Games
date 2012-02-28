<!DOCTYPE html>
<html>
	<head>
		<meta name="apple-mobile-web-app-capable" content="yes" />
		<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
		<link rel="icon" type="image/png" href="../images/ABGLogo48x48.png" />
		<link rel="apple-touch-icon" type="image/png" href="../images/ABGLogo48x48.png" />
		<!--
		<meta name="viewport" content="minimum-scale=0.0001, maximum-scale=10.0">
		-->
		<title>Anywhere Board Games</title>
	<!--
		<link href="http://ajax.googleapis.com/ajax/libs/jqueryui/1.8.16/themes/smoothness/jquery-ui.css" rel="stylesheet" type="text/css"/>
		<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js" type="text/javascript"></script>
		<script src="https://ajax.googleapis.com/ajax/libs/jqueryui/1.8.16/jquery-ui.min.js" type="text/javascript"></script>
 -->
		<link href="../css/smoothness/jquery-ui.css" rel="stylesheet" type="text/css"/>
		<script src="../js/jquery.min.js" type="text/javascript"></script>
		<script src="../js/jquery-ui.min.js" type="text/javascript"></script>
		<style type="text/css">
			#draggable { width: 100px; height: 70px; background: silver; }
			.ui-widget-overlay {opacity: 0;}
			.popup .ui-dialog-titlebar {display: none; visibility: hidden;}
			.popup .ui-button { text-align: left;}
			.ui-dialog-content label {width: 20%; display: inline-block; text-align: right;}
		</style>
		<script src="util.js" type="text/javascript"></script>
		<script src="popup_menu.js" type="text/javascript"></script>
		<script src="world.js" type="text/javascript"></script>
		<script src="piece_ui.js" type="text/javascript"></script>
		<script src="iframesubmit.js" type="text/javascript"></script>
		<script type="text/javascript">
	
			// TODO: LOW - Add error checking from http://jqueryui.com/demos/dialog/modal-form.html
			$(document).ready(function() {
				$( "#upload_board_dialog" ).dialog({
					dialogClass: 'bga_dialog bga_small_text_dialog',
					autoOpen: false,
					height: 300,
					width: 350,
					modal: true,
					open: function(event, ui) {
						$("#upload_board_form").get(0).reset();
					},
					buttons: {
						"OK": function() {
							var file = $("#upload_board_file").val();
							var url = $("#upload_board_url").val();
							var url_select = $("#upload_board_select").val();
							if(url_select){
								url = url_select;
							}
							if (!file && !url){
								alert("Please enter or select an ABG file");
							} else {
								$("#upload_board_form").get(0).action = world_server_url;
								// Reset the last timestamp of the world
								world_listener_start.world_last_ts = 0;
								IFrameSubmit.submit($("#upload_board_form").get(0),{onComplete: function(a){alert(a);}});
								$("#upload_board_form").get(0).submit();
								$( this ).dialog( "close" );
							}
						},
						Cancel: function() {
							$( this ).dialog( "close" );
						}
					}
				});
				// Bind enter to OK to avoid submitting the form to the script
				$( "#upload_board_dialog" ).bind("keydown", function(e){
					if (e.keyCode == 13){
						e.preventDefault();
						$( "#upload_board_dialog" ).parent().find(':button:contains("OK")').click();
						return false;
					}
					return true;
				})
				// Ignore Context Menu
				$(document).bind("contextmenu",util_ignore_event);
			});
	

		</script>
		<style>
			.bga_small_text_dialog { font-size: 67.5%; }
			.bga_dialog fieldset { padding:0; border:0; }
		</style>
	</head>
	<body id="board" style="background-color: #001000;">
		<!-- scrolling="no" -->
		<div id="info"></div>
		<div id="upload_board_dialog" title="Open a Board">
			<form enctype="multipart/form-data" id="upload_board_form" method="POST">
				<fieldset>
					<P>
					<span>Please upload an ABG file, enter a URL to an ABG file, or select one of the standard boards:</span>
					</P>
					<input type="hidden" name="action" value="upload" />
					<label for="upload_board_file">Board File:</label>
					<input type="file" name="file" id="upload_board_file" class="text ui-widget-content ui-corner-all" />
					<BR/>
					<label for="upload_board_url">URL:</label>
					<input type="text" style="width: 75%;" name="url" id="upload_board_url" class="text ui-widget-content ui-corner-all" />
					<BR/>
					<label for="upload_board_select">Board:</label>
					<select style="width: 75%;" name="url" id="upload_board_select" class="ui-widget-content ui-corner-all">
						<option value="">-</option>
						<option value="../games/deck/deck.abg">A blue deck of cards</option>
						<option value="../games/checkers/checkers.abg">Checkers</option>
						<option value="../games/intro.abg">Introduction</option>
					</select>
				</fieldset>
			</form>
		</div>
	</body>
</html>
