import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const parseMarkdown = (text: string): React.ReactNode => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];
    let inCodeBlock = false;
    let codeLines: string[] = [];
    let codeLanguage = '';

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-inside my-2 space-y-1">
            {listItems.map((item, i) => (
              <li key={i}>{parseInline(item)}</li>
            ))}
          </ul>
        );
        listItems = [];
      }
    };

    const flushCodeBlock = () => {
      if (codeLines.length > 0) {
        elements.push(
          <pre key={`code-${elements.length}`} className="bg-gray-900 text-gray-100 p-3 rounded-md my-2 overflow-x-auto">
            <code className={codeLanguage ? `language-${codeLanguage}` : ''}>
              {codeLines.join('\n')}
            </code>
          </pre>
        );
        codeLines = [];
        codeLanguage = '';
      }
    };

    lines.forEach((line, index) => {
      // Code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          flushCodeBlock();
          inCodeBlock = false;
        } else {
          flushList();
          inCodeBlock = true;
          codeLanguage = line.slice(3).trim();
        }
        return;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        return;
      }

      // Headers
      if (line.startsWith('### ')) {
        flushList();
        elements.push(
          <h3 key={`h3-${index}`} className="text-lg font-semibold mt-4 mb-2">
            {parseInline(line.slice(4))}
          </h3>
        );
        return;
      }
      if (line.startsWith('## ')) {
        flushList();
        elements.push(
          <h2 key={`h2-${index}`} className="text-xl font-bold mt-4 mb-2">
            {parseInline(line.slice(3))}
          </h2>
        );
        return;
      }
      if (line.startsWith('# ')) {
        flushList();
        elements.push(
          <h1 key={`h1-${index}`} className="text-2xl font-bold mt-4 mb-2">
            {parseInline(line.slice(2))}
          </h1>
        );
        return;
      }

      // Blockquotes
      if (line.startsWith('> ')) {
        flushList();
        elements.push(
          <blockquote key={`quote-${index}`} className="border-l-4 border-gray-300 pl-4 italic my-2 text-gray-700">
            {parseInline(line.slice(2))}
          </blockquote>
        );
        return;
      }

      // Lists
      if (line.match(/^[\-\*]\s/)) {
        listItems.push(line.slice(2));
        return;
      }
      if (line.match(/^\d+\.\s/)) {
        listItems.push(line.replace(/^\d+\.\s/, ''));
        return;
      }

      // Regular paragraphs
      flushList();
      if (line.trim()) {
        elements.push(
          <p key={`p-${index}`} className="my-2">
            {parseInline(line)}
          </p>
        );
      } else if (elements.length > 0) {
        elements.push(<br key={`br-${index}`} />);
      }
    });

    flushList();
    flushCodeBlock();

    return elements;
  };

  const parseInline = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let currentText = text;
    let key = 0;

    while (currentText.length > 0) {
      // Bold: **text** or __text__
      const boldMatch = currentText.match(/^(.*?)(\*\*|__)(.*?)\2/);
      if (boldMatch) {
        if (boldMatch[1]) parts.push(boldMatch[1]);
        parts.push(<strong key={`bold-${key++}`}>{boldMatch[3]}</strong>);
        currentText = currentText.slice(boldMatch[0].length);
        continue;
      }

      // Inline code: `code`
      const codeMatch = currentText.match(/^(.*?)`(.*?)`/);
      if (codeMatch) {
        if (codeMatch[1]) parts.push(codeMatch[1]);
        parts.push(
          <code key={`code-${key++}`} className="bg-gray-200 px-1 py-0.5 rounded text-sm font-mono">
            {codeMatch[2]}
          </code>
        );
        currentText = currentText.slice(codeMatch[0].length);
        continue;
      }

      // Links: [text](url)
      const linkMatch = currentText.match(/^(.*?)\[([^\]]+)\]\(([^\)]+)\)/);
      if (linkMatch) {
        if (linkMatch[1]) parts.push(linkMatch[1]);
        parts.push(
          <a
            key={`link-${key++}`}
            href={linkMatch[3]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {linkMatch[2]}
          </a>
        );
        currentText = currentText.slice(linkMatch[0].length);
        continue;
      }

      // No more special formatting
      parts.push(currentText);
      break;
    }

    return parts;
  };

  return <div className="markdown-content">{parseMarkdown(content)}</div>;
}
