# 四个模拟生成案例

[返回首页](../README.md) · [下载全部离线 HTML 与两种 PNG](https://github.com/shianlab/m-type/releases/download/v0.3.0/m-type-demo-cases-0.3.0.zip)

全部案例使用合成订单或模拟回答，非真实用户记录。每个案例都通过同一套固定模板生成，人格与统计由脚本计算。长图可点击查看原尺寸。

![案例总览](images/case-wall.png)

## 01 · 深夜经典守护者

**CSNL** — 经典餐品、优惠优先、晚间相遇与熟悉的复购。

2026.09.01—09.24，共 24 笔模拟订单。巨无霸与薯条均为 18 份，排行如实注明并列；18:00 后共 19 笔。

[模拟输入 JSON](../examples/night-guardian.json) · [完整手机长图](images/night-guardian-mobile.png)

![深夜经典守护者报告首屏](images/night-guardian-hero.png)

<details>
<summary>展开查看手机完整长图</summary>

<img src="images/night-guardian-mobile.png" alt="深夜经典守护者完整模拟档案" width="390">

</details>

## 02 · 白日菜单研究员

**CSDV** — 经典偏爱，也喜欢把菜单换着研究。

2026.09.01—09.19，共 10 笔模拟订单、10 种餐品，8 笔在白日。多样的主项份数使其落在 V 维度。

[模拟输入 JSON](../examples/day-researcher.json) · [完整手机长图](images/day-researcher-mobile.png)

![白日菜单研究员报告首屏](images/day-researcher-hero.png)

<details>
<summary>展开查看手机完整长图</summary>

<img src="images/day-researcher-mobile.png" alt="白日菜单研究员完整模拟档案" width="390">

</details>

## 03 · 全能麦门体验官

**EFDV** — 随心尝鲜，让不同的新口味轮流登场。

2026.09.03—09.18，共 16 笔模拟订单、12 种餐品，白日 13 笔。全部新品标签和商品名称均为模拟信息，不代表官方现售菜单。

[模拟输入 JSON](../examples/sunshine-explorer.json) · [完整手机长图](images/sunshine-explorer-mobile.png)

![全能麦门体验官报告首屏](images/sunshine-explorer-hero.png)

<details>
<summary>展开查看手机完整长图</summary>

<img src="images/sunshine-explorer-mobile.png" alt="全能麦门体验官完整模拟档案" width="390">

</details>

## 04 · 午夜麦门探索者

**EFNV** — 还没有记录，也可以先收下一个属于你的角色。

0 笔订单。四维来自预先写好的模拟偏好回答，历史区为空；没有编造餐品、时间线或消费金额。实际使用时必须等待本人选择。

[模拟输入 JSON](../examples/empty-with-answers.json) · [完整手机长图](images/empty-with-answers-mobile.png)

![午夜麦门探索者报告首屏](images/empty-with-answers-hero.png)

<details>
<summary>展开查看手机完整长图</summary>

<img src="images/empty-with-answers-mobile.png" alt="午夜麦门探索者完整模拟档案" width="390">

</details>

## 重新生成

安装开发依赖后，在仓库根目录运行：

```sh
npm ci
npx --no-install playwright install chromium
npm run showcase
npm run package:cases
```

只生成其中一个案例：

```sh
npm run render -- --input examples/sunshine-explorer.json --out output/sunshine --png both
```
