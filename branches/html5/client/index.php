<!DOCTYPE html>
<html>
	<head>
		<meta name="apple-mobile-web-app-capable" content="yes" />
		<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
		<meta name="viewport" content="minimum-scale=0.0001, maximum-scale=10.0">
		<title>Board Game Arena</title>
		<link href="../css/smoothness/jquery-ui.css" rel="stylesheet" type="text/css"/>
		<script src="../js/jquery.min.js" type="text/javascript"></script>
		<script src="../js/jquery-ui.min.js" type="text/javascript"></script>
		<style type="text/css">
			#draggable { width: 100px; height: 70px; background: silver; }
		</style>
		<script src="util.js" type="text/javascript"></script>
		<script src="popup_menu.js" type="text/javascript"></script>
		<script src="world.js" type="text/javascript"></script>
		<script src="piece_ui.js" type="text/javascript"></script>
		<script type="text/javascript">
	
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
					return true;
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
		<div id="create_piece_dialog" title="Create a New Piece">
			<form>
				<fieldset>
					<label for="create_piece_url">Image URL</label>
					<input type="text" name="url" id="create_piece_url" class="text ui-widget-content ui-corner-all" />
				</fieldset>
			</form>
		</div>
	</body>
</html>
