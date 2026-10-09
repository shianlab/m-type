# 运行、输入与交付

下面命令在完整 Skill 包根目录执行；`/path/to/...` 由 Agent 替换成真实绝对路径，用户不需要手填。每次生成创建新输出目录，避免同人格文件被覆盖。脚本目录不依赖当前用户的机器路径。

## 无需 npm 的 HTML 路径

```sh
node scripts/doctor.cjs
node scripts/render.cjs --input examples/day-researcher.json --out /path/to/demo
```

该示例是合成数据，保持 `source: "demo"`。正式本人报告不使用示例填补历史。所有图片与 html-to-image 1.11.13 已在完整包内，Node 20+ 可离线生成 HTML；无需 npm install。

## 本人 MCP 响应

```sh
node scripts/mcp-normalize.cjs --list /path/to/private/list.json --out /path/to/private/normalized.json
```

非空响应还需 `--details /path/to/private/details.json`，格式为 `{ "实际订单ID": { "structuredContent": { ...完整业务响应... } } }`。遵守 [MCP 契约](mcp-contract.md) 核验选项后再使用；绝不复制例子的省略号为数据。

```sh
node scripts/analyze.cjs --input /path/to/private/normalized.json --out /path/to/private/analysis.json
```

读取 analysis 的 `status` 和 `questions`，不能以退出码 0 判断人格已经确定。缺失时询问本人，答案文件格式为维度索引到选项的对象，如 `{"0":"C","1":"S"}`；这仅为格式，不是默认答案。

```sh
node scripts/answer.cjs --input /path/to/private/normalized.json --answers /path/to/private/answers.json --out /path/to/private/answered.json
```

支持部分回答；仍 `needs_answers` 就继续问剩余问题。下一轮以 answered.json 为输入，输出新文件。拒绝覆盖已有回答/订单依据，不接收人格代码或文案覆盖。

```sh
node scripts/render.cjs --input /path/to/private/answered.json --out /path/to/report
```

分析已 ready 则直接以 normalized.json 渲染，无需答案文件。

## PNG

先用 doctor 检测，宿主已有可用 Playwright 时复用。可将 `MTYPE_PLAYWRIGHT_PATH` 指向已安装的 Playwright 包、`MTYPE_BROWSER_PATH` 指向兼容浏览器；不在公共说明里写开发机路径。

需要另装浏览器且宿主允许安装依赖时，在该 Skill 包内运行：

```sh
npm ci --ignore-scripts
npx --no-install playwright install chromium
node scripts/render.cjs --input /path/to/private/answered.json --out /path/to/report --png both
```

这一步需下载依赖/浏览器，HTML 生成不需要。安装失败仍交付 HTML，在浏览器打开后点“保存长图”。已有 HTML 可单独重试：

```sh
node scripts/export.cjs --html /path/to/report/M-TYPE-CSDV.html --out /path/to/report --layout both
```

渲染退出码 0 且 `ready` 为成功；2/`html_ready_png_failed` 表示 HTML 已好但自动 PNG 失败；1 表示输入错误/缺回答等未生成。PNG 路径不存在就不能说已完成。

## 手动导入的数据契约

顶层为 `schemaVersion:1, source:"import", showAmount:false, orders:[], answers:{}`。订单字段：id 用于内部去重；orderedAt 必须带时区；status 为 completed/paid/delivered/finished；items 包含 productName、整数 quantity，可选 tags 为 classic/explorer。未知 tags 省略或空数组。可选 CNY 的 amount、discountAmount 不知则省略，不能补 0。实际 MCP 必须经适配器产生一致 provenance，不能给导入数据改 source 冒充查询。

至少 5 笔有效订单才采用订单证据。C/E 标签份数覆盖 ≥70%；S/F 已知优惠 ≥5 笔且覆盖 ≥70%；D/N 以北京时间 18:00 分界；L/V 前三餐品份数占比 ≥65% 判 L。维度不足才问答，来源在成品内显示。

交付前检查人格代码、角色、来源、有效条数、最早/最近日期及证据说明；打开 HTML 或浏览器截图验证版面与图片。报告 JSON 为派生展示数据；不要公开私人文件。固定模板不附原始订单或凭证。
