using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Windows.Media.Imaging;
using System.Windows;
using System.IO;
using System.Windows.Data;
using System.Security.Cryptography;

namespace BoardGameArena
{
    /// <summary>
    /// The ImageLibrary is a collection of images that can also be searched by
    /// key
    /// </summary>
    public class PieceImageLibrary : ObservableLibrary<PieceImage>
    {
    }

    // May be needed for Silverlight
    public class ByteArrayToImageConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, System.Globalization.CultureInfo culture)
        {
            byte[] byteBlob = value as byte[];
            BitmapImage bmi = new BitmapImage();
            MessageBox.Show("Yo!");
            if (byteBlob != null)
            {
                MemoryStream ms = new MemoryStream(byteBlob);
                bmi.StreamSource = ms;
                MessageBox.Show("Hi!");
            }
            return bmi;
        }
        public object ConvertBack(object value, Type targetType, object parameter, System.Globalization.CultureInfo culture)
        {
            throw new NotImplementedException();
        }
    }
}
