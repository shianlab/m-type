# WorkBuddy

先查看“已安装”的技能并确认启用。同名技能已存在时不要重复导入或覆盖。官方入口为“添加技能 → 上传技能 → 选择本地技能包”；本项目 ZIP 的实际兼容性和包大小限制需在第四阶段验证，不能仅凭文档宣称已安装成功。[官方技能说明](https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Skills-Market)

MCP 优先复用用户已接好的麦当劳连接器。没有时进入当前客户端的连接器配置界面，查看其是否提供麦当劳连接器或自定义 MCP；按界面填写官方 URL、Streamable HTTP 和凭证。先查看实际界面/官方帮助，不猜菜单或把 Codex TOML 写进 WorkBuddy。

需要本人输入的 Token 留在宿主凭证入口。WorkBuddy 平台也提供 Token 表单连接器开发方案，但此 ZIP 是通用 Skill，未附经过客户端验证的专用连接器包。若当前界面无法配置所需传输或请求头，明确停在接入步骤，提供[官方连接器说明](https://open.workbuddy.cn/docs/connector)；不让用户将 Token 发进聊天。

接入后回到任务检查麦当劳工具并按实际 Schema 调用。界面显示“已连接”还需成功只读查询验证。若 Node 或文件写入不可用，先说明运行能力缺口，不假称已出图。
