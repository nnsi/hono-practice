# Note Markdown interoperability

Notes persist GFM Markdown. Both Web and Mobile now parse it with the shared
remark-parse + remark-gfm processor. Ordinary newlines in prose are visible;
standard hard breaks (backslash-newline or two spaces-newline) have the same
visible meaning. Code preserves its literal content. Escaped punctuation is
interpreted by the parser, never by globally removing backslashes.

The Web rich text editor serializes HTML back to standard Markdown. The mobile
editor edits Markdown source; its read view renders the parsed tree. Existing
records need no migration and opening a note does not rewrite stored content.
The native adapter preserves paragraph boundaries, inline breaks, nested emphasis,
list continuations and code rather than tokenizing individual source lines.

Regression coverage includes both hard-break spellings, LF/CRLF, real backslashes,
escaped asterisks, code, lists, quotes, derived titles, repeated Web saves and a
subsequent Mobile edit. Native rendering and bidirectional sync must also be
verified on an iPhone simulator against the isolated test API before deployment.
