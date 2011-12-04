<?php

/**
 * AJAX service to save and manipulate the game world
 *
 * The world is a single world node.  A world node has:
 *  - A value: an int, string, or array of world nodes
 *  - An assignment stamp: when it was last directly assigned to (or new)
 *  - A max child assignment stamp: when it or its children were updated
 */
$filename = sys_get_temp_dir() . DIRECTORY_SEPARATOR . "bgaworld.json";
$action = isset($_REQUEST["action"]) ? $_REQUEST["action"] : "read";
$max_wait_time = 20; // Max time we'll wait for an update
$wait_increment = 0.1; // wait in increments of 50th of a second

if ($action === "read") {
	// TODO: Move last_modify to separate file
	$last_modify = isset($_REQUEST["last_modify"]) ? $_REQUEST["last_modify"] : "-1";
	$mtime = get_world_mtime($filename);
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
		exit_json_error("Unable to open $filename");
	}
	echo json_encode(array('success' => 'true'));
	exit();
} else if (($action === "create") || ($action === "delete")) {
	// Read and update create a world if not there so just delete it
	@unlink($filename);
	echo json_encode(array('success' => 'true'));
	exit();
} else {
	exit_json_error("Unknown action");
	exit();
}


function get_world_mtime($filename){
	return (filemtime($filename));
}

function &read_world($filename) {
	$file = @fopen($filename, "r");
	if ($file) {
		flock($file, LOCK_SH);
	}
	$world = read_world_file($filename);
	if ($file) {
		flock($file, LOCK_UN);
		fclose($file);
	}
	return ($world);
}

function update_world($filename, &$update){
	// Lock and load the world :)
	$file = @fopen($filename, "c+");
	if (!$file) {
		return (0);
	}
	flock($file, LOCK_EX);
	$world = read_world_file($filename);
	world_node_update($world, $update, $world["max_assigned"] + 1);
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

function read_world_file($filename) {
	$file_data = @file_get_contents($filename);
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