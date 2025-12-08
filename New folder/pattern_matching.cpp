#include <iostream>
#include <vector>
#include <string>
#include <map>
#include <set>
#include <algorithm>

using namespace std;

struct Production {
    string lhs;
    vector<string> rhs; // either size 1 (terminal string like "a") or size 2 (variables)
};

class CNFGrammar {
public:
    vector<Production> rules;

    // Build grammar from a list of patterns
    void build(const vector<string>& patterns) {
        // clear any existing rules
        rules.clear();
        termVar.clear();
        patternRoots.clear();
        nextTermId = 1;
        nextBinId = 1;

        // create a terminal-variable for every terminal character encountered
        for (const string &p : patterns) {
            string root = makePatternRootName(p);
            buildPatternCNF(p, root);
            patternRoots.push_back(root);
        }

        // combine all pattern roots under S using a binary tree
        if (patternRoots.empty()) {
            // nothing to do
            return;
        } else if (patternRoots.size() == 1) {
            // rename the single root to S (keeps CNF)
            renameVariable(patternRoots[0], "S");
            patternRoots[0] = "S";
        } else {
            string top = buildBinaryTree("S", patternRoots);
            // ensure top is S (buildBinaryTree links everything under S)
            (void)top;
        }
    }

    void print() const {
        for (const auto &p : rules) {
            cout << p.lhs << " -> ";
            if (p.rhs.size() == 1) {
                // terminal production: show terminal literal in quotes for clarity
                cout << "'" << escapePrintable(p.rhs[0]) << "'";
            } else {
                cout << p.rhs[0] << " " << p.rhs[1];
            }
            cout << "\n";
        }
    }

private:
    map<string,string> termVar; // terminal char -> variable name (e.g. " " -> T_32)
    vector<string> patternRoots;
    int nextTermId = 1;
    int nextBinId  = 1;

    // sanitize and produce a root variable name for a pattern
    string makePatternRootName(const string &p) {
        // produce a deterministic short id derived from a hash of p
        // but keep readable: use prefix P_ + numeric id (based on nextBinId)
        // We'll use a stable name using nextBinId to avoid collisions
        string name = "P";
        name += to_string(nextBinId++);
        return name;
    }

    // produce or return a terminal variable for a given single character
    string ensureTermVar(char c) {
        string key(1, c);
        auto it = termVar.find(key);
        if (it != termVar.end()) return it->second;

        // create a new terminal variable name
        // name encodes ASCII code to keep unique and readable
        int code = static_cast<unsigned char>(c);
        string v = "T_" + to_string(code);
        // avoid accidental collisions if T_code already used with different key:
        // but since key uses character distinct, this is fine.
        termVar[key] = v;

        // add rule: v -> c (terminal production)
        string termStr(1, c);
        addTerminal(v, termStr);
        return v;
    }

    // add a rule A -> terminal (single-character string)
    void addTerminal(const string &A, const string &term) {
        rules.push_back({A, {term}});
    }

    // add a binary rule A -> B C (both B and C are variables)
    void addBinary(const string &A, const string &B, const string &C) {
        rules.push_back({A, {B, C}});
    }

    // Build CNF for a single pattern p with designated root variable name 'root'.
    // Pattern is viewed as sequence of characters p[0] .. p[k-1].
    // Construction (for k >= 2):
    //   create variables V0 .. V_{k-2} where
    //     V_i -> TERM(p[i]) V_{i+1}   (for i = 0 .. k-3)
    //     V_{k-2} -> TERM(p[k-2]) TERM(p[k-1])
    // The whole pattern's root is V0 (or if k==1, root -> terminal)
    void buildPatternCNF(const string &p, const string &root) {
        int k = (int)p.size();
        if (k == 0) {
            // no terminals: do nothing (empty pattern)
            return;
        }
        if (k == 1) {
            // single-character pattern: root -> 'c'
            addTerminal(root, string(1, p[0]));
            return;
        }

        // prepare variable names V0..V_{k-2}
        vector<string> V;
        for (int i = 0; i <= k - 2; ++i) {
            V.push_back(root + "_V" + to_string(i+1));
        }

        // create terminal variables for each char as needed
        vector<string> T(k);
        for (int i = 0; i < k; ++i) {
            T[i] = ensureTermVar(p[i]);
        }

        // build rules:
        // V0 is the pattern root (rename V0 -> root to keep user-specified root)
        // So all V[i] created use full names, then we will alias root -> V0 by adding a binary/terminal?
        // Simpler: we'll use root as V0's name
        // So adjust names: use root as V[0]
        string V0 = root;
        // rename V[0] internal name to root by shifting indices
        // We'll create rules using V0==root and V[1..] as root_V2...
        vector<string> vars;
        vars.push_back(V0);
        for (int i = 1; i < (int)V.size(); ++i) vars.push_back(V[i]);

        // Now add productions:
        // for i = 0 .. k-3: Vi -> TERM(p[i]) Vi+1
        for (int i = 0; i <= k - 3; ++i) {
            string Vi = vars[i];
            string Ti = T[i];
            string Vi1 = vars[i+1];
            addBinary(Vi, Ti, Vi1);
        }

        // last binary: V_{k-2} -> TERM(p[k-2]) TERM(p[k-1])
        string Vlast = vars.back();      // corresponds to V_{k-2}
        string Tpenult = T[k-2];
        string Tlast   = T[k-1];
        addBinary(Vlast, Tpenult, Tlast);
    }

    // Build a binary tree combining 'vars' two-by-two until one variable remains under 'rootName'.
    // The function returns the final top variable (should be "S" for the top call).
    string buildBinaryTree(const string &rootName, vector<string> vars) {
        // if initial call, we want to produce S -> X Y ... via intermediate nodes.
        // We'll iteratively pair adjacent variables into new nodes until one stays.
        if (vars.empty()) return "";

        // If only two vars, directly create S -> vars[0] vars[1]
        if (vars.size() == 2) {
            addBinary(rootName, vars[0], vars[1]);
            return rootName;
        }

        // If more than two, iteratively combine pairs into new variables
        vector<string> current = vars;
        vector<string> next;

        // repeatedly combine adjacent pairs
        while (current.size() > 1) {
            next.clear();
            for (size_t i = 0; i < current.size(); i += 2) {
                if (i + 1 < current.size()) {
                    // combine current[i] and current[i+1] into newVar
                    string newVar;
                    // If we are about to finish to a single variable and we are the topmost iteration create under rootName
                    if (current.size() == 2 && next.empty()) {
                        // this means we are at the top level: create rootName -> current[0] current[1]
                        addBinary(rootName, current[0], current[1]);
                        next.push_back(rootName);
                    } else {
                        // normal internal node
                        newVar = rootName + "_N" + to_string(next.size() + (int)next.size() + next.size() + next.size() + next.size() + next.size()); 
                        // above is to produce unique-ish name; simpler use global counter:
                        newVar = rootName + "_N" + to_string(nextBinId++);
                        addBinary(newVar, current[i], current[i+1]);
                        next.push_back(newVar);
                    }
                } else {
                    // odd element, carry forward unchanged
                    next.push_back(current[i]);
                }
            }
            current.swap(next);
        }

        // At end, current.size() == 1
        // If the final single node is not rootName, and we haven't explicitly linked it to rootName yet,
        // create rootName -> thatNode, but CNF forbids unary rules. Instead, we should arrange so the top-level
        // step already created rootName. To keep safe, if we end with a single node that's not rootName, and it's already rootName then fine.
        // Otherwise rename it to rootName.
        if (current.size() == 1 && current[0] != rootName) {
            // rename the single variable to rootName (preserves CNF)
            renameVariable(current[0], rootName);
            return rootName;
        }

        return current[0];
    }

    // rename occurrences of variable 'from' to 'to' in all existing rules
    void renameVariable(const string &from, const string &to) {
        for (auto &r : rules) {
            if (r.lhs == from) r.lhs = to;
            for (auto &s : r.rhs) {
                if (s == from) s = to;
            }
        }
    }

    // helper to print non-printable char codes more readably
    static string escapePrintable(const string &s) {
        if (s.empty()) return "";
        unsigned char c = s[0];
        if (isprint(c)) return s;
        // otherwise return numeric code
        return "\\" + to_string((int)c);
    }
};

int main() {
    vector<string> patterns = {
        "virus","malware","exploit","ransom",
        "<script","</script","base64","eval","<iframe",
        ";r","&&w","|b",
        "' OR 1","UNION SELECT","DROP TABLE",
        "login","verify","password","account"
    };

    CNFGrammar g;
    g.build(patterns);
    g.print();

    return 0;
}
