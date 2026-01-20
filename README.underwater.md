# README.md - Underwater Doc

## Context & Constraints

- User needed project documentation after fixing VS Code extension activation issue
- Project has dual interfaces (CLI + VS Code) requiring unified explanation
- Chinese-speaking audience (bilingual approach needed)
- Existing CHANGELOG.md and GUIDE.md already present
- No existing README, needed comprehensive overview

## Decision Log

### 1. Document Structure
**Decision**: Top-down approach (overview → architecture → usage → internals)
**Rationale**: Users need quick understanding before diving into details
**Date**: 2026-01-20

### 2. Language Choice
**Decision**: Chinese for main content
**Rationale**:
- User communicates in Chinese
- Existing docs (CHANGELOG, GUIDE) are in Chinese
- Target audience likely Chinese game developers
**Date**: 2026-01-20

### 3. Technical Depth
**Decision**: Mid-level detail (not tutorial, not deep dive)
**Rationale**:
- README should be accessible entry point
- Detailed guides exist in GUIDE.md
- Code comments provide implementation details
**Date**: 2026-01-20

### 4. Dual Interface Presentation
**Decision**: Present both CLI and VS Code equally
**Rationale**:
- Both are first-class interfaces
- Different use cases (automation vs interactive)
- Avoid favoring one over the other
**Date**: 2026-01-20

## Alternatives Considered

### Alt 1: English-first documentation
**Rejected**: Inconsistent with existing docs, user preference, and target audience

### Alt 2: Separate READMEs for CLI and VS Code
**Rejected**:
- Creates maintenance burden
- Shared architecture needs unified explanation
- Users may use both interfaces

### Alt 3: Tutorial-style README
**Rejected**:
- Too verbose for README
- GUIDE.md already serves this purpose
- README should be reference, not tutorial

### Alt 4: Deep technical architecture doc
**Rejected**:
- Too detailed for entry point
- Code exploration better for deep understanding
- Would duplicate inline documentation

## Trade-offs

### Breadth vs Depth
**Chosen**: Breadth (cover all major components)
**Trade-off**: Less detail on each component
**Mitigation**: Link to source files with line numbers for deep dives

### Simplicity vs Completeness
**Chosen**: Completeness (all major features documented)
**Trade-off**: Longer document
**Mitigation**: Clear section headers, scannable structure

### Code Examples vs Conceptual
**Chosen**: Minimal code examples, focus on concepts
**Trade-off**: Users need to explore code for implementation
**Mitigation**: Provide clear usage commands, not implementation details

## Key Insights from Exploration

- Project uses sophisticated context management (summaries + on-demand loading)
- Mail system is core innovation for async user feedback during generation
- Three-agent architecture (Interviewer → Writer → Reviewer) is well-separated
- VS Code extension recently fixed: activation event changed from `onCommand` to `onStartupFinished`
- Shared core logic between CLI and VS Code (agents, core systems)
- Data stored in `.gdd/` directory (session state, mails, metadata)

## Risks

1. **Documentation Drift**: README may become outdated as code evolves
   - Mitigation: Keep high-level, avoid implementation details

2. **Bilingual Confusion**: Mixing Chinese/English may confuse some users
   - Mitigation: Consistent language per section (Chinese for prose, English for code)

3. **Incomplete Feature Coverage**: May miss edge cases or advanced features
   - Mitigation: Focus on primary workflows, let code/comments cover edge cases

## Open Questions

1. Should we add architecture diagrams (Mermaid)?
   - Deferred: User didn't request, can add later if needed

2. Should we document API configuration in detail?
   - Deferred: VS Code settings UI handles this, minimal docs sufficient

3. Should we add troubleshooting section?
   - Deferred: No known issues yet, add when patterns emerge

4. Should we document the `.gdd/` directory structure in more detail?
   - Partial: Included basic structure, full schema can be in separate doc

## Future Considerations

- Add contributing guidelines if project becomes open source
- Add performance benchmarks if users ask
- Add comparison with other GDD tools if competitive landscape emerges
- Consider adding video walkthrough link when available
