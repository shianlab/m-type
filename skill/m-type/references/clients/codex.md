# Codex

先使用当前会话的工具发现能力找麦当劳服务。未加载时查看 MCP 配置入口，避免直接输出整个配置。CLI 能力以本机 `codex mcp add --help` 为准；2026-10-09 本机确认支持 URL 与 Bearer 环境变量引用。

用户授权新增麦当劳服务后、且不存在同名/同 URL 服务时，可使用不带 Token 值的命令：

```sh
codex mcp add mcd --url https://mcp.mcd.cn --bearer-token-env-var MCD_MCP_TOKEN
```

此命令会写入 MCP 配置，不能当作无副作用检查执行。它只保存环境变量名，不会替用户填写 Token。本人需通过安全的环境注入方式让 **Codex 宿主进程** 取得 `MCD_MCP_TOKEN`；在工具子进程里临时设置不会反向传给已启动桌面应用。若桌面应用提供凭证输入界面，优先使用该界面；不可用时明确这项条件，不退回聊天收密钥或明文 shell 历史。

需要时重载 MCP 或开启新会话，再发现工具并查询。`codex mcp login` 的 OAuth 不能替代官方的 Token 申请流程。独立开发客户端成功也不代表本会话原生 MCP 已配置。

本地安装使用仓库 INSTALL.md 的显式目标目录流程；离线包也带有 `scripts/install-skill.cjs --source 包根目录 --target 宿主技能父目录`，先确认宿主实际技能目录再执行。不要修改无关服务或 ECC 配置。当前包的独立执行已验证；Codex 自动发现与原生 MCP 联动将在第四阶段实测。
