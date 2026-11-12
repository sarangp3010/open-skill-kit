import { useId, type ReactNode } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { headingSlug, resolvePackagePath } from '@/lib/markdown-paths';

type HastNode = { type: string; value?: string; children?: HastNode[] };
function nodeText(node: HastNode | undefined): string {
  if (!node) return '';
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(nodeText).join('');
}
export function MarkdownViewer({
  source,
  files,
  onFile,
  path = 'SKILL.md',
}: {
  source: string;
  files: Record<string, string>;
  onFile?: (path: string) => void;
  /** Package path of `source`, for resolving relative links. */
  path?: string;
}) {
  // Heading ids must be unique across every viewer on the page.
  const prefix = `md${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const used = new Map<string, number>();
  const headingId = (node: HastNode | undefined) => {
    const slug = headingSlug(nodeText(node)) || 'section';
    const seen = used.get(slug) ?? 0;
    used.set(slug, seen + 1);
    return `${prefix}-${seen ? `${slug}-${seen}` : slug}`;
  };
  const heading =
    (Tag: 'h3' | 'h4' | 'h5' | 'h6', className?: string) =>
    ({ node, children }: { node?: HastNode; children?: ReactNode }) => (
      <Tag id={headingId(node)} tabIndex={-1} className={className}>
        {children}
      </Tag>
    );
  function jump(id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView?.({ block: 'start' });
    target.focus({ preventScroll: true });
  }
  return (
    <div className="markdown min-w-0">
      <Markdown
        skipHtml
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          h1: heading('h3', 'md-title'),
          h2: heading('h4', 'md-section'),
          h3: heading('h5'),
          h4: heading('h6'),
          h5: heading('h6'),
          h6: heading('h6'),
          pre: ({ children }) => (
            <pre tabIndex={0} aria-label="Code sample">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <table tabIndex={0} aria-label="Data table">
              {children}
            </table>
          ),
          a: ({ href, children }) => {
            if (href?.startsWith('#')) {
              let fragment = href.slice(1);
              try {
                fragment = decodeURIComponent(fragment);
              } catch {
                /* Keep the raw fragment. */
              }
              const id = `${prefix}-${headingSlug(fragment)}`;
              return (
                <a
                  href={`#${id}`}
                  onClick={(event) => {
                    event.preventDefault();
                    jump(id);
                  }}
                >
                  {children}
                </a>
              );
            }
            if (href && /^https?:\/\//i.test(href))
              return (
                <a href={href} target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              );
            const target = href
              ? resolvePackagePath(path, href.split('#')[0])
              : null;
            return onFile && target && Object.hasOwn(files, target) ? (
              <button
                type="button"
                className="text-primary underline underline-offset-4"
                onClick={() => onFile(target)}
              >
                {children}
              </button>
            ) : (
              <span>{children}</span>
            );
          },
          img: ({ alt }) => (
            <span className="text-sm text-muted-foreground">
              [Image: {alt || 'not loaded'}]
            </span>
          ),
        }}
      >
        {source}
      </Markdown>
    </div>
  );
}
