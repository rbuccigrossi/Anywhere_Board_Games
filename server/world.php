<?php

/**
 * AJAX service to save and manipulate the game world
 *
 * The world is a single world node.  A world node has:
 *  - A value: an int, string, or array of world nodes
 *  - An assignment stamp: when it was last directly assigned to (or new)
 *  - A max child assignment stamp: when it or its children were updated
 */
$filename = getcwd() . DIRECTORY_SEPARATOR . "data" . DIRECTORY_SEPARATOR . "bgaworld.json";
$action = isset($_REQUEST["action"]) ? $_REQUEST["action"] : "read";
$max_wait_time = 5; // Max time we'll wait for an update
$wait_increment = 0.1; // wait in increments of 50th of a second

if ($action === "read") {
	// TODO: LOW - Move last_modify to separate file
	$last_modify = isset($_REQUEST["last_modify"]) ? $_REQUEST["last_modify"] : "-1";
	$world = &read_world($filename);
	// Check to see if we need to wait for an update
	if ($last_modify >= $world["max_assigned"]){
		$last_modify = $world["max_assigned"];
		// Semi-busy wait, that times out after 20 seconds
		$wait_time = 0;
		do {
			usleep($wait_increment * 1000000); // Wait 0.05 seconds
			$wait_time += $wait_increment;
			$world = &read_world($filename);
		} while (($last_modify >= $world["max_assigned"]) && ($wait_time < $max_wait_time));
	}
	$update = &get_world_update($world, $last_modify);
	echo "\n\n";
	echo json_encode(array("update" => $update,
		"last_modify" => $world["max_assigned"]));
	exit();
} else if ($action === "update") {
	if (!isset($_REQUEST["update"])) {
		exit_json_error("Must set update value");
	}
	$update = json_decode(stripslashes($_REQUEST["update"]), true);
	if (json_last_error() != JSON_ERROR_NONE) {
		exit_json_error("Error parsing update value");
	}
	if (!update_world($filename,$update)){
		exit_json_error("Unable to open $filename . Please make sure it is writable by the web server.");
	}
	echo json_encode(array('success' => 'true'));
	exit();
} else if (($action === "create") || ($action === "delete")) {
	// Read and update create a world if not there so just delete it
	@unlink($filename);
	echo json_encode(array('success' => 'true'));
	exit();
} else if ($action === "download") {
	// Download the whole JSON file (but use binary and give it an abg extension for now)
	header('Content-type: application/octet-stream');
	header('Content-Disposition: attachment; filename="board_game.abg"');
	$world = &read_world($filename);
	$update = &get_world_update($world, 0);
	remove_null_entries($update);
	echo json_encode($update);
	exit();
} else if ($action === "upload") {
	$new_data = "";
	if ($_FILES['file']['tmp_name']){
		$new_data = read_world($_FILES['file']['tmp_name']);
	} else {
		$file_data = @file_get_contents($_REQUEST["url"]);
		if ($file_data){
			$new_data = json_decode($file_data, true);
		}
	}
	if ($new_data){
		if (!$_REQUEST["clear_world"]){
			// If we aren't going to clear the world, then merge the contents of the new data to the world
			$new_data["__new"] = 1;
			$new_data = append_to_world($filename,$new_data);
		}
		// Now that we've loaded the data, now blast away the current world
		if (!update_world($filename,$new_data)){
			echo "\n\nError updating world.  Please make sure $filename is writable by the web server.";
		}
	} else {
		echo "\n\nError parsing uploaded file";
	}
	exit();
} else {
	exit_json_error("Unknown action");
	exit();
}

// Here we don't merge elements, but append new arrays to old ones
function &append_to_world($filename,$update){
	// Extract an object form of the current world
	$world = &read_world($filename);
	$world = &get_world_update($world, 0);
	remove_null_entries($world);
	if (!$world){
		$world = array();
	}
	// Go through the updates and merge any arrays
	foreach ($update as $key => $child){
		if (is_array($child)){
			if (array_key_exists($key,$world) && is_array($world[$key])){
				$world[$key] = array_merge($world[$key],$child);
			} else {
				$world[$key] = $child;
			}
		}
	}
	return ($world);
}


function get_world_mtime($filename){
	return (filemtime($filename));
}

function &read_world($filename) {
	$file = @fopen($filename, "r");
	if ($file) {
		flock($file, LOCK_SH);
	}
	$world = read_world_file($file);
	if ($file) {
		flock($file, LOCK_UN);
		fclose($file);
	}
	return ($world);
}

function is_not_null($var){
	return (!is_null($var));
}

function remove_null_entries(&$update){
	if (is_array($update)){
		$update = array_filter($update, is_not_null);
		foreach ($update as $key => &$value){
			remove_null_entries($value);
		}
		// Reindex numeric arrays
		if (count(array_filter(array_keys($update),'is_string')) == 0){
			$update = array_values($update);
		}
	}
}

function update_world($filename, &$update){
	// Lock and load the world :)
	$file = @fopen($filename, "c+");
	if (!$file) {
		return (0);
	}
	if (!is_writable($filename)){
		return(0);
	}
	flock($file, LOCK_EX);
	$world = read_world_file($file);
	world_node_update($world, $update, $world["max_assigned"] + 1);
	rewind($file);
	ftruncate($file, 0);
	fwrite($file, json_encode($world));
	flock($file, LOCK_UN);
	fclose($file);
	return (1);
}

function exit_json_error($error_text) {
	echo json_encode(array("error" => $error_text));
	exit();
}

function assign_world_node(&$world_node, $value, $assign_stamp) {
	$world_node["value"] = $value;
	$world_node["assigned"] = $assign_stamp;
	$world_node["max_assigned"] = $assign_stamp;
}

function read_world_file($file) {
	rewind($file);
	$file_data = @stream_get_contents($file);
	if (!empty($file_data)) {
		$world = json_decode($file_data, true);
	} else {
		$world = array();
		assign_world_node($world, null, 0);
	}
	return $world;
}

function world_node_update(&$world_node, &$update, $ts) {
	if (!is_array($update)) {
		assign_world_node($world_node, $update, $ts);
	} else {
		// If we don't have children yet or
		// received the __new directive, create a new array for the value
		if (!is_array($world_node["value"]) ||
				array_key_exists("__new", $update)) {
			assign_world_node($world_node, array(), $ts);
		}
		// One of our children is being updated so update our max_assigned
		$world_node["max_assigned"] = $ts;
		$children = &$world_node["value"];
		foreach ($update as $key => &$value) {
			if ($key === "__new") {
				continue; // Don't copy __new directive
			}
			if (!array_key_exists($key, $children)) {
				$children[$key] = array();
				assign_world_node($children[$key],null,$ts);
			}
			world_node_update($children[$key], $value, $ts);
		}
		unset($value); // Make sure following lines don't change the last element in the array
	}
}

function &get_world_update(&$world_node, $ts, $new = 0) {
	if (!is_array($world_node["value"])){
		$update = $world_node["value"];
	} else {
		$update = array();
		// If newly assigned (and parent not new), send the __new directive
		if (($world_node["assigned"] > $ts) && !$new) {
			$update["__new"] = 1;
			$new = 1;
		}
		$children = $world_node["value"];
		foreach ($children as $key => $child){
			if ($child["max_assigned"] > $ts) {
				$update[$key] = &get_world_update($child,$ts,$new);
			}
		}
	}
	return ($update);
}

?>
