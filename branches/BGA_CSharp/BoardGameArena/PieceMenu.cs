using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Windows.Controls;
using System.Windows;

namespace BoardGameArena
{
    public class PieceMenu : Border
    {
        public Border lower_shadow_border = new Border();
        public StackPanel menu_item_panel = new StackPanel();

        public PieceMenu() : base()
        {
            this.BorderThickness = new Thickness(1, 1, 0, 0);
            this.BorderBrush = System.Windows.Media.Brushes.White;
            lower_shadow_border.BorderThickness = new Thickness(0, 0, 1, 1);
            lower_shadow_border.BorderBrush = System.Windows.Media.Brushes.DarkGray;
            this.Child = lower_shadow_border;
            menu_item_panel.Background = System.Windows.Media.Brushes.LightGray;
            lower_shadow_border.Child = menu_item_panel;
            this.HorizontalAlignment = HorizontalAlignment.Left;
            this.VerticalAlignment = VerticalAlignment.Top;
        }

        /// <summary>
        /// Returns itself so we can chain adds
        /// </summary>
        /// <param name="element"></param>
        /// <returns></returns>
        public PieceMenu Add(UIElement element){
            menu_item_panel.Children.Add(element);
            return (this);
        }
    }

    public class PieceMenuItem : Label
    {
        public delegate void MenuClickedHandler();
        public MenuClickedHandler menuClickedEvent;

        public PieceMenuItem()
            : base()
        {
        }

        public PieceMenuItem(string text) : this()
        {
            Content = text;
        }

        public PieceMenuItem(string text, MenuClickedHandler mc) : this(text)
        {
            menuClickedEvent += mc;
        }

        public void Highlight(){
            this.Background = System.Windows.Media.Brushes.DarkGray;
        }

        public void UnHighlight()
        {
            this.Background = System.Windows.Media.Brushes.LightGray;
        }

        public void Execute()
        {
            if (menuClickedEvent != null)
            {
                menuClickedEvent();
            }
        }
    }
}
