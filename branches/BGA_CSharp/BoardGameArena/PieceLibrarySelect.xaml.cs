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
    /// Interaction logic for Window1.xaml
    /// </summary>
    public partial class PieceLibrarySelect : Window
    {
        public PieceLibrarySelect()
        {
            InitializeComponent();
        }

        private void Window_Loaded(object sender, RoutedEventArgs e)
        {
            PieceList.ItemsSource = World.piece_library;
        }

        private void AddNewClicked(object sender, RoutedEventArgs e)
        {
            Piece p = new Piece();
            PieceAddDialog pad = new PieceAddDialog();
            PieceLibrary pl = PieceList.ItemsSource as PieceLibrary;
            pad.DataContext = p;
            pad.SideList.ItemsSource = p.Sides;
            bool? response = pad.ShowDialog();
            if ((response.HasValue) && (response.Value) && (pl != null) && (p.Sides.Count > 0))
            {
                pl.Add(p);
                PieceList.SelectedIndex = pl.Count - 1;
            }
        }

        private void OKClicked(object sender, RoutedEventArgs e)
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

        private void DeleteSelectedClicked(object sender, RoutedEventArgs e)
        {
            PieceLibrary pl = PieceList.ItemsSource as PieceLibrary;
            int idx = PieceList.SelectedIndex;
            if ((pl != null) && (idx >= 0))
            {
                pl.RemoveAt(idx);
            }
        }

        private void CancelClicked(object sender, RoutedEventArgs e)
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
    }
}
