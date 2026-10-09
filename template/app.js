(function () {
  'use strict';
  const core = window.MTypeCore;
  const model = window.MTypeReportModel;
  const documentData = window.MTYPE_DOCUMENT;
  const personalMode = Boolean(documentData);
  const personalities = window.MTYPE_PERSONALITIES;
  const assets = window.MTYPE_ASSETS;
  const byCode = Object.fromEntries(personalities.map(p => [p.code, p]));
  const names = { C:'经典派', E:'探索派', S:'精算派', F:'随性派', D:'白日派', N:'夜行派', L:'忠诚复购', V:'多样尝鲜' };
  const $ = id => document.getElementById(id);
  const escape = text => String(text).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
  const logo = (color = '#ffbc0d') => `<svg class="arches" viewBox="0 0 90 70" xmlns="http://www.w3.org/2000/svg" aria-label="麦当劳金拱门"><path d="M10 62 C10 26 16 8 27 8 C38 8 44 26 44 62 C44 26 50 8 61 8 C72 8 78 26 78 62" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="butt"/></svg>`;
  const foodSymbol = `<svg class="food-symbol" viewBox="0 0 70 70" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g stroke="#3a251b" stroke-width="2.2" stroke-linejoin="round"><path d="M9 31C10 7 60 7 61 31Z" fill="#ffbc0d"/><path d="M9 36l8-3 9 4 10-4 10 4 9-4 6 3" fill="none" stroke="#84973c" stroke-width="5"/><rect x="8" y="40" width="54" height="9" rx="4" fill="#774527"/><path d="M8 50h54c0 14-54 14-54 0Z" fill="#ffbc0d"/></g><g fill="#fff5dd"><ellipse cx="26" cy="21" rx="2" ry="1" transform="rotate(-25 26 21)"/><ellipse cx="40" cy="16" rx="2" ry="1"/><ellipse cx="48" cy="24" rx="2" ry="1"/></g></svg>`;
  const decorative = (key, cls) => `<img src="${escape(assets[key])}" class="${cls}" alt="" aria-hidden="true">`;
  function icon(kind) {
    const paths = {
      burger:'<path d="M4 12C4 2 28 2 28 12Z"/><rect x="3" y="15" width="26" height="4" rx="2"/><path d="M4 22h24c0 10-24 10-24 0Z"/>',
      bag:'<path d="M8 9V6c0-5 16-5 16 0v3M4 10h24v20H4Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 25c0-11 6-11 6 0 0-11 6-11 6 0" fill="none" stroke="currentColor" stroke-width="2"/>',
      moon:'<path d="M25 3C8-1 0 13 8 25c7 10 22 7 24-2C11 27 9 9 25 3Z"/>',
      sun:'<circle cx="16" cy="17" r="7"/><g fill="none" stroke="currentColor" stroke-width="2"><path d="M16 1v5m0 21v4M1 17h5m20 0h5M5 5l4 4m15 15 4 4M5 29l4-4M24 9l4-4"/></g>',
      clock:'<circle cx="16" cy="16" r="13"/><path d="M16 6v11h8" fill="none" stroke="#d32b20" stroke-width="2"/>',
      ticket:'<path d="M3 7h26v7c-6 0-6 4 0 4v7H3v-7c6 0 6-4 0-4Z"/><path d="m11 23 10-14" stroke="#fff8e2" stroke-width="2"/><circle cx="11" cy="11" r="2" fill="#fff8e2"/><circle cx="21" cy="21" r="2" fill="#fff8e2"/>',
      heart:'<path d="M16 29C-3 17 0 3 8 3c5 0 8 4 8 4s3-4 8-4c8 0 11 14-8 26Z"/>',
      crown:'<path d="m3 23-2-15 9 7 6-13 6 13 9-7-2 15Z" fill="none" stroke="currentColor" stroke-width="2"/>'
    };
    return `<svg class="mini-icon" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${paths[kind]||paths.burger}</svg>`;
  }
  const foodAsset = model.foodAsset;
  let input = window.MTYPE_DEMO_DATA, source = documentData ? documentData.source : 'demo', answers = {}, previewCode = null, analyzed, toastTimer;
  function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 5500); }
  function renderQuestions() {
    if (personalMode) { $('questions').hidden = true; return; }
    const missing = analyzed.dimensions.filter(d => d.source !== 'orders');
    $('questions').hidden = !missing.length;
    if (!missing.length) return;
    const prompts = model.choices;
    $('questions').innerHTML = `<h2>再聊两口，补全你的麦门身份。</h2><p>部分记录不足以确定倾向。补充回答只影响人格，不会补造订单、金额或历史事件。</p>` + missing.map(d => `<fieldset><legend>${prompts[d.index][0]}</legend>${prompts[d.index].slice(1).map(([value,label]) => `<label><input type="radio" name="dimension-${d.index}" data-dimension="${d.index}" value="${value}" ${answers[d.index] === value ? 'checked' : ''}>${label}</label>`).join('')}</fieldset>`).join('');
    $('questions').querySelectorAll('input').forEach(radio => radio.addEventListener('change', () => { answers[radio.dataset.dimension] = radio.value; previewCode = null; render(); }));
  }
  function render() {
    analyzed = personalMode ? documentData.report : core.analyze(input, answers);
    renderQuestions();
    const code = previewCode || analyzed.code;
    const p = code && byCode[code];
    $('sourcePill').textContent = source === 'demo' ? '● 演示数据 · 非真实订单' : source === 'mcp' ? '● 麦当劳 MCP · 本次查询记录' : personalMode ? '● 个人档案 · 基于导入记录' : '● 导入记录 · 当前浏览器分析';
    $('previewNotice').hidden = !previewCode;
    $('showAmount').disabled = !analyzed.amountComplete;
    if (!analyzed.amountComplete) $('showAmount').checked = false;
    if (!p) { $('report').innerHTML = `<div class="folio"><div class="folio-brand">M-TYPE</div><div class="arches-badge">${logo()}</div></div><div class="empty"><h1>你的快乐，还差几条线索。</h1><p>完成上方补充回答，就能解锁人格与档案。</p><p>当前有 ${analyzed.count} 笔有效记录；缺失的信息会保持缺失。</p></div>`; $('exportButton').disabled = true; return; }
    $('exportButton').disabled = false;
    const r = analyzed, top = r.ranked[0];
    const copy = personalMode ? documentData.copy : model.copyFor(r);
    const sourceLabel = source === 'demo' ? '演示数据 · 非真实订单' : source === 'mcp' ? '麦当劳 MCP · 查询记录' : '导入订单记录';
    const provenance = documentData?.provenance;
    const noList = provenance?.outcome === 'no_list_returned';
    const coverageLabel = source === 'mcp' ? noList ? '本次未返回订单列表，不代表历史订单为零' : '仅覆盖本次接口返回记录，非完整历史' : '仅覆盖所提供记录';
    const itemNote = source === 'mcp' ? '按名称去重 · 套餐不拆分' : '按餐品标识去重';
    const dateRange = r.from ? `${r.from.replaceAll('-','.')} — ${r.to.replaceAll('-','.')}` : noList ? '本次未取得订单列表' : '暂无可用历史记录';
    const money = $('showAmount').checked && r.amountComplete;
    const dimensions = previewCode ? [...p.code].map((code,index) => ({code,index,source:'preview',evidence:'当前为人格角色设定预览，非订单分析结论'})) : r.dimensions;
    const stats = [{value:r.count,label:source==='mcp'?'笔有效记录':'次麦门相遇',note:noList?'本次未返回列表':'有效订单',icon:'bag'}, {value:r.uniqueFoods,label:source==='mcp'?'种餐品 / 套餐':'种餐品入场',note:itemNote,icon:'burger'}, {value:r.night,label:'次夜间快乐',note:'18:00 后的订单',icon:'moon'}];
    if (money) stats.push({value:r.amount.toFixed(2),label:'元实付合计',note:'全部有效记录金额完整',icon:'ticket'});
    const maxBin = Math.max(...r.bins.map(b => b.count),1);
    $('report').style.backgroundImage = `linear-gradient(90deg, rgba(255,246,222,.28), rgba(255,246,222,.65) 10%, rgba(255,246,222,.6) 90%, rgba(255,246,222,.28)), url("${assets.paper}")`;
    $('report').innerHTML = `${decorative('fries','report-fries-peek')}${decorative('bag','report-bag-peek')}
      <header class="folio"><div class="folio-brand">M-TYPE<small>麦门人格档案</small><span>THE HAPPY LITTLE ARCHIVE</span></div><div class="folio-note">把快乐，存成一份档案。</div><div class="folio-meta"><span>PERSONALITY & MEMORIES<br>${escape(sourceLabel)}</span><div class="arches-badge">${logo()}</div></div></header>
      <section class="hero"><div class="hero-arches">${logo('#ffd139')}</div>${decorative('heroScene','hero-store-scene')}<div class="hero-pedestal"></div><div class="hero-copy-crown">${icon('crown')}</div><span class="hero-spark a" aria-hidden="true">✦</span><span class="hero-spark b" aria-hidden="true">✦</span><div class="hero-side-note" aria-hidden="true">美味，总在这一刻发光。</div><div class="hero-copy"><div class="eyebrow">${previewCode ? '麦门人格 · 角色预览' : '你的专属麦门身份'}</div><div class="type-code">${p.code}</div><h1><span>${escape(p.name.slice(0,4))}</span><span>${escape(p.name.slice(4))}</span></h1><p class="tagline">${p.tagline}</p><div class="chips">${[...p.code].map(letter => `<span class="chip">${names[letter]}</span>`).join('')}</div><div class="hero-handnote" aria-hidden="true">I'm lovin' it ♡</div></div><div class="hero-visual"><img class="character" id="characterImage" src="${escape(p.image)}" alt="${p.name}复古角色插画"><div class="hero-seal">快乐存档<br><strong>M-TYPE</strong>你的这一型</div></div></section>
      <div class="ticker">${logo()}<span class="ticker-star" aria-hidden="true">✦</span><span>每一份订单，都藏着你的麦门故事。</span><span class="ticker-en">EVERY BITE TELLS A LITTLE STORY</span><span class="ticker-star" aria-hidden="true">✦</span></div>
      <section class="archive"><div class="section-head"><div><span class="section-kicker">01 / YOUR LITTLE HISTORY</span><h2>时光档案，快乐有迹可循。</h2></div><span class="period">${dateRange}</span><span class="archive-scribble" aria-hidden="true">Happy little memories</span></div>
      <div class="stats ${money?'four':''}">${stats.map(s=>`<div class="stat"><span class="stat-icon">${icon(s.icon)}</span><div><strong>${s.value}</strong><span class="stat-label">${s.label}</span><small>${s.note}</small></div></div>`).join('')}</div>
      <p class="story">${escape(copy.summary)}</p>
      ${r.count ? `<div class="data-duo"><section><h3 class="data-title">偏爱，会在记录里留下名字。</h3><p class="data-caption">${escape(copy.favoriteCaption)}</p><div class="favorite"><div class="favorite-copy"><small>${icon('crown')} ${escape(copy.favoriteEyebrow)}</small><h3>${escape(top.name)}</h3><p>${escape(copy.favoriteNote)}</p></div><span class="favorite-handnote" aria-hidden="true">One bite,<br>big joy.</span>${decorative(foodAsset(top.name),'favorite-food')}</div><ol class="ranking">${r.ranked.slice(0,5).map((f,i)=>`<li><div class="rank-line"><span><b>${String(i+1).padStart(2,'0')}</b>${escape(f.name)}</span><span>${f.quantity} 份</span></div><div class="rank-track"><div class="rank-fill" style="width:${Math.round(f.quantity/top.quantity*100)}%"></div></div></li>`).join('')}</ol></section>
      <section><h3 class="data-title">快乐，也有自己的出场时间。</h3><p class="data-caption">按北京时间统计 · 一笔订单计一次</p><div class="histogram">${r.bins.map((b,i)=>`<div class="bin ${b.count===maxBin?'peak':''}"><small>${b.count}次</small><div class="bar" style="height:${b.count/maxBin*83}px"></div>${icon(i===0||i===5?'moon':'sun')}<span>${b.label}</span><em>${b.range}</em></div>`).join('')}</div><div class="time-callout"><span class="time-icon">${icon('clock')}</span><div class="time-text">${escape(copy.timeIntro)}<strong>「${escape(copy.timePeak)}」</strong>${escape(copy.timeSuffix)}<br>${escape(copy.timeDetail)}</div><span class="time-scribble" aria-hidden="true">Happy hour,<br>my hour ♡</span></div></section></div>
      <section class="timeline-section"><span class="section-kicker">02 / LITTLE STOPS ALONG THE WAY</span><h3 class="data-title" style="margin-top:8px">翻一翻，这几次快乐停靠。</h3><p class="data-caption">${escape(copy.timelineCaption)}</p><div class="timeline">${r.timeline.map(t=>`<div class="moment"><time datetime="${t.date}">${t.date.slice(5).replace('-','.')}</time><span class="moment-year">${t.date.slice(0,4)}</span><h3>${t.title}</h3><p>${escape(t.food)}</p></div>`).join('')}</div>${decorative('fries','timeline-fries')}<span class="timeline-note" aria-hidden="true">Small moments,<br>big happiness.</span></section>` : '<p class="time-callout">这一页先留白，下一次点餐，会成为故事的开始。</p>'}
      <section class="evidence"><div class="section-head"><div><span class="section-kicker">03 / BEHIND YOUR M-TYPE</span><h3 class="data-title" style="margin-top:8px">这一型，怎么来的？</h3></div><span class="period">${previewCode?'角色设定预览':'每个倾向都有来源'}</span></div><div class="evidence-grid">${dimensions.map(d=>`<div class="dimension"><div class="dimension-line"><span class="dimension-letter">${d.code}</span><b>${names[d.code]}</b><span class="dimension-source">${d.source==='orders'?'订单依据':d.source==='preview'?'设定预览':'补充回答'}</span></div><span class="dimension-food-icon">${icon(d.index===0?'burger':d.index===1?'ticket':d.index===2?(d.code==='N'?'moon':'sun'):'heart')}</span><p>${escape(d.evidence)}</p></div>`).join('')}</div></section></section>
      <div class="closing"><span class="closing-note" aria-hidden="true">I'm lovin' it ♡</span><div class="closing-copy"><p>快乐不用很大，<br>有喜欢的那一口，就很好。</p><small>${escape(p.tagline)}</small></div>${decorative('footerScene','closing-store-scene')}<span class="closing-side-note" aria-hidden="true">MORE GOOD FOOD<br>A BRIGHTER YOU</span></div>
      <footer class="report-footer"><span>${escape(sourceLabel)} · ${escape(coverageLabel)}${r.omitted?' · 已排除 '+r.omitted+' 笔重复或无效记录':''}<br>餐品图为风格示意 · 趣味消费画像，非心理测评 · 独立开发作品，非麦当劳官方产品</span><span>M-TYPE / ${p.code}<br>把快乐，存成一份档案。</span></footer>`;
    $('characterImage').addEventListener('error', () => toast('角色图片还未就绪，请稍后刷新。'), {once:true});
  }
  async function exportReport(download = true) {
    if (!analyzed.code && !previewCode) throw new Error('请先完成缺失的偏好回答。');
    if (!window.htmlToImage) throw new Error('图片导出组件未加载，请使用完整离线 HTML 或运行 npm install。');
    const mobile = window.innerWidth <= 700;
    const exportWidth = mobile ? Math.round($('report').getBoundingClientRect().width) : 900;
    const host = document.createElement('div'); host.className='export-host'; host.style.width=exportWidth+'px';
    const clone = $('report').cloneNode(true); clone.classList.add(mobile?'export-mobile':'export-layout'); clone.style.width=exportWidth+'px'; clone.removeAttribute('id'); clone.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id')); host.appendChild(clone); document.body.appendChild(host);
    try {
      await document.fonts.ready;
      await Promise.all([...clone.querySelectorAll('img')].map(async image => { await image.decode(); if (!image.naturalWidth) throw new Error('角色图片尚未加载完成。'); }));
      const dataUrl = await window.htmlToImage.toPng(clone, {pixelRatio:mobile?3:2, width:exportWidth, height:Math.ceil(clone.getBoundingClientRect().height), skipFonts:true, backgroundColor:'#fff5dd', cacheBust:false});
      if (download) { const link=document.createElement('a'); link.download=`M-TYPE-${previewCode||analyzed.code}-${source==='demo'?'演示档案':'麦门档案'}.png`; link.href=dataUrl; link.click(); }
      return dataUrl;
    } finally {host.remove();}
  }
  $('exportButton').addEventListener('click', async () => { const button=$('exportButton'); button.disabled=true; button.textContent='正在装订快乐…'; try{ await exportReport(); toast('长图已生成；手机可在下载记录中保存到相册。'); }catch(error){toast('导出失败：'+error.message);}finally{button.textContent='保存长图 ↗';button.disabled=!analyzed.code&&!previewCode;} });
  $('showAmount').addEventListener('change',render);
  $('resetPreview').addEventListener('click',()=>{previewCode=null;render();});
  $('resetDemo').addEventListener('click',()=>{input=window.MTYPE_DEMO_DATA;source='demo';answers={};previewCode=null;$('showAmount').checked=false;render();toast('已恢复演示数据。');});
  $('importFile').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>2*1024*1024)throw new Error('订单文件不能超过 2 MB。');const next=JSON.parse(await file.text());core.normalize(next);input=next;source='import';answers={};previewCode=null;$('showAmount').checked=false;render();toast('已分析导入记录，文件未上传。');}catch(error){toast('导入失败：'+error.message);}finally{event.target.value='';}});
  const gallery=$('gallery');
  $('galleryGrid').innerHTML=personalities.map(p=>`<button class="gallery-card" data-code="${p.code}"><img src="${escape(p.image)}" alt="${p.name}" loading="lazy"><b>${p.code}</b><span>${p.name}</span><small>${p.tagline}</small></button>`).join('');
  $('galleryGrid').querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{previewCode=button.dataset.code;render();gallery.close();$('report').scrollIntoView({behavior:'smooth',block:'start'});}));
  $('galleryButton').addEventListener('click',()=>gallery.showModal());$('closeGallery').addEventListener('click',()=>gallery.close());
  gallery.addEventListener('click',event=>{if(event.target===gallery){const bounds=gallery.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)gallery.close();}});
  window.MTypeApp={exportReport,getReport:()=>analyzed,loadData(next,nextAnswers={}){if(personalMode)throw new Error('个人档案已固定，请使用生成入口更新数据。');core.normalize(next);input=next;source='import';answers=nextAnswers;previewCode=null;render();},preview(code){if(personalMode)throw new Error('个人档案不提供角色预览切换。');if(!byCode[code])throw new Error('未知人格代码');previewCode=code;render();}};
  if (personalMode) {
    $('showAmount').checked = documentData.showAmount;
    $('galleryButton').hidden = true;
    document.querySelector('label[for="importFile"]').hidden = true;
    document.querySelector('.below-controls').hidden = true;
    document.querySelector('.page-note').textContent = '独立开发创意作品，非麦当劳官方产品。人格是趣味消费画像。';
    document.title = 'M-TYPE · ' + byCode[documentData.report.code].name;
  }
  render();
})();
