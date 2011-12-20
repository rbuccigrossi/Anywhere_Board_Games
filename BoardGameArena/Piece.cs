using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.ComponentModel;
using System.Security.Cryptography;
using System.Collections.ObjectModel;
using System.Xml.Serialization;

namespace BoardGameArena
{
    public class Piece : INotifyPropertyChanged, IHasKey, IXmlSerializable 
    {
        public Piece()
        {
            // Start off with a unique Key jut in case
            _key = Guid.NewGuid().ToString();
        }

        public event PropertyChangedEventHandler PropertyChanged;

        private void NotifyPropertyChanged(String info)
        {
            if (PropertyChanged != null)
            {
                PropertyChanged(this, new PropertyChangedEventArgs(info));
            }
        }
 
        string _name;
        string _key;

        /// <summary>
        /// A piece is a collection of image sides - Note that we don't do notification
        /// if the Sides changed since it itself is observable
        /// </summary>
        public ObservableCollection<PieceImage> Sides = new ObservableCollection<PieceImage>();

        /// <summary>
        /// This is a convenience access to the first side (for binding purposes)
        /// </summary>
        public PieceImage Front {
            get
            {
                if (Sides.Count > 0)
                {
                    return (Sides[0]);
                }
                else
                {
                    return (null);
                }
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

            // Read the start element for this object
            reader.Read();
            // Get Name
            reader.ReadStartElement("Name");
            Name = reader.ReadString();
            reader.ReadEndElement();
            // Get Key
            reader.ReadStartElement("Key");
            Key = System.Text.Encoding.UTF8.GetString(
                (byte [])binary_array_serializer.Deserialize(reader));
            reader.ReadEndElement();

            while (reader.NodeType != System.Xml.XmlNodeType.EndElement)
            {
                reader.ReadStartElement("SideKey");
                string key = System.Text.Encoding.UTF8.GetString(
                    (byte[])binary_array_serializer.Deserialize(reader));
                PieceImage pi = World.image_library.ItemFromKey(key);
                if (pi != null)
                {
                    Sides.Add(pi);
                }
                reader.ReadEndElement();
                reader.MoveToContent();
            }
            // read end element for this object
            reader.ReadEndElement();
        }

        public void WriteXml(System.Xml.XmlWriter writer)
        {
            XmlSerializer binary_array_serializer = new XmlSerializer(typeof(byte[]));

            writer.WriteStartElement("Name");
            writer.WriteString(Name);
            writer.WriteEndElement();
            writer.WriteStartElement("Key");
            binary_array_serializer.Serialize(writer,
                System.Text.Encoding.UTF8.GetBytes(Key));
            writer.WriteEndElement();
            foreach (PieceImage side in this.Sides)
            {
                writer.WriteStartElement("SideKey");
                binary_array_serializer.Serialize(writer,
                    System.Text.Encoding.UTF8.GetBytes(side.Key));
                writer.WriteEndElement();
            }
        }

        #endregion
    }
}
