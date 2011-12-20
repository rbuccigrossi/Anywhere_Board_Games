using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Collections.ObjectModel;
using System.Xml.Serialization;

namespace BoardGameArena
{
    /// <summary>
    /// Represents an item that has the "Key" property, which can then
    /// be used in an ObservableLibrary
    /// </summary>
    public interface IHasKey
    {
        string Key {
            get;
        }
    }
    
    /// <summary>
    /// This implements an ObservableCollection that has duplicates its
    /// entries in a dictionary for quick retrieval.  The entries in the 
    /// collection must implement IHasKey that must have a unique key set 
    /// before insertion into the library (otherwise exceptions will occur)
    /// </summary>
    public class ObservableLibrary<T> : ObservableCollection<T>, IXmlSerializable where T : IHasKey
    {
        private Dictionary<string,T> _dict = new Dictionary<string,T> ();

        public ObservableLibrary()
        {
        }

        /// <summary>
        /// This will fail if the key is already in the library
        /// </summary>
        /// <param name="item"></param>
        public new void Add(T item)
        {
            _dict.Add(item.Key, item);
            base.Add(item);
        }

        public new void Clear()
        {
            base.Clear();
            _dict.Clear();
        }

        public new void ClearItems()
        {
            base.ClearItems();
            _dict.Clear();
        }

        /// <summary>
        /// This will fail if the key is already in the library
        /// </summary>
        public new void Insert(int index, T item)
        {
            _dict.Add(item.Key, item);
            base.Insert(index, item);
        }

        /// <summary>
        /// This will fail if the key is already in the library
        /// </summary>
        public new void InsertItem(int index, T item)
        {
            _dict.Add(item.Key, item);
            base.InsertItem(index, item);
        }

        public new bool Remove(T item)
        {
            if (base.Remove(item))
            {
                _dict.Remove(item.Key);
                return (true);
            }
            else
            {
                return (false);
            }
        }

        public new void RemoveAt(int index)
        {
            T item = this[index];
            _dict.Remove(item.Key);
            base.RemoveAt(index);
        }

        public new void RemoveItem(int index)
        {
            T item = this[index];
            _dict.Remove(item.Key);
            base.RemoveAt(index);
        }

        protected override void SetItem(int index, T item)
        {
            base.SetItem(index, item);
            _dict[item.Key] = item;
        }

        /// <summary>
        /// Setting will fail if the key is already in the library
        /// </summary>
        /// <param name="index"></param>
        /// <returns></returns>
        public new T this[int index]
        {
            get 
            { 
                return base[index]; 
            }
            set
            {
                _dict.Add(value.Key, value);
                base[index] = value;
            }
        }

        public T ItemFromKey(string key)
        {
            T value;
            if (_dict.TryGetValue(key, out value))
            {
                return (value);
            }
            else
            {
                return (default(T)); // Null for references, 0 for built-ins
            }
        }

        public bool ContainsKey(string key)
        {
            return (_dict.ContainsKey(key));
        }

        #region IXmlSerializable Members

        public System.Xml.Schema.XmlSchema GetSchema()
        {
            return null;
        }

        public void ReadXml(System.Xml.XmlReader reader)
        {

            XmlSerializer itemSerializer = new XmlSerializer(typeof(T));

            bool wasEmpty = reader.IsEmptyElement;
            reader.Read();

            if (wasEmpty)
                return;

            while (reader.NodeType != System.Xml.XmlNodeType.EndElement)
            {
                reader.ReadStartElement("item");
                T item = (T)itemSerializer.Deserialize(reader);
                this.Add(item);
                reader.ReadEndElement();
                reader.MoveToContent();
            }
            reader.ReadEndElement();
        }

        public void WriteXml(System.Xml.XmlWriter writer)
        {
            XmlSerializer itemSerializer = new XmlSerializer(typeof(T));

            foreach (T item in this)
            {
                writer.WriteStartElement("item");
                itemSerializer.Serialize(writer, item);
                writer.WriteEndElement();
            }
        }

        #endregion
    }


}
