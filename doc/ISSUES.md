# Known Issues & Bug Tracker

## 🔴 Critical Issues

### 1. ChatGPT Message Extraction Failure
**Status**: ❌ Not Working  
**Version**: v4.1.1  
**Reported**: 2025-08-22  

#### Problem Description
- ChatGPT conversations are not being extracted properly
- Q&A pairs are not saved at all
- Issue may be related to using different models (GPT-4, GPT-4o, GPT-3.5)

#### Technical Analysis
**Current selector in sites.js**:
```javascript
pattern: {
  type: 'data-testid',
  messageSelector: '[data-testid^="conversation-turn-"]',
  messageIndicator: '.sr-only',
  userText: '나의 말:',
  assistantText: 'ChatGPT의 말:'
}
```

**Potential Issues**:
1. **Model-specific DOM**: Different models may generate different DOM structures
2. **Language Detection**: Korean text patterns ('나의 말:', 'ChatGPT의 말:') might not match in English interface
3. **Dynamic Structure**: ChatGPT frequently updates UI structure
4. **Content Nesting**: The selector `div > div > div > div > div:first-child` is too rigid

#### Debugging Steps
```javascript
// Console tests to run on ChatGPT page:
// 1. Check for conversation turns
document.querySelectorAll('[data-testid^="conversation-turn-"]').length

// 2. Check for sr-only indicators
document.querySelectorAll('.sr-only').forEach(el => console.log(el.textContent))

// 3. Check actual structure of a message
document.querySelector('[data-testid^="conversation-turn-"]')?.innerHTML

// 4. Check for different model indicators
Array.from(document.querySelectorAll('[class*="model"]')).map(el => el.className)
```

#### Proposed Solutions
1. **Update selectors** for current ChatGPT DOM
2. **Add model detection** to handle different structures
3. **Implement fallback patterns** for various layouts
4. **Support both Korean and English interfaces**

---

### 2. Artifact Download Not Working
**Status**: ❌ Not Working  
**Version**: v4.1.1  
**Details**: See [CURRENT_WORK.md](./CURRENT_WORK.md)

---

## 🟡 Minor Issues

### 3. Claude Q&A File Indentation Problem
**Status**: 🔧 Needs Fix  
**Version**: v4.1.1  
**Reported**: 2025-08-22  

#### Problem Description
- In Claude Q&A files, questions (Q) are not properly indented
- The full conversation file has correct formatting
- Only the questions-only file has indentation issues

#### Current Output
```markdown
## Q1
User question without indentation
```

#### Expected Output
```markdown
## Q1
	User question with proper indentation
```

#### Fix Location
**File**: content.js  
**Function**: `generateQuestionsOnlyMarkdown()`  
**Line**: ~1090

```javascript
// Current code (line ~1095)
markdown += `## Q${qa.index}\n`;
markdown += `${qa.human}\n\n`;

// Should be:
markdown += `## Q${qa.index}\n`;
markdown += `\t${qa.human.replace(/\n/g, '\n\t')}\n\n`;
```

---

## 🟢 Enhancement Requests

### 4. Support for ChatGPT Canvas
**Status**: 📝 Planned  
**Priority**: Medium  

### 5. Support for Deep Research PDFs
**Status**: 📝 Planned  
**Priority**: Low  

### 6. Support for Gemini
**Status**: 📝 Planned  
**Priority**: Low  

---

## Testing Checklist

### For ChatGPT Issues:
- [ ] Test with GPT-3.5 model
- [ ] Test with GPT-4 model
- [ ] Test with GPT-4o model
- [ ] Test with custom GPTs
- [ ] Test in Korean interface
- [ ] Test in English interface
- [ ] Test with code blocks
- [ ] Test with tables
- [ ] Test with images
- [ ] Test with Canvas

### For Claude Issues:
- [ ] Test with Artifacts
- [ ] Test with Thinking blocks
- [ ] Test with Citations
- [ ] Test with long conversations
- [ ] Test Q&A file indentation

---

## Version History

### v4.1.1 (In Development)
- ❌ Artifact download feature (not working)
- ❌ ChatGPT extraction (broken)
- 🔧 Q&A indentation issue

### v4.0.0
- ✅ Multi-platform support
- ✅ Claude extraction working
- ⚠️ ChatGPT extraction unstable

### v3.1.11
- ✅ Tab title priority
- ✅ Thinking/Answer separation
- ✅ Stable Claude extraction

---

## Quick Fixes

### Fix 1: Q&A Indentation
```javascript
// In generateQuestionsOnlyMarkdown() function
// Replace line ~1095:
markdown += `\t${qa.human.replace(/\n/g, '\n\t')}\n\n`;
```

### Fix 2: ChatGPT Model Detection
```javascript
// Add to sites.js chatgpt configuration:
modelIndicators: {
  'gpt-3.5': '[data-model*="3.5"]',
  'gpt-4': '[data-model*="gpt-4"]',
  'gpt-4o': '[data-model*="4o"]'
}
```

### Fix 3: Language Support
```javascript
// Update sites.js pattern:
pattern: {
  userText: ['나의 말:', 'You said:', 'User:'],
  assistantText: ['ChatGPT의 말:', 'ChatGPT said:', 'Assistant:']
}
```

---

## Debug Mode Commands

Enable debug mode for detailed logging:
```javascript
// Press Cmd+Shift+D (Mac) or Ctrl+Shift+D (Windows)
// Or in console:
DEBUG = true;
```

Check current site detection:
```javascript
currentSite
```

Test extraction manually:
```javascript
extractConversation()
```

---

## Contact for Issues

For bug reports or feature requests, please provide:
1. Browser version
2. Extension version
3. Platform (Claude/ChatGPT)
4. Model used (for ChatGPT)
5. Interface language
6. Console error logs
7. Sample conversation structure (if possible)