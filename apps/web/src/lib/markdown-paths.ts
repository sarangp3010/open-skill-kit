/** GitHub-style heading slug, used for in-document anchors. */
export function headingSlug(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
}
/**
 * Resolves a package-relative link against the directory of the file being
 * viewed. Absolute paths, schemes and paths escaping the package are rejected.
 */
export function resolvePackagePath(fromFile: string, href: string) {
  if (!href || /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('/'))
    return null;
  let target: string;
  try {
    target = decodeURI(href);
  } catch {
    return null;
  }
  const parts = fromFile.split('/').slice(0, -1);
  for (const segment of target.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      if (!parts.length) return null;
      parts.pop();
    } else parts.push(segment);
  }
  return parts.join('/') || null;
}
