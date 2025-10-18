import React from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  // Simple markdown parser for common formatting
  const parseMarkdown = (text: string) => {
    const lines = text.split("\n");
    const elements: React.ReactElement[] = [];
    let listItems: string[] = [];
    let inList = false;
    let orderedListItems: string[] = [];
    let inOrderedList = false;

    const flushList = (index: number) => {
      if (inList && listItems.length > 0) {
        elements.push(
          <ul key={`ul-${index}`} className="list-disc list-inside my-2 space-y-1">
            {listItems.map((item, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
            ))}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };

    const flushOrderedList = (index: number) => {
      if (inOrderedList && orderedListItems.length > 0) {
        elements.push(
          <ol key={`ol-${index}`} className="list-decimal list-inside my-2 space-y-1">
            {orderedListItems.map((item, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
            ))}
          </ol>
        );
        orderedListItems = [];
        inOrderedList = false;
      }
    };

    const formatInline = (text: string): string => {
      return text
        // Bold
        .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
        // Code
        .replace(/`(.+?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>')
        // Links (basic)
        .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-primary hover:underline" target="_blank">$1</a>');
    };

    lines.forEach((line, index) => {
      // Headers
      if (line.startsWith("### ")) {
        flushList(index);
        flushOrderedList(index);
        elements.push(
          <h3 key={index} className="text-base font-semibold mt-3 mb-1">
            {line.substring(4)}
          </h3>
        );
      } else if (line.startsWith("## ")) {
        flushList(index);
        flushOrderedList(index);
        elements.push(
          <h2 key={index} className="text-lg font-semibold mt-3 mb-1">
            {line.substring(3)}
          </h2>
        );
      } else if (line.startsWith("# ")) {
        flushList(index);
        flushOrderedList(index);
        elements.push(
          <h1 key={index} className="text-xl font-bold mt-3 mb-2">
            {line.substring(2)}
          </h1>
        );
      }
      // Blockquotes
      else if (line.startsWith("> ")) {
        flushList(index);
        flushOrderedList(index);
        elements.push(
          <blockquote
            key={index}
            className="border-l-4 border-primary pl-3 italic my-2 text-muted-foreground"
          >
            {line.substring(2)}
          </blockquote>
        );
      }
      // Unordered lists
      else if (line.match(/^[\-\*]\s+/)) {
        flushOrderedList(index);
        inList = true;
        listItems.push(line.replace(/^[\-\*]\s+/, ""));
      }
      // Ordered lists
      else if (line.match(/^\d+\.\s+/)) {
        flushList(index);
        inOrderedList = true;
        orderedListItems.push(line.replace(/^\d+\.\s+/, ""));
      }
      // Regular paragraph
      else if (line.trim()) {
        flushList(index);
        flushOrderedList(index);
        elements.push(
          <p
            key={index}
            className="my-1"
            dangerouslySetInnerHTML={{ __html: formatInline(line) }}
          />
        );
      }
      // Empty line
      else {
        flushList(index);
        flushOrderedList(index);
        if (elements.length > 0) {
          elements.push(<div key={`space-${index}`} className="h-2" />);
        }
      }
    });

    // Flush any remaining lists
    flushList(lines.length);
    flushOrderedList(lines.length);

    return elements;
  };

  return (
    <div className={`markdown-content text-sm ${className}`}>
      {parseMarkdown(content)}
    </div>
  );
}
