/**
 * Diagnostic tool to test packet generation and PDA validation
 */

import { generatePacket } from './packetGenerator';
import { PDAEngine } from './pdaEngine';

export function testPacketGenerationAndValidation() {
  console.log('=== Testing Packet Generation and PDA Validation ===\n');
  
  // Test 1: Generate a valid HTTP packet
  console.log('Test 1: Generating valid HTTP packet (benign payload)...');
  const packet = generatePacket({
    payloadType: 'benign',
    protocolType: 'valid'
  });
  
  console.log('Generated payload:');
  console.log(JSON.stringify(packet.payload));
  console.log('\nPayload bytes:', packet.payload.length);
  console.log('Payload hex preview:', packet.rawHex.substring(0, 100));
  
  // Test 2: Validate with PDA engine
  console.log('\nTest 2: Validating with PDA engine...');
  const pda = new PDAEngine();
  const isValid = pda.validate(packet.payload);
  const trace = pda.getTrace();
  
  console.log('Validation result:', isValid ? 'VALID' : 'INVALID');
  console.log('Trace length:', trace.length);
  
  // Show first 10 trace steps
  console.log('\nFirst 10 trace steps:');
  trace.slice(0, 10).forEach((step, idx) => {
    console.log(`${idx + 1}. State=${step.state} Input="${step.input}" Stack=${step.stackTop} Action=${step.action}`);
  });
  
  // Show last 10 trace steps
  if (trace.length > 10) {
    console.log('\nLast 10 trace steps:');
    trace.slice(-10).forEach((step, idx) => {
      const actualIdx = trace.length - 10 + idx;
      console.log(`${actualIdx + 1}. State=${step.state} Input="${step.input}" Stack=${step.stackTop} Action=${step.action}`);
    });
  }
  
  // Test 3: Check for common issues
  console.log('\nTest 3: Checking for common issues...');
  
  // Check if payload starts with HTTP method
  if (!/^[A-Z]/.test(packet.payload)) {
    console.log('❌ ERROR: Payload does not start with uppercase letter');
  } else {
    console.log('✓ Payload starts with uppercase letter');
  }
  
  // Check for CRLF CRLF
  if (packet.payload.indexOf('\r\n\r\n') === -1) {
    console.log('❌ ERROR: Missing CRLF CRLF to end headers');
  } else {
    console.log('✓ Contains CRLF CRLF');
  }
  
  // Check request line format
  const requestLineMatch = packet.payload.match(/^([A-Z]+)\s+(\S+)\s+(HTTP\/[\d.]+)\r\n/);
  if (!requestLineMatch) {
    console.log('❌ ERROR: Invalid request line format');
  } else {
    console.log(`✓ Valid request line: ${requestLineMatch[1]} ${requestLineMatch[2]} ${requestLineMatch[3]}`);
  }
  
  // Check Content-Length if body exists
  const headerEnd = packet.payload.indexOf('\r\n\r\n');
  if (headerEnd !== -1) {
    const headers = packet.payload.substring(0, headerEnd + 4);
    const body = packet.payload.substring(headerEnd + 4);
    const contentLengthMatch = headers.match(/content-length:\s*(\d+)/i);
    
    if (body.length > 0) {
      if (!contentLengthMatch) {
        console.log('⚠ WARNING: Body present but no Content-Length header');
      } else {
        const expectedLength = parseInt(contentLengthMatch[1], 10);
        if (body.length !== expectedLength) {
          console.log(`❌ ERROR: Body length mismatch. Expected ${expectedLength}, got ${body.length}`);
        } else {
          console.log(`✓ Content-Length matches body length: ${expectedLength}`);
        }
      }
    } else {
      console.log('✓ No body (GET request)');
    }
  }
  
  return {
    packet,
    isValid,
    trace,
    errors: trace.filter(t => t.state === 'ERROR' || t.action.includes('REJECT') || t.action.includes('invalid') || t.action.includes('expected'))
  };
}

