export type V11SheetGeometryBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
};

export type V11SheetGeometryNode = {
  component: string;
  node: string;
  left: number;
  right: number;
};

export type V11SheetGeometryIssue = V11SheetGeometryNode & {
  safeLeft: number;
  safeRight: number;
};

export type V11SheetGeometryReport = {
  instanceId: string;
  outer: V11SheetGeometryBounds;
  safe: V11SheetGeometryBounds;
  minimumClearance: number;
  title?: V11SheetGeometryNode;
  widestBodyRow?: V11SheetGeometryNode;
  footer?: V11SheetGeometryNode;
  issues: V11SheetGeometryIssue[];
};

declare global {
  interface Window {
    __questlifeV11SheetGeometry?: V11SheetGeometryReport[];
    __questlifeV11AssertSheetGeometry?: () => V11SheetGeometryReport[];
  }
}

const GEOMETRY_TOLERANCE_PX = 1;

function bounds(rect: DOMRect): V11SheetGeometryBounds {
  return {
    left: rect.left,
    right: rect.right,
    top: rect.top,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

function number(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function describeNode(node: HTMLElement): V11SheetGeometryNode {
  const rect = node.getBoundingClientRect();
  const role = node.dataset.v11RebaselineRole || node.getAttribute('role') || node.tagName.toLowerCase();
  const text = (node.getAttribute('aria-label') || node.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80);
  const component = node.closest<HTMLElement>('[data-v11-component-name]')?.dataset.v11ComponentName || 'V11Stage2ProductionSheet';

  return {
    component,
    node: text ? `${role}: ${text}` : role,
    left: rect.left,
    right: rect.right,
  };
}

function isVisible(node: HTMLElement): boolean {
  const rect = node.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const style = window.getComputedStyle(node);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

function isMeasurable(node: HTMLElement): boolean {
  if (!isVisible(node)) return false;

  const tag = node.tagName.toLowerCase();
  const interactive = tag === 'input'
    || tag === 'textarea'
    || tag === 'select'
    || tag === 'button'
    || node.getAttribute('role') === 'button'
    || node.getAttribute('role') === 'textbox';
  const directText = Array.from(node.childNodes).some((child) => (
    child.nodeType === Node.TEXT_NODE && Boolean((child.textContent || '').trim())
  ));
  return interactive || directText || Boolean(node.dataset.v11GeometryNode);
}

function findNamedNode(
  frame: HTMLElement,
  selector: string,
): V11SheetGeometryNode | undefined {
  const node = frame.querySelector<HTMLElement>(selector);
  return node && isVisible(node) ? describeNode(node) : undefined;
}

function inspectFrame(frame: HTMLElement): V11SheetGeometryReport {
  const frameRect = frame.getBoundingClientRect();
  const computed = window.getComputedStyle(frame);
  const safeLeft = frameRect.left + number(computed.paddingLeft);
  const safeRight = frameRect.right - number(computed.paddingRight);
  const outerNode = frame.closest<HTMLElement>('[data-v11-component="material-frame"]');
  const outerRect = outerNode?.getBoundingClientRect() ?? frameRect;
  const candidates = Array.from(frame.querySelectorAll<HTMLElement>('*')).filter((node) => (
    node.closest('[data-v11-rebaseline-role="sheet-content-safe"]') === frame
    && isMeasurable(node)
  ));

  const measurements = candidates.map(describeNode);
  const issues = measurements
    .filter((measurement) => (
      measurement.left < safeLeft - GEOMETRY_TOLERANCE_PX
      || measurement.right > safeRight + GEOMETRY_TOLERANCE_PX
    ))
    .map((measurement) => ({ ...measurement, safeLeft, safeRight }));

  const bodyRows = Array.from(frame.querySelectorAll<HTMLElement>([
    '[data-v11-rebaseline-role="history-row"]',
    '[data-v11-rebaseline-role="evidence-row"]',
    '[data-v11-rebaseline-role="utility-row"]',
    '[data-v11-rebaseline-role="state-detail-row"]',
    '[data-v11-rebaseline-role="capture-record"]',
  ].join(','))).filter(isVisible);
  const widestBodyNode = bodyRows.sort((a, b) => (
    b.getBoundingClientRect().width - a.getBoundingClientRect().width
  ))[0];
  const leftClearances = measurements.map((measurement) => measurement.left - outerRect.left);
  const rightClearances = measurements.map((measurement) => outerRect.right - measurement.right);
  const minimumClearance = Math.min(...leftClearances, ...rightClearances);

  return {
    instanceId: frame.dataset.v11SheetInstance || 'unknown',
    outer: bounds(outerRect),
    safe: {
      left: safeLeft,
      right: safeRight,
      top: frameRect.top,
      bottom: frameRect.bottom,
      width: safeRight - safeLeft,
      height: frameRect.height,
    },
    minimumClearance: Number.isFinite(minimumClearance) ? minimumClearance : 0,
    title: findNamedNode(frame, '[data-v11-geometry-node="sheet-title"]'),
    widestBodyRow: widestBodyNode ? describeNode(widestBodyNode) : undefined,
    footer: findNamedNode(frame, '[data-v11-rebaseline-role="production-sheet-footer"]'),
    issues,
  };
}

export function inspectV11SheetGeometry(root: ParentNode = document): V11SheetGeometryReport[] {
  if (typeof window === 'undefined' || typeof document === 'undefined') return [];
  return Array.from(root.querySelectorAll<HTMLElement>('[data-v11-rebaseline-role="sheet-content-safe"]'))
    .map(inspectFrame);
}

export function assertV11SheetGeometry(root: ParentNode = document): V11SheetGeometryReport[] {
  const reports = inspectV11SheetGeometry(root);
  const issues = reports.flatMap((report) => report.issues);
  if (issues.length > 0) {
    const details = issues.map((issue) => (
      `${issue.component} | ${issue.node} | node ${issue.left.toFixed(2)}..${issue.right.toFixed(2)} | safe ${issue.safeLeft.toFixed(2)}..${issue.safeRight.toFixed(2)}`
    )).join('\n');
    throw new Error(`[V11 sheet geometry] ${issues.length} boundary violation(s)\n${details}`);
  }
  return reports;
}

export function isV11SheetGeometryDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('debugSheetSafeArea') === '1';
}

export function publishV11SheetGeometryDebug(): V11SheetGeometryReport[] {
  const reports = inspectV11SheetGeometry();
  window.__questlifeV11SheetGeometry = reports;
  window.__questlifeV11AssertSheetGeometry = () => assertV11SheetGeometry();

  const issues = reports.flatMap((report) => report.issues);
  document.documentElement.dataset.v11SheetGeometryStatus = issues.length > 0 ? 'fail' : 'pass';
  document.documentElement.dataset.v11SheetGeometryReport = JSON.stringify(reports);
  if (issues.length > 0) {
    console.error('[V11 sheet geometry]', issues);
  } else {
    console.info('[V11 sheet geometry]', reports);
  }
  return reports;
}
