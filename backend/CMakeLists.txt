cmake_minimum_required(VERSION 3.16)
project(automata_network_backend LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_library(automata_backend
    src/packet_inspection/dfa/dfa_matcher.cpp
    src/protocol_validation/http_pda/http_pda_validator.cpp
)

target_include_directories(automata_backend
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)

add_executable(automata_demo
    src/main.cpp
)

target_link_libraries(automata_demo PRIVATE automata_backend)


