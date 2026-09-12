// Classic script loaded by the sandboxed note iframe. Keep this external so
// the production CSP can prohibit inline scripts without blocking the editor.
(() => {
  const config = JSON.parse(document.currentScript.dataset.config);
  const editor = document.getElementById("editor");
  const toolbar = document.querySelector(".toolbar");
  const shell = document.querySelector(".shell");
  let applyingExternalUpdate = false;
  let lastSentHtml = "";
  let lastSentHeight = 0;
  const caretMarker = String.fromCharCode(8203);

  const postMessage = (payload) => {
    const serialized = JSON.stringify({ source: config.source, ...payload });
    if (window.ReactNativeWebView?.postMessage) {
      window.ReactNativeWebView.postMessage(serialized);
    }
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(serialized, "*");
    }
  };

  const updateEmptyState = () => {
    const text = editor.textContent?.replaceAll(caretMarker, "").trim() ?? "";
    editor.dataset.empty = text.length === 0 ? "true" : "false";
  };

  const ensureEditorHtml = () => {
    if (!editor.innerHTML.trim()) {
      editor.innerHTML = config.emptyHtml;
    }
    updateEmptyState();
  };

  const reportHeight = () => {
    const shellHeight =
      shell instanceof HTMLElement
        ? Math.ceil(shell.getBoundingClientRect().height)
        : 0;
    const toolbarHeight =
      toolbar instanceof HTMLElement
        ? Math.ceil(toolbar.getBoundingClientRect().height)
        : 0;
    const editorHeight = Math.ceil(editor.scrollHeight);
    const nextHeight = Math.max(
      shellHeight,
      toolbarHeight + editorHeight,
      340,
    );
    if (Math.abs(nextHeight - lastSentHeight) > 1) {
      lastSentHeight = nextHeight;
      postMessage({ type: "height", height: nextHeight });
    }
  };

  const emitChange = () => {
    ensureEditorHtml();
    if (applyingExternalUpdate) {
      reportHeight();
      return;
    }

    const nextHtml = editor.innerHTML;
    if (nextHtml !== lastSentHtml) {
      lastSentHtml = nextHtml;
      postMessage({ type: "change", html: nextHtml });
    }
    reportHeight();
  };

  const focusEditor = () => {
    editor.focus();
  };

  const setCaret = (node, offset = 0) => {
    const selection = document.getSelection();
    if (!selection) return;

    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    focusEditor();
  };

  const getElementFromNode = (node) => {
    if (!node) return null;
    if (node.nodeType === Node.ELEMENT_NODE) return node;
    return node.parentElement ||
      (node.parentNode instanceof HTMLElement ? node.parentNode : null);
  };

  const getInlineStyleElement = (node) => {
    const element = getElementFromNode(node);
    const inline = element?.closest("strong, code");
    if (!(inline instanceof HTMLElement)) return null;
    if (inline.tagName === "CODE" && inline.closest("pre")) return null;
    return editor.contains(inline) ? inline : null;
  };

  const placeCaretAfterInlineStyle = (inline) => {
    let caretNode = inline.nextSibling;
    if (!(caretNode instanceof Text)) {
      caretNode = document.createTextNode(caretMarker);
      inline.after(caretNode);
    } else if (!caretNode.textContent?.startsWith(caretMarker)) {
      caretNode.textContent = caretMarker + (caretNode.textContent || "");
    }
    setCaret(caretNode, 1);
  };

  const removeCaretMarkers = () => {
    const selection = document.getSelection();
    const anchorNode = selection?.anchorNode ?? null;
    const anchorOffset = selection?.anchorOffset ?? 0;
    let nextAnchorOffset = anchorOffset;
    let shouldRestoreSelection = false;

    const walker = document.createTreeWalker(
      editor,
      NodeFilter.SHOW_TEXT,
    );
    const textNodes = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    textNodes.forEach((node) => {
      const text = node.textContent || "";
      if (!text.includes(caretMarker)) return;

      if (node === anchorNode) {
        const beforeCaret = text.slice(0, anchorOffset);
        nextAnchorOffset =
          anchorOffset -
          beforeCaret.split(caretMarker).length +
          1;
        shouldRestoreSelection = true;
      }

      node.textContent = text.replaceAll(caretMarker, "");
    });

    if (shouldRestoreSelection && anchorNode?.isConnected) {
      setCaret(anchorNode, Math.max(0, nextAnchorOffset));
    }
  };

  const setCaretToEnd = (element) => {
    const selection = document.getSelection();
    if (!selection) return;

    const lastChild = element.lastChild;
    const inline = getInlineStyleElement(lastChild);
    if (inline && inline === lastChild) {
      placeCaretAfterInlineStyle(inline);
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    focusEditor();
  };

  const textWithLineBreaks = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    }
    if (node instanceof HTMLBRElement) {
      return "\n";
    }
    return Array.from(node.childNodes).map(textWithLineBreaks).join("");
  };

  const isCaretAtBlockEnd = (block, range) => {
    const trailingRange = range.cloneRange();
    trailingRange.selectNodeContents(block);
    trailingRange.setStart(range.endContainer, range.endOffset);
    return trailingRange.toString().replace(/\u200B/g, "").trim().length === 0;
  };

  const appendInlineMarkdown = (parent, text) => {
    const pattern = /(\x60[^\x60\n]+\x60|\*\*[^*\n]+\*\*)/g;
    let lastIndex = 0;

    for (const match of text.matchAll(pattern)) {
      if (match.index > lastIndex) {
        parent.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }

      const token = match[0];
      const element = token.startsWith(String.fromCharCode(96))
        ? document.createElement("code")
        : document.createElement("strong");
      element.textContent = token.startsWith(String.fromCharCode(96))
        ? token.slice(1, -1)
        : token.slice(2, -2);
      parent.appendChild(element);
      lastIndex = match.index + token.length;
    }

    if (lastIndex < text.length) {
      parent.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
  };

  const parseMarkdownTable = (text) => {
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (lines.length < 3) return null;

    const separatorPattern = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/;
    if (!separatorPattern.test(lines[1])) return null;

    const toCells = (line) => {
      const normalized = line.replace(/^[|]/, "").replace(/[|]$/, "");
      return normalized.split("|").map((cell) => cell.trim());
    };
    const headers = toCells(lines[0]);
    const separators = toCells(lines[1]);
    const rows = lines.slice(2).map(toCells);
    if (headers.length < 2 || separators.length !== headers.length) {
      return null;
    }
    if (rows.some((row) => row.length !== headers.length)) {
      return null;
    }

    return { headers, rows };
  };

  const buildMarkdownTable = ({ headers, rows }) => {
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    headers.forEach((header) => {
      const th = document.createElement("th");
      appendInlineMarkdown(th, header);
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      row.forEach((cell) => {
        const td = document.createElement("td");
        appendInlineMarkdown(td, cell);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    return table;
  };

  const isMarkdownBlockStart = (line) =>
    /^\s*$/.test(line) ||
    /^#{1,2}\s+/.test(line) ||
    /^[-*+]\s+/.test(line) ||
    /^\d+\.\s+/.test(line) ||
    /^>\s+/.test(line) ||
    /^\s*\|?.+\|.+/.test(line) ||
    /^\s*\x60\x60\x60/.test(line);

  const buildMarkdownFragment = (text) => {
    const lines = text.split("\n");
    const hasMarkdown = lines.some((line, index) => {
      if (/^#{1,2}\s+/.test(line)) return true;
      if (/^[-*+]\s+/.test(line)) return true;
      if (/^\d+\.\s+/.test(line)) return true;
      if (/^>\s+/.test(line)) return true;
      if (/\x60[^\x60]+\x60/.test(line)) return true;
      if (/\*\*[^*]+\*\*/.test(line)) return true;
      if (/^\s*\x60\x60\x60/.test(line)) {
        return lines
          .slice(index + 1)
          .some((nextLine) => /^\s*\x60\x60\x60\s*$/.test(nextLine));
      }
      if (index + 1 < lines.length) {
        return parseMarkdownTable(lines.slice(index).join("\n")) !== null;
      }
      return false;
    });
    if (!hasMarkdown) return null;

    const fragment = document.createDocumentFragment();
    let focusTarget = null;
    let index = 0;

    const appendBlock = (element, target = element) => {
      fragment.appendChild(element);
      focusTarget = target;
    };

    while (index < lines.length) {
      const line = lines[index];
      if (!line.trim()) {
        index += 1;
        continue;
      }

      if (/^\s*\x60\x60\x60/.test(line)) {
        const closingIndex = lines
          .slice(index + 1)
          .findIndex((nextLine) =>
            /^\s*\x60\x60\x60\s*$/.test(nextLine),
          );
        if (closingIndex < 0) {
          const paragraph = document.createElement("p");
          appendInlineMarkdown(paragraph, line);
          appendBlock(paragraph);
          index += 1;
          continue;
        }
        const codeLines = [];
        index += 1;
        while (index < lines.length && !/^\s*\x60\x60\x60\s*$/.test(lines[index])) {
          codeLines.push(lines[index]);
          index += 1;
        }
        if (index < lines.length) {
          index += 1;
        }
        const pre = document.createElement("pre");
        const code = document.createElement("code");
        code.textContent = codeLines.join("\n");
        pre.appendChild(code);
        appendBlock(pre, code);
        continue;
      }

      const remainingText = lines.slice(index).join("\n");
      const table = parseMarkdownTable(remainingText);
      if (table) {
        const tableElement = buildMarkdownTable(table);
        appendBlock(
          tableElement,
          tableElement.querySelector("tbody tr:last-child td:last-child") || tableElement,
        );
        index += table.rows.length + 2;
        continue;
      }

      const unordered = /^[-*+]\s+(.+)$/.exec(line);
      if (unordered) {
        const list = document.createElement("ul");
        while (index < lines.length) {
          const match = /^[-*+]\s+(.+)$/.exec(lines[index]);
          if (!match) break;
          const item = document.createElement("li");
          appendInlineMarkdown(item, match[1]);
          list.appendChild(item);
          focusTarget = item;
          index += 1;
        }
        appendBlock(list, focusTarget || list);
        continue;
      }

      const ordered = /^\d+\.\s+(.+)$/.exec(line);
      if (ordered) {
        const list = document.createElement("ol");
        while (index < lines.length) {
          const match = /^\d+\.\s+(.+)$/.exec(lines[index]);
          if (!match) break;
          const item = document.createElement("li");
          appendInlineMarkdown(item, match[1]);
          list.appendChild(item);
          focusTarget = item;
          index += 1;
        }
        appendBlock(list, focusTarget || list);
        continue;
      }

      const heading = /^(#{1,2})\s+(.+)$/.exec(line);
      if (heading) {
        const block = document.createElement(heading[1].length === 1 ? "h1" : "h2");
        appendInlineMarkdown(block, heading[2]);
        appendBlock(block);
        index += 1;
        continue;
      }

      const quote = /^>\s+(.+)$/.exec(line);
      if (quote) {
        const blockquote = document.createElement("blockquote");
        appendInlineMarkdown(blockquote, quote[1]);
        appendBlock(blockquote);
        index += 1;
        continue;
      }

      const paragraph = document.createElement("p");
      while (index < lines.length && !isMarkdownBlockStart(lines[index])) {
        if (paragraph.childNodes.length > 0) {
          paragraph.appendChild(document.createElement("br"));
        }
        appendInlineMarkdown(paragraph, lines[index]);
        index += 1;
      }
      if (paragraph.childNodes.length === 0) {
        appendInlineMarkdown(paragraph, line);
        index += 1;
      }
      appendBlock(paragraph);
    }

    if (!fragment.childNodes.length || !focusTarget) return null;
    return { fragment, focusTarget };
  };

  const convertCurrentBlockMarkdown = () => {
    const context = getCurrentBlockContext();
    if (!context) return false;
    if (context.block !== editor && context.block.tagName !== "P") return false;
    if (!isCaretAtBlockEnd(context.block, context.range)) return false;

    const text = textWithLineBreaks(context.block)
      .replace(/\u00a0/g, " ")
      .replace(/\u200B/g, "")
      .trimEnd();
    if (!text.trim()) return false;

    const markdownFragment = buildMarkdownFragment(text);
    if (markdownFragment) {
      if (context.block === editor) {
        editor.replaceChildren(markdownFragment.fragment);
      } else {
        context.block.replaceWith(markdownFragment.fragment);
      }
      setCaretToEnd(markdownFragment.focusTarget);
      window.requestAnimationFrame(emitChange);
      return true;
    }

    return false;
  };

  const scheduleMarkdownConversion = () => {
    window.requestAnimationFrame(() => {
      convertCurrentBlockMarkdown();
    });
  };

  const formatBlock = (tagName) => {
    document.execCommand("formatBlock", false, "<" + tagName + ">");
  };

  const toggleBlock = (tagName) => {
    const selection = document.getSelection();
    const anchorNode = selection?.anchorNode;
    const parentElement =
      anchorNode?.nodeType === Node.ELEMENT_NODE
        ? anchorNode
        : anchorNode?.parentElement;
    const currentBlock = parentElement?.closest(tagName);
    formatBlock(currentBlock ? "p" : tagName);
  };

  const clearFormatting = () => {
    document.execCommand("removeFormat");
    document.execCommand("unlink");
    formatBlock("p");
  };

  const insertLineBreak = () => {
    document.execCommand("insertLineBreak");
  };

  const insertParagraphAfterBlock = (block, range) => {
    const trailingRange = document.createRange();
    trailingRange.selectNodeContents(block);
    trailingRange.setStart(range.startContainer, range.startOffset);
    const trailingFragment = trailingRange.extractContents();

    const paragraph = document.createElement("p");
    if (trailingFragment.childNodes.length > 0) {
      paragraph.appendChild(trailingFragment);
    } else {
      paragraph.appendChild(document.createElement("br"));
    }

    block.after(paragraph);
    setCaret(paragraph, 0);
  };

  const trimTrailingBreaks = (element) => {
    while (element.lastChild instanceof HTMLBRElement) {
      element.lastChild.remove();
    }
  };

  const exitBlockquote = (blockquote, range) => {
    insertParagraphAfterBlock(blockquote, range);
    trimTrailingBreaks(blockquote);
    if (!blockquote.textContent?.replace(/\u200B/g, "").trim()) {
      blockquote.remove();
    }
  };

  const getRangeText = (block, range, boundary) => {
    const textRange = document.createRange();
    textRange.selectNodeContents(block);
    if (boundary === "before") {
      textRange.setEnd(range.endContainer, range.endOffset);
    } else {
      textRange.setStart(range.startContainer, range.startOffset);
    }
    const container = document.createElement("div");
    container.appendChild(textRange.cloneContents());
    return textWithLineBreaks(container).replace(/\u200B/g, "");
  };

  const isCurrentCodeLineEmpty = (pre, range) => {
    const beforeCaret = getRangeText(pre, range, "before");
    const currentLine = beforeCaret.split("\n").at(-1) || "";
    return beforeCaret.length > 0 && currentLine.trim().length === 0;
  };

  const exitCodeBlock = (pre, range) => {
    const beforeCaret = getRangeText(pre, range, "before").replace(
      /\n[ \t]*$/,
      "",
    );
    const afterCaret = getRangeText(pre, range, "after").replace(
      /^[ \t]*\n/,
      "",
    );
    const code = pre.querySelector("code") || pre;
    code.textContent = beforeCaret;

    const paragraph = document.createElement("p");
    if (afterCaret.trim()) {
      paragraph.textContent = afterCaret;
    } else {
      paragraph.appendChild(document.createElement("br"));
    }
    pre.after(paragraph);
    setCaret(paragraph, 0);

    if (!code.textContent?.trim()) {
      pre.remove();
    }
  };

  const isCaretAtInlineStyleEnd = (inline, range) => {
    if (
      range.endContainer !== inline &&
      !inline.contains(range.endContainer)
    ) {
      return false;
    }

    const trailingRange = range.cloneRange();
    trailingRange.selectNodeContents(inline);
    trailingRange.setStart(range.endContainer, range.endOffset);
    return trailingRange.toString().replace(/\u200B/g, "").length === 0;
  };

  const getCurrentBlockContext = () => {
    const selection = document.getSelection();
    if (!selection || !selection.rangeCount || !selection.isCollapsed) {
      return null;
    }

    const range = selection.getRangeAt(0);
    const anchorNode = selection.anchorNode;
    const parentElement =
      anchorNode?.nodeType === Node.ELEMENT_NODE
        ? anchorNode
        : anchorNode?.parentElement ||
          (anchorNode?.parentNode instanceof HTMLElement
            ? anchorNode.parentNode
            : null);
    const block = parentElement?.closest("p, h1, h2, blockquote, li");
    if (block instanceof HTMLElement) {
      return { block, range };
    }

    const root = parentElement?.closest("#editor");
    if (root === editor) {
      return { block: editor, range };
    }

    if (!(block instanceof HTMLElement)) {
      return null;
    }
  };

  const getMarkdownShortcutCommand = (text) => {
    const matchedShortcut = config.markdownShortcuts.find(
      (shortcut) => shortcut.trigger === text.replace(/\u00a0/g, " "),
    );
    return matchedShortcut?.command ?? null;
  };

  const isCurrentBlockquoteLineEmpty = (blockquote, range) => {
    const beforeCaret = document.createRange();
    beforeCaret.selectNodeContents(blockquote);
    beforeCaret.setEnd(range.endContainer, range.endOffset);

    const container = document.createElement("div");
    container.appendChild(beforeCaret.cloneContents());
    const html = container.innerHTML
      .replace(/<\/?span[^>]*>/g, "")
      .replaceAll("&nbsp;", " ");
    const lastBreakIndex = html.toLowerCase().lastIndexOf("<br>");
    const currentLineHtml =
      lastBreakIndex >= 0 ? html.slice(lastBreakIndex + 4) : html;
    const currentLineText = currentLineHtml
      .replace(/<[^>]+>/g, "")
      .replace(/\u200B/g, "")
      .trim();

    return currentLineText.length === 0 && html.length > 0;
  };

  const applyMarkdownShortcut = (command, context) => {
    const shortcutRange = context.range.cloneRange();
    shortcutRange.selectNodeContents(context.block);
    shortcutRange.setEnd(context.range.endContainer, context.range.endOffset);
    shortcutRange.deleteContents();

    const replaceBlock = (nextBlock, caretNode, caretOffset = 0) => {
      context.block.replaceWith(nextBlock);
      setCaret(caretNode, caretOffset);
    };

    switch (command) {
      case "heading1": {
        const heading = document.createElement("h1");
        heading.appendChild(document.createElement("br"));
        replaceBlock(heading, heading, 0);
        break;
      }
      case "bulletList": {
        const list = document.createElement("ul");
        const item = document.createElement("li");
        item.appendChild(document.createElement("br"));
        list.appendChild(item);
        replaceBlock(list, item, 0);
        break;
      }
      case "blockquote": {
        const blockquote = document.createElement("blockquote");
        blockquote.appendChild(document.createElement("br"));
        replaceBlock(blockquote, blockquote, 0);
        break;
      }
      case "codeBlock": {
        const pre = document.createElement("pre");
        const code = document.createElement("code");
        const caretNode = document.createTextNode("");
        code.appendChild(caretNode);
        pre.appendChild(code);
        replaceBlock(pre, caretNode, 0);
        break;
      }
      default:
        return;
    }

    window.requestAnimationFrame(emitChange);
  };

  const runCommand = (command) => {
    focusEditor();
    switch (command) {
      case "bold":
        document.execCommand("bold");
        break;
      case "italic":
        document.execCommand("italic");
        break;
      case "heading1":
        toggleBlock("h1");
        break;
      case "heading2":
        toggleBlock("h2");
        break;
      case "bulletList":
        document.execCommand("insertUnorderedList");
        break;
      case "orderedList":
        document.execCommand("insertOrderedList");
        break;
      case "blockquote":
        toggleBlock("blockquote");
        break;
      case "clear":
        clearFormatting();
        break;
      default:
        break;
    }
    window.requestAnimationFrame(emitChange);
  };

  const setHtml = (html) => {
    applyingExternalUpdate = true;
    editor.innerHTML = html && html.trim() ? html : config.emptyHtml;
    // Do not accept input until the host has supplied the initial value.
    editor.contentEditable = "true";
    updateEmptyState();
    lastSentHtml = editor.innerHTML;
    applyingExternalUpdate = false;
    reportHeight();
  };

  const handleInlineStyleExit = (event) => {
    if (event.key !== "ArrowRight") return false;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return false;
    }

    const selection = document.getSelection();
    if (!selection || !selection.rangeCount || !selection.isCollapsed) {
      return false;
    }

    const range = selection.getRangeAt(0);
    const inline = getInlineStyleElement(selection.anchorNode);
    if (!inline || !isCaretAtInlineStyleEnd(inline, range)) {
      return false;
    }

    event.preventDefault();
    placeCaretAfterInlineStyle(inline);
    return true;
  };

  const handleEnter = (event) => {
    if (event.key !== "Enter") return;
    if (event.isComposing) return;
    const context = getCurrentBlockContext();
    if (!context) return;

    const parentElement =
      context.range.startContainer?.nodeType === Node.ELEMENT_NODE
        ? context.range.startContainer
        : context.range.startContainer?.parentElement ||
          (context.range.startContainer?.parentNode instanceof HTMLElement
            ? context.range.startContainer.parentNode
            : null);
    const pre = parentElement?.closest("pre");
    if (pre instanceof HTMLElement) {
      event.preventDefault();
      if (event.shiftKey || !isCurrentCodeLineEmpty(pre, context.range)) {
        insertLineBreak();
      } else {
        exitCodeBlock(pre, context.range);
      }
      window.requestAnimationFrame(emitChange);
      return;
    }

    const headingBlock =
      context.block.tagName === "H1" || context.block.tagName === "H2"
        ? context.block
        : parentElement?.closest("h1, h2");
    if (headingBlock instanceof HTMLElement) {
      event.preventDefault();
      insertParagraphAfterBlock(headingBlock, context.range);
      window.requestAnimationFrame(emitChange);
      return;
    }

    const blockquote = parentElement?.closest("blockquote");
    if (blockquote instanceof HTMLElement) {
      event.preventDefault();
      if (isCurrentBlockquoteLineEmpty(blockquote, context.range)) {
        exitBlockquote(blockquote, context.range);
      } else {
        insertLineBreak();
      }
      window.requestAnimationFrame(emitChange);
      return;
    }

    const listItem = parentElement?.closest("li");
    if (!listItem) {
      event.preventDefault();
      insertLineBreak();
      window.requestAnimationFrame(emitChange);
      return;
    }

    if (listItem.textContent?.trim()) return;

    event.preventDefault();
    document.execCommand("outdent");
    formatBlock("p");
    window.requestAnimationFrame(emitChange);
    return;
  };

  const handleKeyDown = (event) => {
    if (handleInlineStyleExit(event)) return;
    handleEnter(event);
  };

  const handleInlineStylePointerUp = (event) => {
    const inline = getInlineStyleElement(event.target);
    if (!inline) return;

    const rect = inline.getBoundingClientRect();
    const exitZoneWidth = Math.max(8, Math.min(18, rect.width * 0.35));
    if (event.clientX < rect.right - exitZoneWidth) return;

    window.requestAnimationFrame(() => {
      placeCaretAfterInlineStyle(inline);
    });
  };

  const handleMarkdownShortcut = (event) => {
    if (event.inputType !== "insertText") return;
    if (event.data !== " ") return;
    if (event.isComposing) return;

    const context = getCurrentBlockContext();
    if (!context) return;

    const shortcutRange = context.range.cloneRange();
    shortcutRange.selectNodeContents(context.block);
    shortcutRange.setEnd(context.range.endContainer, context.range.endOffset);
    const command = getMarkdownShortcutCommand(
      shortcutRange.toString().replace(/\u200B/g, ""),
    );
    if (!command) return;

    event.preventDefault();
    applyMarkdownShortcut(command, context);
  };

  const insertHtmlAtCaret = (html) => {
    if (!html) return;
    focusEditor();
    document.execCommand("insertHTML", false, html);
    window.requestAnimationFrame(emitChange);
  };

  const receiveHostMessage = (raw) => {
    try {
      const message =
        typeof raw === "string" ? JSON.parse(raw) : raw;
      if (message?.type === "set-html" && typeof message.html === "string") {
        setHtml(message.html);
        return;
      }
      if (message?.type === "insert-html" && typeof message.html === "string") {
        insertHtmlAtCaret(message.html);
      }
    } catch {
      // Ignore malformed host messages.
    }
  };

  window.__noteEditorHandleHostMessage = receiveHostMessage;
  window.addEventListener("message", (event) =>
    receiveHostMessage(event.data),
  );

  toolbar.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });

  toolbar.addEventListener("click", (event) => {
    const target = event.target.closest("[data-command]");
    if (!(target instanceof HTMLElement)) return;
    runCommand(target.dataset.command);
  });

  editor.addEventListener("keydown", handleKeyDown);
  editor.addEventListener("pointerup", handleInlineStylePointerUp);
  editor.addEventListener("beforeinput", handleMarkdownShortcut);
  editor.addEventListener("input", () => {
    removeCaretMarkers();
    scheduleMarkdownConversion();
    window.requestAnimationFrame(emitChange);
  });
  const markdownDetectionRegexes = (config.markdownDetectionPatterns || []).map(
    (entry) => new RegExp(entry.source, entry.flags),
  );
  const looksLikeMarkdown = (text) => {
    if (!text) return false;
    return markdownDetectionRegexes.some((pattern) => pattern.test(text));
  };

  editor.addEventListener("paste", (event) => {
    const clipboard = event.clipboardData;
    if (!clipboard) {
      window.setTimeout(emitChange, 0);
      return;
    }
    const types = clipboard.types ? Array.from(clipboard.types) : [];
    const text = clipboard.getData("text/plain");
    const hasHtml = types.includes("text/html");
    if (text && (looksLikeMarkdown(text) || !hasHtml)) {
      event.preventDefault();
      postMessage({ type: "paste-request", text });
      return;
    }
    window.setTimeout(emitChange, 0);
  });
  window.addEventListener("resize", reportHeight);

  document.execCommand("defaultParagraphSeparator", false, "p");
  ensureEditorHtml();
  postMessage({ type: "ready" });
  reportHeight();
})();
