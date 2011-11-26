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

if ($action == "read") {
	$last_modify = isset($_REQUEST["last_modify"]) ? $_REQUEST["last_modify"] : "-1";
	$file = @fopen($filename, "r");
	if ($file) {
		flock($file, LOCK_SH);
	}
	$world = read_world_file($filename);
	if ($file) {
		flock($file, LOCK_UN);
		fclose($file);
	}
	$update = &get_world_update($world, $last_modify);
	echo "\n\n";
	echo json_encode($update);
	echo "<P>";
	echo json_encode($world);
	exit();
} else if ($action == "update") {
	if (!isset($_REQUEST["update"])) {
		exit_json_error("Must set update value");
	}
	$update = json_decode(stripslashes($_REQUEST["update"]), true);
	if (json_last_error() != JSON_ERROR_NONE) {
		exit_json_error("Error parsing update value");
	}
	// Lock and load the world :)
	$file = @fopen($filename, "c+");
	if (!$file) {
		exit_json_error("Unable to open $filename");
	}
	flock($file, LOCK_EX);
	$world = read_world_file($filename);
	world_node_update($world, $update, $world["max_assigned"] + 1);
	ftruncate($file, 0);
	fwrite($file, json_encode($world));
	flock($file, LOCK_UN);
	echo "\n\n Update = ";
	print_r($update);
	echo "<P>\n\n";
	print_r($world);
	exit();
} else {
	exit_json_error("Unknown action");
}

function exit_json_error($error_text) {
	echo "\n\n";
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
			if ($key == "__new") {
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

function &get_world_update(&$world_node, $ts) {
	if (!is_array($world_node["value"])){
		$update = $world_node["value"];
	} else {
		$update = array();
		// If newly assigned, send the __new directive
		if ($world_node["assigned"] >= $ts) {
			$update["__new"] = 1;
		}
		$children = $world_node["value"];
		foreach ($children as $key => $child){
			if ($child["max_assigned"] >= $ts) {
				$update[$key] = &get_world_update($child,$ts);
			}
		}
	}
	return ($update);
}

?>