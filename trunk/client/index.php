<!DOCTYPE html>
<html>
	<head>
		<meta name="apple-mobile-web-app-capable" content="yes" />
		<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
		<!--
		<meta name="viewport" content="minimum-scale=0.0001, maximum-scale=10.0">
		-->
		<title>Board Game Arena</title>
		<link href="http://ajax.googleapis.com/ajax/libs/jqueryui/1.8.16/themes/smoothness/jquery-ui.css" rel="stylesheet" type="text/css"/>
		<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js" type="text/javascript"></script>
		<script src="https://ajax.googleapis.com/ajax/libs/jqueryui/1.8.16/jquery-ui.min.js" type="text/javascript"></script>
		<style type="text/css">
			#draggable { width: 100px; height: 70px; background: silver; }
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
					buttons: {
						"OK": function() {
							var file = $("#upload_board_file").val();
							if (!file){
								alert("Please enter a file name");
							} else {
								$("#upload_board_form").get(0).action = world_server_url;
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
						$(':button:contains("OK")').click();
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
		<div id="upload_board_dialog" title="Upload a Board">
			<form enctype="multipart/form-data" id="upload_board_form" method="POST">
				<fieldset>
					<label for="upload_board_file">Board File</label>
					<input type="hidden" name="action" value="upload" />
					<input type="file" name="file" id="upload_board_file" class="text ui-widget-content ui-corner-all" />
				</fieldset>
			</form>
		</div>
	</body>
</html>
