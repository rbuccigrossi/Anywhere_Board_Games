Anywhere Board Games Release Notes
----------------------------------

NEXT RELEASE
 - Fixed issue with piece highlight on standard Android Browser

3/13/2012 (abg_v0.120313.exe and abg_v0.120313.tar.gz)
 - Work to create a consistent feel and better stability
   on touch devices
 - Touch-drag events now initiate multi-select (just like
   mouse events)
 - Touch-based pan/zoom is now done by bringing up a pop-up
   menu and then using touch-drag with the pop-up menu open
 - Pieces that are stacked are now moved to the location of
   the lowest piece, which makes manipulating decks a bit easier
 - Conducted testing on Google Chrome beta for Android (works
   well!)  So we suggest Google Chrome, Safari (iOS), and 
   Firefox for use with ABG.

3/09/2012 (abg_v0.120309.exe and abg_v0.120309.tar.gz)
 - Added HTML form elements to Agricola Express scoreboard
   so players can score their card completely in the
   browser.

3/07/2012 (abg_v0.120307.exe and abg_v0.120307.tar.gz)
 - Added the game "Agricola Express"
 - Added 3-D rendered dice with POV-Ray source code
 - Custom HTML can be attached to pieces (for links
   and initial scripting)

3/05/2012 (abg_v0.120305.exe and abg_v0.120305.tar.gz)
 - Added Go, Chess, and Reversi (Othello) games (more examples of 
   board and card games you can create yourself)

2/29/2012 (abg_v0.120229.exe and abg_v0.120229.tar.gz)
 - Added a Words (with friends or whomever) game!
 - "Open Board" now provides a select list of built-in boards
   from which to choose
 - You can now open a board from a URL (to promote sharing of boards)
 - Added board pieces including dice, a flipping coin, and player
   shields
 - Windows installer now uses Apache (which provides much faster
   update performance with multiple clients)

2/19/2012 (abg_v0.120219.exe and abg_v0.120219.tar.gz)
 - New Windows installer with Mongoose and PHP!
 - Fixed an issue with file locking on Windows
 - Reduced the server timeout for Mongoose to avoid client errors
 - New Windows installer with Mongoose and PHP!
 - Fixed an issue with file locking on Windows
 - Reduced the server timeout for Mongoose to avoid client errors

2/13/2012 (abg_v0.120213.tar.gz)
 - Added intro page for first-time installation
 - Moved the data file into server/data so that multiple installations
   can be done on a single web server
 - Improved error reporting for server-side errors

2/11/2012 (abg_v0.120211.tar.gz)
 - Added rolling animation
 - Improved menu for multi-sided pieces (to make rolling easier)
 - Fixed viewing dietails for pictures with spaces in their
   filenames

2/8/2012 (abg_v0.120208.tar.gz)
 - Moved back to local jquery and jquery-ui to allow offline play
 - Allows pieces to be resized (you can specify a
   width in pixels for the piece in the edit box)
 - Users can now select "View Detail" for a piece (to make a piece
   fill up the screen so that you can read text or other details 
   on the piece)

1/18/2012 (abg_v0.120118.tar.gz)
 - Added checkers and deck images and "abg" files that
   can be used with "Upload Board" to kick-off a game
 - Fixed the ABG icon for favicon and Apple icon usage
 - Cleans up the board when downloaded (removing null entries)
 - Allows users to click on the scrollbar in Chrome

1/1/2012 (abg_v0.120101.tar.gz)
 - Multi-select rotate and shuffle work
 - You can desginate pieces to be "Player Hand Shields", which moves them
   up to the top to hide hands.  A player then can move them locally to the
   back so they can view their hand.
 - Pieces can be edited

12/29/2011 (abg_v0.111229.tar.gz)
 - Got first multi-select methods working (move, lock, and unlock)
 - You can initiate multi-select with mouse through click/drag on the background or 
   a locked piece
 - You can initiate multi-select with touch through a menu on the background or 
   a locked piece

12/25/2011 (abg_v0.111225.tar.gz)
 - Now pieces can have multiple sides!
 - Added flip (for > 1 side) and roll (for > 2 sides)
 - New and cloned pieces are placed on top

12/24/2011 (abg_v0.111224.tar.gz)
 - Brings a piece to front on drag
 - Added ability "Send to Back" a piece

12/21/2011 (abg_v0.111220.tar.gz)
 - Now supports loading and saving board state
 - Defaults to using Google provided jQuery and jQuery-UI (to avoid Chrome log errors)

12/20/2011 (abg_v0.111220.tar.gz)
 - Initial release of PHP5 version
 - Supports single sided pieces, moving and rotating
 - Supports HTML5 browsers and touch events on iOS and Android
