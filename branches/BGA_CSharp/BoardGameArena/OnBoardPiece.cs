using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.ComponentModel;
using System.Windows;
using System.Collections.ObjectModel;
using System.Xml.Serialization;

namespace BoardGameArena
{
    public class OnBoardPiece : INotifyPropertyChanged, IHasKey, IXmlSerializable
    {
        public OnBoardPiece()
        {
            _location = new Point(0, 0);
            _angle = 0;
            _side = 0;
            this.piece = null;
            // Start off with a unique Key jut in case
            _key = Guid.NewGuid().ToString();
            _is_locked = false;
        }
        
        public OnBoardPiece(Piece piece) : this()
        {
            this.piece = piece;
        }
        
        public Piece piece;
        Point _location;
        double _angle;
        int _side;
        string _key;
        bool _is_locked;

        public event PropertyChangedEventHandler PropertyChanged;

        private void NotifyPropertyChanged(String info)
        {
            if (PropertyChanged != null)
            {
                PropertyChanged(this, new PropertyChangedEventArgs(info));
            }
        }

        public Point Location
        {
            get
            {
                return (_location);
            }
            set
            {
                if (_location != value)
                {
                    _location = value;
                    NotifyPropertyChanged("Location");
                }
            }
        }

        public double Angle
        {
            get { return (_angle); }
            set
            {
                if (_angle != value)
                {
                    _angle = value;
                    NotifyPropertyChanged("Angle");
                }
            }
        }

        public bool IsLocked
        {
            get { return (_is_locked); }
            set
            {
                if (_is_locked != value)
                {
                    _is_locked = value;
                    NotifyPropertyChanged("IsLocked");
                }
            }
        }

        /// <summary>
        /// Setting side flips the piece, however, it allows positive
        /// values greater than the total side count and mods the value
        /// by the number of sides.
        /// </summary>
        public int Side
        {
            get { return (_side); }
            set
            {
                if ((piece != null) && (piece.Sides.Count > 0))
                {
                    int v = value % piece.Sides.Count;
                    if (_side != v)
                    {
                        _side = v;
                        NotifyPropertyChanged("Side");
                    }
                }
            }
        }

        public string Key
        {
            get
            {
                return _key;
            }
            set
            {
                _key = value;
                NotifyPropertyChanged("Key");
            }
        }

        #region IXmlSerializable Members

        public System.Xml.Schema.XmlSchema GetSchema()
        {
            return null;
        }

        public void ReadXml(System.Xml.XmlReader reader)
        {
            XmlSerializer binary_array_serializer = new XmlSerializer(typeof(byte[]));
            XmlSerializer point_serializer = new XmlSerializer(typeof(Point));
            XmlSerializer double_serializer = new XmlSerializer(typeof(double));
            XmlSerializer int_serializer = new XmlSerializer(typeof(int));
            XmlSerializer bool_serializer = new XmlSerializer(typeof(bool));

            // Read the start element for this object
            reader.Read();
            reader.ReadStartElement("Key");
            Key = System.Text.Encoding.UTF8.GetString(
                (byte [])binary_array_serializer.Deserialize(reader));
            reader.ReadEndElement();
            reader.ReadStartElement("PieceKey");
            string piece_key = System.Text.Encoding.UTF8.GetString(
                (byte[])binary_array_serializer.Deserialize(reader));
            piece = World.piece_library.ItemFromKey(piece_key);
            reader.ReadEndElement();
            reader.ReadStartElement("Location");
            Location = (Point) point_serializer.Deserialize(reader);
            reader.ReadEndElement();
            reader.ReadStartElement("Angle");
            Angle = (double)double_serializer.Deserialize(reader);
            reader.ReadEndElement();
            reader.ReadStartElement("Side");
            Side = (int) int_serializer.Deserialize(reader);
            reader.ReadEndElement();
            reader.ReadStartElement("IsLocked");
            IsLocked = (bool)bool_serializer.Deserialize(reader);
            reader.ReadEndElement();
            // read end element for this object
            reader.ReadEndElement();
        }

        public void WriteXml(System.Xml.XmlWriter writer)
        {
            XmlSerializer binary_array_serializer = new XmlSerializer(typeof(byte[]));
            XmlSerializer point_serializer = new XmlSerializer(typeof(Point));
            XmlSerializer double_serializer = new XmlSerializer(typeof(double));
            XmlSerializer int_serializer = new XmlSerializer(typeof(int));
            XmlSerializer bool_serializer = new XmlSerializer(typeof(bool));

            writer.WriteStartElement("Key");
            binary_array_serializer.Serialize(writer,
                System.Text.Encoding.UTF8.GetBytes(Key));
            writer.WriteEndElement();
            writer.WriteStartElement("PieceKey");
            binary_array_serializer.Serialize(writer,
                System.Text.Encoding.UTF8.GetBytes(piece.Key));
            writer.WriteEndElement();
            writer.WriteStartElement("Location");
            point_serializer.Serialize(writer, Location);
            writer.WriteEndElement();
            writer.WriteStartElement("Angle");
            double_serializer.Serialize(writer, Angle);
            writer.WriteEndElement();
            writer.WriteStartElement("Side");
            int_serializer.Serialize(writer, Side);
            writer.WriteEndElement();
            writer.WriteStartElement("IsLocked");
            bool_serializer.Serialize(writer, IsLocked);
            writer.WriteEndElement();
        }

        #endregion
    }

    public class OnBoardPieces : ObservableLibrary<OnBoardPiece>
    {
    }
}
