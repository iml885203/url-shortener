/**
 * Copy text to clipboard with fallback for iOS Safari and insecure contexts.
 * Returns true on success, false on failure.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Try modern Clipboard API first
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy method
    }
  }

  // Fallback: textarea + execCommand (works in iOS Safari modals)
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
    document.body.appendChild(textarea);

    // iOS Safari needs special handling
    const range = document.createRange();
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      textarea.select();
      textarea.setSelectionRange(0, text.length); // iOS Safari needs this
      range.selectNodeContents(textarea);
      selection.addRange(range);
    }

    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}
