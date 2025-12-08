cmake_minimum_required(VERSION 3.16)
project(automata_network_backend LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find required packages
find_package(nlohmann_json 3.11.0 QUIET)
if (NOT nlohmann_json_FOUND)
    include(FetchContent)
    FetchContent_Declare(json URL https://github.com/nlohmann/json/releases/download/v3.11.3/json.tar.xz)
    FetchContent_MakeAvailable(json)
endif()

# Packet inspection library
add_library(packet_inspection
    src/packet_inspection/pcap/packet_reader.cpp
    src/packet_inspection/ac/aho_corasick.cpp
    src/packet_inspection/dfa/dfa_builder.cpp
    src/packet_inspection/utils/patterns_loader.cpp
)

target_include_directories(packet_inspection
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)

target_link_libraries(packet_inspection PUBLIC nlohmann_json::nlohmann_json)

# Legacy automata backend library (kept for compatibility)
add_library(automata_backend
    src/packet_inspection/dfa/dfa_matcher.cpp
    src/protocol_validation/http_pda/http_pda_validator.cpp
)

target_include_directories(automata_backend
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)

# API Server executable (requires Crow library)
# Note: Crow is header-only, so we just need to find it
find_package(Crow QUIET)
if (Crow_FOUND OR EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/external/Crow")
    add_executable(packet_inspection_server
        src/main.cpp
    )

    target_link_libraries(packet_inspection_server PRIVATE packet_inspection Crow::Crow nlohmann_json::nlohmann_json)
    
    message(STATUS "Building packet inspection API server")
else()
    message(WARNING "Crow library not found, skipping API server build. Install Crow: https://github.com/CrowCpp/Crow")
endif()

# Test executable (legacy demo, can be updated)
add_executable(automata_demo
    src/main.cpp
)

target_link_libraries(automata_demo PRIVATE packet_inspection automata_backend)


