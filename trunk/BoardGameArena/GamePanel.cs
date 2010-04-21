using System;
using System.Collections.Generic;
using System.Windows;
using System.Windows.Controls;
using System.Linq;
using System.Text;
using System.Windows.Media;
using System.Windows.Media.Animation;

namespace BoardGameArena
{
    /// <summary>
    /// A special Panel (Canvas) that manages game pieces
    /// </summary>

    public class GamePanel : Canvas
    {

        private double _zoom = 1.0;

        private ScaleTransform _scale_transform = null;

        public double Zoom
        {
            get
            {
                return _zoom;
            }
            set
            {
                _zoom = value;
                _scale_transform.ScaleX = _zoom;
                _scale_transform.ScaleY = _zoom;
            }
        }

        /// <summary>
        /// Default constructor
        /// </summary>
        public GamePanel()
            : base()
        {
            // Set up transforms
            _scale_transform = new ScaleTransform(1.0,1.0);
            this.LayoutTransform = _scale_transform;
        }
    }
    /*
            // Register the scale transform for animation
            ScaleTransform st = new ScaleTransform(1.0,1.0);
            NameScope.SetNameScope(this, new NameScope());
            this.RegisterName("AnimatedScale", st);
            this.LayoutTransform = st;

            DoubleAnimation dax = new DoubleAnimation(new_zoom, new Duration(TimeSpan.FromSeconds(0.1)));
            zoom_sb.Children.Add(dax);
            Storyboard.SetTargetName(dax, "AnimatedScale");
            Storyboard.SetTargetProperty(dax, new PropertyPath(ScaleTransform.ScaleXProperty));
            DoubleAnimation day = new DoubleAnimation(new_zoom, new Duration(TimeSpan.FromSeconds(0.1)));
            zoom_sb.Children.Add(day);
            Storyboard.SetTargetName(day, "AnimatedScale");
            Storyboard.SetTargetProperty(day, new PropertyPath(ScaleTransform.ScaleYProperty));
            zoom_sb.Begin(this,true);
    */
}
