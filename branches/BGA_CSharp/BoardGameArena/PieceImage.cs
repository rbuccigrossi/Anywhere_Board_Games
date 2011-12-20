using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.ComponentModel;
using System.Security.Cryptography;
using System.Xml.Serialization;

namespace BoardGameArena
{
    public class PieceImage : INotifyPropertyChanged, IHasKey
    {
        string _name;
        byte[] _buffer;
        string _key;

        public PieceImage()
            : this(null, null)
        {
        }

        public PieceImage(string name, byte[] buffer)
        {
            Name = name;
            Buffer = buffer;
        }

        public event PropertyChangedEventHandler PropertyChanged;

        private void NotifyPropertyChanged(String info)
        {
            if (PropertyChanged != null)
            {
                PropertyChanged(this, new PropertyChangedEventArgs(info));
            }
        }

        /// <summary>
        /// The Name is an identifier created by the user (optional)
        /// </summary>
        public string Name
        {
            get
            {
                return _name;
            }
            set
            {
                _name = value;
                NotifyPropertyChanged("Name");
            }
        }

        /// <summary>
        /// Simplifies the MD5 hash utilities
        /// </summary>
        /// <param name="buffer"></param>
        /// <returns>md5 hash as string</returns>
        public static string md5(byte[] buffer)
        {
            MD5CryptoServiceProvider md5csp = new MD5CryptoServiceProvider();
            return (System.Text.Encoding.ASCII.GetString(md5csp.ComputeHash(buffer)));
        }

        /// <summary>
        /// The Buffer is a byte array of the compressed image
        /// </summary>
        public byte[] Buffer
        {
            get
            {
                return _buffer;
            }
            set
            {
                _buffer = value;
                if (_buffer == null)
                {
                    _key = null;
                }
                else
                {
                    _key = md5(Buffer) + _buffer.Length.ToString();
                }
                NotifyPropertyChanged("Buffer");
            }
        }

        /// <summary>
        /// The Key is a string calculated from the compressed buffer (a combination
        /// of an MD5 hash and the buffer size)
        ///  -- The key is automatically generated from the buffer
        /// </summary>
        [XmlIgnoreAttribute]
        public string Key
        {
            get
            {
                return _key;
            }
        }
    }
}
