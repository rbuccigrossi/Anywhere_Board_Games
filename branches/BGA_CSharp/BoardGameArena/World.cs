using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Xml.Serialization;
using System.IO;
using System.Xml;

namespace BoardGameArena
{
    class World
    {
        static public PieceImageLibrary image_library = new PieceImageLibrary();
        static public PieceLibrary piece_library = new PieceLibrary();
        static public OnBoardPieces on_board_pieces = new OnBoardPieces();
        
        static public void SaveWorld(string filename)
        {
            XmlSerializer piece_image_library_serializer = new XmlSerializer(typeof(PieceImageLibrary));
            XmlSerializer piece_library_serializer = new XmlSerializer(typeof(PieceLibrary));
            XmlSerializer on_board_pieces_serializer = new XmlSerializer(typeof(OnBoardPieces));
            XmlWriter writer = XmlWriter.Create(filename);
            writer.WriteStartElement("BoardGameArenaWorld");
            piece_image_library_serializer.Serialize(writer, image_library);
            piece_library_serializer.Serialize(writer, piece_library);
            on_board_pieces_serializer.Serialize(writer, on_board_pieces);
            writer.WriteEndElement();
            writer.Close();
        }

        static public void LoadWorld(string filename)
        {
            XmlSerializer piece_image_library_serializer = new XmlSerializer(typeof(PieceImageLibrary));
            XmlSerializer piece_library_serializer = new XmlSerializer(typeof(PieceLibrary));
            XmlSerializer on_board_pieces_serializer = new XmlSerializer(typeof(OnBoardPieces));
            XmlReader reader = XmlReader.Create(filename);
            reader.ReadStartElement("BoardGameArenaWorld");
            image_library = (PieceImageLibrary) piece_image_library_serializer.Deserialize(reader);
            // The image_library needs to be defined before we deserialize the piece_library
            piece_library = (PieceLibrary) piece_library_serializer.Deserialize(reader);
            // The piece_library needs to be defined before we deserialize the on_board_pieces
            on_board_pieces = (OnBoardPieces)on_board_pieces_serializer.Deserialize(reader);
            reader.ReadEndElement();
            reader.Close();
        }

        static public void ClearWorld()
        {
            image_library = new PieceImageLibrary();
            piece_library = new PieceLibrary();
            on_board_pieces = new OnBoardPieces();
        }
    }
}
