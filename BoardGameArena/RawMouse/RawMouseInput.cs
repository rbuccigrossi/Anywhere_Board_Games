using System;
using System.Runtime.InteropServices;
using System.Collections;
using System.Text;

namespace RawMouseInputSystem {

    public class RawMouseEventArgs : EventArgs {
        public int mouse;
        public int x;
        public int y;
        public int z;
        public RawMouseEventArgs(int mouse, int x, int y, int z)
        {
            this.mouse = mouse;
            this.x = x;
            this.y = y;
            this.z = z;
        }
    }

    public delegate void RawMouseMoveEventHandler(object sender, RawMouseEventArgs e);

    public class RawMouseButtonEventArgs : EventArgs
    {
        public int mouse;
        public int button;
        public RawMouseButtonEventArgs(int mouse, int button)
        {
            this.mouse = mouse;
            this.button = button;
        }
    }

    public delegate void RawMouseButtonDownEventHandler(object sender, RawMouseButtonEventArgs e);
    public delegate void RawMouseButtonUpEventHandler(object sender, RawMouseButtonEventArgs e);

	/// <summary>
	/// Handles raw mouse input. Ignores the system mouse (handle == 0) and the RDP mouse. This uses
	/// the same means to identify the RDP mouse as raw_mouse.c, and those caveats apply. 
	/// </summary>
	public class RawMouseInput : RawInput{

		private ArrayList _mice;

        public event RawMouseMoveEventHandler RawMouseMoved;
        public event RawMouseButtonDownEventHandler RawMouseButtonDown;
        public event RawMouseButtonUpEventHandler RawMouseButtonUp;


		public RawMouseInput() : base() {
			GetRawInputMice();
		}

		/// <summary>
		/// Gets all the raw mice and initializes the Mice property.
		/// </summary>
		public void GetRawInputMice() {
			_mice = new ArrayList();

			foreach(RAWINPUTDEVICELIST d in Devices) {
				//skip everything but mice.
				if(d.dwType != RIM_TYPEMOUSE) {
					continue;
				}

				//Get length of name.
				Int32 pcbSize = 0;
				GetRawInputDeviceInfo(d.hDevice, RIDI_DEVICENAME, IntPtr.Zero, ref pcbSize);

				//Get name
				StringBuilder sb = new StringBuilder();
				GetRawInputDeviceInfo(d.hDevice, RIDI_DEVICENAME, sb, ref pcbSize);
				
				//skip windows terminal (rdp?) mouse
				if(sb.ToString().IndexOf(@"\Root#RDP_MOU#0000#") < 0) {
					//Get size of RID_DEVICE_INFO struct
					GetRawInputDeviceInfo(d.hDevice, RIDI_DEVICEINFO, IntPtr.Zero, ref pcbSize);

					//Get the struct.
					RID_DEVICE_INFO mouseInfo = new RID_DEVICE_INFO();
					//Set cbSize as per docs on GetRawInputDeviceInfo
					mouseInfo.cbSize = (uint)Marshal.SizeOf(typeof(RID_DEVICE_INFO));
					GetRawInputDeviceInfo(d.hDevice, RIDI_DEVICEINFO, ref mouseInfo, ref pcbSize);

					//Create our state container
					RawMouse mouse = new RawMouse(d.hDevice, (int)mouseInfo.mouse.dwNumberOfButtons, sb.ToString(), _mice.Count);
                    _mice.Add(mouse);
				}
			}
            // Make sure we have at least one
            if (_mice.Count == 0)
            {
                RawMouse mouse = new RawMouse(System.IntPtr.Zero, 3, "holder", _mice.Count);
                _mice.Add(mouse);
            }
		}

		/// <summary>
		/// Registers the application to receive WM_INPUT messages for mice.
		/// </summary>
		/// <param name="hwndTarget">The application's hwnd.</param>
		public void RegisterForWM_INPUT(IntPtr hwndTarget) {
			RAWINPUTDEVICE rid = new RAWINPUTDEVICE();
			rid.usUsagePage = 0x01;
			rid.usUsage = 0x02; //mouse
			rid.dwFlags = 0;// RIDEV_NOLEGACY;   // adds HID mouse and also ignores legacy mouse messages
			rid.hwndTarget = (uint)hwndTarget.ToInt32(); 

			//supposed to be a pointer to an array, we're only registering one device though.
			IntPtr pRawInputDeviceArray = Marshal.AllocHGlobal(Marshal.SizeOf(typeof(RAWINPUTDEVICE)));
			Marshal.StructureToPtr(rid, pRawInputDeviceArray, true);
            uint retval = RegisterRawInputDevices(pRawInputDeviceArray, 1, (uint)Marshal.SizeOf(typeof(RAWINPUTDEVICE)));
			Marshal.FreeHGlobal(pRawInputDeviceArray);
		}

		/// <summary>
		/// Updates the status of the mouse given a raw mouse handle.
		/// </summary>
		/// <param name="dHandle"></param>
		public void UpdateRawMouse(IntPtr dHandle) {
			Int32 hRawInput = dHandle.ToInt32();
			Int32 pcbSize = 0;

			//get the size of the raw input struct
			Int32 retval = GetRawInputData(hRawInput, RawInput.RID_INPUT, IntPtr.Zero, ref pcbSize, Marshal.SizeOf(typeof(RAWINPUTHEADER)));

			//get the RAWINPUT structure.
			RAWINPUT ri = new RAWINPUT();
			retval = GetRawInputData(hRawInput, RawInput.RID_INPUT, ref ri, ref pcbSize,Marshal.SizeOf(typeof(RAWINPUTHEADER)));

            int i=0;
			foreach(RawMouse mouse in Mice) {
				if(mouse.Handle.ToInt32() == (Int32)ri.header.hDevice) {
                    bool move_event = false;

                    //relative mouse
					mouse.rawX += ri.mouse.lLastX;
					mouse.rawY += ri.mouse.lLastY;
                    if ((ri.mouse.lLastX != 0) || (ri.mouse.lLastY != 0)) move_event = true;

                    //mouse wheel
                    if ((ri.mouse.usButtonFlags & RI_MOUSE_WHEEL) > 0)
                    {
                        if ((short)ri.mouse.usButtonData > 0)
                        {
                            mouse.rawZ++;
                            move_event = true;
                        }
                        if ((short)ri.mouse.usButtonData < 0)
                        {
                            mouse.rawZ--;
                            move_event = true;
                        }
                    }

                    if (move_event && (RawMouseMoved != null))
                    {
                        RawMouseMoved(mouse, new RawMouseEventArgs(i, mouse.X, mouse.Y, mouse.Z));
                    }

					//mouse buttons
                    if (((ri.mouse.usButtonFlags & RI_MOUSE_BUTTON_1_DOWN) > 0) && !(mouse.Buttons[0]))
                    {
                        mouse.Buttons[0] = true;
                        if (RawMouseButtonDown != null)
                        {
                            RawMouseButtonDown(this,new RawMouseButtonEventArgs(i,0));
                        }
                    }
                    if (((ri.mouse.usButtonFlags & RI_MOUSE_BUTTON_3_DOWN) > 0) && !(mouse.Buttons[1]))
                    {
                        mouse.Buttons[1] = true;
                        if (RawMouseButtonDown != null)
                        {
                            RawMouseButtonDown(this,new RawMouseButtonEventArgs(i,1));
                        }
                    }
                    if (((ri.mouse.usButtonFlags & RI_MOUSE_BUTTON_2_DOWN) > 0) && !(mouse.Buttons[2]))
                    {
                        mouse.Buttons[2] = true;
                        if (RawMouseButtonDown != null)
                        {
                            RawMouseButtonDown(this,new RawMouseButtonEventArgs(i,2));
                        }
                    }
                    if (((ri.mouse.usButtonFlags & RI_MOUSE_BUTTON_1_UP) > 0) && (mouse.Buttons[0]))
                    {
                        mouse.Buttons[0] = false;
                        if (RawMouseButtonUp != null)
                        {
                            RawMouseButtonUp(this, new RawMouseButtonEventArgs(i, 0));
                        }
                    }
                    if (((ri.mouse.usButtonFlags & RI_MOUSE_BUTTON_3_UP) > 0) && (mouse.Buttons[1]))
                    {
                        mouse.Buttons[1] = false;
                        if (RawMouseButtonUp != null)
                        {
                            RawMouseButtonUp(this, new RawMouseButtonEventArgs(i, 1));
                        }
                    }
                    if (((ri.mouse.usButtonFlags & RI_MOUSE_BUTTON_2_UP) > 0) && (mouse.Buttons[2]))
                    {
                        mouse.Buttons[2] = false;
                        if (RawMouseButtonUp != null)
                        {
                            RawMouseButtonUp(this, new RawMouseButtonEventArgs(i, 2));
                        }
                    }
				}
                i++;
            }
		}

		/// <summary>
		/// Returns an ArrayList of RawMouse objects. The system mouse is not included.
		/// </summary>
		public ArrayList Mice {
			get {
				return _mice;
			}
		}
	}
}
