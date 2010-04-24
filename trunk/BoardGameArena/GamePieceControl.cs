using System;
using System.Collections.Generic;
using System.Windows;
using System.Windows.Controls;
using System.Linq;
using System.Text;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.IO;
using System.Windows.Media.Effects;

namespace BoardGameArena
{
    /// <summary>
    /// Extension of Controls.Image that represents a piece
    /// </summary>
    public class GamePieceControl : Image
    {

        RotateTransform _rotate_transform;
        TranslateTransform _translate_transform;
        ScaleTransform _scale_transform;
        OnBoardPiece _piece;

        public Point center = new Point();

        private bool _in_grab = false;

        public bool inGrab{
            get 
            {
                return _in_grab;
            }
            set 
            {
                _in_grab = value;
                UpdateHighlight();
            }
        }

        public OnBoardPiece PieceModel
        {
            get
            {
                return _piece;
            }
        }

        private void UpdateHighlight()
        {
            if (_in_grab && !IsLocked)
                Highlight();
            else
                UnHighlight();
        }

        // Members to assist in rotation
        public double rotateStartAngle;
        public Point rotateStartPoint;

        private void UnHighlight()
        {
            Opacity = 1;
        }

        public void Highlight()
        {
            Opacity = 0.8;
        }

        /// <summary>
        /// Constructor which requires a piece
        /// </summary>
        public GamePieceControl(OnBoardPiece piece): base()
        {
            _rotate_transform = new RotateTransform(0);
            _translate_transform = new TranslateTransform(0, 0);
            _scale_transform = new ScaleTransform(1.0,1.0);
            TransformGroup tg = new TransformGroup();
            tg.Children.Add(_translate_transform);
            tg.Children.Add(_rotate_transform);
            tg.Children.Add(_scale_transform);
            this.RenderTransform = tg;
            _piece = piece;
            // Now set display properties
            HorizontalAlignment = HorizontalAlignment.Center;
            VerticalAlignment = VerticalAlignment.Center;
            Stretch = Stretch.None;
            // Set the side (which sets the image and the center)
            Side = piece.Side;
            // Now set the location from the piece
            Location = piece.Location;
            angle = piece.Angle;
        }

        public void setRotationPoint(double cx, double cy)
        {
            _rotate_transform.CenterX = cx;
            _rotate_transform.CenterY = cy;
        }

        public void translate(double x, double y)
        {
            _translate_transform.X = x;
            _translate_transform.Y = y;
        }

        public double angle{
            get{
                return _piece.Angle;
            }
            set{
                _rotate_transform.Angle = value;
                _piece.Angle = value;
            }
        }

        public bool IsLocked
        {
            get {
                return (_piece.IsLocked); 
            }
            set
            {
                _piece.IsLocked = value;
                UpdateHighlight();
            }
        }

        public double Scale
        {
            get
            {
                return _scale_transform.ScaleX;
            }
            set
            {
                _scale_transform.ScaleX = value;
                _scale_transform.ScaleY = value;
            }
        }

        /// <summary>
        /// Gets/sets the location of the piece in Board coordinates
        /// </summary>
        public Point Location 
        { 
            get 
            {
                Thickness m = this.Margin;
                return (new Point(m.Left,m.Top));
            }
            set
            {
                _piece.Location = value;
                Margin = new Thickness(value.X, value.Y, 0, 0);
            }
        }

        /// <summary>
        /// Setting the side sets the bitmap for the piece
        /// </summary>
        public int Side
        {
            get
            {
                return (_piece.Side);
            }
            set
            {
                int idx = value % NumSides;
                if (idx != _piece.Side){
                    _piece.Side = idx;
                }
                // Create source
                BitmapImage myBitmapImage = new BitmapImage();

                myBitmapImage.BeginInit();
                myBitmapImage.StreamSource = new MemoryStream(_piece.piece.Sides[idx].Buffer);
                myBitmapImage.EndInit();

                //set image source
                Source = myBitmapImage;

                // Determine the center of the image
                center = new Point(Source.Width / 2, Source.Height / 2);
                // The location is calculated from the center of the face, so translate accordingly
                translate(-center.X, -center.Y);
            }
        }

        public int NumSides
        {
            get
            {
                return (_piece.piece.Sides.Count());
            }
        }


        public OnBoardPiece Piece
        {
            get
            {
                return (_piece);
            }
        }
    }
}
