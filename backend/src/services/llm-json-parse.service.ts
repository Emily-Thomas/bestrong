/**
 * Extracts JSON object from text, handling markdown and extra content
 */
function extractJSON(content: string): string {
  let cleaned = content.trim();

  // Remove markdown code blocks if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  // Try to find the JSON object - look for the first { and try to find matching }
  // This handles cases where there's text before or after the JSON
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace === -1) {
    throw new Error('No JSON object found in response');
  }

  // Start from the first brace and try to find the matching closing brace
  let braceCount = 0;
  let inString = false;
  let escapeNext = false;
  let lastValidBrace = -1;

  for (let i = firstBrace; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"' && !escapeNext) {
      inString = !inString;
    } else if (!inString) {
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          lastValidBrace = i;
          break; // Found the complete JSON object
        }
      }
    }
  }

  if (lastValidBrace === -1) {
    // JSON object is incomplete, return what we have (will be repaired)
    return cleaned.substring(firstBrace);
  }

  return cleaned.substring(firstBrace, lastValidBrace + 1);
}

/**
 * Finds the last valid position in JSON before an error
 * Returns the position where we can safely truncate
 */
function findLastValidPosition(json: string, errorPosition: number): number {
  let braceDepth = 0;
  let _bracketDepth = 0;
  let inString = false;
  let escapeNext = false;
  let lastValidBrace = -1;
  let _lastStringEnd = -1;
  let stringStartPos = -1;

  // Only scan up to the error position
  const scanLength = Math.min(errorPosition, json.length);

  for (let i = 0; i < scanLength; i++) {
    const char = json[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"' && !escapeNext) {
      if (!inString) {
        stringStartPos = i;
        inString = true;
      } else {
        // String closed
        _lastStringEnd = i;
        inString = false;
        stringStartPos = -1;
      }
    } else if (!inString) {
      if (char === '{') {
        braceDepth++;
      } else if (char === '}') {
        braceDepth--;
        if (braceDepth === 0) {
          lastValidBrace = i;
        }
      } else if (char === '[') {
        _bracketDepth++;
      } else if (char === ']') {
        _bracketDepth--;
      }
    }
  }

  // If we're in a string at the error position, try to find where that string started
  // and truncate before it
  if (inString && stringStartPos !== -1) {
    // Go back to before this string started
    // Look for the last complete structure before this string
    for (let i = stringStartPos - 1; i >= 0; i--) {
      const char = json[i];
      if (char === '}' || char === ']' || char === ',') {
        // Found a safe truncation point
        return i + 1;
      }
    }
    // If we can't find a safe point, truncate before the string
    return stringStartPos;
  }

  // Return the position of the last complete object
  if (lastValidBrace !== -1) {
    return lastValidBrace + 1;
  }

  // If no complete object, try to find a safe truncation point
  // Go back from error position to find a closing quote, brace, or bracket
  for (
    let i = Math.min(errorPosition - 1, json.length - 1);
    i >= Math.max(0, errorPosition - 1000);
    i--
  ) {
    const char = json[i];
    if (char === '"' || char === '}' || char === ']' || char === ',') {
      // Make sure we're not in a string at this position
      let checkInString = false;
      let checkEscape = false;
      for (let j = 0; j <= i; j++) {
        if (checkEscape) {
          checkEscape = false;
          continue;
        }
        if (json[j] === '\\') {
          checkEscape = true;
          continue;
        }
        if (json[j] === '"' && !checkEscape) {
          checkInString = !checkInString;
        }
      }
      if (!checkInString) {
        return i + 1;
      }
    }
  }

  return 0;
}

/**
 * LLMs sometimes emit invalid \\u escapes (incomplete hex). Sanitize so JSON.parse can succeed.
 */
function sanitizeJsonUnicodeEscapes(json: string): string {
  let out = '';
  for (let i = 0; i < json.length; i++) {
    const c = json[i];
    if (c === '\\' && json[i + 1] === 'u') {
      const hex = json.slice(i + 2, i + 6);
      if (/^[0-9a-fA-F]{4}$/.test(hex)) {
        out += json.slice(i, i + 6);
        i += 5;
        continue;
      }
      out += '\\\\u';
      i += 1;
      continue;
    }
    out += c;
  }
  return out;
}
export function parseJSONWithRepair<T>(
  content: string,
  maxRetries = 1,
  rawResponse?: string
): T {
  let cleaned = sanitizeJsonUnicodeEscapes(extractJSON(content));

  // Attempt to parse with repair attempts
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return JSON.parse(cleaned) as T;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1;

      // Extract error position if available - try multiple patterns
      let errorPos = 0;
      if (error instanceof SyntaxError) {
        // Try "position 12345" pattern
        const posMatch = error.message.match(/position\s+(\d+)/i);
        if (posMatch) {
          errorPos = parseInt(posMatch[1], 10);
        }

        // Also try "line X column Y" pattern and calculate position
        const lineColMatch = error.message.match(
          /line\s+(\d+)\s+column\s+(\d+)/i
        );
        if (lineColMatch && errorPos === 0) {
          const lineNum = parseInt(lineColMatch[1], 10);
          const colNum = parseInt(lineColMatch[2], 10);
          // Calculate position from line/column
          const lines = cleaned
            .substring(0, Math.min(cleaned.length, 100000))
            .split('\n');
          if (lineNum <= lines.length) {
            let calculatedPos = 0;
            for (let i = 0; i < lineNum - 1 && i < lines.length; i++) {
              calculatedPos += lines[i].length + 1; // +1 for newline
            }
            calculatedPos += colNum - 1;
            errorPos = calculatedPos;
          }
        }
      }

      // Log error details for all attempts (but more detail on last attempt)
      if (isLastAttempt || attempt > 0) {
        console.warn(
          `⚠️  JSON Parse Error (attempt ${attempt + 1}/${maxRetries}):`
        );
        console.warn(
          `   Error: ${error instanceof Error ? error.message : 'Unknown'}`
        );
        if (errorPos > 0) {
          console.warn(
            `   Position: ${errorPos}, Content length: ${cleaned.length}`
          );
        }
      }

      if (isLastAttempt) {
        // Last attempt - try multiple repair strategies
        let repaired = cleaned;

        // Strategy 1: Truncate at last valid position before error
        if (errorPos > 0) {
          const lastValidPos = findLastValidPosition(cleaned, errorPos);
          if (lastValidPos > 100) {
            // Only if we have substantial content
            repaired = cleaned.substring(0, lastValidPos);
            // Close any open structures
            repaired = repairJSON(repaired);

            try {
              const parsed = JSON.parse(
                sanitizeJsonUnicodeEscapes(repaired)
              ) as T;
              console.warn(
                `⚠️  JSON was truncated at position ${errorPos}, parsed up to position ${lastValidPos}`
              );
              return parsed;
            } catch {
              // Continue to next strategy
            }
          }
        }

        // Strategy 2: Try to find and extract just the JSON object portion
        // Look for the main object structure
        const firstBrace = cleaned.indexOf('{');
        if (firstBrace !== -1) {
          // Try to find a complete object by counting braces
          let braceCount = 0;
          let inString = false;
          let escapeNext = false;
          let lastCompleteBrace = -1;

          for (
            let i = firstBrace;
            i < cleaned.length && i < errorPos + 1000;
            i++
          ) {
            const char = cleaned[i];

            if (escapeNext) {
              escapeNext = false;
              continue;
            }

            if (char === '\\') {
              escapeNext = true;
              continue;
            }

            if (char === '"' && !escapeNext) {
              inString = !inString;
            } else if (!inString) {
              if (char === '{') braceCount++;
              if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                  lastCompleteBrace = i;
                  break;
                }
              }
            }
          }

          if (lastCompleteBrace !== -1) {
            repaired = cleaned.substring(firstBrace, lastCompleteBrace + 1);
            try {
              const parsed = JSON.parse(
                sanitizeJsonUnicodeEscapes(repaired)
              ) as T;
              console.warn(
                `⚠️  Extracted complete JSON object (truncated from ${cleaned.length} to ${repaired.length} chars)`
              );
              return parsed;
            } catch {
              // Continue to next strategy
            }
          }
        }

        // Strategy 3: Aggressive repair
        repaired = repairJSON(cleaned);
        try {
          return JSON.parse(sanitizeJsonUnicodeEscapes(repaired)) as T;
        } catch (_finalError) {
          // Log detailed error information for debugging
          const _start = Math.max(0, errorPos - 500);
          const _end = Math.min(cleaned.length, errorPos + 500);

          console.error('\n❌ JSON Parse Error (final attempt):');
          console.error(
            `   Error: ${error instanceof Error ? error.message : 'Unknown'}`
          );
          console.error(
            `   Position: ${errorPos}, Total length: ${cleaned.length}`
          );

          // Calculate line and column
          const linesBeforeError = cleaned.substring(0, errorPos).split('\n');
          const lineNumber = linesBeforeError.length;
          const columnNumber =
            linesBeforeError[linesBeforeError.length - 1].length + 1;
          console.error(
            `   Location: Line ${lineNumber}, Column ${columnNumber}`
          );

          // Show the exact error location with visual indicator
          const contextStart = Math.max(0, errorPos - 500);
          const contextEnd = Math.min(cleaned.length, errorPos + 500);
          const context = cleaned.substring(contextStart, contextEnd);
          const relativeErrorPos = errorPos - contextStart;

          console.error(
            `\n   Context around error (chars ${contextStart}-${contextEnd}):`
          );
          console.error(`   ${'─'.repeat(80)}`);

          // Show context with line numbers and highlight the error
          const contextLines = context.split('\n');
          let charCount = 0;
          const errorLineIndex =
            context.substring(0, relativeErrorPos).split('\n').length - 1;

          contextLines.forEach((line, idx) => {
            const _lineStart = charCount;
            const lineEnd = charCount + line.length;
            const isErrorLine = idx === errorLineIndex;

            if (isErrorLine) {
              // Show the error line with indicator
              const beforeError = line.substring(
                0,
                Math.min(
                  relativeErrorPos - (charCount - contextStart),
                  line.length
                )
              );
              const atError =
                line[
                  Math.min(
                    relativeErrorPos - (charCount - contextStart),
                    line.length - 1
                  )
                ] || '';
              const afterError = line.substring(
                Math.min(
                  relativeErrorPos - (charCount - contextStart) + 1,
                  line.length
                )
              );

              console.error(
                `   ${lineNumber - errorLineIndex + idx} | ${beforeError}${atError}${afterError}`
              );
              console.error(
                `      ${' '.repeat(beforeError.length)}^ ERROR HERE (char ${errorPos}, col ${columnNumber})`
              );
            } else if (Math.abs(idx - errorLineIndex) <= 3) {
              // Show nearby lines
              console.error(
                `   ${lineNumber - errorLineIndex + idx} | ${line}`
              );
            }

            charCount = lineEnd + 1; // +1 for newline
          });

          console.error(`   ${'─'.repeat(80)}`);

          // Show character details
          const errorChar = cleaned[errorPos];
          const charBefore = errorPos > 0 ? cleaned[errorPos - 1] : '';
          const charAfter =
            errorPos < cleaned.length - 1 ? cleaned[errorPos + 1] : '';
          console.error(`\n   Character details:`);
          console.error(
            `   - At error position ${errorPos}: "${errorChar}" (code: ${errorChar ? cleaned.charCodeAt(errorPos) : 'N/A'})`
          );
          console.error(
            `   - Before: "${charBefore}" (code: ${charBefore ? cleaned.charCodeAt(errorPos - 1) : 'N/A'})`
          );
          console.error(
            `   - After: "${charAfter}" (code: ${charAfter ? cleaned.charCodeAt(errorPos + 1) : 'N/A'})`
          );

          // Show hex dump around error for hidden characters
          const hexStart = Math.max(0, errorPos - 20);
          const hexEnd = Math.min(cleaned.length, errorPos + 20);
          console.error(
            `\n   Hex dump around error (positions ${hexStart}-${hexEnd}):`
          );
          const hexContext = cleaned.substring(hexStart, hexEnd);
          for (let i = 0; i < hexContext.length; i += 16) {
            const chunk = hexContext.substring(i, i + 16);
            const hex = Array.from(chunk)
              .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
              .join(' ');
            const ascii = Array.from(chunk)
              .map((c) =>
                c.charCodeAt(0) >= 32 && c.charCodeAt(0) < 127 ? c : '.'
              )
              .join('');
            const marker =
              hexStart + i <= errorPos && hexStart + i + 16 > errorPos
                ? ' <-- ERROR'
                : '';
            console.error(
              `   ${(hexStart + i).toString(16).padStart(8, '0')}: ${hex.padEnd(48)} |${ascii}|${marker}`
            );
          }

          // Analyze what the parser expected
          if (error instanceof SyntaxError) {
            const errorMsg = error.message;
            console.error(`\n   Parser error message: "${errorMsg}"`);

            // Extract expected token from error message
            const expectedMatch = errorMsg.match(
              /Expected\s+['"]([^'"]+)['"]/i
            );
            if (expectedMatch) {
              console.error(`   - Parser expected: "${expectedMatch[1]}"`);
            }

            // Extract position from error message if available
            const posMatch = errorMsg.match(/position\s+(\d+)/i);
            if (posMatch) {
              const msgPos = parseInt(posMatch[1], 10);
              if (msgPos !== errorPos) {
                console.error(
                  `   - Note: Error message reports position ${msgPos}, but we calculated ${errorPos}`
                );
              }
            }

            // Extract line/column from error message if available
            const lineMatch = errorMsg.match(/line\s+(\d+)\s+column\s+(\d+)/i);
            if (lineMatch) {
              const msgLine = parseInt(lineMatch[1], 10);
              const msgCol = parseInt(lineMatch[2], 10);
              console.error(
                `   - Error message reports: Line ${msgLine}, Column ${msgCol}`
              );
              if (msgLine !== lineNumber || msgCol !== columnNumber) {
                console.error(
                  `   - Note: Calculated position is Line ${lineNumber}, Column ${columnNumber}`
                );
              }
            }
          }

          // Show JSON structure context (what object/array we're in)
          let braceDepth = 0;
          let bracketDepth = 0;
          let inString = false;
          let escapeNext = false;
          const path: string[] = [];
          let currentKey = '';
          const recentProperties: Array<{
            key: string;
            value: string;
            pos: number;
          }> = [];

          for (let i = 0; i < errorPos && i < cleaned.length; i++) {
            const char = cleaned[i];

            if (escapeNext) {
              escapeNext = false;
              continue;
            }

            if (char === '\\') {
              escapeNext = true;
              continue;
            }

            if (char === '"' && !escapeNext) {
              inString = !inString;
              if (!inString && braceDepth > 0) {
                // Might be a key
                const nextNonWhitespace = cleaned
                  .substring(i + 1)
                  .match(/^\s*:/);
                if (nextNonWhitespace) {
                  const keyStart = cleaned.lastIndexOf('"', i - 1);
                  if (keyStart !== -1) {
                    currentKey = cleaned.substring(keyStart + 1, i);
                  }
                }
              }
            } else if (!inString) {
              if (char === '{') {
                braceDepth++;
                if (currentKey) {
                  path.push(currentKey);
                  currentKey = '';
                }
              } else if (char === '}') {
                braceDepth--;
                if (path.length > 0) {
                  path.pop();
                }
              } else if (char === '[') {
                bracketDepth++;
              } else if (char === ']') {
                bracketDepth--;
              } else if (char === ':' && currentKey) {
                // Found a key-value pair, try to extract the value
                const valueStart = i + 1;
                let valueEnd = valueStart;
                let _valueInString = false;
                let valueEscapeNext = false;

                // Skip whitespace
                while (
                  valueEnd < cleaned.length &&
                  /\s/.test(cleaned[valueEnd])
                ) {
                  valueEnd++;
                }

                // Try to find the end of the value
                if (valueEnd < cleaned.length) {
                  const firstChar = cleaned[valueEnd];
                  if (firstChar === '"') {
                    // String value
                    _valueInString = true;
                    valueEnd++;
                    while (valueEnd < cleaned.length) {
                      if (valueEscapeNext) {
                        valueEscapeNext = false;
                        valueEnd++;
                        continue;
                      }
                      if (cleaned[valueEnd] === '\\') {
                        valueEscapeNext = true;
                        valueEnd++;
                        continue;
                      }
                      if (cleaned[valueEnd] === '"') {
                        valueEnd++;
                        break;
                      }
                      valueEnd++;
                    }
                  } else if (firstChar === '{' || firstChar === '[') {
                    // Object or array - find matching closing brace/bracket
                    const openChar = firstChar;
                    const closeChar = firstChar === '{' ? '}' : ']';
                    let depth = 1;
                    valueEnd++;
                    while (valueEnd < cleaned.length && depth > 0) {
                      if (cleaned[valueEnd] === '\\') {
                        valueEnd += 2;
                        continue;
                      }
                      if (cleaned[valueEnd] === '"') {
                        // Skip string
                        valueEnd++;
                        while (
                          valueEnd < cleaned.length &&
                          cleaned[valueEnd] !== '"'
                        ) {
                          if (cleaned[valueEnd] === '\\') valueEnd++;
                          valueEnd++;
                        }
                        valueEnd++;
                        continue;
                      }
                      if (cleaned[valueEnd] === openChar) depth++;
                      if (cleaned[valueEnd] === closeChar) depth--;
                      valueEnd++;
                    }
                  } else {
                    // Number, boolean, null - find end
                    while (
                      valueEnd < cleaned.length &&
                      /[^,\s}\]\]]/.test(cleaned[valueEnd])
                    ) {
                      valueEnd++;
                    }
                  }

                  const valuePreview = cleaned.substring(
                    valueStart,
                    Math.min(valueEnd, valueStart + 100)
                  );
                  recentProperties.push({
                    key: currentKey,
                    value: valuePreview
                      .replace(/\n/g, '\\n')
                      .replace(/\r/g, '\\r'),
                    pos: valueStart,
                  });

                  // Keep only last 5 properties
                  if (recentProperties.length > 5) {
                    recentProperties.shift();
                  }
                }
              }
            }
          }

          console.error(`\n   JSON structure context:`);
          console.error(`   - Brace depth: ${braceDepth}`);
          console.error(`   - Bracket depth: ${bracketDepth}`);
          console.error(`   - In string: ${inString}`);
          console.error(
            `   - Current path: ${path.length > 0 ? path.join(' → ') : 'root'}`
          );
          if (currentKey) {
            console.error(`   - Current key: "${currentKey}"`);
          }

          if (recentProperties.length > 0) {
            console.error(`\n   Recent properties before error:`);
            recentProperties.forEach((prop, idx) => {
              const distance = errorPos - prop.pos;
              console.error(
                `   ${idx + 1}. "${prop.key}": ${prop.value.substring(0, 80)}${prop.value.length > 80 ? '...' : ''} (at position ${prop.pos}, ${distance} chars before error)`
              );
            });
          }

          // Show what comes after the error position
          const afterError = cleaned.substring(
            errorPos,
            Math.min(errorPos + 100, cleaned.length)
          );
          console.error(`\n   Content immediately after error position:`);
          console.error(
            `   "${afterError.replace(/\n/g, '\\n').replace(/\r/g, '\\r')}"`
          );

          // Show first and last portions
          console.error(`\n   First 1500 chars:`);
          console.error(
            `   ${cleaned.substring(0, 1500).split('\n').slice(0, 30).join('\n   ')}`
          );
          if (cleaned.length > 1500) {
            console.error('   ... (truncated)');
          }

          console.error(`\n   Last 1500 chars:`);
          const lastPortion = cleaned.substring(
            Math.max(0, cleaned.length - 1500)
          );
          console.error(
            `   ${lastPortion.split('\n').slice(-30).join('\n   ')}`
          );

          // Log the raw OpenAI response for debugging
          if (rawResponse) {
            console.error('\n📋 RAW OPENAI RESPONSE (for debugging):');
            console.error('   Length:', rawResponse.length);
            console.error('   First 2000 chars:');
            console.error(
              `   ${rawResponse.substring(0, 2000).split('\n').join('\n   ')}`
            );
            console.error('\n   Last 2000 chars:');
            console.error(
              `   ${rawResponse
                .substring(Math.max(0, rawResponse.length - 2000))
                .split('\n')
                .join('\n   ')}`
            );

            // Log the full response in chunks for easier reading
            const chunkSize = 5000;
            const chunks = Math.ceil(rawResponse.length / chunkSize);
            if (chunks > 1) {
              console.error(
                `\n   Full response (${chunks} chunks of ${chunkSize} chars):`
              );
              for (let i = 0; i < chunks; i++) {
                const start = i * chunkSize;
                const end = Math.min(start + chunkSize, rawResponse.length);
                console.error(
                  `   Chunk ${i + 1}/${chunks} (chars ${start}-${end}):`
                );
                console.error(
                  `   ${rawResponse.substring(start, end).split('\n').slice(0, 50).join('\n   ')}`
                );
                if (end < rawResponse.length) {
                  console.error('   ... (truncated for readability)');
                }
              }
            } else {
              console.error('\n   Full response:');
              console.error(`   ${rawResponse.split('\n').join('\n   ')}`);
            }
          } else {
            console.error('\n📋 CLEANED/EXTRACTED JSON (for debugging):');
            console.error('   Length:', cleaned.length);
            const cleanedChunks = Math.ceil(cleaned.length / 5000);
            if (cleanedChunks > 1) {
              console.error(
                `   Full cleaned response (${cleanedChunks} chunks):`
              );
              for (let i = 0; i < cleanedChunks; i++) {
                const start = i * 5000;
                const end = Math.min(start + 5000, cleaned.length);
                console.error(
                  `   Chunk ${i + 1}/${cleanedChunks}: ${cleaned.substring(start, end)}`
                );
              }
            } else {
              console.error('   Full cleaned response:', cleaned);
            }
          }

          throw new Error(
            `Failed to parse JSON after ${maxRetries} repair attempts at position ${errorPos}. The AI response may be truncated or contain invalid characters.`
          );
        }
      } else {
        // Try repairs for intermediate attempts
        cleaned = repairJSON(cleaned);
      }
    }
  }

  throw new Error('Failed to parse JSON: max retries exceeded');
}

/**
 * Attempts to repair common JSON issues
 * Handles unterminated strings, trailing commas, unclosed braces
 */
function repairJSON(json: string): string {
  let repaired = json;

  // Step 1: Remove trailing commas before closing braces/brackets
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1');

  // Step 2: Track string state and brace depth to find issues
  let braceDepth = 0;
  let bracketDepth = 0;
  let inString = false;
  let escapeNext = false;
  let _lastStringStart = -1;

  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"' && !escapeNext) {
      if (!inString) {
        _lastStringStart = i;
        inString = true;
      } else {
        inString = false;
        _lastStringStart = -1;
      }
    } else if (!inString) {
      if (char === '{') braceDepth++;
      else if (char === '}') braceDepth--;
      else if (char === '[') bracketDepth++;
      else if (char === ']') bracketDepth--;
    }
  }

  // Step 3: If we're in a string at the end, close it
  // For safety, we'll just close the string without trying to escape content
  // This is conservative but safer
  if (inString) {
    // Simply close the string - if there are unescaped quotes, that's a deeper issue
    // that would require more complex parsing
    repaired += '"';
  }

  // Step 4: Close any unclosed brackets first (they're inside objects)
  while (bracketDepth > 0) {
    repaired += ']';
    bracketDepth--;
  }

  // Step 5: Close any unclosed braces
  while (braceDepth > 0) {
    repaired += '}';
    braceDepth--;
  }

  // Step 6: Find the last valid closing brace and truncate anything after
  braceDepth = 0;
  inString = false;
  escapeNext = false;
  let lastValidBrace = -1;

  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"' && !escapeNext) {
      inString = !inString;
    } else if (!inString) {
      if (char === '{') braceDepth++;
      if (char === '}') {
        braceDepth--;
        if (braceDepth === 0) {
          lastValidBrace = i;
        }
      }
    }
  }

  // Truncate to last valid brace
  if (lastValidBrace !== -1 && lastValidBrace < repaired.length - 1) {
    repaired = repaired.substring(0, lastValidBrace + 1);
  }

  return repaired;
}
