'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TopicTreeNode {
  id: string;
  path: string;
  nameUz: string;
  count: number;
  children: TopicTreeNode[];
}

interface TopicTreeProps {
  nodes: TopicTreeNode[];
  selectedPaths: string[];
  onChange: (paths: string[]) => void;
}

/** `selectedPaths`dagi biror yo'l shu node.path ning o'zi yoki ota-bobosi bo'lsa — ota tugun tanlangani uchun bu ham "tanlangan" hisoblanadi (item-picker.ts#buildItemWhere'dagi prefiks moslik bilan bir xil qoida). */
function isChecked(node: TopicTreeNode, selectedPaths: string[]): boolean {
  return selectedPaths.some((p) => node.path === p || node.path.startsWith(`${p}/`));
}

/** Tugunning o'zi emas, faqat ota-bobosi orqali "tanlangan" bo'lsa — checkbox belgilangan, lekin bosib bo'lmaydi (ota allaqachon butun shoxni qamrab olgan). */
function isLockedByAncestor(node: TopicTreeNode, selectedPaths: string[]): boolean {
  return selectedPaths.some((p) => p !== node.path && node.path.startsWith(`${p}/`));
}

function TopicNodeRow({
  node,
  depth,
  selectedPaths,
  onChange,
}: {
  node: TopicTreeNode;
  depth: number;
  selectedPaths: string[];
  onChange: (paths: string[]) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = node.children.length > 0;
  const checked = isChecked(node, selectedPaths);
  const locked = isLockedByAncestor(node, selectedPaths);

  const toggle = () => {
    if (locked) return;
    if (checked) {
      onChange(selectedPaths.filter((p) => p !== node.path));
    } else {
      // O'zini tanlash — bu shoxdagi (endi ortiqcha bo'lgan) bola yo'llarini olib tashlaymiz.
      const withoutDescendants = selectedPaths.filter(
        (p) => !p.startsWith(`${node.path}/`) && p !== node.path
      );
      onChange([...withoutDescendants, node.path]);
    }
  };

  return (
    <div>
      <div
        className="flex items-center gap-1 min-h-11 py-1"
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="w-11 h-11 -my-2 flex-shrink-0 flex items-center justify-center text-text-secondary"
            aria-label={expanded ? 'Yopish' : 'Ochish'}
          >
            <ChevronRight size={16} className={cn('transition-transform', expanded && 'rotate-90')} />
          </button>
        ) : (
          <span className="w-11 flex-shrink-0" />
        )}

        <label
          className={cn(
            'flex-1 flex items-center gap-2.5 min-h-11 pr-2 rounded-lg cursor-pointer',
            locked && 'cursor-not-allowed opacity-70'
          )}
        >
          <input
            type="checkbox"
            checked={checked}
            disabled={locked}
            onChange={toggle}
            className="w-5 h-5 rounded border-border text-primary-600 focus:ring-primary-500 flex-shrink-0"
          />
          <span className="text-sm text-text-primary flex-1 min-w-0 break-words">{node.nameUz}</span>
          <span className="text-xs text-text-secondary flex-shrink-0 bg-gray-100 rounded-full px-2 py-0.5">
            {node.count}
          </span>
        </label>
      </div>

      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <TopicNodeRow key={child.id} node={child} depth={depth + 1} selectedPaths={selectedPaths} onChange={onChange} />
          ))}
        </div>
      )}
    </div>
  );
}

// Mavzular daraxti — checkbox bilan, ota tugun tanlansa (prefiks moslik
// sabab) bolalari ham avtomatik "tanlangan" bo'ladi va qayta bosib
// bo'lmaydi. `selectedPaths` = `spec.topicPaths` — minimal, bir-birining
// ustiga tushmaydigan yo'llar to'plami (bola tanlanganda ota qo'shilmaydi,
// ota tanlanganda bolalar chiqarib tashlanadi).
export default function TopicTree({ nodes, selectedPaths, onChange }: TopicTreeProps) {
  if (nodes.length === 0) return null;
  return (
    <div className="max-h-80 overflow-y-auto -mx-1 px-1">
      {nodes.map((node) => (
        <TopicNodeRow key={node.id} node={node} depth={0} selectedPaths={selectedPaths} onChange={onChange} />
      ))}
    </div>
  );
}
