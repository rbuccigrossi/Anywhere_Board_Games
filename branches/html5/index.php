<?php
require_once("world.php");

$test = array ( "a" => 
				array ( "x" => 2,
						"y" => 23,
						"image" => "test.png"),
				"b" =>
				array ( "x" => 3.4,
						"y" => 1.2,
						"image" => "testb.png"));

print"\n\n";
print_r ($test);
print"<P>\n\n";
$j =  json_encode($test);
print $j;
print "<P>\n\n";
$jd = json_decode($j,true);
print_r($jd);
print "<P>\n\n";

?>