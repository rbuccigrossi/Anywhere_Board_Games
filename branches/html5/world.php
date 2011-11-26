<?php
/**
 * AJAX service to save and manipulate the game world
 *
 * The world is essentially a JSON associative array.
 *
 * In addition, each element of the world has a last modification stamp.  The stamp
 * is a monotonically increasing number (so the stamp for newer updates are greater
 * than older updates), with a starting stamp of 0.
 */

$filename = sys_get_temp_dir() . DIRECTORY_SEPARATOR . "bgaworld.json";
$action = isset($_REQUEST["action"])?$_REQUEST["action"]:"read";

if ($action == "read"){
	$lastmodify = isset($_REQUEST["lastmodify"])?$_REQUEST["lastmodify"]:"-1";
	$file = @fopen($filename, "r");
	if ($file) {
		flock($file,LOCK_SH);
	}
	$data = read_world_file($filename);

	if ($file) {
		flock($file,LOCK_UN);
		fclose($file);
	}
	echo "\n\n";
	print_r($data);
	exit();
} else if ($action == "update"){
	if (!isset($_REQUEST["update"])){
		exit_json_error("Must set update value");
	}
	$update = json_decode(stripslashes($_REQUEST["update"]),true);
	// Lock and load the world :)
	$file = @fopen($filename, "c+");
	if (!$file){
		exit_json_error("Unable to open $filename");
	}
	flock($file,LOCK_EX);
	$data = read_world_file($filename);
	$data["maxlastmodify"] += 1;
	world_node_update($data["world"],$data["lastmodify"],$update,$data["maxlastmodify"]);
	ftruncate($file,0);
	fwrite($file,json_encode($data));
	flock($file,LOCK_UN);
	echo "\n\n Update = ";
	print_r($update);
	echo "<P>\n\n";
	print_r($data);
	exit();
} else {
	exit_json_error("Unknown action");
}

function exit_json_error($error_text){
	echo "\n\n";
	echo json_encode(array("error" => $error_text));
	exit();
}

function read_world_file($filename){
	$file_data = @file_get_contents($filename);
	if (!empty($file_data)){
		$data = json_decode($file_data,true);
	} else {
		$data = array("world" => null,
			"lastmodify" => array("__ts" => 0),
			"maxlastmodify" => 0);
	}
	return $data;
}

function world_node_update(&$world_node,&$lastmodify,&$update,$ts){
	if (!is_array($world_node) || !is_array($update)){
		$world_node = $update;
		$lastmodify = array("__ts" => $ts);
	} else {
		if (!is_array($lastmodify)){
			$lastmodify = array();
		}
		// If we have the __new directive, clear out the node
		if (array_key_exists("__new",$update)){
			$world_node = array();
			$lastmodify = array("__ts" => $ts);
		}
		foreach($update as $key => &$value){
			if ($key == "__new") continue; // Don't copy __new derective
			if (!array_key_exists($key,$world_node)){
				$world_node[$key] = $value;
				$lastmodify[$key] = array("__ts" => $ts);
			} else {
				world_node_update($world_node[$key],$lastmodify[$key],$value,$ts);
			}
		}
		unset($value); // Make sure following lines don't change the last element in the array
	}
}

?>