# 安装麦门人格档案

当前为 **v0.3.0 公开预览版**。仓库：https://github.com/shianlab/m-type 。

从 [Release v0.3.0](https://github.com/shianlab/m-type/releases/tag/v0.3.0) 下载 [完整 Skill ZIP](https://github.com/shianlab/m-type/releases/download/v0.3.0/m-type-0.3.0.zip) 和 [SHA256SUMS](https://github.com/shianlab/m-type/releases/download/v0.3.0/SHA256SUMS)。不要把 GitHub 自动的 Source code ZIP 当作完整安装包。

`skill/m-type/` 是编写源，代码与图片由构建装配；不能只复制它安装。WorkBuddy/Codex 的原生安装与全流程仍待客户端实测。

## 给执行安装的 Agent

1. 识别宿主和系统，确认本次用户要求安装。先读取包内 `SKILL.md` 与当前客户端说明，查看实际安装位置及已有同名技能。不要用 Codex 的目录代替 WorkBuddy 的导入流程。
2. 从用户指定的可信发布来源取得指定版本 ZIP 与 SHA256SUMS，核对 SHA-256。校验值只校验完整性，不能替代可信来源或签名。解压前检查只有 `m-type/` 根目录、无绝对路径、`..` 或符号链接；忽略 `._*`、`.DS_Store` 元数据。
3. 解压到临时目录；完整包有 SKILL.md、scripts、references、template、assets、vendor 和 package-manifest.json。需要本地 Node 20+；HTML 路径不需要 npm install。运行包内安装器校验每个文件并写入明确目标，或使用宿主提供的导入功能。
4. 有同名版本时先检查。安装器在相同未修改版本上直接返回 already_installed；不同或修改过的版本不会覆盖。更新需要先说明差异并备份旧版，再按已授权范围替换；保留无关技能、配置、凭证。
5. 运行 doctor 验证 16 个角色、8 个装饰和 HTML 组件。文件就位仅表示本地安装完成；随后在宿主启用并按需重载，确认实际发现 `m-type`。最后说“生成我的麦门人格档案”，按 Skill 引导连接 MCP。

## Codex 本地路径安装

先确认实际技能根目录（有自定义 CODEX_HOME 时使用其 skills；通常是用户的 `.codex/skills`）。不要修改任何 MCP 配置来完成 Skill 文件安装。下面占位路径由 Agent 替换为实际路径：

```sh
node /path/to/unpacked/m-type/scripts/install-skill.cjs --source /path/to/unpacked/m-type --target /path/to/codex/skills
node /path/to/codex/skills/m-type/scripts/doctor.cjs
```

安装器要求显式目标，没有默认写入全局目录的行为。MCP 接入使用包内 `references/clients/codex.md`，是另一步；安装成功不意味着账号已授权。

## WorkBuddy

官方说明提供“添加技能 → 上传技能”的本地技能包入口，可导入 ZIP 后确认启用。此预览包的客户端导入、限制与自然语言触发仍待第四阶段实测；不要对外宣称已经兼容通过。[官方技能说明](https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Skills-Market)

MCP 接入按 `references/clients/workbuddy.md` 引导本人填写 Token。Skill ZIP 不包含专用连接器和账号授权，不把 Token 发到聊天。

## 可复制的安装请求

```text
请从 https://github.com/shianlab/m-type 安装「麦门人格档案」Skill：先阅读 INSTALL.md，下载 v0.3.0 Release 的完整 Skill 安装包，按当前 Agent 的方式安装并自检，再引导我连接麦当劳官方 MCP，生成我的麦门人格与时光档案。
```

无需用户记住脚本或接口名；本人登录和填写 Token 仍由本人完成。

## 开发者重新打包

在仓库根目录运行 `npm ci`，再运行 `npm run package:skill`。生成 ZIP、解包目录与 SHA256SUMS；只复制白名单源码、合成示例与所需素材，不复制 `.local`、output、node_modules 或开发联调 Token 客户端。`npm run test:skill` 验证实际 ZIP、独立安装与离线出图。
