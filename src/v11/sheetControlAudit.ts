type V11SheetControlIssue = {
  component: string;
  file: string;
  prohibitedStyleOrToken: string;
  renderedSheet: string;
};

function debugEnabled() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('debugV11Controls') === '1';
}

function sourceForElement(element: Element) {
  const explicit = element.closest('[data-v11-control-file]')?.getAttribute('data-v11-control-file');
  if (explicit) return explicit;
  if (element.closest('.quest-button')) return 'src/components/ui/QuestButton.tsx';
  if (element.closest('.quest-input')) return 'src/components/ui/QuestInput.tsx';
  if (element.closest('.quest-pill')) return 'src/components/ui/QuestPill.tsx';
  if (element.closest('[data-v11-capture-pending]')) return 'src/screens/HomeCapturePending.tsx';
  return 'unknown';
}

function componentForElement(element: Element) {
  return element.getAttribute('data-v11-control')
    || element.className?.toString().split(/\s+/).filter(Boolean).join('.')
    || element.tagName.toLowerCase();
}

export function auditV11SheetControlDescendants() {
  if (typeof __DEV__ === 'undefined' || !__DEV__ || !debugEnabled() || typeof document === 'undefined') return [];

  const issues: V11SheetControlIssue[] = [];
  document.querySelectorAll('[data-v11-sheet]').forEach((sheet) => {
    const renderedSheet = sheet.getAttribute('data-v11-sheet') || 'unknown';
    const descendants = sheet.querySelectorAll('button,input,textarea,select,[role="button"],[role="radio"],[role="checkbox"]');

    descendants.forEach((element) => {
      const approved = element.closest('[data-v11-control]');
      const className = element.className?.toString() ?? '';
      const inlineStyle = element.getAttribute('style') ?? '';
      const component = componentForElement(element);
      const file = sourceForElement(element);

      if (/\bquest-(button|input|pill)\b/.test(className)) {
        issues.push({ component, file, prohibitedStyleOrToken: 'legacy Quest control class', renderedSheet });
      }
      if (/(#fff(?:fff)?\b|\bwhite\b|rgb\(255,\s*255,\s*255\))/i.test(inlineStyle)) {
        issues.push({ component, file, prohibitedStyleOrToken: 'prohibited hardcoded light colour', renderedSheet });
      }
      if (!approved) {
        const defaultControl = ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName);
        issues.push({
          component,
          file,
          prohibitedStyleOrToken: defaultControl
            ? 'browser/native control without approved V11 primitive'
            : 'interactive descendant without approved V11 primitive',
          renderedSheet,
        });
      }
    });
  });

  if (issues.length > 0) {
    console.warn('[V11 Sheet control audit]', issues);
  } else {
    console.info('[V11 Sheet control audit] no control issues');
  }
  (window as any).__questlifeV11SheetControlIssues = issues;
  document.documentElement.dataset.v11SheetControlStatus = issues.length ? 'fail' : 'pass';
  return issues;
}

export function scheduleV11SheetControlAudit(delayMs: number) {
  if (typeof __DEV__ === 'undefined' || !__DEV__ || !debugEnabled() || typeof window === 'undefined') return undefined;
  return window.setTimeout(auditV11SheetControlDescendants, delayMs);
}
