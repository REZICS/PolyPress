/**
 * 黄金比例羽毛笔生成器 (Golden Ratio Feather Pen Generator)
 * 
 * NOTE 完全不工作好吧
 *
 * 使用黄金比例 φ (phi ≈ 1.618) 作为设计基础，创建符合美学原则的羽毛笔图标
 *
 * 设计原则：
 * - 羽毛笔的整体长度与宽度比例遵循黄金比例
 * - 关键转折点基于黄金分割点
 * - 宽度变化曲线基于黄金螺旋
 * - 羽枝（barbs）的分布遵循斐波那契数列
 *
 * Usage:
 *   bun .\drawIcon.ts  > ../../public/icon.svg
 *   or: ts-node drawIcon.ts
 *   node dist/drawIcon.js
 */

// ============================================================================
// 常量定义：黄金比例相关
// ============================================================================

const PHI = (1 + Math.sqrt(5)) / 2; // 黄金比例 ≈ 1.618
const PHI_INV = 1 / PHI; // 黄金比例倒数 ≈ 0.618
const PHI_SQ = PHI * PHI; // 黄金比例平方 ≈ 2.618

// ============================================================================
// 向量工具函数
// ============================================================================

type Vec = {x: number; y: number};

const add = (a: Vec, b: Vec): Vec => ({x: a.x + b.x, y: a.y + b.y});
const sub = (a: Vec, b: Vec): Vec => ({x: a.x - b.x, y: a.y - b.y});
const mul = (a: Vec, k: number): Vec => ({x: a.x * k, y: a.y * k});
const len = (a: Vec): number => Math.hypot(a.x, a.y);
const norm = (a: Vec): Vec => {
  const l = len(a) || 1;
  return {x: a.x / l, y: a.y / l};
};
const perp = (a: Vec): Vec => ({x: -a.y, y: a.x});
const lerp = (a: Vec, b: Vec, t: number): Vec => add(mul(a, 1 - t), mul(b, t));
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
const dot = (a: Vec, b: Vec): number => a.x * b.x + a.y * b.y;

// ============================================================================
// 黄金比例美学函数
// ============================================================================

/**
 * 黄金螺旋函数：基于黄金比例的对数螺旋
 * 用于生成自然优雅的曲线
 */
function goldenSpiral(theta: number, scale: number = 1): number {
  // r = a * φ^(θ/π/2)
  return scale * Math.pow(PHI, theta / (Math.PI / 2));
}

/**
 * 黄金波函数：结合黄金比例的正弦波
 * 创造和谐的周期性变化
 */
function goldenWave(t: number, frequency: number = 1): number {
  return Math.sin(2 * Math.PI * frequency * t * PHI_INV) * PHI_INV;
}

/**
 * 平滑步进函数：基于黄金比例的缓动
 */
function smoothStep(t: number): number {
  const t2 = clamp(t, 0, 1);
  // 使用黄金比例优化的平滑曲线
  return t2 * t2 * (3 - 2 * t2) * (1 + goldenWave(t2, 0.5) * 0.08);
}

const fract = (x: number) => x - Math.floor(x);
const hash01 = (i: number) =>
  fract(Math.sin(i * 127.1 + 311.7) * 43758.5453123);

// 约束贝塞尔控制点，防止尖端/连接处“炸刺”
function clampHandle(p: Vec, cp: Vec, maxLen: number): Vec {
  const v = sub(cp, p);
  const l = len(v) || 1;
  if (l <= maxLen) return cp;
  return add(p, mul(v, maxLen / l));
}

// ============================================================================
// 羽毛笔脊柱曲线：基于黄金螺旋的优雅曲线
// ============================================================================

/**
 * 羽毛笔的中心脊柱曲线
 * 使用修改的黄金螺旋，创造从笔杆到笔尖的自然过渡
 */
function spinePoint(t: number): Vec {
  // 在 24x24 画布中的定位
  const canvasHeight = 24;
  const canvasWidth = 24;

  // 黄金分割点作为关键位置
  const golden1 = PHI_INV; // ≈ 0.618
  const golden2 = 1 - PHI_INV; // ≈ 0.382

  // 使用五点贝塞尔曲线，控制点基于黄金比例
  const P0 = {x: 6.5, y: 21.5}; // 笔杆底部
  const P1 = {x: 5.2, y: 21.5 * golden1}; // 第一控制点：黄金分割
  const P2 = {x: 8.5, y: 21.5 * golden2}; // 第二控制点：黄金分割
  const P3 = {x: 15.0, y: 8.0}; // 第三控制点：羽毛主体
  const P4 = {x: 19.2, y: 2.8}; // 笔尖

  // 五次贝塞尔曲线（更平滑）
  const u = 1 - t;
  const u2 = u * u;
  const u3 = u2 * u;
  const u4 = u3 * u;
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;

  // 贝塞尔基函数
  const b0 = u4;
  const b1 = 4 * u3 * t;
  const b2 = 6 * u2 * t2;
  const b3 = 4 * u * t3;
  const b4 = t4;

  const x = b0 * P0.x + b1 * P1.x + b2 * P2.x + b3 * P3.x + b4 * P4.x;
  const y = b0 * P0.y + b1 * P1.y + b2 * P2.y + b3 * P3.y + b4 * P4.y;

  // 添加基于黄金比例的微妙波动，让曲线更自然
  const flutter = 0.15 * goldenWave(t, 1.5) * smoothStep(t) * smoothStep(1 - t);

  return {
    x: x + flutter * 0.8,
    y: y - flutter * 0.5,
  };
}

/**
 * 脊柱切线（用于计算法向量）
 */
function spineTangent(t: number): Vec {
  const dt = 0.001;
  const p1 = spinePoint(Math.min(t + dt, 1));
  const p0 = spinePoint(Math.max(t - dt, 0));
  return norm(sub(p1, p0));
}

// ============================================================================
// 羽毛笔宽度曲线：基于黄金比例的宽度分布
// ============================================================================

/**
 * 羽毛笔的宽度分布函数
 * 使用黄金比例来确定最宽处的位置和形状
 */
function featherWidth(t: number): number {
  // 最宽处位于黄金分割点
  const peakPosition = PHI_INV;

  // 使用黄金比例构建宽度曲线
  // 笔尖到笔杆的自然过渡
  const tipTaper = Math.pow(1 - t, 0.7); // 笔尖渐细
  const baseTaper = Math.pow(t, 0.45); // 笔杆渐细

  // 主体宽度：使用高斯分布，中心在黄金分割点
  const sigma = 0.22 / PHI; // 使用黄金比例调整标准差
  const bellCurve = Math.exp(-Math.pow((t - peakPosition) / sigma, 2));

  // 组合各种因素，创造优雅的宽度曲线
  const baseWidth = 0.35;
  const maxWidth = 3.5 / PHI; // 最大宽度也遵循黄金比例

  const width =
    baseWidth + maxWidth * bellCurve * tipTaper * (0.7 + 0.3 * baseTaper);

  // 添加基于斐波那契数列的细微变化
  const fibboDetail =
    0.08 *
    Math.sin((t * 8 * Math.PI) / PHI) *
    smoothStep(t) *
    smoothStep(1 - t);

  return width * (1 + fibboDetail);
}

// ============================================================================
// 羽枝（Barbs）生成：基于斐波那契数列的羽毛细节
// ============================================================================

/**
 * 生成羽枝（羽毛两侧的细小分支）
 * 使用斐波那契数列确定羽枝的位置和大小
 */
function generateBarbs(): Array<{
  t: number;
  length: number;
  angle: number;
  side: 'left' | 'right';
}> {
  const barbs: Array<{
    t: number;
    length: number;
    angle: number;
    side: 'left' | 'right';
  }> = [];
  const fibPositions = [0.21, 0.34, 0.47, 0.55, 0.63, 0.7, 0.76, 0.82, 0.87];

  fibPositions.forEach((t, i) => {
    if (t < 0.2 || t > 0.9) return;

    const width = featherWidth(t);
    const r1 = hash01(i * 2 + 1);
    const r2 = hash01(i * 2 + 2);

    const baseLength = width * (0.6 + 0.4 * r1);
    const side = i % 2 === 0 ? 'left' : 'right';
    const angleVariation = (r2 - 0.5) * 0.3;

    barbs.push({
      t,
      length: baseLength * (1.2 - t * 0.4),
      angle: Math.PI / 3 + angleVariation,
      side,
    });
  });

  return barbs;
}

// ============================================================================
// 羽毛笔轮廓生成
// ============================================================================

/**
 * 生成羽毛笔的左右轮廓线
 */
function buildOutline(samples: number = 100): {left: Vec[]; right: Vec[]} {
  const left: Vec[] = [];
  const right: Vec[] = [];

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const center = spinePoint(t);
    const tangent = spineTangent(t);
    const normal = perp(tangent);

    const w = featherWidth(t);

    // 羽毛天然的不对称性
    const asymmetry = 0.08 * Math.sin(t * Math.PI * PHI);
    const leftWidth = w * (1 + asymmetry);
    const rightWidth = w * (1 - asymmetry);

    left.push(add(center, mul(normal, leftWidth)));
    right.push(add(center, mul(normal, -rightWidth)));
  }

  return {left, right};
}

/**
 * 优化笔尖形状：创造锐利优雅的尖端
 */
function refineTip(left: Vec[], right: Vec[]): void {
  const tipPoint = {x: 19.5, y: 2.5};

  const affectedPoints = Math.max(3, Math.floor(8 * PHI_INV));

  for (let i = 0; i < affectedPoints; i++) {
    const ratio = Math.pow((i + 1) / (affectedPoints + 1), PHI_INV);
    const idx = left.length - 1 - i;
    if (idx >= 0) {
      left[idx] = lerp(left[idx], tipPoint, ratio);
      right[idx] = lerp(right[idx], tipPoint, ratio);
    }
  }

  // ✅ 进一步稳住尖端：最后一点强制同点，避免左右末端分叉
  if (left.length) left[left.length - 1] = tipPoint;
  if (right.length) right[right.length - 1] = tipPoint;
}
/**
  笔杆底部（你原来的 drop + bulbBottom 会把 y 推到 viewBox 外）
// 这会在 24x24 图标里被裁切，底部就看起来“不像笔杆/羽管”
// 这里做一个保守缩小：仍保留鼓包，但确保落在 0..24 内
 */
function refineQuill(left: Vec[], right: Vec[]): void {
  const affectedPoints = Math.floor(10 * PHI_INV);

  for (let i = 0; i <= affectedPoints && i < left.length; i++) {
    const ratio = 1 - i / Math.max(1, affectedPoints);
    const expansion = ratio * ratio * 0.45; // 原来 0.7，缩小
    const drop = ratio * ratio * 0.55; // 原来 1.2，缩小

    const t = i / (left.length - 1);
    const tangent = spineTangent(t);
    const normal = perp(tangent);

    left[i] = add(left[i], add(mul(normal, expansion), {x: 0, y: drop}));
    right[i] = add(right[i], add(mul(normal, -expansion), {x: 0, y: drop}));

    // 防止被 viewBox 裁切（可选但很实用）
    left[i].y = Math.min(left[i].y, 23.8);
    right[i].y = Math.min(right[i].y, 23.8);
  }

  // 底部鼓包：整体下移量缩小，避免越界
  if (left.length > 0 && right.length > 0) {
    const base = mul(add(left[0], right[0]), 0.5);
    const bulbBottom = add(base, {x: 0, y: 1.1}); // 原来 2.0
    const bulbLeft = add(bulbBottom, {x: -0.75, y: -0.15}); // 原来 -0.9, -0.2
    const bulbRight = add(bulbBottom, {x: 0.75, y: -0.15});

    left.unshift(bulbLeft);
    right.unshift(bulbRight);
  }
}

/**
 * 生成羽毛的中央裂口（rachis split）
 * 这是羽毛特征性的细节
 */
function generateRachisSplit(): Vec[] {
  // 位置基于黄金分割
  const splitT = PHI_INV * 1.1; // 约在 0.68 位置
  const center = spinePoint(splitT);
  const tangent = spineTangent(splitT);
  const normal = perp(tangent);

  const splitWidth = featherWidth(splitT) * 0.6;
  const splitLength = splitWidth * PHI_INV * 1.2;

  // 创建一个优雅的菱形切口
  const p0 = add(center, mul(tangent, -splitLength * 0.5));
  const p1 = add(center, mul(normal, splitWidth * 0.5));
  const p2 = add(center, mul(tangent, splitLength * 0.5));
  const p3 = add(center, mul(normal, -splitWidth * 0.5));

  return [p0, p1, p2, p3];
}

// ============================================================================
// SVG 路径生成
// ============================================================================

/**
 * 将点列表转换为平滑的贝塞尔曲线路径
 * 使用 Catmull-Rom 样条插值
 */
function pointsToBezierPath(points: Vec[], closed: boolean): string {
  if (points.length < 2) return '';

  const n = points.length;
  const getPoint = (i: number): Vec => {
    if (closed) return points[(i + n) % n];
    return points[clamp(i, 0, n - 1)];
  };

  let path = `M ${points[0].x.toFixed(3)} ${points[0].y.toFixed(3)}`;

  // ✅ 修复：张力用“乘”而不是“除”（倒数写反会过冲）
  const tension = PHI_INV / 6;

  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = getPoint(i - 1);
    const p1 = getPoint(i);
    const p2 = getPoint(i + 1);
    const p3 = getPoint(i + 2);

    let cp1 = add(p1, mul(sub(p2, p0), tension));
    let cp2 = sub(p2, mul(sub(p3, p1), tension));

    // ✅ 修复：控制柄限幅，避免尖端/连接处“炸刺”
    const segLen = len(sub(p2, p1));
    const maxHandle = segLen * 0.75;
    cp1 = clampHandle(p1, cp1, maxHandle);
    cp2 = clampHandle(p2, cp2, maxHandle);

    path += ` C ${cp1.x.toFixed(3)} ${cp1.y.toFixed(3)}, ${cp2.x.toFixed(
      3,
    )} ${cp2.y.toFixed(3)}, ${p2.x.toFixed(3)} ${p2.y.toFixed(3)}`;
  }

  if (closed) path += ' Z';
  return path;
}

// ============================================================================
// 主生成函数
// ============================================================================

/**
 * 生成最终的羽毛笔 SVG
 */
function generateGoldenFeatherSVG(options?: {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  withBarbs?: boolean;
}): string {
  const fill = options?.fill ?? '#f4606c';
  const stroke = options?.stroke ?? 'none';
  const strokeWidth = options?.strokeWidth ?? 0.5;
  const withBarbs = options?.withBarbs ?? false;

  const {left, right} = buildOutline(120);
  refineTip(left, right);
  refineQuill(left, right);

  const outline = [...left, ...right.reverse()];
  const mainPath = pointsToBezierPath(outline, true);

  const split = generateRachisSplit();
  const splitPath = pointsToBezierPath(split, true);

  const combinedPath = `${mainPath} ${splitPath}`;

  let svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="2400" viewBox="0 0 24 24" role="img" aria-label="Golden Ratio Feather Pen">\n';

  // ✅ 先画填充（带洞），不描边
  svg += `  <path d="${combinedPath}" fill="${fill}" fill-rule="evenodd"/>\n`;

  // ✅ 再对外轮廓描边（不包含裂口子路径）
  if (stroke !== 'none' && strokeWidth > 0) {
    svg += `  <path d="${mainPath}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round" stroke-linecap="round"/>\n`;
  }

  if (withBarbs) {
    const barbs = generateBarbs();
    barbs.forEach(barb => {
      const center = spinePoint(barb.t);
      const tangent = spineTangent(barb.t);
      const normal = perp(tangent);

      const direction = barb.side === 'left' ? normal : mul(normal, -1);
      const rotated = {
        x:
          direction.x * Math.cos(barb.angle) -
          direction.y * Math.sin(barb.angle),
        y:
          direction.x * Math.sin(barb.angle) +
          direction.y * Math.cos(barb.angle),
      };

      const end = add(center, mul(rotated, barb.length));

      svg += `  <line x1="${center.x.toFixed(3)}" y1="${center.y.toFixed(
        3,
      )}" x2="${end.x.toFixed(3)}" y2="${end.y.toFixed(
        3,
      )}" stroke="${fill}" stroke-width="${(strokeWidth * 0.5).toFixed(
        3,
      )}" stroke-linecap="round" opacity="0.4"/>\n`;
    });
  }

  svg += '</svg>\n';
  return svg;
}

// ============================================================================
// 执行
// ============================================================================

const svg = generateGoldenFeatherSVG({
  fill: '#f4606c',
  stroke: '#f4606c',
  strokeWidth: 0.5,
  withBarbs: true, // 设为 true 可添加羽枝细节
});

process.stdout.write(svg);
