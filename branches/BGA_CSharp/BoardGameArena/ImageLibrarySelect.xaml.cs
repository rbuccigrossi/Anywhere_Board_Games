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
using System.IO;

namespace BoardGameArena
{
    /// <summary>
    /// Interaction logic for Window1.xaml
    /// </summary>
    public partial class PieceImageLibrarySelect : Window
    {
        PieceImage new_library_entry = new PieceImage("",null);

        public PieceImageLibrarySelect()
        {
            InitializeComponent();
        }

        private void Window_Loaded(object sender, RoutedEventArgs e)
        {
            ImageList.ItemsSource = World.image_library;
            AddImageGrid.DataContext = new_library_entry;
        }

        private void AddToLibraryButtonClick(object sender, RoutedEventArgs e)
        {
            PieceImageLibrary il = ImageList.ItemsSource as PieceImageLibrary;
            if (il == null)
            {
                MessageBox.Show("NULL Library (Programming Error)", "Image Library Error");
                return;
            }
            if (new_library_entry.Key == null)
            {
                MessageBox.Show("Please select an image.", "Image Library Error");
                return;
            }
            if (il.ContainsKey(new_library_entry.Key))
            {
                MessageBox.Show("The library already has this image (same MD5 hash and size)",
                    "Image Library Error");
                return;
            }
            il.Add(new_library_entry);
            ImageList.SelectedIndex = il.Count - 1;
            new_library_entry = new PieceImage("", null);
            AddImageGrid.DataContext = new_library_entry;
        }

        private void UpdateImageClick(object sender, RoutedEventArgs e)
        { 
            // Configure open file dialog box
            Microsoft.Win32.OpenFileDialog dlg = new Microsoft.Win32.OpenFileDialog();
            dlg.FileName = ""; // Default file name
            dlg.DefaultExt = "*.png"; // Default file extension
            dlg.Filter = "Common Image Types (*.gif; *.jpg; *.png)|*.gif;*.jpg;*.png|All Types (*.*)|*.*"; // Filter files by extension

            // Show open file dialog box
            Nullable<bool> result = dlg.ShowDialog();

            // Process open file dialog box results
            if (result == true)
            {
                // Open document
                string filename = dlg.FileName;
                try
                {
                    // Attempt to load the file into a bitmap (to verify it is valid)
                    BitmapImage myBitmapImage = new BitmapImage();

                    myBitmapImage.BeginInit();
                    myBitmapImage.StreamSource = new FileStream(filename, FileMode.Open, FileAccess.Read);
                    myBitmapImage.EndInit();

                    FileStream fs = new FileStream(filename, FileMode.Open, FileAccess.Read);
                    byte[] image_data = new byte[fs.Length];
                    fs.Read(image_data, 0, (int)fs.Length);
                    new_library_entry.Buffer = image_data;
                    if ((new_library_entry.Name == null) || (new_library_entry.Name.Length == 0)){
                        new_library_entry.Name = System.IO.Path.GetFileName(filename);
                    }
                }
                catch
                {
                    MessageBox.Show("Unable to open file as an image", "Error");
                }
            }
        }

        private void DeleteCurrentSelection(object sender, RoutedEventArgs e)
        {
            PieceImageLibrary il = ImageList.ItemsSource as PieceImageLibrary;
            int idx = ImageList.SelectedIndex;
            if ((il != null) && (idx >= 0))
            {
                il.RemoveAt(idx);
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
