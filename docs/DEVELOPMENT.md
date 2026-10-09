# 开发与构建

项目首页见 [README](../README.md)，安装使用 [完整 Release 包](https://github.com/shianlab/m-type/releases/tag/v0.3.0)。下面保留源码开发、输入契约与统计规则。

```sh
npm ci
npm run render -- --input examples/day-researcher.json --out output/my-report
```

自动导出图片可在安装 Chromium 后加 `--png both`；完整 16 型演示仍使用下面的构建与预览方式。

## 看成果

完成构建后，双击 `output/M-TYPE-麦门人格档案.html` 即可离线打开；16 个角色、样式、演示订单与图片导出组件均内嵌，无需服务或网络。

也可以本地预览：

```sh
npm install
npm start
```

打开 `http://127.0.0.1:4173/template/index.html`。手机与电脑均有对应布局；电脑导出 900px 排版的 2 倍清晰度长图，手机导出保留当前手机排版并采用 3 倍清晰度。浏览器下载图片后可保存到相册。

```sh
npm test
npm run build
```

## 页面能力

- 初始档案显著标记演示数据，不伪称真实 MCP 分析。
- 「16 型人格」可预览角色；预览与实际分析结论有明确区分。
- 「导入订单」接受下述规范化 JSON，文件仅在浏览器内处理，不上传、不永久保存。
- 部分维度证据不足时显示补充问题；没有订单也能问答生成人格，但历史档案保持空白。
- 金额默认不显示，只有全部有效订单的 CNY 实付金额都已知时才允许展示。
- 「保存长图」只导出报告，不包含操作按钮、导入文件、地址、手机号、Token 或订单号。

## 数据结构

```json
{
  "orders": [
    {
      "id": "用于去重的内部标识",
      "orderedAt": "2026-09-01T21:30:00+08:00",
      "status": "completed",
      "currency": "CNY",
      "amount": 24.9,
      "discountAmount": 5,
      "items": [
        { "productName": "巨无霸", "quantity": 1, "tags": ["classic"] }
      ]
    }
  ]
}
```

`id`、带时区的 `orderedAt`、`status` 和 `items` 必需；商品可额外提供 `productId`。有效状态为规范化后的 `completed`、`paid`、`delivered`、`finished`，其他状态排除。不得直接套用未经核验的官方状态字段。

`amount`、`currency`、`discountAmount` 和 `tags` 允许省略。未知金额、优惠不能补为 0。经典/新品标签为 `classic`/`explorer`，应来自真实目录或经核验的标注，不从商品名任意猜测。

## 初始规则

至少 5 笔有效订单才使用订单证据。C/E 由带标签餐品的购买份数计算，标签覆盖需达到 70%；S/F 由优惠记录计算，已知优惠至少 5 笔且覆盖达到 70%；D/N 以北京时间 18:00 分界；L/V 以前三餐品份数占比 65% 分界。样本不足时改用对应问答并注明来源。没有心理测评置信度。

标签并列时 C、优惠比例等于 50% 时 S、白日夜间并列时 D、前三份数等于 65% 时 L。规则为初版可调整参数，不是官方标准。

## 文件

- `assets/personalities-retro-v1/*.png`：16 张真实透明背景 PNG。
- `assets/personalities-retro-v1/manifest.json`：代码、名称、宣言、角色描述和完整生图提示词。
- `template/`：可编辑 HTML、CSS、JS 与演示订单。
- `assets/report-decor-v1/`：复古纸张拼贴背景、页首/页尾门店场景、透明餐品素材和完整提示词。
- `output/`：离线 HTML 与验证导出的长图。
- `MCP_INTEGRATION.md`：官方接口核对结果、真实数据接入契约与未联调边界。

Skill 使用宿主原生 MCP 读取本人授权的记录，再交给同一模板与规则引擎。公开仓库为 https://github.com/shianlab/m-type；预览版保留真实兼容性边界。

```sh
npm run package:skill
npm run test:skill
```

## README 展示图与案例复现

```sh
npx --no-install playwright install chromium
npm run showcase
npm run package:cases
```

`showcase` 由固定模板重新生成 4 个模拟案例、两种长图和 README 展示图；合成记录在 examples 中，统计清单在 [cases.json](cases.json)。展示图源程序为 `scripts/publish-showcase.cjs`，可重复构建。
