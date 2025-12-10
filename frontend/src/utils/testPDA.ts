/**
 * Test PDA validation with generated packets
 */

import { generatePacket } from './packetGenerator';
import { PDAEngine } from './pdaEngine';

export function testPDAValidation() {
  console.log('=== PDA Validation Test ===\n');
  
  // Test with a simple GET request (no body)
  const testPayload = 'GET /index.html HTTP/1.1\r\nHost: example.com\r\nConnection: close\r\n\r\n';
  
  console.log('Test 1: Simple GET request');
  console.log('Payload:', JSON.stringify(testPayload));
  console.log('Payload length:', testPayload.length);
  console.log('Ends with CRLF CRLF:', testPayload.endsWith('\r\n\r\n'));
  
  const pda1 = new PDAEngine();
  const result1 = pda1.validate(testPayload);
  const trace1 = pda1.getTrace();
  
  console.log('Result:', result1 ? 'VALID' : 'INVALID');
  console.log('Final state:', trace1[trace1.length - 1]?.state);
  console.log('Last action:', trace1[trace1.length - 1]?.action);
  
  if (!result1) {
    console.log('\nError trace:');
    trace1.filter(t => t.state === 'ERROR' || t.action.includes('REJECT') || t.action.includes('invalid') || t.action.includes('expected')).forEach(t => {
      console.log(`  State=${t.state} Input="${t.input}" Action=${t.action}`);
    });
  }
  
  // Test with generated packet
  console.log('\n\nTest 2: Generated valid HTTP packet');
  const packet = generatePacket({
    payloadType: 'benign',
    protocolType: 'valid'
  });
  
  console.log('Generated payload:');
  console.log(JSON.stringify(packet.payload));
  console.log('Payload length:', packet.payload.length);
  console.log('Has CRLF CRLF:', packet.payload.indexOf('\r\n\r\n') !== -1);
  
  const pda2 = new PDAEngine();
  const result2 = pda2.validate(packet.payload);
  const trace2 = pda2.getTrace();
  
  console.log('Result:', result2 ? 'VALID' : 'INVALID');
  console.log('Final state:', trace2[trace2.length - 1]?.state);
  console.log('Last action:', trace2[trace2.length - 1]?.action);
  
  if (!result2) {
    console.log('\nError trace:');
    trace2.filter(t => t.state === 'ERROR' || t.action.includes('REJECT') || t.action.includes('invalid') || t.action.includes('expected')).forEach(t => {
      console.log(`  State=${t.state} Input="${t.input}" Action=${t.action}`);
    });
    
    console.log('\nFull trace (last 20 steps):');
    trace2.slice(-20).forEach((t, idx) => {
      console.log(`${trace2.length - 20 + idx + 1}. State=${t.state} Input="${t.input}" Stack=${t.stackTop} Action=${t.action}`);
    });
  }
  
  return { test1: result1, test2: result2, trace1, trace2 };
}

