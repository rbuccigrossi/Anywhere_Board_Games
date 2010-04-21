using System;
using System.IO;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using System.Windows.Shapes;
using System.Runtime.InteropServices;
using System.Windows.Interop;
using RawMouseInputSystem;
using System.ComponentModel;
using System.Windows.Media.Effects;
using System.Diagnostics;

namespace BoardGameArena
{

    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window, INotifyPropertyChanged
    {
        private RawMouseInput raw_mouse_input = null;

        private List<Image> mouse_pointers = new List<Image>();

        public event PropertyChangedEventHandler PropertyChanged;

        public Random random = new Random();

        private void NotifyPropertyChanged(String info)
        {
            if (PropertyChanged != null)
            {
                PropertyChanged(this, new PropertyChangedEventArgs(info));
            }
        }

        private bool _use_multi_mouse = false;

        public bool use_multi_mouse
        {
            get
            {
                return (_use_multi_mouse);
            }
            set
            {
                if (_use_multi_mouse != value)
                {
                    _use_multi_mouse = value;
                    if (_use_multi_mouse)
                    {
                        // When we are in multi mouse mode, make the current mouse disappear and
                        // Capture mouse events onto the menu (so it can't accidentally move pieces)
                        // The trick is that we'll keep the mouse over the playing field, so it can't do anything
                        Mouse.OverrideCursor = Cursors.None;
                        Mouse.Capture(MainMenu, CaptureMode.Element);
                    }
                    else
                    {
                        Mouse.OverrideCursor = null;
                        Mouse.Capture(null);
                    }
                    updateMultiMouseVisibility();
                    NotifyPropertyChanged("use_multi_mouse");
                }
            }
        }

        /// <summary>
        /// Initializes XAML, addes mouse event handlers
        /// </summary>
        public MainWindow()
        {
            InitializeComponent();
            this.MousePanel.MouseMove += new MouseEventHandler(RealBoardMouseMove);
            this.MousePanel.MouseUp += new MouseButtonEventHandler(RealBoardMouseButtonUp);
            this.MousePanel.MouseDown += new MouseButtonEventHandler(RealBoardMouseButtonDown);
            this.MousePanel.MouseWheel += new MouseWheelEventHandler(RealBoardMouseWheel);

            raw_mouse_input = new RawMouseInput();
            raw_mouse_input.RawMouseMoved += new RawMouseMoveEventHandler(RawMouseMoved);
            raw_mouse_input.RawMouseButtonDown += new RawMouseButtonDownEventHandler(RawMouseButtonDown);
            raw_mouse_input.RawMouseButtonUp += new RawMouseButtonUpEventHandler(RawMouseButtonUp);

            this.AllowDrop = true;
            this.Drop += new DragEventHandler(DropEventOccurred);

        }

        void DropEventOccurred(object sender, DragEventArgs e)
        {
            if (!e.Data.GetDataPresent(DataFormats.FileDrop)){
                return;
            }
            string [] files = (string[])e.Data.GetData(DataFormats.FileDrop);
            try
            {
                Piece p = new Piece();
                foreach (string filename in files)
                {
                    string f = System.IO.Path.GetFileName(filename);
                    // Attempt to load the file into a bitmap (to verify it is valid)
                    BitmapImage myBitmapImage = new BitmapImage();

                    myBitmapImage.BeginInit();
                    myBitmapImage.StreamSource = new FileStream(filename, FileMode.Open, FileAccess.Read);
                    myBitmapImage.EndInit();

                    FileStream fs = new FileStream(filename, FileMode.Open, FileAccess.Read);
                    byte[] image_data = new byte[fs.Length];
                    fs.Read(image_data, 0, (int)fs.Length);
                    PieceImage pi = new PieceImage(f, image_data);
                    if (World.image_library.ItemFromKey(pi.Key) != null)
                    {
                        pi = World.image_library.ItemFromKey(pi.Key);
                    }
                    else
                    {
                        World.image_library.Add(pi);
                    }
                    p.Sides.Add(pi);
                    if (p.Name == null)
                    {
                        p.Name = f;
                    }
                }
                World.piece_library.Add(p);
                OnBoardPiece obp = new OnBoardPiece(p);
                World.on_board_pieces.Add(obp);
                GamePieceControl gpc = AddControlForPiece(obp);
                gpc.Location = e.GetPosition(BoardPanel);
            }
            catch (Exception ex){
                MessageBox.Show("Error creating piece: " + ex.Message);
            }
        }

        /* The following draws the pointers for the raw mice, and
         * translates raw mouse move events to mouse move events
         * for our game board */

        void RawMouseButtonUp(object sender, RawMouseButtonEventArgs e)
        {
            if ((use_multi_mouse) && (e.mouse < raw_mouse_input.Mice.Count) && (e.mouse < mouse_pointers.Count))
            {
                MouseButtonUpOnBoard(e.mouse, e.button);
            }
        }

        void RawMouseButtonDown(object sender, RawMouseButtonEventArgs e)
        {
            if ((use_multi_mouse) && (e.mouse < raw_mouse_input.Mice.Count) && (e.mouse < mouse_pointers.Count))
            {
                MouseButtonDownOnBoard(e.mouse, e.button);
            }
        }

        void RawMouseMoved(object sender, RawMouseEventArgs e)
        {
            if ((use_multi_mouse) && (e.mouse < raw_mouse_input.Mice.Count) && (e.mouse < mouse_pointers.Count))
            {
                // Limit mice to window:
                RawMouse mouse = (RawMouse)raw_mouse_input.Mice[e.mouse];
                if (mouse.X < 0) mouse.X = 0;
                if (mouse.Y < 0) mouse.Y = 0;
                if (mouse.X > MousePanel.ActualWidth) mouse.X = (int)MousePanel.ActualWidth;
                if (mouse.Y > MousePanel.ActualHeight) mouse.Y = (int)MousePanel.ActualHeight;
                // Draw mouse
                mouse_pointers[e.mouse].Margin = new Thickness(mouse.X, mouse.Y, 0, 0);
                MouseMoveOnBoard(e.mouse);
            }
        }

        /// <summary>
        /// When the window is loaded, we need to configure the raw mouse handler
        /// and add the low level hook
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void Window_Loaded(object sender, EventArgs e)
        {
            IntPtr handle = (new System.Windows.Interop.WindowInteropHelper(this)).Handle;
            HwndSource src = HwndSource.FromHwnd(handle);
            raw_mouse_input.RegisterForWM_INPUT(handle);
            src.AddHook(new HwndSourceHook(WndProc));
            // Add the mouse pointers to a list
            mouse_pointers.Add(MousePointer01);
            mouse_pointers.Add(MousePointer02);
            mouse_pointers.Add(MousePointer03);
            mouse_pointers.Add(MousePointer04);
            mouse_pointers.Add(MousePointer05);
            mouse_pointers.Add(MousePointer06);
            mouse_pointers.Add(MousePointer07);
            mouse_pointers.Add(MousePointer08);
            mouse_pointers.Add(MousePointer09);
            mouse_pointers.Add(MousePointer10);
            mouse_pointers.Add(MousePointer11);
            mouse_pointers.Add(MousePointer12);
            mouse_pointers.Add(MousePointer13);
            mouse_pointers.Add(MousePointer14);
            mouse_pointers.Add(MousePointer15);
            mouse_pointers.Add(MousePointer16);
        }

        /// <summary>
        /// Constant representing a low level input event
        /// </summary>
        private const int WM_INPUT = 0x00FF;
        private const int WM_DEVICECHANGE = 0x0219;                 // device change event 
        private const int DBT_DEVICEARRIVAL = 0x8000;               // system detected a new device 
        private const int DBT_DEVICEREMOVEPENDING = 0x8003;         // about to remove, still available 
        private const int DBT_DEVICEREMOVECOMPLETE = 0x8004;        // device is gone 
        private const int DBT_DEVTYP_PORT = 0x00000003;             // serial, parallel 

        /// <summary>
        /// Based upon the number of mice plugged in, and if we are using multi mouse,
        /// update the visibility of the multi mouse images
        /// </summary>
        private void updateMultiMouseVisibility()
        {
            for (int i = 0; i < mouse_pointers.Count; i++)
            {
                if ((raw_mouse_input.Mice.Count > i) && use_multi_mouse)
                {
                    mouse_pointers[i].Visibility = Visibility.Visible;
                }
                else
                {
                    mouse_pointers[i].Visibility = Visibility.Hidden;
                }
            }
        }

        /// <summary>
        /// Handles low level input multi-mouse events
        /// </summary>
        /// <param name="hwnd"></param>
        /// <param name="msg"></param>
        /// <param name="wParam"></param>
        /// <param name="lParam"></param>
        /// <param name="handled"></param>
        /// <returns></returns>
        public IntPtr WndProc(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
        {
            switch (msg)
            {
                case WM_INPUT:
                    if ((raw_mouse_input != null) && (use_multi_mouse))
                    {
                        raw_mouse_input.UpdateRawMouse(lParam);
                        // Force the cursor to stay put
                        SetCursorPos(((int)this.Left) + ((int)this.Width / 2), ((int)this.Top) + ((int)this.Height / 2));

                    }
                    break;

                case WM_DEVICECHANGE:
                    // TODO: Update mice without refreshing all existing mice
                    raw_mouse_input.GetRawInputDevices();
                    raw_mouse_input.GetRawInputMice();
                    updateMultiMouseVisibility();
                    break;
            }
            return IntPtr.Zero;
        }

        /// <summary>
        /// Routed event to control a full screen toggle
        /// </summary>
        public static RoutedCommand ToggleFullScreenCommand = new RoutedCommand();
        public static RoutedCommand ToggleMultiMouseCommand = new RoutedCommand();
        public static RoutedCommand ZoomInCommand = new RoutedCommand();
        public static RoutedCommand ZoomOutCommand = new RoutedCommand();
        public static RoutedCommand Zoom100Command = new RoutedCommand();

        /// <summary>
        /// This is a generic CanExecute call that returns true if the sender is 
        /// a control
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void ControlCanExecute(object sender, CanExecuteRoutedEventArgs e)
        {
            Control target = e.Source as Control;

            e.CanExecute = (target != null);
        }

        /// <summary>
        /// Handle application close command
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void CloseExecuted(object sender, ExecutedRoutedEventArgs e)
        {
            // TODO: Offer to save the board if there is a piece on it
            Close();
        }

        /// <summary>
        /// Handle full screen toggle command
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void ToggleFullScreenCommandExecuted(object sender, ExecutedRoutedEventArgs e)
        {
            if (this.WindowStyle == WindowStyle.None)
            {
                this.MainMenu.Visibility = Visibility.Visible;
                this.MousePanel.Margin = new Thickness(0, 22, 0, 0);
                this.WindowState = WindowState.Normal;
                this.WindowStyle = WindowStyle.SingleBorderWindow;
            }
            else
            {
                this.MousePanel.Margin = new Thickness(0, 0, 0, 0);
                this.MainMenu.Visibility = Visibility.Collapsed;
                this.WindowState = WindowState.Maximized;
                this.WindowStyle = WindowStyle.None;
            }
        }


        private void ToggleMultiMouseCommandExecuted(object sender, ExecutedRoutedEventArgs e)
        {
            use_multi_mouse = !use_multi_mouse;
        }

        private void ZoomInCommandExecuted(object sender, ExecutedRoutedEventArgs e)
        {
            this.BoardPanel.Zoom *= 1.1;
        }

        private void ZoomOutCommandExecuted(object sender, ExecutedRoutedEventArgs e)
        {
            this.BoardPanel.Zoom /= 1.1;
        }

        private void Zoom100CommandExecuted(object sender, ExecutedRoutedEventArgs e)
        {
            this.BoardPanel.Zoom = 1.0;
        }

        private GamePieceControl AddControlForPiece(OnBoardPiece obp)
        {
            // Now make a control for the new on board piece
            GamePieceControl game_piece = new GamePieceControl(obp);
            game_piece.IsHitTestVisible = false;
            this.BoardPanel.Children.Add(game_piece);
            return (game_piece);
        }

        /// <summary>
        /// Handles an add piece command
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void AddPieceCommand(object sender, RoutedEventArgs e)
        {
            bool multi_mouse_state = use_multi_mouse;
            // Turn off multi mouse
            use_multi_mouse = false;

            PieceLibrarySelect pls = new PieceLibrarySelect();
            bool? result = pls.ShowDialog();
            int idx = pls.PieceList.SelectedIndex;
            if (result.HasValue && result.Value && (idx >= 0))
            {
                // Create a new on board piece and add it to the World
                OnBoardPiece obp = new OnBoardPiece(World.piece_library[idx]);
                World.on_board_pieces.Add(obp);
                GamePieceControl game_piece = AddControlForPiece(obp);
                // Move piece to the upper left of the board
                game_piece.Location = new Point(game_piece.Source.Width / 2,
                    game_piece.Source.Height / 2);
            }
            // Restore multi mouse
            use_multi_mouse = multi_mouse_state;
        }

        public void RealBoardMouseButtonDown(object sender, MouseButtonEventArgs e)
        {
            if (!use_multi_mouse)
            {
                RawMouse mouse = (RawMouse)raw_mouse_input.Mice[0];
                Point p = (Point)e.GetPosition((IInputElement)MousePanel);
                mouse.X = (int)p.X;
                mouse.Y = (int)p.Y;
                mouse.Buttons[0] = (e.LeftButton == MouseButtonState.Pressed);
                mouse.Buttons[1] = (e.MiddleButton == MouseButtonState.Pressed);
                mouse.Buttons[2] = (e.RightButton == MouseButtonState.Pressed);
                if (e.ChangedButton == MouseButton.Left)
                {
                    MouseButtonDownOnBoard(0, 0);
                }
                if (e.ChangedButton == MouseButton.Middle)
                {
                    MouseButtonDownOnBoard(0, 1);
                }
                if (e.ChangedButton == MouseButton.Right)
                {
                    MouseButtonDownOnBoard(0, 2);
                }
            }
        }

        public void RealBoardMouseMove(object sender, MouseEventArgs e)
        {
            if (!use_multi_mouse)
            {
                RawMouse mouse = (RawMouse)raw_mouse_input.Mice[0];
                Point p = (Point)e.GetPosition((IInputElement)this.MousePanel);
                mouse.X = (int)p.X;
                mouse.Y = (int)p.Y;
                mouse.Buttons[0] = (e.LeftButton == MouseButtonState.Pressed);
                mouse.Buttons[1] = (e.MiddleButton == MouseButtonState.Pressed);
                mouse.Buttons[2] = (e.RightButton == MouseButtonState.Pressed);
                MouseMoveOnBoard(0);
            }
        }


        public void RealBoardMouseWheel(object sender, MouseWheelEventArgs e)
        {
            if (!use_multi_mouse)
            {
                RawMouse mouse = (RawMouse)raw_mouse_input.Mice[0];
                Point p = (Point)e.GetPosition((IInputElement)this.MousePanel);
                mouse.X = (int)p.X;
                mouse.Y = (int)p.Y;
                mouse.Z = (int)e.Delta;
                mouse.Buttons[0] = (e.LeftButton == MouseButtonState.Pressed);
                mouse.Buttons[1] = (e.MiddleButton == MouseButtonState.Pressed);
                mouse.Buttons[2] = (e.RightButton == MouseButtonState.Pressed);
                MouseMoveOnBoard(0);
            }
        }

        void RealBoardMouseButtonUp(object sender, MouseButtonEventArgs e)
        {
            if (!use_multi_mouse)
            {
                RawMouse mouse = (RawMouse)raw_mouse_input.Mice[0];
                Point p = (Point)e.GetPosition((IInputElement)this.MousePanel);
                mouse.X = (int)p.X;
                mouse.Y = (int)p.Y;
                mouse.Buttons[0] = (e.LeftButton == MouseButtonState.Pressed);
                mouse.Buttons[1] = (e.MiddleButton == MouseButtonState.Pressed);
                mouse.Buttons[2] = (e.RightButton == MouseButtonState.Pressed);
                if (e.ChangedButton == MouseButton.Left)
                {
                    MouseButtonUpOnBoard(0, 0);
                }
                if (e.ChangedButton == MouseButton.Middle)
                {
                    MouseButtonUpOnBoard(0, 1);
                }
                if (e.ChangedButton == MouseButton.Right)
                {
                    MouseButtonUpOnBoard(0, 2);
                }
            }
        }

        [System.Runtime.InteropServices.DllImportAttribute("user32.dll", EntryPoint = "SetCursorPos")]
        [return: System.Runtime.InteropServices.MarshalAsAttribute(System.Runtime.InteropServices.UnmanagedType.Bool)]

        public static extern bool SetCursorPos(int X, int Y);

        private void FlipPiece(GamePieceControl gamepiece)
        {
            gamepiece.Side++;
        }

        private void FlipPieces(List<GamePieceControl> gamepieces)
        {
            List<GamePieceControl> pieces_in_order = GetSelectedPiecesInOrder(gamepieces);
            pieces_in_order.Reverse();
            foreach (GamePieceControl piece in pieces_in_order)
            {
                if (!piece.IsLocked)
                    FlipPiece(piece);
                MoveGamePieceToTop(piece);
            }
        }

        private List<GamePieceControl> GetSelectedPiecesInOrder(List<GamePieceControl> gamepieces)
        {
            List<GamePieceControl> pieces_in_order = new List<GamePieceControl>();
            GamePieceControl gamepiece = null;
            foreach (var child in BoardPanel.Children)
            {
                gamepiece = child as GamePieceControl;
                if ((gamepiece != null) &&
                    (!gamepiece.IsLocked) &&
                    (gamepieces.IndexOf(gamepiece) >= 0))
                {
                    pieces_in_order.Add(gamepiece);
                }
            }
            return pieces_in_order;
        }

        private void RollPieces(List<GamePieceControl> gamepieces)
        {
            foreach (GamePieceControl piece in gamepieces)
            {
                if ((!piece.IsLocked) && (piece.NumSides > 2))
                {
                    piece.Side = random.Next(piece.NumSides);
                    piece.angle = random.Next(360);
                }
            }
        }

        private void MouseMoveOnBoard(int mouse_idx)
        {
            RawMouse mouse = (RawMouse)raw_mouse_input.Mice[mouse_idx];
            // Get the point of action
            Point pt = MousePanel.TransformToDescendant(BoardPanel).Transform(new Point(mouse.X, mouse.Y));
            // Get any middle button rotation
            int zDelta = mouse.ZDelta;

            // Handle mouse in and out events
            if (mouse.inMenu)
            {
                PieceMenuItem menu_item = findHitMenuItem(mouse);
                PieceMenuItem old_menu_item = mouse.menuItemIn as PieceMenuItem;
                if (old_menu_item != menu_item)
                {
                    if (old_menu_item != null)
                    {
                        old_menu_item.UnHighlight();
                    }
                    if (menu_item != null)
                    {
                        menu_item.Highlight();
                    }
                    mouse.menuItemIn = menu_item;
                }
            }

            // Turn off zoom if we mouse out of the piece
            if (mouse.inZoom)
            {
                HitTestResult result = VisualTreeHelper.HitTest(BoardPanel, pt);
                GamePieceControl gamepiece = null;
                GamePieceControl zoompiece = mouse.zoomPiece as GamePieceControl;
                if (result != null)
                {
                    gamepiece = result.VisualHit as GamePieceControl;
                }
                if (gamepiece != zoompiece)
                {
                    mouse.inZoom = false;
                    zoompiece.Scale = 1.0;
                }
            }

            // Continue mouse select
            if (mouse.inMultiSelect)
            {
                double xmin, ymin, xmax, ymax;
                if (mouse.X < mouse.multiSelectStart.X)
                {
                    xmin = mouse.X;
                    xmax = mouse.multiSelectStart.X;
                }
                else
                {
                    xmin = mouse.multiSelectStart.X;
                    xmax = mouse.X;
                }
                if (mouse.Y < mouse.multiSelectStart.Y)
                {
                    ymin = mouse.Y;
                    ymax = mouse.multiSelectStart.Y;
                }
                else
                {
                    ymin = mouse.multiSelectStart.Y;
                    ymax = mouse.Y;
                }
                mouse.multiSelectRectangle.Margin = new Thickness(xmin, ymin, 0, 0);
                mouse.multiSelectRectangle.Width = xmax - xmin;
                mouse.multiSelectRectangle.Height = ymax - ymin;
            }

            // Continue drag
            if (mouse.inDrag)
            {
                GamePieceControl dragPiece = mouse.dragPiece;
                if (dragPiece != null)
                {
                    Vector drag_offset = (Vector)(pt -
                        (Vector)dragPiece.TransformToAncestor(BoardPanel).Transform((Point)mouse.dragPointOnPiece));
                    foreach (GamePieceControl piece in mouse.selectedPieces)
                    {
                        if (!piece.IsLocked)
                        {
                            piece.Location = (Point)(
                                (Vector)piece.Location +
                                drag_offset);
                        }
                    }

                    // If we are in a drag, also use the middle button to rotate
                    if (zDelta != 0)
                    {
                        double angle_delta = 10;
                        if (zDelta > 0) angle_delta = -10;
                        double angle_radians = angle_delta * Math.PI / 180;
                        Vector unit_vec = new Vector(Math.Cos(angle_radians), Math.Sin(angle_radians));
                        Point rotation_center = dragPiece.TransformToAncestor(BoardPanel).Transform(dragPiece.center);
                        foreach (GamePieceControl piece in mouse.selectedPieces)
                        {
                            if (!piece.IsLocked)
                            {
                                piece.angle += angle_delta;
                                Vector d = (Vector)piece.Location - (Vector)rotation_center;
                                d = new Vector(unit_vec.X * d.X - unit_vec.Y * d.Y,
                                    unit_vec.Y * d.X + unit_vec.X * d.Y);
                                piece.Location = (Point)(d + rotation_center);
                            }
                        }
                    }
                }
            }
            else if (mouse.inRotate) // Left and right button rotate control
            {
                GamePieceControl dragPiece = mouse.dragPiece;
                if ((dragPiece != null) && (pt != (Point)mouse.rotatePieceOrigin))
                {
                    // TODO This code should be centralized with other rotation code
                    double angle_delta = Math.Atan2(pt.Y - mouse.rotatePieceOrigin.Y,
                        pt.X - mouse.rotatePieceOrigin.X) * 180.0 / Math.PI - mouse.rotateStartAngle;
                    angle_delta = Math.Round(angle_delta / 5.0) * 5.0;
                    double angle_radians = angle_delta * Math.PI / 180;
                    Vector unit_vec = new Vector(Math.Cos(angle_radians), Math.Sin(angle_radians));
                    foreach (GamePieceControl piece in mouse.selectedPieces)
                    {
                        if (!piece.IsLocked)
                        {
                            piece.angle = piece.rotateStartAngle + angle_delta;
                            Vector d = (Vector)piece.rotateStartPoint - (Vector)mouse.rotatePieceOrigin;
                            d = new Vector(unit_vec.X * d.X - unit_vec.Y * d.Y,
                                unit_vec.Y * d.X + unit_vec.X * d.Y);
                            piece.Location = (Point)(d + mouse.rotatePieceOrigin);
                        }
                    }
                }
            }
            else if (zDelta != 0)
            {
                HitTestResult result = VisualTreeHelper.HitTest(BoardPanel, pt);
                if (result != null)
                {
                    GamePieceControl gamepiece = result.VisualHit as GamePieceControl;
                    if ((gamepiece != null) && (!gamepiece.inGrab))
                    {
                        double zoom_factor = 1.4;
                        if (zDelta > 0) zoom_factor = 1.0 / 1.4;
                        ZoomPiece(mouse, gamepiece, zoom_factor);
                    }
                }
            }
        }

        private void MouseButtonUpOnBoard(int mouse_idx, int button)
        {
            RawMouse mouse = (RawMouse)raw_mouse_input.Mice[mouse_idx];
            Point pt = MousePanel.TransformToDescendant(BoardPanel).Transform(new Point(mouse.X, mouse.Y));
            if (button == 0)
            {
                if (mouse.inDrag || mouse.inRotate)
                {
                    mouse.inDrag = false;
                    mouse.inRotate = false;
                    // After a drag, clear a single selected item
                    if (mouse.selectedPieces.Count == 1)
                    {
                        ClearSelectedPieces(mouse);
                    }
                }
                if (mouse.inMultiSelect)
                {
                    Point pa = new Point(mouse.multiSelectRectangle.Margin.Left,
                        mouse.multiSelectRectangle.Margin.Top);
                    Point pb = (Point)(pa + new Vector(
                        mouse.multiSelectRectangle.Width,
                        mouse.multiSelectRectangle.Height));
                    Rect ra = new Rect(MousePanel.TransformToDescendant(BoardPanel).Transform(pa),
                        MousePanel.TransformToDescendant(BoardPanel).Transform(pb));
                    Rect rb = new Rect();
                    foreach (UIElement element in BoardPanel.Children)
                    {
                        GamePieceControl piece = element as GamePieceControl;
                        if ((piece != null) && (!piece.inGrab))
                        {
                            rb = new Rect(piece.Margin.Left, piece.Margin.Top, 1, 1);
                            if (Rect.Intersect(ra, rb) != Rect.Empty)
                            {
                                AddSelectedPiece(mouse, piece);
                            }
                        }
                    }

                    mouse.inMultiSelect = false;
                    MousePanel.Children.Remove(mouse.multiSelectRectangle);
                    mouse.multiSelectRectangle = null;
                }
            }
            else if (button == 1)
            {
                // After a flip (or click on background), clear a single selected item
                if ((mouse.selectedPieces.Count == 1) && (!mouse.inDrag))
                {
                    ClearSelectedPieces(mouse);
                }
            }
            else if (button == 2)
            {
                if (mouse.inRotate)
                {
                    mouse.inRotate = false;
                    GamePieceControl gamepiece = mouse.dragPiece;
                    if (gamepiece != null)
                    {
                        mouse.inDrag = true;
                        mouse.dragPointOnPiece =
                                  BoardPanel.TransformToDescendant(gamepiece).Transform(pt);
                    }
                }
            }
        }

        private static void AddSelectedPiece(RawMouse mouse, GamePieceControl piece)
        {
            mouse.selectedPieces.Add(piece);
            piece.inGrab = true;
        }

        private void MouseButtonDownOnBoard(int mouse_idx, int button)
        {
            RawMouse mouse = (RawMouse)raw_mouse_input.Mice[mouse_idx];
            Point pt = MousePanel.TransformToDescendant(BoardPanel).Transform(new Point(mouse.X, mouse.Y));

            // First handle any menu events
            if (mouse.inMenu)
            {
                PieceMenuItem menu_item = findHitMenuItem(mouse);
                // If we didn't click on a menu, remove it
                if (menu_item == null)
                {
                    MenuPanel.Children.Remove(mouse.rootMenu as PieceMenu);
                    mouse.inMenu = false;
                }
                else
                {
                    MenuPanel.Children.Remove(mouse.rootMenu as PieceMenu);
                    mouse.inMenu = false;
                    //Note: We execute last because it may pop-up a new menu
                    menu_item.Execute();
                    // After a menu execution, clear a single selected item
                    if (mouse.selectedPieces.Count == 1)
                    {
                        ClearSelectedPieces(mouse);
                    }
                    return;
                }
            }

            // If we are in a multiselect, ignore other buttons until done
            if (mouse.inMultiSelect)
            {
                return;
            }

            // Handle regular mouse events
            if (button == 0)
            {
                // See if we hit something and should start a drag
                GamePieceControl hitpiece = UpdateSelectionAndGetHit(mouse, pt);
                // If locked, then treat as background
                if ((hitpiece != null) && hitpiece.IsLocked) hitpiece = null;
                // If a legal piece hit, then start drag
                if (hitpiece != null)
                {
                    // If the only piece, then raise to top
                    if (mouse.selectedPieces.Count == 1)
                    {
                        MoveGamePieceToTop(hitpiece);
                    }
                    mouse.inDrag = true;
                    mouse.dragPiece = hitpiece;
                    mouse.dragPointOnPiece =
                              BoardPanel.TransformToDescendant(hitpiece).Transform(pt);
                }
                // If we didn't hit anything, then start a multi select
                if (hitpiece == null)
                {
                    // First clear all old selected items
                    ClearSelectedPieces(mouse);
                    // Now initiate a new multi select
                    mouse.inMultiSelect = true;
                    mouse.multiSelectStart = new Point(mouse.X, mouse.Y);
                    mouse.multiSelectRectangle = new Rectangle();
                    mouse.multiSelectRectangle.Margin = new Thickness(mouse.X, mouse.Y, 0, 0);
                    mouse.multiSelectRectangle.Stroke = new SolidColorBrush(Color.FromArgb(128, 255, 255, 255));
                    MousePanel.Children.Add(mouse.multiSelectRectangle);
                }
            }
            else if (button == 1)
            {
                UpdateSelectionAndGetHit(mouse, pt);
                FlipPieces(mouse.selectedPieces);
            }
            else if (button == 2)
            {
                if (mouse.inDrag)
                {
                    mouse.inRotate = true;
                    mouse.inDrag = false;
                    GamePieceControl gamepiece = mouse.dragPiece as GamePieceControl;
                    if (gamepiece != null)
                    {
                        mouse.rotatePieceOrigin = (Vector)gamepiece.TransformToAncestor(BoardPanel).Transform(gamepiece.center);
                        if (pt != (Point)mouse.rotatePieceOrigin)
                        {
                            mouse.rotateStartAngle = Math.Atan2(pt.Y - mouse.rotatePieceOrigin.Y,
                                pt.X - mouse.rotatePieceOrigin.X) * 180.0 / Math.PI;
                        }
                        else
                        {
                            mouse.rotateStartAngle = 0;
                        }
                        // Record the starting position and angle
                        foreach (GamePieceControl piece in mouse.selectedPieces)
                        {
                            piece.rotateStartAngle = piece.angle;
                            piece.rotateStartPoint = piece.Location;
                        }
                    }
                }
                else if (!mouse.inMenu)
                {
                    UpdateSelectionAndGetHit(mouse, pt);
                    PopupMainPieceMenu(mouse);
                }
            }
        }

        /// <summary>
        /// Given a mouse and point, if the point lands on the set of already selected
        /// pieces, then it keeps it, otherwise it selects the new piece it hit.
        /// If it hits a piece it can own, then it selects it.
        /// </summary>
        /// <param name="mouse"></param>
        /// <param name="pt"></param>
        private GamePieceControl UpdateSelectionAndGetHit(RawMouse mouse, Point pt)
        {
            GamePieceControl hitpiece = null;
            // Figure out what we clicked on
            HitTestResult result = VisualTreeHelper.HitTest(BoardPanel, pt);
            if (result != null)
            {
                hitpiece = result.VisualHit as GamePieceControl;
                if (hitpiece != null) // Didn't click on highlighted element
                {
                    if (mouse.selectedPieces.IndexOf(hitpiece) < 0)
                    {
                        ClearSelectedPieces(mouse);
                        if (!hitpiece.inGrab) // Does someone else have it selected?
                        {
                            AddSelectedPiece(mouse, hitpiece);
                        }
                        else
                        { // Act like we hit the background
                            hitpiece = null;
                        }
                    }
                }
            }
            if (hitpiece == null)
            {
                ClearSelectedPieces(mouse);
            }
            return hitpiece;
        }

        private static void ClearSelectedPieces(RawMouse mouse)
        {
            foreach (GamePieceControl piece in mouse.selectedPieces)
            {
                piece.inGrab = false;
            }
            mouse.selectedPieces.Clear();
        }

        public void ZoomPiece(RawMouse mouse, GamePieceControl gamepiece, double zoom_factor)
        {
            mouse.inZoom = true;
            mouse.zoomPiece = gamepiece;
            gamepiece.Scale = gamepiece.Scale * zoom_factor;
        }

        private void PopupMainPieceMenu(RawMouse mouse)
        {
            Point pt = MousePanel.TransformToDescendant(BoardPanel).Transform(new Point(mouse.X, mouse.Y));
            PieceMenu piece_menu = new PieceMenu();
            bool has_locked = false;
            bool has_unlocked = false;
            bool has_multi_sided = false;
            bool has_dice = false; // Dice is more than 2 sided
            foreach (GamePieceControl piece in mouse.selectedPieces)
            {
                if (piece.IsLocked) has_locked = true;
                else
                {
                    has_unlocked = true;
                    // It has to be unlocked to flip or roll
                    if (piece.NumSides > 1) has_multi_sided = true;
                    if (piece.NumSides > 2) has_dice = true;
                }
            }
            if (has_dice)
                piece_menu.Add(new PieceMenuItem("Roll", () => { this.RollPieces(mouse.selectedPieces); }));

            if (has_multi_sided)
                piece_menu.Add(new PieceMenuItem("Flip", () => { this.FlipPieces(mouse.selectedPieces); }));

            if (mouse.selectedPieces.Count() == 1)
                piece_menu.Add(new PieceMenuItem("Magnify Piece", () => { this.ZoomPiece(mouse, mouse.selectedPieces[0], 2.0); }));
            else if ((mouse.selectedPieces.Count() > 1) && (has_unlocked))
            {
                piece_menu.Add(new PieceMenuItem("Stack", () => { this.StackPieces(pt, mouse.selectedPieces); }));
                piece_menu.Add(new PieceMenuItem("Shuffle", () => { this.ShufflePieces(mouse.selectedPieces); }));
            }

            if (has_locked)
                piece_menu.Add(new PieceMenuItem("Unlock", () => { this.UnlockPieces(mouse.selectedPieces); }));

            if (has_unlocked)
                piece_menu.Add(new PieceMenuItem("Lock", () => { this.LockPieces(mouse.selectedPieces); }));

            if (mouse.selectedPieces.Count() > 0)
            {
                piece_menu.Add(new Separator());
                piece_menu.Add(new PieceMenuItem("Copy", () => { this.CopyPieces(mouse); }));
                piece_menu.Add(new PieceMenuItem("Delete", () => { this.DeletePieces(mouse.selectedPieces); }));
                piece_menu.Add(new Separator());
            }

            piece_menu.Add(new PieceMenuItem("Select All", () => { this.SelectAll(mouse); }));
            piece_menu.Add(new Separator());

            if (_use_multi_mouse)
            {
                piece_menu.Add(new PieceMenuItem("Player Position...", () => { this.PopupPlayerPositionMenu(mouse); }));
                piece_menu.Add(new Separator());
            }
            piece_menu.Add(new PieceMenuItem("File...", () => { this.PopupFileMenu(mouse); }));
            piece_menu.Add(new PieceMenuItem("View...", () => { this.PopupViewMenu(mouse); }));
            PopupMenu(mouse, piece_menu);
        }

        private void DeletePieces(List<GamePieceControl> list)
        {
            List<GamePieceControl> dup_list = new List<GamePieceControl>(list);
            foreach (GamePieceControl piece in dup_list)
            {
                if (!piece.IsLocked)
                {
                    list.Remove(piece);
                    BoardPanel.Children.Remove(piece);
                    World.on_board_pieces.Remove(piece.PieceModel);
                }
            }
        }

        private void CopyPieces(RawMouse mouse)
        {
            List<GamePieceControl> pieces_in_order = GetSelectedPiecesInOrder(mouse.selectedPieces);
            ClearSelectedPieces(mouse);
            foreach (GamePieceControl piece in pieces_in_order)
            {
                if (!piece.IsLocked)
                {
                    OnBoardPiece obp = new OnBoardPiece(piece.PieceModel.piece);
                    World.on_board_pieces.Add(obp);
                    GamePieceControl new_piece = AddControlForPiece(obp);
                    new_piece.Location = new Point(piece.Location.X + 10, piece.Location.Y + 10);
                    new_piece.angle = piece.angle;
                    new_piece.Side = piece.Side;
                    AddSelectedPiece(mouse, new_piece);
                }
            }
        }

        private void ShufflePieces(List<GamePieceControl> list)
        {
            List<GamePieceControl> left_to_shuffle = new List<GamePieceControl>();
            foreach (GamePieceControl piece in list)
            {
                if (!piece.IsLocked) left_to_shuffle.Add(piece);
            }
            // Go through the list, picking a random one and bringing to the top
            while (left_to_shuffle.Count > 0)
            {
                int idx = random.Next(left_to_shuffle.Count);
                MoveGamePieceToTop(left_to_shuffle[idx]);
                left_to_shuffle.RemoveAt(idx);
            }
        }

        private void SelectAll(RawMouse mouse)
        {
            ClearSelectedPieces(mouse);
            foreach (var child in BoardPanel.Children)
            {
                GamePieceControl piece = child as GamePieceControl;
                if ((piece != null) && (!piece.inGrab))
                {
                    AddSelectedPiece(mouse, piece);
                }
            }
        }

        private void StackPieces(Point pt, List<GamePieceControl> list)
        {
            foreach (GamePieceControl piece in list)
            {
                if (!piece.IsLocked)
                {
                    piece.Location = pt;
                    piece.angle = 0;
                    piece.Side = 0;
                }
            }
        }

        private void UnlockPieces(List<GamePieceControl> list)
        {
            foreach (GamePieceControl piece in list)
            {
                piece.IsLocked = false;
            }
        }

        private void LockPieces(List<GamePieceControl> list)
        {
            foreach (GamePieceControl piece in list)
            {
                piece.IsLocked = true;
            }
        }

        private void PopupFileMenu(RawMouse mouse)
        {
            PieceMenu piece_menu = new PieceMenu();
            piece_menu.Add(new PieceMenuItem("Add Piece...", () => { this.AddPieceCommand(this, null); }));
            piece_menu.Add(new Separator());
            piece_menu.Add(new PieceMenuItem("Load Board...", () => { this.LoadBoardCommand(this, null); }));
            piece_menu.Add(new PieceMenuItem("Save Board...", () => { this.SaveBoardCommand(this, null); }));
            piece_menu.Add(new Separator());
            piece_menu.Add(new PieceMenuItem("Toggle Multi Mouse", () => { this.ToggleMultiMouseCommandExecuted(this, null); }));
            PopupMenu(mouse, piece_menu);
        }

        private void PopupViewMenu(RawMouse mouse)
        {
            PieceMenu piece_menu = new PieceMenu();
            piece_menu.Add(new PieceMenuItem("Toggle FullScreen", () => { this.ToggleFullScreenCommandExecuted(this, null); }));
            piece_menu.Add(new Separator());
            piece_menu.Add(new PieceMenuItem("Zoom In", () => { this.ZoomInCommandExecuted(this, null); }));
            piece_menu.Add(new PieceMenuItem("Zoom Out", () => { this.ZoomOutCommandExecuted(this, null); }));
            piece_menu.Add(new PieceMenuItem("Zoom 100%", () => { this.Zoom100CommandExecuted(this, null); }));
            PopupMenu(mouse, piece_menu);
        }

        private void PopupPlayerPositionMenu(RawMouse mouse)
        {
            PieceMenu piece_menu = new PieceMenu();
            piece_menu.Add(new PieceMenuItem("Bottom", () => { this.SetPlayerPosition(mouse, RawMouse.PLAYER_BOTTOM); }));
            piece_menu.Add(new PieceMenuItem("Right", () => { this.SetPlayerPosition(mouse, RawMouse.PLAYER_RIGHT); }));
            piece_menu.Add(new PieceMenuItem("Top", () => { this.SetPlayerPosition(mouse, RawMouse.PLAYER_TOP); }));
            piece_menu.Add(new PieceMenuItem("Left", () => { this.SetPlayerPosition(mouse, RawMouse.PLAYER_LEFT); }));
            PopupMenu(mouse, piece_menu);
        }

        private void SetPlayerPosition(RawMouse mouse, int player_orientation)
        {
            mouse.PlayerOrientation = player_orientation;
            Image mouse_pointer = mouse_pointers[mouse.mouse_index];
            mouse_pointer.RenderTransform = new RotateTransform(getPlayerAngle(mouse));
        }

        private double getPlayerAngle(RawMouse mouse)
        {
            if (use_multi_mouse)
            {
                if (mouse.PlayerOrientation == RawMouse.PLAYER_RIGHT)
                {
                    return (270);
                }
                else if (mouse.PlayerOrientation == RawMouse.PLAYER_TOP)
                {
                    return (180);
                }
                else if (mouse.PlayerOrientation == RawMouse.PLAYER_LEFT)
                {
                    return (90);
                }
            }
            return 0;
        }

        private void PopupMenu(RawMouse mouse, PieceMenu piece_menu)
        {
            mouse.inMenu = true;
            mouse.rootMenu = piece_menu;
            piece_menu.RenderTransform = new RotateTransform(getPlayerAngle(mouse));
            if (!use_multi_mouse || mouse.PlayerOrientation == RawMouse.PLAYER_BOTTOM)
            {
                piece_menu.Margin = new Thickness(mouse.X - 10, mouse.Y - 5, 0, 0);
            }
            else if (mouse.PlayerOrientation == RawMouse.PLAYER_RIGHT)
            {
                piece_menu.Margin = new Thickness(mouse.X - 5, mouse.Y + 10, 0, 0);
            }
            else if (mouse.PlayerOrientation == RawMouse.PLAYER_TOP)
            {
                piece_menu.Margin = new Thickness(mouse.X + 10, mouse.Y + 5, 0, 0);
            }
            else if (mouse.PlayerOrientation == RawMouse.PLAYER_LEFT)
            {
                piece_menu.Margin = new Thickness(mouse.X + 5, mouse.Y - 10, 0, 0);
            }
            // Add above the game board but under the mouses
            MenuPanel.Children.Add(piece_menu);
        }

        private PieceMenuItem findHitMenuItem(RawMouse mouse)
        {
            Point mpt = MousePanel.TransformToDescendant(MenuPanel).Transform(new Point(mouse.X, mouse.Y));
            HitTestResult result = VisualTreeHelper.HitTest(MenuPanel, mpt);
            PieceMenuItem menu_item = null;
            // If we have a result and didn't hit the game panel, navigate the parents to find the menu
            if ((result != null) && ((result.VisualHit as GamePanel) == null))
            {
                DependencyObject item = result.VisualHit;
                while ((item != null) && ((item as PieceMenuItem) == null))
                {
                    item = VisualTreeHelper.GetParent(item);
                }
                if (item != null)
                {
                    menu_item = item as PieceMenuItem;
                }
            }
            return menu_item;
        }

        private void MoveGamePieceToTop(GamePieceControl gamepiece)
        {
            BoardPanel.Children.Remove(gamepiece);
            World.on_board_pieces.Remove(gamepiece.Piece);
            BoardPanel.Children.Add(gamepiece);
            World.on_board_pieces.Add(gamepiece.Piece);
        }

        private void OpenImageLibrary(object sender, RoutedEventArgs e)
        {
            PieceImageLibrarySelect ild = new PieceImageLibrarySelect();
            ild.ShowDialog();
        }

        private void OpenPieceLibrary(object sender, RoutedEventArgs e)
        {
            PieceLibrarySelect pld = new PieceLibrarySelect();
            pld.ShowDialog();
        }

        private void ClearWorld()
        {
            World.ClearWorld();
            // Clear all pieces off of the board
            BoardPanel.Children.Clear();
        }

        private void LoadBoardCommand(object sender, RoutedEventArgs e)
        {
            // TODO: Ask if we want to clear the world if there is a piece on the board

            // Turn off multi mouse
            bool multi_mouse_state = use_multi_mouse;
            use_multi_mouse = false;

            // Configure open file dialog box
            Microsoft.Win32.OpenFileDialog dlg = new Microsoft.Win32.OpenFileDialog();
            dlg.FileName = ""; // Default file name
            dlg.DefaultExt = "*.bga"; // Default file extension
            dlg.Filter = "Board Game Arena (*.bga)|*.bga|All Types (*.*)|*.*"; // Filter files by extension

            // Show open file dialog box
            Nullable<bool> result = dlg.ShowDialog();

            // Process open file dialog box results
            if (result == true)
            {
                ClearWorld();
                try
                {
                    World.LoadWorld(dlg.FileName);
                    foreach (OnBoardPiece obp in World.on_board_pieces)
                    {
                        AddControlForPiece(obp);
                    }
                }
                catch (Exception ex)
                {
                    MessageBox.Show("Error reading board file: " + ex.Message);
                }
            }
            // Restore multi mouse
            use_multi_mouse = multi_mouse_state;
        }

        private void SaveBoardCommand(object sender, RoutedEventArgs e)
        {
            // Turn off multi mouse
            bool multi_mouse_state = use_multi_mouse;
            use_multi_mouse = false;

            // Configure open file dialog box
            Microsoft.Win32.SaveFileDialog dlg = new Microsoft.Win32.SaveFileDialog();
            dlg.FileName = ""; // Default file name
            dlg.DefaultExt = "*.bga"; // Default file extension
            dlg.Filter = "Board Game Arena (*.bga)|*.bga|All Types (*.*)|*.*"; // Filter files by extension

            // Show open file dialog box
            Nullable<bool> result = dlg.ShowDialog();

            // Process open file dialog box results
            if (result == true)
            {
                try
                {
                    World.SaveWorld(dlg.FileName);
                }
                catch (Exception ex)
                {
                    MessageBox.Show("Error writing board file: " + ex.Message);
                }
            }
            // Restore multi mouse
            use_multi_mouse = multi_mouse_state;
        }

        private void HelpMenuClick(object sender, RoutedEventArgs e)
        {
            Process.Start("http://boardgamearena.sourceforge.net/help/");
        }
    }
}
