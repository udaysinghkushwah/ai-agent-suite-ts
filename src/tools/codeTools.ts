/**
 * src/tools/codeTools.ts
 * Code analysis tools: AST parsing, security scanning, complexity analysis.
 */
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// ── Syntax / AST Analysis ─────────────────────────────────────────────────────

export const analyzeSyntax = tool(
  async ({ code, language }: { code: string; language: string }): Promise<string> => {
    if (language.toLowerCase() === "typescript" || language.toLowerCase() === "javascript") {
      try {
        // Dynamic import to avoid issues if not installed
        const { parse } = await import("@typescript-eslint/typescript-estree");
        const ast = parse(code, { jsx: true, loc: true, range: true });

        const lines = code.split("\n").length;
        const functions: string[] = [];
        const classes: string[] = [];
        const imports: string[] = [];

        function walk(node: any) {
          if (!node || typeof node !== "object") return;
          if (
            node.type === "FunctionDeclaration" ||
            node.type === "ArrowFunctionExpression" ||
            node.type === "FunctionExpression"
          ) {
            if (node.id?.name) functions.push(node.id.name);
          }
          if (node.type === "ClassDeclaration" && node.id?.name) {
            classes.push(node.id.name);
          }
          if (node.type === "ImportDeclaration") {
            imports.push(`import from '${node.source.value}'`);
          }
          for (const key of Object.keys(node)) {
            if (Array.isArray(node[key])) node[key].forEach(walk);
            else if (node[key] && typeof node[key] === "object") walk(node[key]);
          }
        }
        walk(ast);

        return [
          `✅ Syntax: Valid ${language}`,
          `📏 Lines: ${lines}`,
          `🔧 Functions: ${functions.length > 0 ? functions.join(", ") : "none"}`,
          `🏛️  Classes: ${classes.length > 0 ? classes.join(", ") : "none"}`,
          `📦 Imports: ${imports.length > 0 ? imports.join(", ") : "none"}`,
        ].join("\n");
      } catch (e: any) {
        return `❌ Syntax Error: ${e.message}`;
      }
    }
    // Generic analysis for other languages
    const lines = code.split("\n");
    return [
      `ℹ️  Language: ${language} (basic analysis)`,
      `📏 Lines: ${lines.length}`,
      `📝 Non-empty lines: ${lines.filter((l) => l.trim()).length}`,
    ].join("\n");
  },
  {
    name: "analyze_syntax",
    description: "Parse code and check for syntax errors. Returns structure summary.",
    schema: z.object({
      code: z.string().describe("The source code to analyze"),
      language: z.string().describe("Programming language (typescript, javascript, python, etc.)"),
    }),
  }
);

// ── Security Scanner ──────────────────────────────────────────────────────────

export const checkSecurity = tool(
  async ({ code }: { code: string }): Promise<string> => {
    const lines = code.split("\n");
    const issues: string[] = [];

    const patterns: [RegExp, string][] = [
      [/eval\s*\(/, "🔴 HIGH: eval() — arbitrary code execution risk"],
      [/new Function\s*\(/, "🔴 HIGH: new Function() — arbitrary code execution risk"],
      [/dangerouslySetInnerHTML/, "🔴 HIGH: dangerouslySetInnerHTML — XSS risk"],
      [/innerHTML\s*=/, "🟡 MEDIUM: innerHTML assignment — potential XSS"],
      [/document\.write\s*\(/, "🟡 MEDIUM: document.write() — XSS risk"],
      [/password\s*[:=]\s*['"`][^'"`]+['"`]/, "🟠 MEDIUM: Hardcoded password"],
      [/api_?key\s*[:=]\s*['"`][^'"`]+['"`]/i, "🟠 MEDIUM: Hardcoded API key"],
      [/secret\s*[:=]\s*['"`][^'"`]+['"`]/i, "🟠 MEDIUM: Hardcoded secret"],
      [/Math\.random\(\)/, "🟡 LOW: Math.random() is not cryptographically secure"],
      [/md5/i, "🟡 LOW: MD5 is cryptographically weak"],
      [/process\.env\.\w+\s*\|\|\s*['"`]/, "🟢 INFO: Env var with fallback value"],
    ];

    for (let i = 0; i < lines.length; i++) {
      for (const [pattern, message] of patterns) {
        if (pattern.test(lines[i])) {
          issues.push(`  Line ${i + 1}: ${message}`);
        }
      }
    }

    if (issues.length === 0) return "✅ No obvious security issues detected.";
    return "🔒 Security Scan Results:\n" + issues.join("\n");
  },
  {
    name: "check_security",
    description: "Scan code for common security vulnerabilities and anti-patterns.",
    schema: z.object({
      code: z.string().describe("The source code to scan"),
    }),
  }
);

// ── Complexity Analyzer ───────────────────────────────────────────────────────

export const analyzeComplexity = tool(
  async ({ code }: { code: string }): Promise<string> => {
    const lines = code.split("\n");

    // Count decision points for a rough cyclomatic complexity estimate
    const decisionKeywords =
      /\b(if|else if|for|while|do|switch|case|catch|\?\?|&&|\|\|)\b/g;

    let totalComplexity = 1;
    const functionComplexities: string[] = [];
    let currentFn = "";
    let currentComplexity = 1;
    let braceDepth = 0;
    let inFunction = false;

    for (const line of lines) {
      const fnMatch = line.match(
        /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?\(|(\w+)\s*[:=]\s*(?:async\s+)?(?:function|\())/
      );
      if (fnMatch) {
        if (inFunction && currentFn) {
          const rating =
            currentComplexity <= 5 ? "A ✅" : currentComplexity <= 10 ? "B ✅" : currentComplexity <= 15 ? "C ⚠️" : "D ❌";
          functionComplexities.push(
            `  ${currentFn}: complexity=${currentComplexity} [${rating}]`
          );
        }
        currentFn = fnMatch[1] ?? fnMatch[2] ?? fnMatch[3] ?? "anonymous";
        currentComplexity = 1;
        inFunction = true;
      }

      const matches = line.match(decisionKeywords);
      if (matches) {
        currentComplexity += matches.length;
        totalComplexity += matches.length;
      }
    }

    if (inFunction && currentFn) {
      const rating =
        currentComplexity <= 5 ? "A ✅" : currentComplexity <= 10 ? "B ✅" : "C ⚠️";
      functionComplexities.push(
        `  ${currentFn}: complexity=${currentComplexity} [${rating}]`
      );
    }

    return [
      "📊 Complexity Analysis:",
      `  Total lines: ${lines.length}`,
      `  Estimated complexity: ${totalComplexity}`,
      "",
      "Per-function breakdown:",
      ...(functionComplexities.length > 0
        ? functionComplexities
        : ["  No named functions detected"]),
    ].join("\n");
  },
  {
    name: "analyze_complexity",
    description:
      "Estimate cyclomatic complexity of code functions. Returns scores per function.",
    schema: z.object({
      code: z.string().describe("The source code to analyze"),
    }),
  }
);
