import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
export function MarkdownViewer({
  source,
  files,
  onFile,
}: {
  source: string;
  files: Record<string, string>;
  onFile?: (path: string) => void;
}) {
  return (
    <div className="markdown min-w-0">
      <Markdown
        skipHtml
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          h1: ({ children }) => <h3 className="md-title">{children}</h3>,
          h2: ({ children }) => <h4 className="md-section">{children}</h4>,
          h3: ({ children }) => <h5>{children}</h5>,
          h4: ({ children }) => <h6>{children}</h6>,
          h5: ({ children }) => <h6>{children}</h6>,
          h6: ({ children }) => <h6>{children}</h6>,
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
          a: ({ href, children }) =>
            onFile && href && Object.hasOwn(files, href.split('#')[0]) ? (
              <button
                type="button"
                className="text-primary underline underline-offset-4"
                onClick={() => onFile(href.split('#')[0])}
              >
                {children}
              </button>
            ) : href?.startsWith('#') ? (
              <span>{children}</span>
            ) : href && /^https?:\/\//i.test(href) ? (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ) : (
              <span>{children}</span>
            ),
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
