(function (root) {
  'use strict';
  const ZONE = 'Asia/Shanghai';
  const VALID = new Set(['completed', 'paid', 'delivered', 'finished']);
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  function localParts(iso) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(iso)).map(p => [p.type, p.value]));
    return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), minute: Number(parts.minute) };
  }
  function normalize(input) {
    if (!input || !Array.isArray(input.orders)) throw new Error('请导入包含 orders 数组的订单文件。');
    if (input.orders.length > 5000) throw new Error('一次最多分析 5000 笔订单。');
    let omitted = 0;
    const ids = new Set();
    const orders = [];
    for (const raw of input.orders) {
      if (!raw || typeof raw.id !== 'string' || !raw.id.trim()) throw new Error('每笔订单需要一个非空字符串 id，用于去重。');
      if (!VALID.has(raw.status)) { omitted++; continue; }
      if (typeof raw.orderedAt !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(raw.orderedAt) || !Number.isFinite(Date.parse(raw.orderedAt))) throw new Error('orderedAt 需要带时区的 ISO 时间，例如 2026-09-01T21:30:00+08:00。');
      if (ids.has(raw.id)) { omitted++; continue; }
      if (!Array.isArray(raw.items) || raw.items.length > 1000) throw new Error('订单 items 必须是餐品数组，且不超过 1000 项。');
      const items = raw.items.map(item => {
        if (!item || typeof item.productName !== 'string' || !item.productName.trim() || item.productName.length > 100) throw new Error('餐品需要不超过 100 字的 productName。');
        if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0 || item.quantity > 10000) throw new Error('餐品 quantity 必须是正整数。');
        return { productId: typeof item.productId === 'string' ? item.productId : undefined, productName: item.productName.trim(), quantity: item.quantity, tags: Array.isArray(item.tags) ? item.tags.filter(t => ['classic', 'explorer'].includes(t)) : [] };
      });
      if (!items.length) { omitted++; continue; }
      for (const key of ['amount', 'discountAmount']) if (raw[key] != null && (typeof raw[key] !== 'number' || !Number.isFinite(raw[key]) || raw[key] < 0)) throw new Error(`${key} 必须是非负数；未知请省略。`);
      if (raw.currency != null && raw.currency !== 'CNY') throw new Error('当前模板只支持人民币订单，请先按币种拆分。');
      ids.add(raw.id);
      orders.push({ id: raw.id, orderedAt: raw.orderedAt, items, amount: raw.amount ?? undefined, currency: raw.currency, discountAmount: raw.discountAmount ?? undefined });
    }
    orders.sort((a, b) => Date.parse(a.orderedAt) - Date.parse(b.orderedAt) || a.id.localeCompare(b.id));
    return { orders, omitted };
  }
  function analyze(input, answers = {}) {
    const { orders, omitted } = normalize(input);
    const items = new Map();
    const bins = Array(6).fill(0);
    const labels = ['凌晨', '早餐', '午间', '下午', '晚间', '深夜'];
    const ranges = ['00–06', '06–10', '10–14', '14–18', '18–22', '22–24'];
    let day = 0, night = 0, classic = 0, explorer = 0, total = 0, discounts = 0, discountKnown = 0;
    for (const order of orders) {
      const { hour } = localParts(order.orderedAt);
      if (hour < 18) day++; else night++;
      bins[hour < 6 ? 0 : hour < 10 ? 1 : hour < 14 ? 2 : hour < 18 ? 3 : hour < 22 ? 4 : 5]++;
      if (order.discountAmount != null) { discountKnown++; if (order.discountAmount > 0) discounts++; }
      const seen = new Set();
      for (const item of order.items) {
        const key = item.productId || item.productName;
        const current = items.get(key) || { name: item.productName, quantity: 0, orderCount: 0 };
        current.quantity += item.quantity;
        if (!seen.has(key)) { current.orderCount++; seen.add(key); }
        items.set(key, current);
        total += item.quantity;
        if (item.tags.includes('classic') && !item.tags.includes('explorer')) classic += item.quantity;
        if (item.tags.includes('explorer') && !item.tags.includes('classic')) explorer += item.quantity;
      }
    }
    const ranked = [...items.values()].sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name, 'zh-CN'));
    const top3Share = total ? ranked.slice(0, 3).reduce((n, x) => n + x.quantity, 0) / total : 0;
    const amountComplete = orders.length > 0 && orders.every(o => o.amount != null && o.currency === 'CNY');
    const amount = amountComplete ? Math.round(orders.reduce((n, o) => n + o.amount, 0) * 100) / 100 : undefined;
    const sufficient = orders.length >= 5;
    function dimension(index, allowed, computed, enough, evidence) {
      if (enough) return { index, code: computed, source: 'orders', evidence, sufficient: true };
      const answer = answers[index];
      return { index, code: allowed.includes(answer) ? answer : null, source: allowed.includes(answer) ? 'questions' : 'missing', evidence: allowed.includes(answer) ? '由你的补充回答确定' : '记录不足，等待你的补充回答', sufficient: false };
    }
    const dimensions = [
      dimension(0, ['C', 'E'], classic >= explorer ? 'C' : 'E', sufficient && total > 0 && (classic + explorer) / total >= .7, `已标记餐品中，经典款 ${classic} 份、新品 ${explorer} 份`),
      dimension(1, ['S', 'F'], discounts / (discountKnown || 1) >= .5 ? 'S' : 'F', sufficient && discountKnown >= 5 && discountKnown / orders.length >= .7, `${discountKnown} 笔记录有优惠信息，其中 ${discounts} 笔使用优惠`),
      dimension(2, ['D', 'N'], day >= night ? 'D' : 'N', sufficient, `白日 ${day} 笔，18:00 后 ${night} 笔（北京时间）`),
      dimension(3, ['L', 'V'], top3Share >= .65 ? 'L' : 'V', sufficient, `前三餐品占购买份数的 ${Math.round(top3Share * 100)}%`)
    ];
    const code = dimensions.every(d => d.code) ? dimensions.map(d => d.code).join('') : null;
    const peak = bins.indexOf(Math.max(...bins));
    const peakLabels = orders.length ? labels.filter((_, i) => bins[i] === bins[peak]) : [];
    const timelineIndices = [...new Set([0, Math.floor((orders.length - 1) / 2), orders.length - 1])].filter(i => i >= 0 && i < orders.length);
    const timeline = timelineIndices.map((i, index) => ({ date: localParts(orders[i].orderedAt).date, title: timelineIndices.length === 1 ? '这一口，留下了记录' : index === 0 ? '记录里的第一口' : index === timelineIndices.length - 1 ? '最近的一次快乐' : '中途的快乐停靠', food: orders[i].items.map(x => x.productName).slice(0, 2).join('、') }));
    return { code, dimensions, count: orders.length, omitted, uniqueFoods: ranked.length, ranked, total, top3Share, amount, amountComplete, day, night, bins: bins.map((count, i) => ({ count, label: labels[i], range: ranges[i] })), peak: orders.length ? labels[peak] : null, peakLabels, from: orders.length ? localParts(orders[0].orderedAt).date : null, to: orders.length ? localParts(orders.at(-1).orderedAt).date : null, timeline };
  }
  function story(report) {
    if (!report.count) return report.dimensions.every(d => d.source === 'questions') ? '还没有可分析的订单。你的麦门身份来自补充回答，时光档案先留白，等下一次相遇，再慢慢写满。' : '还没有可分析的订单。先用问答解锁你的麦门身份，等下一次相遇，再慢慢写满这份档案。';
    const top = report.ranked[0];
    if (report.count === 1) return `这段档案里，先收下了 1 次麦门相遇。记录中有 ${report.uniqueFoods} 种餐品，共 ${report.total} 份。这一口留在${report.peak}，更多偏爱，等以后的记录慢慢补全。`;
    const tied = report.ranked.filter(item => item.quantity === top.quantity).length;
    const favorite = tied > 1 ? `「${top.name}」点了 ${top.quantity} 份，出现在 ${top.orderCount} 笔订单里，与另外 ${tied - 1} 种餐品并列份数最多` : `「${top.name}」是出场最多的那一口，共点了 ${top.quantity} 份，出现在 ${top.orderCount} 笔订单里`;
    const peaks = report.peakLabels || [report.peak];
    const timing = peaks.length > 1 ? `${peaks.join('、')}的订单数并列最多` : `${report.peak}是你最常出现的时段`;
    return `在这段记录里，你和麦门碰面了 ${report.count} 次。${favorite}。${timing}。每一笔小小的记录，都让这份快乐有了自己的轮廓。`;
  }
  const api = { normalize, analyze, story, localParts };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MTypeCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
