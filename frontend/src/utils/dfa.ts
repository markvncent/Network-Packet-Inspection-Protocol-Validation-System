/**
 * DFA Module: Defines deterministic finite automaton structure and pattern-based DFA instances
 * This module provides the formal definition of DFAs used for pattern matching in packet inspection
 */

/**
 * DFA Interface - Standard mathematical representation
 * Corresponds to formal definition: M = (Q, Σ, δ, q0, F)
 * Q: states
 * Σ: alphabet (input symbols)
 * δ: transition function
 * q0: start state
 * F: set of accepting states
 */
export interface DFA {
  states: string[];
  alphabet: string[];
  start: string;
  accept: string[];
  transition: Record<string, Record<string, string>>;
}

/**
 * Malicious Pattern DFA
 * Detects common attack patterns: SQL injection, XSS, command injection, etc.
 * Built from patterns: virus, malware, exploit, ransom, <script, base64, eval, etc.
 */
export const maliciousPatternDFA: DFA = {
  states: [
    "q0",     // Start state - no pattern match
    "q_v",    // Partial: "v" (virus/ransom)
    "q_vi",   // Partial: "vi" (virus)
    "q_vir",  // Partial: "vir"
    "q_viru", // Partial: "viru"
    "q_virus", // Accept: "virus" detected
    "q_m",    // Partial: "m" (malware)
    "q_ma",   // Partial: "ma"
    "q_mal",  // Partial: "mal"
    "q_mala", // Partial: "mala"
    "q_malaw", // Partial: "malaw"
    "q_malaw_e", // Partial: "malware"
    "q_malware", // Accept: "malware" detected
    "q_e",    // Partial: "e" (exploit/eval)
    "q_ex",   // Partial: "ex"
    "q_expl", // Partial: "expl"
    "q_explo", // Partial: "explo"
    "q_exploi", // Partial: "exploi"
    "q_exploit", // Accept: "exploit" detected
    "q_ev",   // Partial: "ev"
    "q_eva",  // Partial: "eva"
    "q_eval", // Accept: "eval" detected
    "q_b",    // Partial: "b" (base64)
    "q_ba",   // Partial: "ba"
    "q_bas",  // Partial: "bas"
    "q_base", // Partial: "base"
    "q_base6", // Partial: "base6"
    "q_base64", // Accept: "base64" detected
    "q_script_open",  // Accept: "<script" detected
    "q_script_close", // Accept: "</script" detected
    "q_iframe", // Accept: "<iframe" detected
    "q_sql_or", // Accept: "' OR 1" detected
    "q_union", // Accept: "UNION SELECT" detected
    "q_drop",  // Accept: "DROP TABLE" detected
    "dead"    // Reject state - no valid transition
  ],
  alphabet: [
    "v", "i", "r", "u", "s", // virus letters
    "m", "a", "l", "w", "e", // malware letters
    "x", "p", "o", "t",      // exploit letters
    "b", "4", "6",            // base64 letters/numbers
    "<", ">", "/", "c", "d", "t", "f", // HTML/SQL special
    "=", "'", " ", "O", "1", "U", "N", "L", "S", "C", "D", "P", "T", "R", // SQL/symbols
    // ... and all other ASCII chars
  ],
  start: "q0",
  accept: [
    "q_virus",
    "q_malware",
    "q_exploit",
    "q_eval",
    "q_base64",
    "q_script_open",
    "q_script_close",
    "q_iframe",
    "q_sql_or",
    "q_union",
    "q_drop"
  ],
  transition: {
    // Virus pattern: v-i-r-u-s
    q0: {
      v: "q_v",
      m: "q_m",
      e: "q_e",
      b: "q_b",
      "<": "q_script_open",
      "'": "q_sql_or"
    },
    q_v: { i: "q_vi" },
    q_vi: { r: "q_vir" },
    q_vir: { u: "q_viru" },
    q_viru: { s: "q_virus" },
    q_virus: {},

    // Malware pattern: m-a-l-w-a-r-e
    q_m: { a: "q_ma" },
    q_ma: { l: "q_mal" },
    q_mal: { a: "q_mala" },
    q_mala: { w: "q_malaw" },
    q_malaw: { a: "q_malaw_e" },
    q_malaw_e: { r: "q_malware_r" },
    q_malware_r: { e: "q_malware" },
    q_malware: {},

    // Exploit pattern: e-x-p-l-o-i-t
    q_e: { x: "q_ex" },
    q_ex: { p: "q_expl" },
    q_expl: { l: "q_explo" },
    q_explo: { o: "q_exploi" },
    q_exploi: { i: "q_exploit_i" },
    q_exploit_i: { t: "q_exploit" },
    q_exploit: {},

    // Eval pattern: e-v-a-l (alternative from q_e)
    // q_e can also go to q_ev
    q_ev: { a: "q_eva" },
    q_eva: { l: "q_eval" },
    q_eval: {},

    // Base64 pattern: b-a-s-e-6-4
    q_b: { a: "q_ba" },
    q_ba: { s: "q_bas" },
    q_bas: { e: "q_base" },
    q_base: { "6": "q_base6" },
    q_base6: { "4": "q_base64" },
    q_base64: {},

    // Script tag: <-s-c-r-i-p-t
    q_script_open: { s: "q_script_s" },
    q_script_s: { c: "q_script_c" },
    q_script_c: { r: "q_script_r" },
    q_script_r: { i: "q_script_i" },
    q_script_i: { p: "q_script_p" },
    q_script_p: { t: "q_script_t" },
    q_script_t: {},

    // Close script tag: <-/-s-c-r-i-p-t
    q_script_close: { "/": "q_script_close_slash" },
    q_script_close_slash: { s: "q_script_close_s" },
    q_script_close_s: { c: "q_script_close_c" },
    q_script_close_c: { r: "q_script_close_r" },
    q_script_close_r: { i: "q_script_close_i" },
    q_script_close_i: { p: "q_script_close_p" },
    q_script_close_p: { t: "q_script_close_t" },
    q_script_close_t: {},

    // IFrame tag: <-i-f-r-a-m-e
    q_iframe: { i: "q_iframe_i" },
    q_iframe_i: { f: "q_iframe_f" },
    q_iframe_f: { r: "q_iframe_r" },
    q_iframe_r: { a: "q_iframe_a" },
    q_iframe_a: { m: "q_iframe_m" },
    q_iframe_m: { e: "q_iframe" },

    // SQL Injection: '-space-O-R-space-1
    q_sql_or: { " ": "q_sql_or_space" },
    q_sql_or_space: { O: "q_sql_or_o" },
    q_sql_or_o: { R: "q_sql_or_r" },
    q_sql_or_r: { " ": "q_sql_or_final_space" },
    q_sql_or_final_space: { "1": "q_sql_or" },

    // UNION SELECT
    q_union: { U: "q_union_u" },
    q_union_u: { N: "q_union_n" },
    q_union_n: { I: "q_union_i" },
    q_union_i: { O: "q_union_o" },
    q_union_o: { N: "q_union_final_n" },
    q_union_final_n: { " ": "q_union_space" },
    q_union_space: { S: "q_union_s" },
    q_union_s: { E: "q_union_e" },
    q_union_e: { L: "q_union_l" },
    q_union_l: { E: "q_union_e2" },
    q_union_e2: { C: "q_union_c" },
    q_union_c: { T: "q_union" },

    // DROP TABLE
    q_drop: { D: "q_drop_d" },
    q_drop_d: { R: "q_drop_r" },
    q_drop_r: { O: "q_drop_o" },
    q_drop_o: { P: "q_drop_p" },
    q_drop_p: { " ": "q_drop_space" },
    q_drop_space: { T: "q_drop_t" },
    q_drop_t: { A: "q_drop_a" },
    q_drop_a: { B: "q_drop_b" },
    q_drop_b: { L: "q_drop_l" },
    q_drop_l: { E: "q_drop" },

    dead: {}
  }
};

/**
 * Benign Web Traffic DFA
 * Accepts common HTTP methods and headers
 */
export const benignTrafficDFA: DFA = {
  states: ["q0", "q_GET", "q_POST", "q_HEAD", "accept", "dead"],
  alphabet: ["G", "E", "T", "P", "O", "S", "H", "A", "D"],
  start: "q0",
  accept: ["accept"],
  transition: {
    q0: { G: "q_GET", P: "q_POST", H: "q_HEAD" },
    q_GET: { E: "q_GET_E" },
    q_GET_E: { T: "accept" },
    q_POST: { O: "q_POST_O" },
    q_POST_O: { S: "q_POST_S" },
    q_POST_S: { T: "accept" },
    q_HEAD: { E: "q_HEAD_E" },
    q_HEAD_E: { A: "q_HEAD_A" },
    q_HEAD_A: { D: "accept" },
    accept: {},
    dead: {}
  }
};

/**
 * Simple Test DFA - for demo purposes
 * Accepts: "hello"
 */
export const simpleDFA: DFA = {
  states: ["q0", "q1", "q2", "q3", "q4", "q5", "accept"],
  alphabet: ["h", "e", "l", "o"],
  start: "q0",
  accept: ["accept"],
  transition: {
    q0: { h: "q1" },
    q1: { e: "q2" },
    q2: { l: "q3" },
    q3: { l: "q4" },
    q4: { o: "q5" },
    q5: { o: "accept" },
    accept: {}
  }
};
