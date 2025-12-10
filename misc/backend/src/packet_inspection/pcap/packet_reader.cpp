#include "packet_inspection/pcap/packet_reader.hpp"
#include <cstdio>
#include <cstring>
#include <algorithm>
#include <cctype>
#include <sstream>
#include <iomanip>

/**
 * PCAP File Structure:
 * - Global header (24 bytes)
 * - For each packet:
 *   - Packet header (16 bytes)
 *   - Packet data (variable)
 */

// PCAP magic number for native byte order
#define PCAP_MAGIC 0xa1b2c3d4
#define PCAP_MAGIC_SWAPPED 0xd4c3b2a1

std::vector<Packet> PacketReader::readPcapFile(const std::string& pcapFilePath) {
    std::vector<Packet> packets;
    FILE* file = fopen(pcapFilePath.c_str(), "rb");
    
    if (!file) {
        fprintf(stderr, "Error: Could not open PCAP file: %s\n", pcapFilePath.c_str());
        return packets;
    }

    if (!parsePcapHeader(file)) {
        fprintf(stderr, "Error: Invalid PCAP file header\n");
        fclose(file);
        return packets;
    }

    uint32_t packetId = 0;
    uint32_t packetHeader[4];
    const uint32_t PACKET_HEADER_SIZE = 16;
    const uint32_t MAX_PACKET_SIZE = 65535;

    // Read packets until EOF
    while (fread(packetHeader, PACKET_HEADER_SIZE, 1, file) == 1) {
        uint32_t timestamp = packetHeader[0];
        uint32_t incl_len = packetHeader[2];  // Captured packet length

        // Sanity check
        if (incl_len == 0 || incl_len > MAX_PACKET_SIZE) {
            fprintf(stderr, "Warning: Skipping packet with invalid length: %u\n", incl_len);
            continue;
        }

        std::vector<uint8_t> packetData(incl_len);
        if (fread(packetData.data(), incl_len, 1, file) != 1) {
            fprintf(stderr, "Error: Could not read packet data\n");
            break;
        }

        Packet packet = extractTcpPayload(packetData.data(), incl_len, packetId, timestamp);
        if (packet.payloadLength > 0) {
            packets.push_back(packet);
        }
        packetId++;
    }

    fclose(file);
    fprintf(stdout, "Successfully read %zu packets from %s\n", packets.size(), pcapFilePath.c_str());
    return packets;
}

bool PacketReader::parsePcapHeader(FILE* file) {
    uint32_t magic;
    if (fread(&magic, sizeof(uint32_t), 1, file) != 1) {
        return false;
    }

    // Check magic number (supports both byte orders)
    if (magic != PCAP_MAGIC && magic != PCAP_MAGIC_SWAPPED) {
        return false;
    }

    // Skip rest of global header (20 more bytes)
    uint8_t globalHeader[20];
    if (fread(globalHeader, 20, 1, file) != 1) {
        return false;
    }

    return true;
}

Packet PacketReader::extractTcpPayload(const uint8_t* packetData, uint32_t packetLength, 
                                       uint32_t packetId, uint32_t timestamp) {
    Packet packet;
    packet.packetId = packetId;
    packet.timestamp = timestamp;
    packet.payloadLength = 0;

    if (!isValidTcpPacket(packetData, packetLength)) {
        return packet;
    }

    uint32_t payloadStart = findTcpPayloadStart(packetData, packetLength);
    if (payloadStart >= packetLength) {
        return packet;
    }

    uint32_t payloadLen = packetLength - payloadStart;
    if (payloadLen > 0) {
        packet.payloadBytes.insert(packet.payloadBytes.end(),
                                   packetData + payloadStart,
                                   packetData + packetLength);
        packet.payloadHex = bytesToHex(packet.payloadBytes);
        packet.payloadAscii = bytesToAscii(packet.payloadBytes);
        packet.payloadLength = payloadLen;
    }

    return packet;
}

bool PacketReader::isValidTcpPacket(const uint8_t* data, uint32_t length) const {
    // Minimum IPv4 header is 20 bytes, TCP header is 20 bytes
    if (length < 40) {
        return false;
    }

    // Check IPv4 version (first nibble should be 4)
    uint8_t version = (data[0] >> 4) & 0x0F;
    if (version != 4 && version != 6) {
        return false;  // Not IPv4 or IPv6
    }

    // For IPv4: protocol field is at byte 9
    if (version == 4) {
        uint8_t protocol = data[9];
        return protocol == 6;  // TCP protocol number
    }

    // For IPv6: next header field is at byte 6
    if (version == 6) {
        uint8_t nextHeader = data[6];
        return nextHeader == 6;  // TCP protocol number
    }

    return false;
}

uint32_t PacketReader::findTcpPayloadStart(const uint8_t* packetData, uint32_t packetLength) const {
    uint8_t version = (packetData[0] >> 4) & 0x0F;
    uint32_t ipHeaderLen;
    uint32_t tcpHeaderStart;

    if (version == 4) {
        // IPv4: IHL field (low 4 bits of first byte) gives header length in 32-bit words
        ipHeaderLen = (packetData[0] & 0x0F) * 4;
        if (ipHeaderLen < 20 || ipHeaderLen > packetLength) {
            return packetLength;
        }
        tcpHeaderStart = ipHeaderLen;
    } else if (version == 6) {
        // IPv6 has fixed 40-byte header
        ipHeaderLen = 40;
        if (ipHeaderLen > packetLength) {
            return packetLength;
        }
        tcpHeaderStart = ipHeaderLen;
    } else {
        return packetLength;
    }

    // Check if we have enough data for TCP header
    if (tcpHeaderStart + 20 > packetLength) {
        return packetLength;
    }

    // TCP header length is in data offset field (high 4 bits of byte 12 after IP header)
    uint8_t tcpDataOffset = (packetData[tcpHeaderStart + 12] >> 4) & 0x0F;
    uint32_t tcpHeaderLen = tcpDataOffset * 4;

    uint32_t payloadStart = tcpHeaderStart + tcpHeaderLen;
    if (payloadStart > packetLength) {
        return packetLength;
    }

    return payloadStart;
}

std::string PacketReader::bytesToHex(const std::vector<uint8_t>& data) {
    std::stringstream ss;
    for (uint8_t byte : data) {
        ss << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(byte);
    }
    return ss.str();
}

std::string PacketReader::bytesToAscii(const std::vector<uint8_t>& data) {
    std::string ascii;
    for (uint8_t byte : data) {
        if (std::isprint(byte)) {
            ascii += static_cast<char>(byte);
        } else {
            ascii += '.';
        }
    }
    return ascii;
}
