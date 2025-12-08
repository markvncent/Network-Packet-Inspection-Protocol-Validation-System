# Packet Inspection System - Testing Guide

## Quick Start Testing

### Test 1: Generate and Inspect Benign Packet

1. **Open PacketGenerator Modal**
   - Click "Generate Packet" button in Packet Intake card
   - Leave defaults: Type = "Benign", Protocol = "HTTP"

2. **Generate & Download**
   - Click "Generate Packet"
   - Click "Download as Text" or "Download as Hex"
   - This creates a benign HTTP packet with GET/POST method

3. **Upload & Inspect**
   - Back in main interface, click "Upload or Add Packet"
   - Select the generated text/hex file
   - Click "Packet Inspection" button in Inspection Controls

4. **Expected Results in Result View**
   - ✅ Status: **SAFE - BENIGN TRAFFIC** (Green, 80%+ confidence)
   - DFA Used: Benign Traffic DFA
   - Detected Benign Indicators:
     - ✓ Valid HTTP signature: GET
     - ✓ Valid HTTP signature: POST  
     - ✓ Standard HTTP headers present
     - ✓ Low suspicious character count
   - DFA State Transitions: Should show path through benign pattern matcher

---

### Test 2: Generate and Inspect Malicious Packet

1. **Open PacketGenerator Modal**
   - Click "Generate Packet" in Packet Intake
   - Change: Type = "Malicious", Protocol = "HTTP"

2. **Generate & Download**
   - Click "Generate Packet"
   - The generation log will show one of these patterns:
     - `virus_payload.exe`
     - `malware_detection`
     - `exploit_kit_payload`
     - `eval(dangerous_code)`
     - `base64_encoded_malware`
     - `<script>alert("xss")</script>`
     - `'; DROP TABLE users; --`
     - `UNION SELECT * FROM passwords`
     - `; rm -rf /`
   - Click download

3. **Upload & Inspect**
   - Click "Upload or Add Packet" → Select generated file
   - Click "Packet Inspection" button

4. **Expected Results in Result View**
   - 🛑 Status: **ALERT - MALICIOUS TRAFFIC** (Red, 90%+ confidence)
   - DFA Used: Malicious Pattern DFA
   - Malicious Indicators section showing detected pattern:
     - 🛑 DFA Pattern Detected: [virus|malware|exploit|SQL injection|etc]
     - 🛑 Corresponding attack type message
   - DFA State Transitions: Should show path through malicious pattern matcher

---

### Test 3: Manual Text File Creation

Create a file with exact content to test specific patterns:

**benign_test.txt:**
```
GET /api/users HTTP/1.1
Host: api.example.com
User-Agent: Mozilla/5.0
Accept: application/json
Connection: close

```

**Expected:** ✅ SAFE - Green status, benign indicators

---

**malicious_test.txt:**
```
GET /search HTTP/1.1
Host: example.com
Cookie: id='; DROP TABLE users; --
Connection: close

```

**Expected:** 🛑 ALERT - Red status, SQL injection detected

---

**exploit_test.txt:**
```
GET /api HTTP/1.1
Host: target.com
X-Payload: exploit_kit_payload
Connection: close

```

**Expected:** 🛑 ALERT - Red status, exploit pattern detected

---

## DFA State Visualization

When results display, the "DFA State Transitions" section shows:
- **State Sequence**: Linear path through DFA states as each character is processed
- **Current State**: Which state was last reached
- **Transitions**: Symbol → State mappings
- **First 10 States**: Displayed inline, with "... +X more" if longer

### Example Benign State Path:
```
q0 → q_G → q_E → q_T → q_space → q_/ → ... (benign HTTP method match)
```

### Example Malicious State Path:
```
q0 → q_' → q_sql_or → q_drop → q_t → q_a → ... (SQL injection pattern)
```

---

## Confidence Score Interpretation

- **90-100%**: High confidence classification
  - Benign: Clear HTTP headers + low suspicious chars
  - Malicious: Direct signature matches (virus, exploit, SQL, etc)

- **70-89%**: Medium confidence
  - Some indicators present but not definitive
  - Mixed signals in content

- **50-69%**: Low confidence
  - Ambiguous content
  - Defaults to benign if unclear

---

## Classification Logic

The `dfaPacketInspection.ts` module uses:

1. **Definite Malicious Signatures** (25 points each):
   - virus, malware, exploit, eval, base64, <script>, </script>, <iframe>, SQL patterns

2. **Pattern Detection** (20 points):
   - SQL injection: `['"`];|--` + SQL keywords
   - Command injection: Shell chars + bash/cmd/powershell
   - XSS: `<script>`, `javascript:`, `onerror=`

3. **Benign Indicators** (15 points each):
   - Valid HTTP methods: GET, POST, HEAD, PUT, DELETE, PATCH
   - HTTP version: HTTP/1.1, HTTP/2
   - Standard headers: User-Agent, Content-Type, Accept, Host

4. **Final Decision**:
   - If Malicious Score > Benign Score → MALICIOUS
   - Else if Benign Score > Malicious Score → BENIGN
   - Else if HTTP/1.1 detected → BENIGN (likely safe)
   - Else → BENIGN (conservative default)

---

## Troubleshooting

### Status shows "INSPECTING" forever
- Check browser console (F12) for errors
- Verify file was successfully uploaded
- Try with a smaller file first

### No Results in Result View
- Ensure "Packet Inspection" button was clicked (not "Protocol Validation")
- Check that a file is uploaded (should see filename in Packet Intake box)
- Verify file content is valid text (not corrupted binary)

### Classification seems incorrect
- Check the "Detected Signatures" section for what was found
- Verify packet contains expected patterns
- Generate a new packet and re-test

### DFA State Transitions not showing
- Ensure payload is not empty
- Check that inspection completed (dfaStatus changed from 'inspecting')
- Result View should show state sequence even if classification is uncertain

---

## Test Coverage Checklist

- [ ] Generate benign HTTP packet → Upload → See SAFE status
- [ ] Generate malicious packet → Upload → See ALERT status
- [ ] Create benign_test.txt → Upload → See benign classification
- [ ] Create malicious_test.txt with SQL → Upload → See malicious + SQL indicator
- [ ] Create exploit_test.txt → Upload → See malicious + exploit indicator
- [ ] Try hex format file (.hex) → Should parse and classify correctly
- [ ] Try oversized payload (1000+ chars) → Should still process
- [ ] Check DFA state path displays correctly for both benign and malicious
- [ ] Export result as JSON → Should download successfully
- [ ] Click "Inspect Different Packet" → Should reset ResultsView
- [ ] Upload new packet after inspection → ResultsView should update

---

## Performance Expectations

- **Inspection Time**: < 100ms for payloads < 10KB (sync processing)
- **Display Time**: < 500ms for state visualization
- **Memory**: Minimal impact (DFA engine is lightweight)

---

## Next Steps for Improvement

1. **Backend Integration**: Connect C++ DFA results when backend ready
2. **Live Capture**: Add PCAP parsing for network packets
3. **Pattern Database**: Make malicious signatures configurable
4. **Analytics**: Track detection accuracy over time
5. **Export Formats**: CSV, HTML report generation
6. **Visualization**: Enable ReactFlow for interactive state diagrams (optional)
