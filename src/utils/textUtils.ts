/**
 * Strips HTML tags from a string and returns clean text
 * @param html - HTML string to clean
 * @returns Clean text without HTML tags
 */
export const stripHtml = (html: string): string => {
  if (!html) return ''
  
  // Create a temporary div to parse HTML safely
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  const text = tmp.textContent || tmp.innerText || ''
  
  // Clean up extra whitespace
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * Truncates text to a specified length and adds ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}

/**
 * Strips HTML and truncates in one operation
 * @param html - HTML string to clean
 * @param maxLength - Maximum length for the clean text
 * @returns Clean, truncated text
 */
export const stripAndTruncate = (html: string, maxLength: number): string => {
  const cleanText = stripHtml(html)
  return truncateText(cleanText, maxLength)
}
