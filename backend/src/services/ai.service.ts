import OpenAI from 'openai';
import type {
  Questionnaire,
  StructuredQuestionnaireData,
  LLMRecommendationResponse,
  LLMWorkoutResponse,
  Recommendation,
  Workout,
  ActualWorkout,
  InBodyScan,
  Client,
  TrainerPersonaStructured,
  RecommendedCoachMatch,
  PeerCoachDirectionPreview,
  TrainerCoachMatchOption,
} from '../types';
import {
  formatQuestionnaireForPrompt,
  parseQuestionnaireData,
  GOALS_VS_INJURIES_INSTRUCTION,
} from './questionnaire-prompt.service';
import * as exerciseLibraryService from './exercise-library.service';
import { enrichAIWorkoutsWithLibrary } from './workout-library-integration.service';

export { parseQuestionnaireData, formatQuestionnaireForPrompt } from './questionnaire-prompt.service';

async function enrichLlmWorkoutsWithExerciseLibrary(
  workouts: LLMWorkoutResponse[]
): Promise<LLMWorkoutResponse[]> {
  try {
    const lib = await exerciseLibraryService.getExercises({ status: 'active' });
    if (!lib.length) {
      return workouts;
    }
    return enrichAIWorkoutsWithLibrary(workouts, lib);
  } catch {
    return workouts;
  }
}

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
  let bracketDepth = 0;
  let inString = false;
  let escapeNext = false;
  let lastValidBrace = -1;
  let lastStringEnd = -1;
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
        lastStringEnd = i;
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
        bracketDepth++;
      } else if (char === ']') {
        bracketDepth--;
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
  for (let i = Math.min(errorPosition - 1, json.length - 1); i >= Math.max(0, errorPosition - 1000); i--) {
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

export interface GenerateRecommendationStructureOptions {
  coachMatchOptions?: TrainerCoachMatchOption[];
  /** Comparison jobs: no roster match or peer previews */
  skipCoachRecommendation?: boolean;
}

type RawGuidanceResponse = Omit<LLMRecommendationResponse, 'workouts'> & {
  recommended_coach?: RecommendedCoachMatch;
};

function normalizeGuidanceForStorage(
  raw: RawGuidanceResponse
): Omit<LLMRecommendationResponse, 'workouts'> {
  const ps: Record<string, unknown> =
    typeof raw.plan_structure === 'object' && raw.plan_structure !== null
      ? { ...(raw.plan_structure as Record<string, unknown>) }
      : {};

  const rc =
    raw.recommended_coach ??
    (ps.recommended_coach as RecommendedCoachMatch | undefined);

  if (rc) {
    ps.recommended_coach = rc;
  }

  const { recommended_coach: _omit, ...rest } = raw;
  return {
    ...rest,
    plan_structure: ps,
  };
}

export function mergePlanWithPeerCoachPreviews(
  planStructure: Record<string, unknown>,
  peerPreviews: PeerCoachDirectionPreview[]
): Record<string, unknown> {
  if (!peerPreviews.length) {
    return planStructure;
  }
  return { ...planStructure, other_coaches_preview: peerPreviews };
}

/**
 * Robust JSON parsing with repair and retry logic
 * Reduced retries to minimize token waste - only repair JSON, don't retry API calls
 */
function parseJSONWithRepair<T>(content: string, maxRetries = 1, rawResponse?: string): T {
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
        const lineColMatch = error.message.match(/line\s+(\d+)\s+column\s+(\d+)/i);
        if (lineColMatch && errorPos === 0) {
          const lineNum = parseInt(lineColMatch[1], 10);
          const colNum = parseInt(lineColMatch[2], 10);
          // Calculate position from line/column
          const lines = cleaned.substring(0, Math.min(cleaned.length, 100000)).split('\n');
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
        console.warn(`⚠️  JSON Parse Error (attempt ${attempt + 1}/${maxRetries}):`);
        console.warn(`   Error: ${error instanceof Error ? error.message : 'Unknown'}`);
        if (errorPos > 0) {
          console.warn(`   Position: ${errorPos}, Content length: ${cleaned.length}`);
        }
      }
      
      if (isLastAttempt) {
        // Last attempt - try multiple repair strategies
        let repaired = cleaned;
        
        // Strategy 1: Truncate at last valid position before error
        if (errorPos > 0) {
          const lastValidPos = findLastValidPosition(cleaned, errorPos);
          if (lastValidPos > 100) { // Only if we have substantial content
            repaired = cleaned.substring(0, lastValidPos);
            // Close any open structures
            repaired = repairJSON(repaired);
            
            try {
              const parsed = JSON.parse(sanitizeJsonUnicodeEscapes(repaired)) as T;
              console.warn(`⚠️  JSON was truncated at position ${errorPos}, parsed up to position ${lastValidPos}`);
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
          
          for (let i = firstBrace; i < cleaned.length && i < errorPos + 1000; i++) {
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
              const parsed = JSON.parse(sanitizeJsonUnicodeEscapes(repaired)) as T;
              console.warn(`⚠️  Extracted complete JSON object (truncated from ${cleaned.length} to ${repaired.length} chars)`);
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
        } catch (finalError) {
          // Log detailed error information for debugging
          const start = Math.max(0, errorPos - 500);
          const end = Math.min(cleaned.length, errorPos + 500);
          
          console.error('\n❌ JSON Parse Error (final attempt):');
          console.error(`   Error: ${error instanceof Error ? error.message : 'Unknown'}`);
          console.error(`   Position: ${errorPos}, Total length: ${cleaned.length}`);
          
          // Calculate line and column
          const linesBeforeError = cleaned.substring(0, errorPos).split('\n');
          const lineNumber = linesBeforeError.length;
          const columnNumber = linesBeforeError[linesBeforeError.length - 1].length + 1;
          console.error(`   Location: Line ${lineNumber}, Column ${columnNumber}`);
          
          // Show the exact error location with visual indicator
          const contextStart = Math.max(0, errorPos - 500);
          const contextEnd = Math.min(cleaned.length, errorPos + 500);
          const context = cleaned.substring(contextStart, contextEnd);
          const relativeErrorPos = errorPos - contextStart;
          
          console.error(`\n   Context around error (chars ${contextStart}-${contextEnd}):`);
          console.error('   ' + '─'.repeat(80));
          
          // Show context with line numbers and highlight the error
          const contextLines = context.split('\n');
          let charCount = 0;
          const errorLineIndex = context.substring(0, relativeErrorPos).split('\n').length - 1;
          
          contextLines.forEach((line, idx) => {
            const lineStart = charCount;
            const lineEnd = charCount + line.length;
            const isErrorLine = idx === errorLineIndex;
            
            if (isErrorLine) {
              // Show the error line with indicator
              const beforeError = line.substring(0, Math.min(relativeErrorPos - (charCount - contextStart), line.length));
              const atError = line[Math.min(relativeErrorPos - (charCount - contextStart), line.length - 1)] || '';
              const afterError = line.substring(Math.min(relativeErrorPos - (charCount - contextStart) + 1, line.length));
              
              console.error(`   ${lineNumber - errorLineIndex + idx} | ${beforeError}${atError}${afterError}`);
              console.error(`      ${' '.repeat(beforeError.length)}^ ERROR HERE (char ${errorPos}, col ${columnNumber})`);
            } else if (Math.abs(idx - errorLineIndex) <= 3) {
              // Show nearby lines
              console.error(`   ${lineNumber - errorLineIndex + idx} | ${line}`);
            }
            
            charCount = lineEnd + 1; // +1 for newline
          });
          
          console.error('   ' + '─'.repeat(80));
          
          // Show character details
          const errorChar = cleaned[errorPos];
          const charBefore = errorPos > 0 ? cleaned[errorPos - 1] : '';
          const charAfter = errorPos < cleaned.length - 1 ? cleaned[errorPos + 1] : '';
          console.error(`\n   Character details:`);
          console.error(`   - At error position ${errorPos}: "${errorChar}" (code: ${errorChar ? cleaned.charCodeAt(errorPos) : 'N/A'})`);
          console.error(`   - Before: "${charBefore}" (code: ${charBefore ? cleaned.charCodeAt(errorPos - 1) : 'N/A'})`);
          console.error(`   - After: "${charAfter}" (code: ${charAfter ? cleaned.charCodeAt(errorPos + 1) : 'N/A'})`);
          
          // Show hex dump around error for hidden characters
          const hexStart = Math.max(0, errorPos - 20);
          const hexEnd = Math.min(cleaned.length, errorPos + 20);
          console.error(`\n   Hex dump around error (positions ${hexStart}-${hexEnd}):`);
          const hexContext = cleaned.substring(hexStart, hexEnd);
          for (let i = 0; i < hexContext.length; i += 16) {
            const chunk = hexContext.substring(i, i + 16);
            const hex = Array.from(chunk)
              .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
              .join(' ');
            const ascii = Array.from(chunk)
              .map(c => (c.charCodeAt(0) >= 32 && c.charCodeAt(0) < 127) ? c : '.')
              .join('');
            const marker = hexStart + i <= errorPos && hexStart + i + 16 > errorPos ? ' <-- ERROR' : '';
            console.error(`   ${(hexStart + i).toString(16).padStart(8, '0')}: ${hex.padEnd(48)} |${ascii}|${marker}`);
          }
          
          // Analyze what the parser expected
          if (error instanceof SyntaxError) {
            const errorMsg = error.message;
            console.error(`\n   Parser error message: "${errorMsg}"`);
            
            // Extract expected token from error message
            const expectedMatch = errorMsg.match(/Expected\s+['"]([^'"]+)['"]/i);
            if (expectedMatch) {
              console.error(`   - Parser expected: "${expectedMatch[1]}"`);
            }
            
            // Extract position from error message if available
            const posMatch = errorMsg.match(/position\s+(\d+)/i);
            if (posMatch) {
              const msgPos = parseInt(posMatch[1], 10);
              if (msgPos !== errorPos) {
                console.error(`   - Note: Error message reports position ${msgPos}, but we calculated ${errorPos}`);
              }
            }
            
            // Extract line/column from error message if available
            const lineMatch = errorMsg.match(/line\s+(\d+)\s+column\s+(\d+)/i);
            if (lineMatch) {
              const msgLine = parseInt(lineMatch[1], 10);
              const msgCol = parseInt(lineMatch[2], 10);
              console.error(`   - Error message reports: Line ${msgLine}, Column ${msgCol}`);
              if (msgLine !== lineNumber || msgCol !== columnNumber) {
                console.error(`   - Note: Calculated position is Line ${lineNumber}, Column ${columnNumber}`);
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
          const recentProperties: Array<{key: string, value: string, pos: number}> = [];
          
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
                const nextNonWhitespace = cleaned.substring(i + 1).match(/^\s*:/);
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
                let valueInString = false;
                let valueEscapeNext = false;
                
                // Skip whitespace
                while (valueEnd < cleaned.length && /\s/.test(cleaned[valueEnd])) {
                  valueEnd++;
                }
                
                // Try to find the end of the value
                if (valueEnd < cleaned.length) {
                  const firstChar = cleaned[valueEnd];
                  if (firstChar === '"') {
                    // String value
                    valueInString = true;
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
                        while (valueEnd < cleaned.length && cleaned[valueEnd] !== '"') {
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
                    while (valueEnd < cleaned.length && /[^,\s}\]\]]/.test(cleaned[valueEnd])) {
                      valueEnd++;
                    }
                  }
                  
                  const valuePreview = cleaned.substring(valueStart, Math.min(valueEnd, valueStart + 100));
                  recentProperties.push({
                    key: currentKey,
                    value: valuePreview.replace(/\n/g, '\\n').replace(/\r/g, '\\r'),
                    pos: valueStart
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
          console.error(`   - Current path: ${path.length > 0 ? path.join(' → ') : 'root'}`);
          if (currentKey) {
            console.error(`   - Current key: "${currentKey}"`);
          }
          
          if (recentProperties.length > 0) {
            console.error(`\n   Recent properties before error:`);
            recentProperties.forEach((prop, idx) => {
              const distance = errorPos - prop.pos;
              console.error(`   ${idx + 1}. "${prop.key}": ${prop.value.substring(0, 80)}${prop.value.length > 80 ? '...' : ''} (at position ${prop.pos}, ${distance} chars before error)`);
            });
          }
          
          // Show what comes after the error position
          const afterError = cleaned.substring(errorPos, Math.min(errorPos + 100, cleaned.length));
          console.error(`\n   Content immediately after error position:`);
          console.error(`   "${afterError.replace(/\n/g, '\\n').replace(/\r/g, '\\r')}"`);
          
          // Show first and last portions
          console.error(`\n   First 1500 chars:`);
          console.error('   ' + cleaned.substring(0, 1500).split('\n').slice(0, 30).join('\n   '));
          if (cleaned.length > 1500) {
            console.error('   ... (truncated)');
          }
          
          console.error(`\n   Last 1500 chars:`);
          const lastPortion = cleaned.substring(Math.max(0, cleaned.length - 1500));
          console.error('   ' + lastPortion.split('\n').slice(-30).join('\n   '));
          
          // Log the raw OpenAI response for debugging
          if (rawResponse) {
            console.error('\n📋 RAW OPENAI RESPONSE (for debugging):');
            console.error('   Length:', rawResponse.length);
            console.error('   First 2000 chars:');
            console.error('   ' + rawResponse.substring(0, 2000).split('\n').join('\n   '));
            console.error('\n   Last 2000 chars:');
            console.error('   ' + rawResponse.substring(Math.max(0, rawResponse.length - 2000)).split('\n').join('\n   '));
            
            // Log the full response in chunks for easier reading
            const chunkSize = 5000;
            const chunks = Math.ceil(rawResponse.length / chunkSize);
            if (chunks > 1) {
              console.error(`\n   Full response (${chunks} chunks of ${chunkSize} chars):`);
              for (let i = 0; i < chunks; i++) {
                const start = i * chunkSize;
                const end = Math.min(start + chunkSize, rawResponse.length);
                console.error(`   Chunk ${i + 1}/${chunks} (chars ${start}-${end}):`);
                console.error('   ' + rawResponse.substring(start, end).split('\n').slice(0, 50).join('\n   '));
                if (end < rawResponse.length) {
                  console.error('   ... (truncated for readability)');
                }
              }
            } else {
              console.error('\n   Full response:');
              console.error('   ' + rawResponse.split('\n').join('\n   '));
            }
          } else {
            console.error('\n📋 CLEANED/EXTRACTED JSON (for debugging):');
            console.error('   Length:', cleaned.length);
            const cleanedChunks = Math.ceil(cleaned.length / 5000);
            if (cleanedChunks > 1) {
              console.error(`   Full cleaned response (${cleanedChunks} chunks):`);
              for (let i = 0; i < cleanedChunks; i++) {
                const start = i * 5000;
                const end = Math.min(start + 5000, cleaned.length);
                console.error(`   Chunk ${i + 1}/${cleanedChunks}: ${cleaned.substring(start, end)}`);
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
  let lastStringStart = -1;
  
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
        lastStringStart = i;
        inString = true;
      } else {
        inString = false;
        lastStringStart = -1;
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

/**
 * Calls OpenAI with minimal retry logic (only for rate limits)
 * Errors from OpenAI API are not retried to avoid token waste
 */
async function callOpenAIWithRetry(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  options: {
    maxTokens?: number;
    temperature?: number;
    maxRetries?: number;
  } = {}
): Promise<string> {
  // Default to 1 retry (only for rate limits) - can be overridden via env var
  const defaultMaxRetries = parseInt(process.env.OPENAI_MAX_RETRIES || '1', 10);
  const maxRetries = options.maxRetries ?? defaultMaxRetries;
  const model = process.env.OPENAI_MODEL || 'gpt-5-mini';

  // Calculate approximate input tokens (rough estimate: 4 chars per token)
  const inputText = messages.map(m => 
    typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
  ).join(' ');
  const estimatedInputTokens = Math.ceil(inputText.length / 4);

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const startTime = Date.now();
      const completion = await openai.chat.completions.create({
        model,
        messages,
        response_format: { type: 'json_object' },
        max_completion_tokens: options.maxTokens ?? 8000,
      });

      const duration = Date.now() - startTime;
      const finishReason = completion.choices[0]?.finish_reason;
      const content = completion.choices[0]?.message?.content;
      
      // Track token usage
      const usage = completion.usage;
      if (usage) {
        console.log(`[OpenAI] Token usage - Input: ${usage.prompt_tokens}, Output: ${usage.completion_tokens}, Total: ${usage.total_tokens} (${duration}ms)`);
      } else {
        console.log(`[OpenAI] Estimated input tokens: ~${estimatedInputTokens} (usage not available)`);
      }
      
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      // Warn if response was truncated
      if (finishReason === 'length') {
        console.warn(`⚠️  Response was truncated (length finish reason). Content length: ${content.length}`);
        // Still return the content - our repair logic will try to fix it
      }

      return content;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1;
      
      // Log the error with token context
      if (error instanceof Error) {
        console.error(`[OpenAI] API Error (attempt ${attempt + 1}/${maxRetries}):`, {
          error: error.message,
          estimatedInputTokens,
          isLastAttempt,
        });
      }

      // Only retry on rate limit errors (not API errors, authentication errors, etc.)
      if (error instanceof Error) {
        const isRateLimit = 
          error.message.toLowerCase().includes('rate limit') ||
          error.message.toLowerCase().includes('rate_limit') ||
          (error as any).status === 429; // HTTP 429 Too Many Requests
        
        if (isRateLimit && !isLastAttempt) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s...
          console.warn(`[OpenAI] Rate limit hit. Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      // For all other errors (API errors, invalid requests, etc.), fail immediately
      // Don't retry to avoid wasting tokens
      throw error;
    }
  }

  throw new Error('Failed to get response from OpenAI after retries');
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Client archetypes based on trainer's methodology
const CLIENT_ARCHETYPES = {
  REBUILDER: {
    type: 'The Rebuilder',
    description: '40+, post-injury, cautious',
    trainingMethods: [
      'Rehabilitation-Based Functional Training',
      'Low-Impact Strength Circuits',
      'Stability & Mobility Progressions (FRC-inspired)',
    ],
    whyItFits:
      'Rebuilders need controlled intensity and tissue remodeling; they thrive on measurable progress without setbacks. These methods rebuild confidence and function.',
  },
  SERIAL_ATHLETE: {
    type: 'The Serial Athlete',
    description: 'Lifelong competitor',
    trainingMethods: [
      'Concurrent Training (Strength + Endurance)',
      'Undulating Periodization',
      'Performance-Based Conditioning (HIIT/Tempo Runs)',
    ],
    whyItFits:
      'Keeps them stimulated with variety and performance benchmarks. Undulating loads prevent burnout while concurrent training supports hybrid goals.',
  },
  MIDLIFE_TRANSFORMER: {
    type: 'The Midlife Transformer',
    description: 'Career-driven, seeking vitality',
    trainingMethods: [
      'Linear Progression Strength Training',
      'Metabolic Conditioning (MetCon)',
      'Habit-Based Lifestyle Integration',
    ],
    whyItFits:
      'Linear strength builds tangible results, MetCons keep engagement high, and habit integration sustains long-term transformation.',
  },
  GOLDEN_GRINDER: {
    type: 'The Golden Grinder',
    description: '60+, longevity-focused',
    trainingMethods: [
      'Functional Strength Training',
      'Balance & Neuromotor Drills',
      'Zone 2 Cardio Conditioning',
    ],
    whyItFits:
      'Functional patterns improve independence, balance reduces fall risk, and Zone 2 supports heart health and recovery.',
  },
  FUNCTIONALIST: {
    type: 'The Functionalist',
    description: 'Movement-minded, practical strength',
    trainingMethods: [
      'Movement Pattern Periodization',
      'Kettlebell & TRX Integration',
      'Hybrid Mobility Circuits',
    ],
    whyItFits:
      'They crave efficiency and purpose—training should feel like real life. Compound and asymmetrical loads reinforce control and joint resilience.',
  },
  TRANSFORMATION_SEEKER: {
    type: 'The Transformation Seeker',
    description: 'Short-term goal, high emotion',
    trainingMethods: [
      'Body Recomposition Circuits',
      'Linear Strength + HIIT Split',
      'Macro-Driven Program Integration',
    ],
    whyItFits:
      'Needs fast results with visible payoff. These pair calorie-burning structure with sustainable strength outcomes.',
  },
  MAINTENANCE_PRO: {
    type: 'The Maintenance Pro',
    description: 'Advanced, consistent, data-driven',
    trainingMethods: [
      'Autoregulated Hypertrophy (RIR-based)',
      'Block Periodization',
      'Athlete Monitoring Systems (InBody, HRV, etc.)',
    ],
    whyItFits:
      'Already efficient—focus on fine-tuning. Block periodization keeps novelty; RIR-based training ensures precision without overtraining.',
  },
  OVERWHELMED_BEGINNER: {
    type: 'The Overwhelmed Beginner',
    description: 'Inexperienced, anxious',
    trainingMethods: [
      'Foundational Movement Training',
      'Circuit-Based Full Body Workouts',
      'Progressive Habit Building',
    ],
    whyItFits:
      'Simple, clear, repeatable. Builds confidence, coordination, and comfort in the gym environment.',
  },
  BURNOUT_COMEBACK: {
    type: 'The Burnout Comeback',
    description: 'Ex-athlete, rediscovering joy',
    trainingMethods: [
      'Autoregulatory Strength Training',
      'Play-Based Conditioning (sleds, med balls)',
      'Mindful Mobility & Breathwork',
    ],
    whyItFits:
      'Needs to rekindle enjoyment while avoiding all-or-nothing intensity. Blends creativity with low-pressure structure.',
  },
  DATA_DRIVEN_DEVOTEE: {
    type: 'The Data-Driven Devotee',
    description: 'Analytical, optimization-focused',
    trainingMethods: [
      'Autoregulated Progressive Overload',
      'Concurrent Training with Measurable Metrics',
      'Biofeedback-Integrated Programming (HRV, sleep, strain)',
    ],
    whyItFits:
      'They want systems. Real-time data creates buy-in and accountability while precision keeps them engaged.',
  },
} as const;

/**
 * Formats client information for inclusion in LLM prompt
 */
function formatClientInfoForPrompt(client: Client | null): string {
  if (!client) {
    return '';
  }

  let text = `## Client Information\n\n`;
  
  if (client.date_of_birth) {
    const birthDate = typeof client.date_of_birth === 'string' 
      ? new Date(client.date_of_birth) 
      : client.date_of_birth;
    text += `- Date of Birth: ${birthDate.toLocaleDateString()}\n`;
  }
  
  text += `\nConsider the client's age (calculate from date of birth) when:
- Selecting age-appropriate exercises and training methods
- Setting realistic progression expectations based on age
- Adjusting recovery time and training frequency
- Choosing appropriate intensity levels
- Designing programs that account for age-related factors (mobility, recovery, etc.)`;

  return text;
}

/**
 * Formats InBody scan data for inclusion in LLM prompt
 */
function formatInBodyScanForPrompt(scan: InBodyScan | null): string {
  if (!scan) {
    return '';
  }

  let text = `## Client Body Composition (InBody Scan)

The client's latest InBody scan shows:`;

  // Helper function to safely convert to number and format
  // PostgreSQL may return numeric values as strings, so we need to handle both
  const formatNumber = (value: unknown): string | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') {
      if (value.trim() === '') return null;
      const num = parseFloat(value);
      if (Number.isNaN(num) || !Number.isFinite(num)) return null;
      return num.toFixed(1);
    }
    if (typeof value === 'number') {
      if (Number.isNaN(value) || !Number.isFinite(value)) return null;
      return value.toFixed(1);
    }
    // Try to convert other types
    const num = Number(value);
    if (Number.isNaN(num) || !Number.isFinite(num)) return null;
    return num.toFixed(1);
  };

  const weight = formatNumber(scan.weight_lbs);
  if (weight !== null) {
    text += `\n- Weight: ${weight} lbs`;
  }
  const smm = formatNumber(scan.smm_lbs);
  if (smm !== null) {
    text += `\n- Skeletal Muscle Mass (SMM): ${smm} lbs`;
  }
  const bodyFatMass = formatNumber(scan.body_fat_mass_lbs);
  if (bodyFatMass !== null) {
    text += `\n- Body Fat Mass: ${bodyFatMass} lbs`;
  }
  const bmi = formatNumber(scan.bmi);
  if (bmi !== null) {
    text += `\n- BMI: ${bmi}`;
  }
  const percentBodyFat = formatNumber(scan.percent_body_fat);
  if (percentBodyFat !== null) {
    text += `\n- Percent Body Fat: ${percentBodyFat}%`;
  }

  if (scan.segment_analysis) {
    text += `\n\nSegment Analysis:`;
    const segments = [
      { key: 'right_arm', label: 'Right Arm' },
      { key: 'left_arm', label: 'Left Arm' },
      { key: 'trunk', label: 'Trunk' },
      { key: 'right_leg', label: 'Right Leg' },
      { key: 'left_leg', label: 'Left Leg' },
    ];

    // Helper function to safely convert to number and format
    // PostgreSQL may return numeric values as strings, so we need to handle both
    const formatNumber = (value: unknown): string | null => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'string') {
        if (value.trim() === '') return null;
        const num = parseFloat(value);
        if (Number.isNaN(num) || !Number.isFinite(num)) return null;
        return num.toFixed(1);
      }
      if (typeof value === 'number') {
        if (Number.isNaN(value) || !Number.isFinite(value)) return null;
        return value.toFixed(1);
      }
      // Try to convert other types
      const num = Number(value);
      if (Number.isNaN(num) || !Number.isFinite(num)) return null;
      return num.toFixed(1);
    };

    for (const segment of segments) {
      const data = scan.segment_analysis[segment.key as keyof typeof scan.segment_analysis];
      if (data && typeof data === 'object') {
        const parts: string[] = [];
        const muscleMass = formatNumber(data.muscle_mass_lbs);
        if (muscleMass !== null) {
          parts.push(`${muscleMass} lbs muscle`);
        }
        const fatMass = formatNumber(data.fat_mass_lbs);
        if (fatMass !== null) {
          parts.push(`${fatMass} lbs fat`);
        }
        const percentFat = formatNumber(data.percent_fat);
        if (percentFat !== null) {
          parts.push(`${percentFat}% fat`);
        }
        if (parts.length > 0) {
          text += `\n- ${segment.label}: ${parts.join(', ')}`;
        }
      }
    }
  }

  text += `\n\nConsider this body composition when:
- Selecting appropriate training intensity based on current muscle mass and body fat levels
- Choosing exercises that match current muscle mass distribution
- Setting realistic progression goals that account for body composition
- Adjusting volume and load based on body composition metrics
- Designing programs that address any muscle imbalances indicated by segment analysis`;

  return text;
}

function coachPersonaBlock(injection?: string): string {
  const t = injection?.trim();
  if (!t) return '';
  return `## Coach persona (apply this coaching style and bias throughout)\n\n${t}\n\n`;
}

export async function generatePeerCoachDirectionPreviews(
  questionnaire: Questionnaire,
  structuredData: StructuredQuestionnaireData | null,
  inbodyScan: InBodyScan | null,
  client: Client | null,
  recommended: RecommendedCoachMatch,
  peerOptions: TrainerCoachMatchOption[]
): Promise<PeerCoachDirectionPreview[]> {
  if (!peerOptions.length) {
    return [];
  }

  const questionnaireText = formatQuestionnaireForPrompt(questionnaire, structuredData);
  const inbodyText = formatInBodyScanForPrompt(inbodyScan);
  const clientInfoText = formatClientInfoForPrompt(client);

  const roster = peerOptions
    .map(
      (o) =>
        `- id: ${o.id}\n  name: ${o.display_name}\n  title: ${o.title}\n  summary: ${o.program_summary}`
    )
    .join('\n');

  const prompt = `You summarize how OTHER coaches on the roster would steer this same client at a high level (themes, focus, intensity philosophy — not exercise lists).

## Recommended coach (already chosen)
- ${recommended.coach_name} (trainer_id ${recommended.trainer_id})
- Reasoning: ${recommended.reasoning}

## Other coaches (write a short direction summary for EACH)
${roster}

## Client context
${clientInfoText ? `${clientInfoText}\n\n` : ''}## Questionnaire
${questionnaireText}
${inbodyText ? `\n${inbodyText}\n` : ''}

Respond with JSON only:
{
  "previews": [
    {
      "trainer_id": <number>,
      "coach_name": "<full name>",
      "direction_summary": "2-4 sentences: how this coach would steer programming for this client",
      "differs_from_recommended": "one short sentence on how this differs from the recommended coach"
    }
  ]
}

Include one object per coach listed under "Other coaches". Use the exact trainer_id values from the roster.`;

  const responseContent = await callOpenAIWithRetry(
    [
      {
        role: 'system',
        content:
          'You respond with ONLY valid JSON. No markdown. Keep summaries concise.',
      },
      { role: 'user', content: prompt },
    ],
    { maxTokens: 2500, maxRetries: 1 }
  );

  const parsed = parseJSONWithRepair<{ previews: PeerCoachDirectionPreview[] }>(
    responseContent,
    1,
    responseContent
  );

  if (!parsed.previews || !Array.isArray(parsed.previews)) {
    return [];
  }

  return parsed.previews.filter(
    (p) =>
      typeof p.trainer_id === 'number' &&
      typeof p.coach_name === 'string' &&
      typeof p.direction_summary === 'string'
  );
}

/**
 * Generates planning-direction structure (no workouts) using OpenAI
 */
export async function generateRecommendationStructure(
  questionnaire: Questionnaire,
  structuredData: StructuredQuestionnaireData | null,
  inbodyScan: InBodyScan | null = null,
  client: Client | null = null,
  trainerPersonaInjection?: string | null,
  options?: GenerateRecommendationStructureOptions
): Promise<Omit<LLMRecommendationResponse, 'workouts'>> {
  const questionnaireText = formatQuestionnaireForPrompt(questionnaire, structuredData);
  const inbodyText = formatInBodyScanForPrompt(inbodyScan);
  const clientInfoText = formatClientInfoForPrompt(client);

  const personasText = Object.values(CLIENT_ARCHETYPES)
    .map(
      (archetype) =>
        `**${archetype.type}**\n` +
        `Description: ${archetype.description}\n` +
        `Training Methods: ${archetype.trainingMethods.join(', ')}\n` +
        `Why It Fits: ${archetype.whyItFits}\n`
    )
    .join('\n');

  const coachRosterSection =
    options?.skipCoachRecommendation || !options?.coachMatchOptions?.length
      ? ''
      : `## Coach roster (recommended match)
Pick the ONE best-matching coach from this list by \`id\`. Use questionnaire + InBody + goals.

${options.coachMatchOptions
  .map(
    (o) =>
      `- id: ${o.id}\n  name: ${o.display_name}\n  title: ${o.title}\n  summary: ${o.program_summary}`
  )
  .join('\n\n')}

`;

  const recommendedCoachJson = options?.skipCoachRecommendation
    ? ''
    : options?.coachMatchOptions?.length
      ? `,
  "recommended_coach": {
    "trainer_id": <number from roster>,
    "coach_name": "<from roster>",
    "reasoning": "<why this coach fits this client>"
  }`
      : '';

  const prompt = `You are an expert personal trainer producing **planning direction only** for a coach to implement later.

Do NOT output exercise lists, session prescriptions, or week-by-week workout plans. Themes, volume, intensity philosophy, and scheduling patterns only.

## Available client personas

${personasText}

${clientInfoText ? `${clientInfoText}\n\n` : ''}## Client questionnaire

${questionnaireText}
${inbodyText ? `\n${inbodyText}\n` : ''}
${coachPersonaBlock(trainerPersonaInjection ?? undefined)}${coachRosterSection}## Instructions

1. Select the ONE client persona that best matches this client. Explain why (${GOALS_VS_INJURIES_INSTRUCTION}).

2. Set **sessions_per_week** to 1, 2, or 3 only.

3. Set **session_length_minutes** to **30** or **45** only (pick what fits the client).

4. **plan_structure** describes the **first phase** of training (not a full multi-week prescription of workouts):
   - **phase_1_weeks**: length of this initial phase in weeks (typically 1–4).
   - **weekly_repeating_schedule**: one row per training day in a typical week (day label, session label, focus theme). Repeat the same weekly pattern across phase_1_weeks unless you explain otherwise in progression_guidelines.
   - **progression_guidelines** and **intensity_load_progression**: how load and effort progress over the phase (RPE/RIR, volume landmarks, deload hints) without naming specific exercises.

5. **training_style** summarizes the approach in plain language.

## Output format

Respond with a single JSON object. Shape:

{
  "client_type": "The [Persona Name]",
  "client_type_reasoning": "...",
  "sessions_per_week": 2,
  "session_length_minutes": 45,
  "training_style": "...",
  "plan_structure": {
    "archetype": "The [Persona Name]",
    "description": "short summary of the training direction",
    "phase_1_weeks": 2,
    "training_methods": ["..."],
    "weekly_repeating_schedule": [
      { "day": "Monday", "session_label": "...", "focus_theme": "..." }
    ],
    "progression_guidelines": "...",
    "intensity_load_progression": "...",
    "periodization_approach": "optional"
  },
  "ai_reasoning": "overall reasoning for this planning direction"${recommendedCoachJson}
}

CRITICAL: Respond with ONLY valid JSON. No markdown fences or extra text.`;

  const responseContent = await callOpenAIWithRetry(
    [
      {
        role: 'system',
        content:
          'You are an expert personal trainer. Respond with ONLY valid JSON. No markdown. Escape quotes inside strings. Close all brackets.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    {
      maxTokens: 4000,
      maxRetries: 1,
    }
  );

  const parsed = parseJSONWithRepair<RawGuidanceResponse>(
    responseContent,
    1,
    responseContent
  );

  if (!parsed.client_type || typeof parsed.sessions_per_week !== 'number') {
    throw new Error('Invalid recommendation structure from OpenAI');
  }

  let result = normalizeGuidanceForStorage(parsed);

  if (
    !options?.skipCoachRecommendation &&
    options?.coachMatchOptions?.length
  ) {
    const rc = (result.plan_structure as Record<string, unknown>)
      ?.recommended_coach as RecommendedCoachMatch | undefined;
    if (rc && typeof rc.trainer_id === 'number') {
      const peers = options.coachMatchOptions.filter((o) => o.id !== rc.trainer_id);
      if (peers.length) {
        const previews = await generatePeerCoachDirectionPreviews(
          questionnaire,
          structuredData,
          inbodyScan,
          client,
          rc,
          peers
        );
        result = {
          ...result,
          plan_structure: mergePlanWithPeerCoachPreviews(
            result.plan_structure as Record<string, unknown>,
            previews
          ),
        };
      }
    }
  }

  return result;
}

/**
 * Generates workouts for WEEK 1 ONLY of a recommendation
 * This keeps token usage manageable and allows for progressive generation later
 */
export async function generateWorkouts(
  recommendation: Omit<LLMRecommendationResponse, 'workouts'>,
  questionnaire: Questionnaire,
  structuredData: StructuredQuestionnaireData | null,
  inbodyScan: InBodyScan | null = null,
  client: Client | null = null,
  trainerPersonaInjection?: string
): Promise<LLMWorkoutResponse[]> {
  const questionnaireText = formatQuestionnaireForPrompt(questionnaire, structuredData);
  const inbodyText = formatInBodyScanForPrompt(inbodyScan);
  const clientInfoText = formatClientInfoForPrompt(client);
  const week1Workouts = recommendation.sessions_per_week; // Only week 1

  const prompt = `You are an expert personal trainer generating detailed workouts for WEEK 1 of a 6-week training program.

## Client Context

**Selected Persona:** ${recommendation.client_type}
**Sessions Per Week:** ${recommendation.sessions_per_week}
**Session Length:** ${recommendation.session_length_minutes} minutes
**Training Style:** ${recommendation.training_style}

${clientInfoText ? `${clientInfoText}\n\n` : ''}## Client Questionnaire

${questionnaireText}
${inbodyText ? `\n${inbodyText}\n` : ''}
${coachPersonaBlock(trainerPersonaInjection)}## Instructions

${GOALS_VS_INJURIES_INSTRUCTION}

Generate ONLY WEEK 1 workouts (${week1Workouts} total sessions for week 1). Each workout should include:
- Specific exercises with sets, reps, weight/load guidance, rest periods
- Warmup and cooldown exercises when appropriate
- Notes on form, tempo, or RIR when relevant
- Brief reasoning for exercise selection

**CRITICAL: Generate ONLY Week 1 workouts**
- Generate workouts for WEEK 1 ONLY, sessions 1-${recommendation.sessions_per_week}
- All workouts must have week_number: 1
- Each exercise must have at least a name
- Be specific with exercise selection - use actual exercise names
- Be specific with load - using lbs, percentage of 1RM, bodyweight, RIR, etc
- These are foundational workouts to establish the program
- Keep exercise notes and reasoning concise
- Make workouts realistic and achievable for the client's level
- Plan exercises, rest periods, warmup, and cooldown to fit within ${recommendation.session_length_minutes} minutes total.

## Output Format

You must respond with a valid JSON object with this structure:

{
  "workouts": [
    {
      "week_number": 1,
      "session_number": 1,
      "workout_name": "Upper Body Strength",
      "workout_data": {
        "exercises": [
          {
            "name": "Barbell Bench Press",
            "sets": 4,
            "reps": "6-8",
            "weight": "RIR 2",
            "rest_seconds": 180,
            "notes": "Focus on controlled tempo",
            "rir": 2
          }
        ],
        "warmup": [{"name": "Light Cardio", "notes": "5 minutes"}],
        "cooldown": [{"name": "Static Stretching", "notes": "Focus on chest"}],
        "total_duration_minutes": 60,
        "focus_areas": ["upper body", "push", "strength"]
      },
      "workout_reasoning": "This workout focuses on building upper body strength..."
    }
  ]
}

CRITICAL: 
- Respond with ONLY valid JSON. All strings must be properly escaped.
- Generate exactly ${week1Workouts} workouts for WEEK 1 ONLY
- All workouts must have "week_number": 1
- Do NOT generate workouts for weeks 2-6
- Keep all text fields SHORT (max 100 characters per field) to prevent truncation
- Exercise notes should be brief (1-2 sentences max)
- Workout reasoning should be concise (2-3 sentences max)`;

  const responseContent = await callOpenAIWithRetry(
    [
      {
        role: 'system',
        content:
          'You are an expert personal trainer. You MUST respond with ONLY valid JSON. No markdown code blocks, no explanations, no additional text. All string values must have properly escaped quotes (use \\" for quotes inside strings). Generate ONLY Week 1 workouts. Ensure all JSON brackets and braces are properly closed. Keep all text fields concise to avoid truncation.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    {
      maxTokens: 6000, // Reduced to prevent truncation issues
      maxRetries: 1, // Only retry on rate limits - don't waste tokens on API errors
    }
  );

  const parsed = parseJSONWithRepair<{ workouts: LLMWorkoutResponse[] }>(
    responseContent,
    1, // Only 1 attempt - don't waste tokens on repair retries
    responseContent // Pass raw response for error logging
  );

  if (!parsed.workouts || !Array.isArray(parsed.workouts)) {
    throw new Error('Invalid workout response: missing workouts array');
  }

  // Validate we got the right number of workouts for week 1
  if (parsed.workouts.length !== week1Workouts) {
    // tolerate count mismatch from the model
  }

  const invalidWeeks = parsed.workouts.filter((w) => w.week_number !== 1);
  if (invalidWeeks.length > 0) {
    parsed.workouts = parsed.workouts.filter((w) => w.week_number === 1);
  }

  return enrichLlmWorkoutsWithExerciseLibrary(parsed.workouts);
}

/**
 * Full recommendation: planning-direction structure plus Week 1 workouts.
 */
export async function generateRecommendationWithAI(
  questionnaire: Questionnaire,
  inbodyScan: InBodyScan | null = null,
  client: Client | null = null,
  structureOptions?: GenerateRecommendationStructureOptions,
  trainerPersonaInjection?: string | null
): Promise<LLMRecommendationResponse> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      'OPENAI_API_KEY environment variable is not set. Please configure it to use AI recommendations.'
    );
  }

  const structuredData = parseQuestionnaireData(questionnaire);

  try {
    const recommendation = await generateRecommendationStructure(
      questionnaire,
      structuredData,
      inbodyScan,
      client,
      trainerPersonaInjection ?? undefined,
      structureOptions
    );

    const workouts = await generateWorkouts(
      recommendation,
      questionnaire,
      structuredData,
      inbodyScan,
      client,
      trainerPersonaInjection ?? undefined
    );

    return {
      ...recommendation,
      workouts,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate AI recommendation: ${error.message}`);
    }
    throw new Error('Failed to generate AI recommendation: Unknown error');
  }
}

/**
 * Legacy function for backward compatibility
 * Now uses the LLM-based approach
 */
export async function generateRecommendation(
  questionnaire: Questionnaire
): Promise<LLMRecommendationResponse> {
  return generateRecommendationWithAI(questionnaire);
}

/**
 * Generates workouts for a specific week based on previous weeks' performance
 * This is used for progressive week generation after Week 1
 */
export async function generateWeekWorkouts(
  recommendation: Recommendation,
  previousWeeksData: {
    week_number: number;
    workouts: Workout[];
    actual_workouts: ActualWorkout[];
  }[],
  questionnaire: Questionnaire,
  structuredData: StructuredQuestionnaireData | null,
  targetWeek: number,
  inbodyScan: InBodyScan | null = null,
  client: Client | null = null,
  trainerPersonaInjection?: string
): Promise<LLMWorkoutResponse[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      'OPENAI_API_KEY environment variable is not set. Please configure it to use AI recommendations.'
    );
  }

  const questionnaireText = formatQuestionnaireForPrompt(questionnaire, structuredData);
  const inbodyText = formatInBodyScanForPrompt(inbodyScan);
  const clientInfoText = formatClientInfoForPrompt(client);
  const sessionsPerWeek = recommendation.sessions_per_week;

  // Build performance history summary
  let performanceHistoryText = '';
  if (previousWeeksData.length > 0) {
    performanceHistoryText = '## Performance History\n\n';
    
    for (const weekData of previousWeeksData) {
      performanceHistoryText += `### Week ${weekData.week_number} Results:\n\n`;
      
      for (let i = 0; i < weekData.workouts.length; i++) {
        const workout = weekData.workouts[i];
        const actualWorkout = weekData.actual_workouts.find(
          aw => aw.workout_id === workout.id
        );

        performanceHistoryText += `**Session ${workout.session_number}: ${workout.workout_name || 'Workout'}**\n`;
        
        if (actualWorkout) {
          performanceHistoryText += `- Overall RIR: ${actualWorkout.overall_rir || 'N/A'}/5\n`;
          performanceHistoryText += `- Client Energy Level: ${actualWorkout.client_energy_level || 'N/A'}/10\n`;
          if (actualWorkout.workout_rating) {
            const ratingEmoji = actualWorkout.workout_rating === 'happy' ? '😊' : 
                               actualWorkout.workout_rating === 'meh' ? '😐' : '😞';
            performanceHistoryText += `- Overall Workout Rating: ${ratingEmoji} (${actualWorkout.workout_rating})\n`;
          }
          
          if (actualWorkout.actual_performance.exercises.length > 0) {
            performanceHistoryText += `- Exercise Performance:\n`;
            actualWorkout.actual_performance.exercises.forEach((ex) => {
              performanceHistoryText += `  - ${ex.exercise_name}: `;
              if (ex.sets_completed) performanceHistoryText += `${ex.sets_completed} sets, `;
              if (ex.reps_completed) performanceHistoryText += `${ex.reps_completed} reps, `;
              if (ex.weight_used) performanceHistoryText += `${ex.weight_used}, `;
              if (ex.rir !== undefined) performanceHistoryText += `RIR ${ex.rir}`;
              if (ex.exercise_rating) {
                const ratingEmoji = ex.exercise_rating === 'happy' ? '😊' : 
                                   ex.exercise_rating === 'meh' ? '😐' : '😞';
                performanceHistoryText += `, Rating: ${ratingEmoji} (${ex.exercise_rating})`;
              }
              performanceHistoryText += '\n';
              if (ex.exercise_notes) {
                performanceHistoryText += `    Notes: ${ex.exercise_notes}\n`;
              } else if (ex.notes) {
                performanceHistoryText += `    Notes: ${ex.notes}\n`;
              }
              // Include per-round data if available
              if (ex.rounds && ex.rounds.length > 0) {
                performanceHistoryText += `    Round Details:\n`;
                ex.rounds.forEach((round) => {
                  performanceHistoryText += `      Round ${round.round_number}: `;
                  if (round.reps) performanceHistoryText += `${round.reps} reps, `;
                  if (round.weight) performanceHistoryText += `${round.weight}, `;
                  if (round.rir !== undefined) performanceHistoryText += `RIR ${round.rir}`;
                  performanceHistoryText += '\n';
                });
              }
            });
          }
          
          if (actualWorkout.trainer_observations) {
            performanceHistoryText += `- Trainer Observations: ${actualWorkout.trainer_observations}\n`;
          }
          if (actualWorkout.session_notes) {
            performanceHistoryText += `- Session Notes: ${actualWorkout.session_notes}\n`;
          }
        } else {
          performanceHistoryText += `- Status: Not completed\n`;
        }
        performanceHistoryText += '\n';
      }
    }
  }

  const prompt = `You are an expert personal trainer generating workouts for WEEK ${targetWeek} of a 6-week training program.

## Original Client Context

**Selected Persona:** ${recommendation.client_type}
**Sessions Per Week:** ${recommendation.sessions_per_week}
**Session Length:** ${recommendation.session_length_minutes} minutes
**Training Style:** ${recommendation.training_style}
**Original Plan Structure:** ${JSON.stringify(recommendation.plan_structure, null, 2)}
**Original AI Reasoning:** ${recommendation.ai_reasoning || 'N/A'}

${performanceHistoryText}

${clientInfoText ? `${clientInfoText}\n\n` : ''}## Client Questionnaire

${questionnaireText}
${inbodyText ? `\n${inbodyText}\n` : ''}
${coachPersonaBlock(trainerPersonaInjection)}## Instructions

Generate workouts for WEEK ${targetWeek} ONLY (${sessionsPerWeek} total sessions). These workouts should:

1. **Build on previous weeks' performance:**
   - Adjust difficulty based on actual RIR and performance data
   - Address any issues noted in trainer observations
   - Progress appropriately based on what the client actually achieved
   - Maintain client engagement and motivation

2. **Follow the original plan structure** while adapting to real-world results:
   - Stay true to the original training style and approach
   - Maintain the overall progression strategy
   - Adjust volume/intensity based on actual performance

3. **Consider performance feedback:**
   - If client struggled (low RIR, low energy), reduce difficulty or volume
   - If client exceeded expectations (high RIR, high energy), increase challenge appropriately
   - Address specific issues mentioned in trainer observations
   - Build on exercises that worked well

4. **Each workout should include:**
   - Specific exercises with sets, reps, weight/load guidance, rest periods
   - Warmup and cooldown exercises when appropriate
   - Notes on form, tempo, or RIR when relevant
   - Brief reasoning for exercise selection and progression

5. ${GOALS_VS_INJURIES_INSTRUCTION}

**CRITICAL: Generate ONLY Week ${targetWeek} workouts**
- Generate workouts for WEEK ${targetWeek} ONLY, sessions 1-${sessionsPerWeek}
- All workouts must have week_number: ${targetWeek}
- Each exercise must have at least a name
- Be specific with exercise selection - use actual exercise names
- Keep exercise notes and reasoning concise
- Make workouts realistic and achievable based on actual performance

## Output Format

You must respond with a valid JSON object with this structure:

{
  "workouts": [
    {
      "week_number": ${targetWeek},
      "session_number": 1,
      "workout_name": "Upper Body Strength",
      "workout_data": {
        "exercises": [
          {
            "name": "Barbell Bench Press",
            "sets": 4,
            "reps": "6-8",
            "weight": "RIR 2",
            "rest_seconds": 180,
            "notes": "Focus on controlled tempo",
            "rir": 2
          }
        ],
        "warmup": [{"name": "Light Cardio", "notes": "5 minutes"}],
        "cooldown": [{"name": "Static Stretching", "notes": "Focus on chest"}],
        "total_duration_minutes": ${recommendation.session_length_minutes},
        "focus_areas": ["upper body", "push", "strength"]
      },
      "workout_reasoning": "This workout builds on Week ${targetWeek - 1} performance..."
    }
  ]
}

CRITICAL: 
- Respond with ONLY valid JSON. All strings must be properly escaped.
- Generate exactly ${sessionsPerWeek} workouts for WEEK ${targetWeek} ONLY
- All workouts must have "week_number": ${targetWeek}
- Do NOT generate workouts for other weeks
- Keep all text fields SHORT (max 100 characters per field) to prevent truncation
- Exercise notes should be brief (1-2 sentences max)
- Workout reasoning should explain how this week builds on previous performance`;

  const responseContent = await callOpenAIWithRetry(
    [
      {
        role: 'system',
        content:
          'You are an expert personal trainer. You MUST respond with ONLY valid JSON. No markdown code blocks, no explanations, no additional text. All string values must have properly escaped quotes (use \\" for quotes inside strings). Generate ONLY the specified week workouts. Ensure all JSON brackets and braces are properly closed. Keep all text fields concise to avoid truncation.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    {
      maxTokens: 6000,
      maxRetries: 1, // Only retry on rate limits - don't waste tokens on API errors
    }
  );

  console.log(`Received week ${targetWeek} workout response (${responseContent.length} characters)`);

  const parsed = parseJSONWithRepair<{ workouts: LLMWorkoutResponse[] }>(
    responseContent,
    1, // Only 1 attempt - don't waste tokens on repair retries
    responseContent
  );

  if (!parsed.workouts || !Array.isArray(parsed.workouts)) {
    throw new Error('Invalid workout response: missing workouts array');
  }

  // Validate we got the right number of workouts
  if (parsed.workouts.length !== sessionsPerWeek) {
    console.warn(`⚠️  Expected ${sessionsPerWeek} workouts for week ${targetWeek}, got ${parsed.workouts.length}`);
  }

  // Validate all workouts are for the target week
  const invalidWeeks = parsed.workouts.filter(w => w.week_number !== targetWeek);
  if (invalidWeeks.length > 0) {
    console.warn(`⚠️  Found ${invalidWeeks.length} workouts not for week ${targetWeek}, filtering them out`);
    parsed.workouts = parsed.workouts.filter(w => w.week_number === targetWeek);
  }

  console.log(`✅ Generated ${parsed.workouts.length} workouts for Week ${targetWeek}`);

  return enrichLlmWorkoutsWithExerciseLibrary(parsed.workouts);
}

function assertTrainerPersonaShape(data: unknown): asserts data is TrainerPersonaStructured {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid trainer persona JSON');
  }
  const o = data as Record<string, unknown>;
  if (typeof o.coaching_headline !== 'string' || typeof o.coaching_narrative !== 'string') {
    throw new Error('Invalid trainer persona: missing required text fields');
  }
}

/**
 * Builds structured JSON persona from free-form trainer + client-need notes (for prompts).
 */
export async function generateTrainerStructuredPersona(
  rawTrainerDefinition: string,
  rawClientNeeds: string
): Promise<TrainerPersonaStructured> {
  const prompt = `Synthesize a structured coaching persona as a single JSON object.

Required keys:
- coaching_headline (string)
- coaching_narrative (string)
- programming_pillars (array of { "name": string, "summary": string })
- progression_philosophy (string)
- intensity_and_effort_model (string)
- prehab_and_systems_integration (string)
- client_archetype_summary (string)
- ideal_client_needs (string array, short bullets)
- programming_anti_patterns (string array)
- ai_prompt_injection (one paragraph for downstream LLM program generation; concise, imperative)

### Trainer definition
${rawTrainerDefinition}

### Typical client needs
${rawClientNeeds}`;

  const content = await callOpenAIWithRetry(
    [
      {
        role: 'system',
        content:
          'You are an expert coach. Respond with ONLY valid JSON. No markdown, no preamble.',
      },
      { role: 'user', content: prompt },
    ],
    { maxTokens: 4000, maxRetries: 1 }
  );

  const parsed = parseJSONWithRepair<TrainerPersonaStructured>(
    content,
    1,
    content
  );
  assertTrainerPersonaShape(parsed);
  return parsed;
}
