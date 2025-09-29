/**
 * Highlights search terms in HTML content
 * @param content - The HTML content to search in
 * @param searchTerm - The term to highlight
 * @returns HTML string with highlighted terms
 */
export const highlightSearchTerms = (content: string, searchTerm: string): string => {
  if (!searchTerm || !content) return content;
  
  // Create a temporary div to parse HTML
  const div = document.createElement('div');
  div.innerHTML = content;
  
  // Function to highlight text in text nodes
  const highlightTextNodes = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
      
      if (regex.test(text)) {
        const span = document.createElement('span');
        span.innerHTML = text.replace(regex, '<mark class="search-highlight">$1</mark>');
        node.parentNode?.replaceChild(span, node);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Skip script and style tags
      const element = node as Element;
      if (element.tagName !== 'SCRIPT' && element.tagName !== 'STYLE') {
        Array.from(node.childNodes).forEach(highlightTextNodes);
      }
    }
  };
  
  highlightTextNodes(div);
  return div.innerHTML;
};

/**
 * Escapes special regex characters in a string
 */
const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Scrolls to the first highlighted element
 */
export const scrollToFirstHighlight = () => {
  setTimeout(() => {
    const firstHighlight = document.querySelector('.search-highlight');
    if (firstHighlight) {
      firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 300);
};
