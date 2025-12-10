# Automaton Export Format

DFA JSON:
{
  "states": ["S0","S1","S2"],
  "start": "S0",
  "accept": ["S5","S9"],
  "transitions": [
      {"from":"S0","input":"v","to":"S1"},
      {"from":"S1","input":"i","to":"S2"}
  ]
}

AC Trie JSON:
{
  "nodes": [
    {"id":0, "fail":0, "output":[]},
    {"id":1, "fail":0, "output":["virus"]}
  ],
  "edges": [
    {"from":0,"input":"v","to":1},
    {"from":1,"input":"i","to":2}
  ]
}

Scan result:
{
  "packetId": 17,
  "payloadHex": "...",
  "payloadAscii": "...",
  "matches": [
    {"pattern":"virus","position":34},
    {"pattern":"<script","position":80}
  ],
  "steps": [
    {"byte":"76","char":"v","dfaState":"S1","acNode":1},
    {"byte":"69","char":"i","dfaState":"S2","acNode":2}
  ]
}
