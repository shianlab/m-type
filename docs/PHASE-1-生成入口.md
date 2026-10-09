# 第一阶段：固定模板，按数据生成个人档案

用户已认可的 `retro-v1` 视觉作为固定模板。保留纸张拼贴、金拱门、门店场景、字体、颜色、区块顺序和响应式布局。每次生成只替换人格、角色、相关宣言、统计数字、图表、时间线与依据文案。

## 1. 直接生成

需要 Node.js 20 或更新版本。首次准备依赖：

```sh
npm ci
npm run doctor
```

从规范化订单生成一个可离线打开的个人 HTML：

```sh
npm run render -- --input examples/day-researcher.json --out output/my-report
```

输出包括：

- `M-TYPE-CSDV.html`：自包含个人档案，角色和装饰均内嵌。
- `M-TYPE-CSDV.json`：实际用于渲染的派生统计与文案，不是原始订单。

同一输出目录内的同类型成品会被覆盖。为不同用户或不同次生成指定不同的 `--out` 目录；不要把成品输出指向输入文件。

## 2. 同时导出电脑和手机长图

首次安装浏览器：

```sh
npx playwright install chromium
```

一次完成分析、HTML 和两种 PNG：

```sh
npm run render -- --input examples/day-researcher.json --out output/my-report --png both
```

也可将 `both` 替换为 `desktop` 或 `mobile`。手机采用 390px 浏览器布局；当前报告宽度为 362px，输出 3 倍图像；电脑报告为 900px 排版，输出 2 倍图像。页面高度随内容自然变化。

已有 HTML 可以单独重试导出：

```sh
npm run export -- --html output/my-report/M-TYPE-CSDV.html --layout both
```

浏览器不可用时，生成命令保留已完成的 HTML，返回 `html_ready_png_failed` 和退出码 2。可以直接打开 HTML，使用页面的“保存长图”，也可以准备好浏览器后运行独立导出命令。浏览器驱动采用 [Playwright Library](https://playwright.dev/docs/library)。

宿主若提供已有浏览器或托管 Playwright，可分别用 `MTYPE_BROWSER_PATH` 与 `MTYPE_PLAYWRIGHT_PATH` 指定绝对路径。仓库不硬编码开发者电脑路径；默认采用项目依赖与 Playwright 标准安装位置。

## 3. 输入契约

输入文件最多 8 MB，最多 5000 笔订单。基本格式：

```json
{
  "schemaVersion": 1,
  "source": "import",
  "showAmount": false,
  "orders": [
    {
      "id": "local-order-1",
      "status": "completed",
      "orderedAt": "2026-09-01T12:30:00+08:00",
      "currency": "CNY",
      "amount": 24.9,
      "discountAmount": 5,
      "items": [
        { "productName": "巨无霸", "quantity": 1, "tags": ["classic"] }
      ]
    }
  ],
  "answers": { "0": "C", "1": "S", "2": "D", "3": "V" }
}
```

示例只有一笔订单，四维人格由回答补充；它不会伪装成已有足够订单证据。

| 字段 | 规则 |
| --- | --- |
| `schemaVersion` | 当前支持 1，省略时按 1 处理 |
| `source` | `demo` 为合成演示，`import` 为导入记录；默认 `import`。第二阶段新增 `mcp`，必须携带适配器生成的查询来源与范围信息，详见 MCP 联调文档 |
| `showAmount` | 默认 false；此时总金额也不嵌入成品 HTML/JSON。true 需要全部有效记录都有人民币实付金额 |
| `orders[].id` | 非空字符串，用于去重，不进入成品 |
| `status` | 规范化有效状态：completed、paid、delivered、finished；其他状态排除 |
| `orderedAt` | 可解析且包含时区的 ISO 时间；统计统一北京时间 |
| `items` | 每单 1–1000 项；餐品名 1–100 字；数量为 1–10000 的整数 |
| `productId` | 可选；同一商品优先按该标识聚合，否则按名称 |
| `amount` / `discountAmount` | 可选、非负，金额单位为人民币元；未知时省略，不能补 0 |
| `tags` | classic / explorer；缺失或冲突时不当作已知分类，不从餐品名猜测 |
| `answers` | 只补充证据不足的维度，不能覆盖充分的订单依据 |

四个回答键分别为：0 = C/E，1 = S/F，2 = D/N，3 = L/V。无缺失维度时可省略。完整问题及选项由分析命令返回。

人格代码、自由文案、HTML 和样式不属于输入接口。传入 `code`、`personality` 或 `copy` 会被拒绝；角色名称、插图、标签、宣言与证据须始终相互匹配。

## 4. Agent 后续怎么使用

先分析：

```sh
npm run analyze -- --input examples/needs-answers.json
```

分析成功返回 `status: ready` 或 `status: needs_answers`。后者携带结构化 `questions`：维度序号、问题和选项。让用户回答所缺维度，将结果写入输入的 `answers`，然后调用生成命令。分析命令本身退出码 0 表示成功完成分析，不代表人格已完整，调用者应读取 status。

未补完问题时直接生成，会返回 `needs_answers`、具体问题和退出码 1，不产生缺人格的空壳报告。输入无效返回 `error` 和退出码 1。诊断不会回显 JSON 中的秘密片段。

后续 MCP 只需把已核验的响应映射为同一个输入格式。统计逻辑、素材与页面布局共用现有实现，无需 Agent 改写 demo.js 或自由拼装网页。

## 5. 文案如何跟数据变化

- 人格身份：由订单证据与缺失维度回答计算，选择唯一预制角色和对应宣言。
- 主要餐品：按真实份数和出现订单数描述；并列第一明确说并列。
- 时间偏好：高峰时段并列时列出所有并列时段；单笔记录不宣称长期习惯。
- 少量记录：不写“反复出现”等无依据表述；单笔时间线只呈现一个节点。
- 无订单：人格可来自问答，历史、日期与时间线保持为空，文案明确来源。
- 人格依据：逐维注明订单证据或补充回答，不输出心理测评置信度。

文案均由同一份派生统计生成，正文与图表不会分别让模型猜测。视觉仍由同一套 HTML/CSS 渲染。

## 6. 个人成品与完整图鉴

`npm run build` 继续生成包含 16 张角色的完整演示图鉴。

`npm run render` 生成个人成品：只带匹配的角色和所需装饰；操作区只保留保存长图，隐藏图鉴切换、导入和演示重置，避免分享结果被混同为另一个人格预览。成品以展示统计为输入，不嵌入原始订单、内部 ID、地址、手机号、Token 或支付链接。

## 7. 验证

```sh
npm test
npm run test:generator
```

生成流程检查会生成白日、夜间和无订单样本，验证所有 16 个角色独立打包、手机与电脑排版、离线 PNG 导出、HTML 注入转义及隐藏金额。`examples/` 中均为合成数据；验证成品位于 `output/phase1/`。

现有完整图鉴回归检查：运行 `npm start` 后，在另一终端运行 `npm run test:browser`。

2026-10-09 验收：42 项逻辑与命令行测试通过；个人生成检查与完整图鉴回归通过。已用项目自身安装的 Playwright/Chromium 完成导出，不需要开发者机器专有路径。白日样例为 CSDV / 10 笔，夜间样例为 CSNL / 24 笔；两个样例均已实际生成电脑和手机 PNG。个人 HTML 约 18 MB，完整图鉴约 56 MB。
