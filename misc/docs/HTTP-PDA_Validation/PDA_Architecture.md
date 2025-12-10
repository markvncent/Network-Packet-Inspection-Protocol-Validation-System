[Frontend UI]
      |
      |  (pcap/hex file)
      v
[C++ Packet Parser]
    - extract TCP streams
    - reassemble HTTP
      |
      v
[PDA HTTP Validator Module]
    - pushdown automaton engine
    - produces trace of transitions
    - returns accept/reject + debug trace
      |
      v
[Frontend Visualization]
