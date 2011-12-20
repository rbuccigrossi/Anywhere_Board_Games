using System;
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
using System.Windows.Shapes;

namespace BoardGameArena
{
    /// <summary>
    /// Interaction logic for PieceAddDialog.xaml
    /// </summary>
    public partial class PieceAddDialog : Window
    {
        public PieceAddDialog()
        {
            InitializeComponent();
        }

        private void OKButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                DialogResult = true; // Causes the window to close
            }
            catch
            {
                // Allow the window to be used stand-alone or as a dialog
                Close();
            }
        }

        private void CancelButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                DialogResult = false; // Causes the window to close
            }
            catch
            {
                // Allow the window to be used stand-alone or as a dialog
                Close();
            }
        }

        private void AddFaceButton_Click(object sender, RoutedEventArgs e)
        {
            PieceImageLibrarySelect pils = new PieceImageLibrarySelect();
            Piece p = this.DataContext as Piece;
            bool? result = pils.ShowDialog();
            if (result.HasValue && result.Value && (p != null) 
                && (pils.ImageList.SelectedIndex >= 0))
            {
                p.Sides.Add(World.image_library[pils.ImageList.SelectedIndex]);
                if ((p.Sides.Count == 1) && ((p.Name == null) || p.Name.Length == 0))
                {
                    p.Name = p.Sides[0].Name;
                }
            }
        }

        private void DeleteSelectedFaceButton_Click(object sender, RoutedEventArgs e)
        {
            Piece p = this.DataContext as Piece;
            int idx = SideList.SelectedIndex;
            if ((p != null) && (idx >= 0))
            {
                p.Sides.RemoveAt(idx);
            }
        }
    }
}
