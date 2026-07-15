'use client';

import { useMemo } from 'react';
import katex from 'katex';

interface LatexRendererProps {
  content: string;
  className?: string;
}

/**
 * LaTeX formulalarni render qiluvchi komponent.
 * $...$ — inline formula
 * $$...$$ — block formula
 * Oddiy matn ham ko'rsatiladi
 */
export default function LatexRenderer({ content, className = '' }: LatexRendererProps) {
  const renderedHtml = useMemo(() => {
    if (!content) return '';

    try {
      // Replace $$...$$ (block math) first
      let html = content.replace(/\$\$([\s\S]*?)\$\$/g, (_, formula) => {
        try {
          return katex.renderToString(formula.trim(), {
            displayMode: true,
            throwOnError: false,
            trust: true,
          });
        } catch {
          return `<span class="text-red-500">[Formula xato: ${formula}]</span>`;
        }
      });

      // Replace $...$ (inline math)
      html = html.replace(/\$([^\$\n]+?)\$/g, (_, formula) => {
        try {
          return katex.renderToString(formula.trim(), {
            displayMode: false,
            throwOnError: false,
            trust: true,
          });
        } catch {
          return `<span class="text-red-500">[${formula}]</span>`;
        }
      });

      // Replace \( ... \) inline math (alternative syntax)
      html = html.replace(/\\\((.+?)\\\)/g, (_, formula) => {
        try {
          return katex.renderToString(formula.trim(), {
            displayMode: false,
            throwOnError: false,
          });
        } catch {
          return formula;
        }
      });

      // Replace \[ ... \] display math (alternative syntax)
      html = html.replace(/\\\[([\s\S]*?)\\\]/g, (_, formula) => {
        try {
          return katex.renderToString(formula.trim(), {
            displayMode: true,
            throwOnError: false,
          });
        } catch {
          return formula;
        }
      });

      return html;
    } catch {
      return content;
    }
  }, [content]);

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}
