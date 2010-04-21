using System;
using System.Windows;
using System.Windows.Shapes;
using System.Collections.Generic;
using BoardGameArena;

namespace RawMouseInputSystem
{
	/// <summary>
	/// Maintains state of a given mouse.
	/// </summary>
	public class RawMouse {
		private IntPtr _handle;
		private int _x;
		private int _y;
		private int _z;
		private bool[] _buttons;
		private string _name;

        public const int PLAYER_BOTTOM = 0;
        public const int PLAYER_RIGHT = 1;
        public const int PLAYER_TOP = 2;
        public const int PLAYER_LEFT = 3;

        // Records the orientation of the player who is using this mouse
        private int _player_orientation;

        // All of the pieces used in the current drag, rotate, or menu operation
        public List<GamePieceControl> selectedPieces = new List<GamePieceControl>();

        // Members to facilitate multi-select
        public bool inMultiSelect = false;
        public Point multiSelectStart = new Point();
        public Rectangle multiSelectRectangle = null;

        // Members to facilitate dragging
        public bool inDrag = false;
        public GamePieceControl dragPiece;
        public Point dragPointOnPiece = new Point();

        // Members to facilitate rotation
        public bool inRotate = false;
        public Vector rotatePieceOrigin = new Vector();
        public double rotateStartAngle = 0;

        // Members to facilitate zoom (only effects first selected piece)
        public bool inZoom = false;
        public object zoomPiece;

        // Members to facilitate context menu
        public bool inMenu = false;
        public object menuItemIn = null;
        public object rootMenu;

        // Simplify finding index when needed
        public int mouse_index = 0;

		public RawMouse(IntPtr handle, int numButtons, string name, int idx) {
			_handle = handle;
			_buttons = new bool[numButtons];
			_name = name;
            _x = 0;
            _y = 0;
            _z = 0;
            _player_orientation = PLAYER_BOTTOM;
            mouse_index = idx;
		}

        public int PlayerOrientation
        {
            get
            {
                return _player_orientation;
            }
            set
            {
                // Save current position
                int tempX = X;
                int tempY = Y;
                _player_orientation = value;
                // Now set position with translations
                X = tempX;
                Y = tempY;
            }
        }

        /// <summary>
        /// Sets X with player position translation
        /// </summary>
		public int X {
			get {
                if (_player_orientation == PLAYER_BOTTOM)
                {
                    return (_x);
                }
                else if (_player_orientation == PLAYER_RIGHT)
                {
                    return (_y);
                }
                else if (_player_orientation == PLAYER_TOP)
                {
                    return (-_x);
                }
                else // _player_orientation == PLAYER_LEFT
                {
                    return (-_y);
                }
			}
			set {
                if (_player_orientation == PLAYER_BOTTOM)
                {
                    _x = value;
                }
                else if (_player_orientation == PLAYER_RIGHT)
                {
                    _y = value;
                }
                else if (_player_orientation == PLAYER_TOP)
                {
                    _x = -value;
                }
                else // _player_orientation == PLAYER_LEFT
                {
                    _y = -value;
                }
			}
		}

        /// <summary>
        /// Sets Y with player position translation
        /// </summary>
        public int Y
        {
            get {
                if (_player_orientation == PLAYER_BOTTOM)
                {
                    return (_y);
                }
                else if (_player_orientation == PLAYER_RIGHT)
                {
                    return (-_x);
                }
                else if (_player_orientation == PLAYER_TOP)
                {
                    return (-_y);
                }
                else // _player_orientation == PLAYER_LEFT
                {
                    return (_x);
                }
			}
            set
            {
                if (_player_orientation == PLAYER_BOTTOM)
                {
                    _y = value;
                }
                else if (_player_orientation == PLAYER_RIGHT)
                {
                    _x = -value;
                }
                else if (_player_orientation == PLAYER_TOP)
                {
                    _y = -value;
                }
                else // _player_orientation == PLAYER_LEFT
                {
                    _x = value;
                }
            }
		}

		public int Z {
			get {
				return _z;
			}

			set {
				_z = value;
			}
		}

        public int rawX
        {
            get
            {
                return _x;
            }

            set
            {
                _x = value;
            }
        }

        public int rawY
        {
            get
            {
                return _y;
            }

            set
            {
                _y = value;
            }
        }

        public int rawZ
        {
            get
            {
                return _z;
            }

            set
            {
                _z = value;
            }
        }

        public int YDelta
        {
			get {
				int y = _y;
				_y = 0;
				return y;
			}
		}

		public int XDelta {
			get {
				int x = _x;
				_x = 0;
				return x;
			}
		}

		public int ZDelta {
			get {
				int z = _z;
				_z = 0;
				return z;
			}
		}

		public IntPtr Handle {
			get {
				return _handle;
			}
		}

		public bool[] Buttons {
			get {
				return _buttons;
			}
		}

		public string Name {
			get {
				return _name;
			}
		}



	}
			
}
