(function (root) {
  'use strict';
  const core = typeof module !== 'undefined' && module.exports ? require('./core.js') : root.MTypeCore;
  const choices = [
    ['你更喜欢哪一种口味？', ['C', '一直喜欢的经典款'], ['E', '没吃过的新口味']],
    ['选餐时，你通常怎么决定？', ['S', '先看优惠，再安排快乐'], ['F', '今天想吃什么就选什么']],
    ['你更常在哪个时段吃麦当劳？', ['D', '18:00 之前'], ['N', '18:00 及之后']],
    ['你的菜单，更像哪一种？', ['L', '反复点心里的那几款'], ['V', '喜欢换着试不同组合']]
  ];
  function foodAsset(name) {
    return /薯条|薯饼/.test(name) ? 'fries' : /可乐|饮|咖啡|茶/.test(name) ? 'cola' : /冰|甜筒|圣代/.test(name) ? 'icecream' : /堡|巨无霸/.test(name) ? 'burger' : 'bag';
  }
  function copyFor(report) {
    const top = report.ranked[0];
    const tied = top && report.ranked.filter(item => item.quantity === top.quantity).length > 1;
    const peaks = report.peakLabels || (report.peak ? [report.peak] : []);
    return {
      summary: core.story(report),
      favoriteEyebrow: tied ? 'A MOST-ORDERED BITE' : 'YOUR MOST-ORDERED BITE',
      favoriteCaption: top && top.orderCount > 1 ? '那些反复出现的餐品，是这段记录的小主角。' : '记录里的每一种味道，都在这里留下名字。',
      favoriteNote: top ? `${top.quantity} 份 · 出现在 ${top.orderCount} 笔订单里${tied ? ' · 份数并列第一' : ''}` : '',
      timeIntro: report.count === 1 ? '这次快乐，出现在' : peaks.length > 1 ? '订单数并列最多的时段：' : '你最常在',
      timePeak: peaks.join('、'),
      timeSuffix: report.count === 1 || peaks.length > 1 ? '。' : '出现。',
      timeDetail: `白日 ${report.day} 次，18:00 后 ${report.night} 次。`,
      timelineCaption: report.timeline.length < 3 ? '来自现有的有效记录，不代表完整全年历史。' : '取自最早、中间与最近的有效记录，不代表完整全年历史。'
    };
  }
  function prepare(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('输入必须是 JSON 对象。');
    if (input.schemaVersion != null && input.schemaVersion !== 1) throw new Error('仅支持 schemaVersion: 1。');
    if (input.source != null && !['demo', 'import', 'mcp'].includes(input.source)) throw new Error('source 仅支持 demo、import 或带查询来源信息的 mcp。');
    let provenance;
    if (input.source === 'mcp') {
      const p = input.provenance;
      if (!p || p.provider !== 'mcd' || p.endpoint !== 'https://mcp.mcd.cn' || p.coverage !== 'single-response' || p.itemBasis !== 'top-level-lines' || typeof p.queriedAt !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(p.queriedAt) || !Number.isFinite(Date.parse(p.queriedAt))) throw new Error('MCP 输入缺少有效的查询来源与范围记录。');
      const length = input.orders?.length;
      const validOutcome = p.outcome === 'no_list_returned' ? p.receivedCount === null && length === 0 : p.outcome === 'empty_list' ? p.receivedCount === 0 && length === 0 : p.outcome === 'records_received' && Number.isInteger(p.receivedCount) && p.receivedCount > 0 && p.receivedCount === length;
      if (!validOutcome || !['unverified', 'CNY-yuan'].includes(p.moneyUnit) || !['explicit-offset-only', 'Asia/Shanghai'].includes(p.localTimeZone)) throw new Error('MCP 查询结果、条数或字段口径不一致。');
      if (input.showAmount && p.moneyUnit !== 'CNY-yuan') throw new Error('MCP 金额单位尚未核验，不能显示金额。');
      provenance = Object.fromEntries(['provider', 'endpoint', 'queriedAt', 'outcome', 'receivedCount', 'coverage', 'itemBasis', 'moneyUnit', 'localTimeZone'].map(key => [key, p[key]]));
    }
    if (input.showAmount != null && typeof input.showAmount !== 'boolean') throw new Error('showAmount 必须是布尔值。');
    for (const key of ['code', 'personality', 'copy']) if (Object.hasOwn(input, key)) throw new Error('人格、统计和文案由记录与回答自动生成，请勿传入 ' + key + ' 覆盖结论。');
    const answers = input.answers ?? {};
    if (typeof answers !== 'object' || Array.isArray(answers)) throw new Error('answers 必须是按 0–3 维度填写的对象。');
    for (const [key, value] of Object.entries(answers)) {
      if (!/^[0-3]$/.test(key) || !choices[Number(key)].slice(1).some(option => option[0] === value)) throw new Error('answers 中包含无效的维度或选项。');
    }
    const report = core.analyze(input, answers);
    const questions = report.dimensions.filter(d => !d.code).map(d => ({ index: d.index, prompt: choices[d.index][0], options: choices[d.index].slice(1).map(([value, label]) => ({ value, label })) }));
    if (input.showAmount && !report.amountComplete) throw new Error('实付金额不完整，不能生成金额合计；请保持 showAmount: false。');
    // Personal artifacts contain derived display data, never raw orders or internal IDs.
    if (!input.showAmount) { delete report.amount; report.amountComplete = false; }
    const copy = copyFor(report);
    if (provenance?.outcome === 'no_list_returned') copy.summary = '官方查询已成功，但本次没有返回订单列表，不能据此判断你的历史订单为零。这份档案暂以补充回答确定人格，历史记录先留白。';
    if (provenance?.outcome === 'empty_list') copy.summary = '本次官方接口返回了空列表。这里仅展示补充回答得到的麦门身份，时光档案等待以后可获取的记录。';
    return {
      schemaVersion: 1,
      templateVersion: 'retro-v1',
      status: questions.length ? 'needs_answers' : 'ready',
      source: input.source || 'import',
      ...(provenance ? { provenance } : {}),
      showAmount: Boolean(input.showAmount),
      report,
      questions,
      copy
    };
  }
  const api = { prepare, copyFor, choices, foodAsset };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MTypeReportModel = api;
})(typeof window !== 'undefined' ? window : globalThis);
