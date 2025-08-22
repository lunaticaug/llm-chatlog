# LLM Chat Logger - Project Overview

## Executive Summary
LLM Chat Logger is a Chrome extension that extracts and saves chat conversations from LLM platforms (Claude.ai and ChatGPT) as structured markdown files. The extension preserves the conversation structure, including thinking blocks, answers, and artifacts, while providing clean, readable output.

## Current Version
- **Version**: v4.1.1 (in development)
- **Status**: Core features working, Artifact download feature incomplete
- **Supported Platforms**: Claude.ai, ChatGPT

## Key Features
1. **Multi-platform Support**: Works with both Claude.ai and ChatGPT
2. **Dual File Output**: Generates both full conversation and questions-only files
3. **Thinking/Answer Separation**: Preserves Claude's thinking blocks as separate sections
4. **Korean Keyword Extraction**: Intelligent keyword extraction for Korean text
5. **Artifact Detection** (in progress): Automatic download of Claude artifacts

## Project Structure

```
llm-chatlog/
├── llm-chat-logger/        # Current v4.x (multi-platform)
│   ├── content.js          # Main logic (1300+ lines)
│   ├── sites.js            # Platform-specific DOM configs
│   ├── keywords.js         # Korean language processing
│   └── manifest.json       # Extension manifest
├── claude-chat-logger/     # Legacy v2.11 (Claude-only)
├── gpt-chat-logger/        # Standalone GPT version (deprecated)
├── doc/                    # Technical documentation
├── _log/                   # Development logs
├── _sample/                # Sample outputs
└── _sessions/              # Session logs
```

## Architecture Philosophy

### Modular Design (v4.x)
The v4.x architecture separates concerns into three main files:
- **content.js**: Core logic, platform-agnostic
- **sites.js**: Platform-specific DOM structures and selectors
- **keywords.js**: Language processing utilities

This design allows easy addition of new platforms without modifying core logic.

### Key Design Decisions
1. **DOM-first Approach**: Extract first, process later
2. **No Build Process**: Direct JavaScript for easy debugging
3. **Platform Detection**: Automatic detection based on domain
4. **Non-destructive Extraction**: Preserves original content structure

## Core Components

### 1. Content Extraction Engine
- Platform-agnostic extraction logic
- Two-phase processing: collect nodes → process content
- Preserves markdown formatting and code blocks
- Handles nested structures (thinking blocks, answers)

### 2. Platform Adapters (sites.js)
- DOM selectors for each platform
- Pattern definitions (sequential-pairs, data-testid)
- Special element configurations
- UI pattern filters

### 3. Keyword Extraction (keywords.js)
- Korean stopword filtering
- Particle removal
- Frequency-based keyword selection
- Tab title fallback

### 4. File Generation
- Dual output: full conversation + questions-only
- Timestamp-based naming
- Korean/English keyword integration
- Version tracking in filename

## Data Flow

```
1. User triggers save (Cmd/Ctrl+S)
   ↓
2. Detect current platform
   ↓
3. Find conversation container
   ↓
4. Extract messages using platform pattern
   ↓
5. Process content (thinking/answer separation)
   ↓
6. Generate markdown
   ↓
7. Extract keywords for filename
   ↓
8. Save files
   ↓
9. (Optional) Download artifacts
```

## Browser Compatibility
- **Chrome**: Full support (primary target)
- **Edge**: Expected to work (Chromium-based)
- **Firefox**: Not tested
- **Safari**: Not supported

## Known Limitations
1. Artifact download feature not working (v4.1.1)
2. ChatGPT Canvas not yet supported
3. Deep Research PDFs not handled
4. No automatic updates
5. Manual reload required after extension update

## Performance Characteristics
- Extraction time: <1 second for typical conversations
- Memory usage: Minimal (DOM operations only)
- File size: Proportional to conversation length
- No external dependencies

## Security Considerations
- No data sent to external servers
- All processing done locally
- No persistent storage except downloads
- Read-only DOM access
- No code execution from extracted content