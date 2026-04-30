import { escapeAttr, escapeHtml } from './dom.js';
import { capitalizeFirst, currency, monthFormat } from './format.js';

export const SVG_NS = 'http://www.w3.org/2000/svg';

export function svgMarkup(tagName, attrs = {}, content = '') {
  const attributes = Object.entries(attrs)
    .filter(([, value]) => value !== null && value !== undefined && value !== false)
    .map(([name, value]) => `${name}="${escapeAttr(value === true ? '' : value)}"`)
    .join(' ');
  return `<${tagName}${attributes ? ` ${attributes}` : ''}>${content}</${tagName}>`;
}

export function svgTitle(text) {
  return svgMarkup('title', {}, escapeHtml(text));
}

export function shortSvgLabel(value, maxLength = 24) {
  const text = String(value ?? '');
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

export function getSvgTokens() {
  const styles = window.getComputedStyle(document.documentElement);
  return {
    brand: cssToken(styles, '--color-brand', '#16664f'),
    brandStrong: cssToken(styles, '--color-brand-strong', '#0f3e32'),
    success: cssToken(styles, '--color-success', '#155f49'),
    warning: cssToken(styles, '--color-warning', '#a86613'),
    danger: cssToken(styles, '--color-danger', '#a33a35'),
    info: cssToken(styles, '--color-info', '#266485'),
    plum: cssToken(styles, '--color-plum', '#66547f'),
    surface: cssToken(styles, '--color-surface', '#ffffff'),
    surfaceMuted: cssToken(styles, '--color-surface-muted', '#fbfdfc'),
    border: cssToken(styles, '--color-border', '#d5dfda'),
    text: cssToken(styles, '--color-text', '#14231f'),
    muted: cssToken(styles, '--color-text-muted', '#5d6b66'),
    focus: cssToken(styles, '--color-focus-ring', '#0c756e'),
  };
}

export function statusColor(status, tokens = getSvgTokens()) {
  const key = status?.key || status?.prazoBucket || '';
  const tone = status?.tone || '';
  const colors = {
    vencido: tokens.danger,
    'vence-hoje': tokens.warning,
    'proximo-de-vencer': tokens.warning,
    'vence-ate-30': tokens.warning,
    'vence-31-90': tokens.info,
    vigente: tokens.success,
    'sem-data': tokens.plum,
    'sem-informacao': tokens.plum,
    concluido: tokens.muted,
    encerrado: tokens.muted,
  };
  if (colors[key]) return colors[key];
  if (tone === 'danger') return tokens.danger;
  if (tone === 'warning') return tokens.warning;
  if (tone === 'notice') return tokens.info;
  if (tone === 'ok') return tokens.success;
  if (tone === 'closed') return tokens.muted;
  return tokens.brand;
}

export function heatmapColor(value, max, tokens = getSvgTokens()) {
  if (!value || !max) return tokens.surface;
  const ratio = Math.min(1, Math.max(0.18, value / max));
  return mixHex(tokens.surfaceMuted, tokens.brand, ratio);
}

export function monthKeyFromDate(date) {
  if (!date) return '';
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthLabelFromKey(key) {
  const [year, month] = String(key).split('-').map(Number);
  if (!year || !month) return key;
  return capitalizeFirst(
    monthFormat.format(new Date(Date.UTC(year, month - 1, 1))).replace('.', ''),
  );
}

export function formatSvgCurrency(value) {
  return currency.format(Number(value) || 0);
}

export async function exportSvgAsPng(svg, filename, elements) {
  if (!svg) return;
  const clone = svg.cloneNode(true);
  applySvgPresentationAttributes(svg, clone);
  clone.setAttribute('xmlns', SVG_NS);
  const serialized = new XMLSerializer().serializeToString(clone);
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
  const image = new Image();
  const width = Number(svg.getAttribute('width')) || svg.clientWidth || 960;
  const height = Number(svg.getAttribute('height')) || svg.clientHeight || 540;

  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
    image.src = dataUrl;
  });
  const canvas = document.createElement('canvas');
  canvas.width = width * window.devicePixelRatio;
  canvas.height = height * window.devicePixelRatio;
  const context = canvas.getContext('2d');
  context.fillStyle = getSvgTokens().surface;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.scale(window.devicePixelRatio, window.devicePixelRatio);
  context.drawImage(image, 0, 0, width, height);
  const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.92));
  if (!pngBlob) throw new Error('Não foi possível gerar o PNG.');
  downloadBlob(pngBlob, filename);

  elements?.actionFeedback &&
    (elements.actionFeedback.textContent = `Visualização exportada: ${filename}`);
}

export function renderAccessibleTable(caption, headers, rows) {
  return `
    <table>
      <caption>${escapeHtml(caption)}</caption>
      <thead>
        <tr>${headers.map((header) => `<th scope="col">${escapeHtml(header)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
          <tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>
        `,
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function applySvgPresentationAttributes(source, target) {
  const sourceNodes = [source, ...source.querySelectorAll('*')];
  const targetNodes = [target, ...target.querySelectorAll('*')];
  sourceNodes.forEach((sourceNode, index) => {
    const targetNode = targetNodes[index];
    if (!targetNode || targetNode.nodeType !== Node.ELEMENT_NODE) return;
    const computed = window.getComputedStyle(sourceNode);
    setPresentationAttribute(targetNode, 'font-family', computed.fontFamily);
    setPresentationAttribute(targetNode, 'font-size', computed.fontSize);
    setPresentationAttribute(targetNode, 'font-weight', computed.fontWeight);
    setPresentationAttribute(targetNode, 'fill', computed.fill);
    setPresentationAttribute(targetNode, 'stroke', computed.stroke);
  });
}

function setPresentationAttribute(element, name, value) {
  if (!value || value === 'none' || value === 'normal') return;
  element.setAttribute(name, value);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function cssToken(styles, name, fallback) {
  return styles.getPropertyValue(name).trim() || fallback;
}

function mixHex(from, to, weight) {
  const a = parseHex(from);
  const b = parseHex(to);
  if (!a || !b) return to;
  const mix = a.map((channel, index) => Math.round(channel + (b[index] - channel) * weight));
  return `#${mix.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function parseHex(value) {
  const match = String(value)
    .trim()
    .match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  return match ? match.slice(1).map((part) => Number.parseInt(part, 16)) : null;
}
