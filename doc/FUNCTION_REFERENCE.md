# LLM Chat Logger - Function Reference

## content.js Functions

### Core Functions

#### `extractConversation()`
**Purpose**: Main extraction orchestrator  
**Returns**: Array of Q&A pairs  
**Flow**:
1. Finds conversation container using platform selectors
2. Determines extraction pattern type
3. Calls appropriate extraction function
4. Returns structured Q&A array

**Error Codes**:
- 001: Container not found
- 002: Unknown pattern type
- 003: Extraction exception

---

#### `saveConversation()`
**Purpose**: Handles the complete save workflow  
**Returns**: void  
**Async**: Yes  
**Flow**:
1. Calls extractConversation()
2. Generates markdown for both formats
3. Creates download links
4. Triggers downloads
5. Attempts artifact downloads (v4.1.1)
6. Shows success toast

**Error Code**: 005 (Save operation error)

---

### Extraction Functions

#### `extractSequentialPairs(container)`
**Purpose**: Extract Claude-style sequential div pairs  
**Parameters**: 
- `container`: DOM element containing messages
**Returns**: Array of Q&A pairs  
**Logic**:
```
for each pair of divs:
  - div[i] = human message
  - div[i+1] = assistant message
  - Skip if no edit button (system message)
  - Extract content with thinking separation
```

---

#### `extractDataTestId(container)`
**Purpose**: Extract ChatGPT-style data-testid messages  
**Parameters**:
- `container`: DOM element containing messages
**Returns**: Array of Q&A pairs  
**Logic**:
```
for each [data-testid^="conversation-turn-"]:
  - Check .sr-only for role
  - Extract nested content divs
  - Handle special elements (tables, code)
```

---

#### `extractAssistantContentTopDown(element)`
**Purpose**: Two-phase extraction for assistant messages  
**Parameters**:
- `element`: Assistant message DOM element
**Returns**: Object with contents and artifacts arrays  
**Phases**:
1. **Collection**: Gather nodes without DOM modification
2. **Processing**: Transform nodes to structured content

**Key Features**:
- Preserves original order
- Handles nested thinking blocks
- Detects artifacts
- Maintains markdown formatting

---

### Content Processing Functions

#### `extractContent(element, role)`
**Purpose**: Extract and clean text content  
**Parameters**:
- `element`: DOM element to extract from
- `role`: 'human' or 'assistant'
**Returns**: String of cleaned content  
**Operations**:
- Removes UI elements (buttons, avatars)
- Preserves meaningful text
- Handles code blocks specially

---

#### `extractThinkingContent(container)`
**Purpose**: Extract Claude thinking block content  
**Parameters**:
- `container`: Thinking block DOM element
**Returns**: String of thinking content  
**Special Handling**:
- Checks if expanded or collapsed
- Extracts summary if collapsed
- Gets full content if expanded

---

#### `extractArtifactInfo(element)`
**Purpose**: Extract artifact metadata (v4.1.1)  
**Parameters**:
- `element`: Artifact DOM element
**Returns**: Artifact object or null  
**Structure**:
```javascript
{
  id: 'unique_id',
  title: 'Artifact name',
  subtitle: 'Description',
  element: DOMElement,
  clickableElement: DOMElement
}
```

---

### Utility Functions

#### `log(...args)`
**Purpose**: Debug logging  
**Condition**: Only logs if DEBUG=true  
**Format**: `[LLM Logger] {message}`

---

#### `logError(code, message, details)`
**Purpose**: Error logging  
**Always Active**: Yes  
**Format**: `[LLM-ERROR-{code}] {message} {details}`

---

#### `findContainer(selectors)`
**Purpose**: Find conversation container using multiple strategies  
**Parameters**:
- `selectors`: Array of selector objects
**Returns**: DOM element or null  
**Strategy**:
1. Try XPath selectors first
2. Fall back to CSS selectors
3. Return first match

---

#### `removeUIElements(element)`
**Purpose**: Clean UI elements from extracted content  
**Parameters**:
- `element`: DOM element to clean
**Removes**:
- Buttons
- SVG icons
- Avatars (rounded elements with initials)
- Time indicators
- Copy/Edit buttons

---

#### `isUIText(text)`
**Purpose**: Check if text is UI element  
**Parameters**:
- `text`: String to check
**Returns**: Boolean  
**Uses**: Platform-specific uiPatterns array

---

### Markdown Generation Functions

#### `generateMarkdown(qaPairs)`
**Purpose**: Generate full conversation markdown  
**Parameters**:
- `qaPairs`: Array of Q&A objects
**Returns**: Object with markdown and title  
**Format**: Full conversation with metadata, thinking blocks, and answers

---

#### `generateQuestionsOnlyMarkdown(qaPairs)`
**Purpose**: Generate questions-only markdown  
**Parameters**:
- `qaPairs`: Array of Q&A objects
**Returns**: String of markdown  
**Format**: Simple list of questions without answers

---

#### `convertToMarkdownFull(html)`
**Purpose**: Convert HTML to markdown  
**Parameters**:
- `html`: HTML string
**Returns**: Markdown string  
**Handles**:
- Headers (h1-h6)
- Links
- Bold/Italic
- Lists (ordered/unordered)
- Code blocks
- Tables (ChatGPT)
- Line breaks

---

#### `convertListToMarkdown(listElement, indent)`
**Purpose**: Convert HTML lists to markdown  
**Parameters**:
- `listElement`: UL or OL element
- `indent`: Current indentation level
**Returns**: Markdown string  
**Features**:
- Handles nested lists
- Preserves numbering
- Maintains indentation

---

#### `convertTableToMarkdown(table)`
**Purpose**: Convert HTML tables to markdown (ChatGPT)  
**Parameters**:
- `table`: Table element
**Returns**: Markdown table string  
**Format**:
```markdown
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
```

---

### Title Generation Functions

#### `generateTitle(qaPairs)`
**Purpose**: Generate filename-safe title  
**Parameters**:
- `qaPairs`: Array of Q&A objects
**Returns**: Object with title and keywords  
**Priority**:
1. Use browser tab title
2. Extract keywords from content
3. Fallback to "conversation"

---

#### `extractKeywords(text, maxKeywords)`
**Purpose**: Extract meaningful keywords from text  
**Parameters**:
- `text`: Source text
- `maxKeywords`: Maximum number to extract
**Returns**: Array of keywords  
**Process**:
1. Clean and tokenize text
2. Remove stopwords
3. Remove particles (Korean)
4. Count frequencies
5. Filter by threshold
6. Return top keywords

---

#### `cleanKoreanWord(word)`
**Purpose**: Clean Korean word for keyword extraction  
**Parameters**:
- `word`: Korean word
**Returns**: Cleaned word  
**Operations**:
- Remove particles
- Normalize verb endings
- Preserve word stem

---

### Event Handlers

#### `handleKeyPress(event)`
**Purpose**: Handle keyboard shortcuts  
**Triggers**:
- Cmd+S (Mac) / Ctrl+S (Windows): Save conversation
- Cmd+Shift+D / Ctrl+Shift+D: Toggle debug mode
**Prevents**: Default save dialog

---

### Toast Notification

#### `showToast(message, duration)`
**Purpose**: Show temporary notification  
**Parameters**:
- `message`: Text to display
- `duration`: Display time in ms (default: 3000)
**Style**: Fixed position, dark theme, fade animation

---

### Artifact Functions (v4.1.1 - In Development)

#### `downloadArtifacts(artifacts)` ⚠️ Not Working
**Purpose**: Trigger artifact downloads  
**Parameters**:
- `artifacts`: Array of artifact objects
**Issues**:
- Cannot find correct menu button selector
- Click simulation not working
- Download link not accessible

---

#### `sleep(ms)`
**Purpose**: Async delay helper  
**Parameters**:
- `ms`: Milliseconds to wait
**Returns**: Promise  
**Usage**: `await sleep(1000)`

---

## sites.js Functions

#### `detectCurrentSite()`
**Purpose**: Detect current LLM platform  
**Returns**: Site configuration object or null  
**Detection**: Based on `window.location.hostname`  
**Supported**: claude.ai, chatgpt.com

---

## keywords.js Data Structure

### `KOREAN_FILTERS`
**Purpose**: Korean language processing configuration  
**Structure**:
```javascript
{
  stopWords: [],           // Words to exclude
  baselineFrequency: {},   // Expected frequencies
  particles: [],           // Korean particles
  verbEndings: []         // Verb/adjective endings
}
```

---

## Function Call Hierarchy

```
User presses Cmd/Ctrl+S
  └─> handleKeyPress()
      └─> saveConversation()
          ├─> extractConversation()
          │   ├─> detectCurrentSite()
          │   ├─> findContainer()
          │   └─> extractSequentialPairs() or extractDataTestId()
          │       ├─> extractAssistantContentTopDown()
          │       │   ├─> extractThinkingContent()
          │       │   └─> extractArtifactInfo()
          │       └─> extractContent()
          ├─> generateMarkdown()
          │   ├─> generateTitle()
          │   │   └─> extractKeywords()
          │   └─> convertToMarkdownFull()
          ├─> generateQuestionsOnlyMarkdown()
          ├─> downloadArtifacts() [if artifacts exist]
          └─> showToast()
```

## Performance Characteristics

### Time Complexity
- Container finding: O(1) - Direct selector
- Message extraction: O(n) - Linear scan
- Content processing: O(n*m) - n messages, m nodes
- Markdown generation: O(n) - Linear
- Keyword extraction: O(n log n) - Sorting

### Space Complexity
- Memory usage: O(n) - Proportional to conversation size
- No persistent storage
- Temporary DOM clones cleared after use

## Common Issues & Solutions

### Issue: Container not found
**Cause**: DOM structure changed  
**Solution**: Update selectors in sites.js

### Issue: Thinking blocks not separated
**Cause**: Class names changed  
**Solution**: Update extraction.thinking selectors

### Issue: Artifacts not downloading
**Status**: Known bug in v4.1.1  
**Workaround**: Manual download from UI

### Issue: Korean keywords poor quality
**Cause**: Insufficient filtering  
**Solution**: Add to stopWords in keywords.js