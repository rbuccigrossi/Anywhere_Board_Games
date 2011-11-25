<?php
/* This PHP class allows the definition and manipulation of the game world

The world is simply a world element which is recursively defined.  A world
element is either:
 - A number (real or integer)
 - A string
 - An associative array of world elements
 - null

In addition, each element of the world has a last modification stamp.  The stamp
is a monotonically increasing number (so the stamp for newer updates are greater
than older updates), with a starting stamp of 0.

Currently the last modification stamps are maintained in a separate array than
the latest world data. */


?>