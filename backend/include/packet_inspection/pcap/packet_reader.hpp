#ifndef PACKET_READER_HPP
#define PACKET_READER_HPP

#include <string>
#include <vector>
#include <cstdint>
#include <memory>

/**
 * Represents a single packet extracted from a PCAP file
 */
struct Packet {
    uint32_t packetId;
    std::vector<uint8_t> payloadBytes;
    std::string payloadHex;
    std::string payloadAscii;
    uint32_t payloadLength;
    uint32_t timestamp;
};

/**
 * PacketReader: Loads PCAP files and extracts TCP payloads
 * Provides raw bytes, hex encoding, and ASCII representation
 */
class PacketReader {
public:
    PacketReader() = default;
    ~PacketReader() = default;

    /**
     * Load and parse a PCAP file
     * @param pcapFilePath Path to the .pcap file
     * @return Vector of extracted packets
     */
    std::vector<Packet> readPcapFile(const std::string& pcapFilePath);

    /**
     * Extract TCP payload from packet data
     * @param packetData Raw packet data
     * @param packetLength Length of packet data
     * @return Packet struct with payload extracted
     */
    Packet extractTcpPayload(const uint8_t* packetData, uint32_t packetLength, uint32_t packetId, uint32_t timestamp);

    /**
     * Convert bytes to hex string
     * @param data Byte vector
     * @return Hex string representation (lowercase)
     */
    static std::string bytesToHex(const std::vector<uint8_t>& data);

    /**
     * Convert bytes to ASCII string (non-printable chars as '.')
     * @param data Byte vector
     * @return ASCII string representation
     */
    static std::string bytesToAscii(const std::vector<uint8_t>& data);

private:
    /**
     * Parse PCAP file header
     * @param file File handle
     * @return true if valid PCAP file
     */
    bool parsePcapHeader(FILE* file);

    /**
     * Check if byte sequence looks like TCP/IP packet
     * @param data Packet data
     * @param length Packet length
     * @return true if valid IPv4/TCP structure detected
     */
    bool isValidTcpPacket(const uint8_t* data, uint32_t length) const;

    /**
     * Find TCP payload start in packet (skip IP and TCP headers)
     * @param packetData Raw packet data
     * @param packetLength Length of packet data
     * @return Offset to start of TCP payload
     */
    uint32_t findTcpPayloadStart(const uint8_t* packetData, uint32_t packetLength) const;
};

#endif // PACKET_READER_HPP
