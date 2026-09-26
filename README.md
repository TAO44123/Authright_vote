# Authright_Voting

面向约 30–40 人活动的中文匿名投票网站。任何人都能发起限时单选投票，发布后获得公开投票链接和私密结果管理链接。参与者投票后可看当前结果，截止后所有人可看最终结果；管理员后台保留全部历史和操作记录。

当前状态（2026-09-26）：**已部署到 AWS Lightsail，正式网站为 https://vote.authright.com**。GitHub Actions 构建并发布镜像，服务器按固定镜像版本更新；本次手机端时间框与箭头修复已上线。线上健康检查、HTTPS、管理员登录及已有数据检查通过，实际 iPhone／微信浏览器仍需复验。发布、备份与回退步骤见[部署文档](docs/部署文档.md)。匿名浏览器身份只能提供基础防重复，清除 Cookie 或换设备仍可能再次投票。

## 本地运行

需要 Node.js 24、npm。首次运行：

```bash
npm ci
cp .env.example .env.local
```

把 `.env.local` 中的 `VOTER_SECRET` 换成随机值（例如运行 `openssl rand -hex 32`），然后：

```bash
npm run db:migrate
npm run admin:init
npm run dev
```

开发服务监听 `0.0.0.0:3000`，就绪后自动预热投票接口。等终端显示“投票接口预热完成”再分享链接，可避免首次投票等待接口编译。只在本机使用时，打开 [http://127.0.0.1:3000](http://127.0.0.1:3000)。要让同一局域网的手机和电脑访问，先把 `.env.local` 中的 `APP_ORIGIN` 改为这台电脑的局域网地址，例如 `http://192.168.1.10:3000`，重启开发服务，然后从该地址打开网站。分享页、复制链接和二维码都会使用 `APP_ORIGIN`。管理员登录入口在 `/admin/login`。

如果电脑的局域网 IP 改变，更新 `APP_ORIGIN` 并重启服务。其他设备需连接同一网络，且本机防火墙需允许 3000 端口。局域网预览使用 HTTP；正式公开部署仍应使用 HTTPS。

修改投票接口代码后，开发服务可能重新编译它；可运行 `npm run dev:prewarm` 手动再次预热。预热只会得到 405 响应，不会写入选票。开发服务固定使用 3000 端口（或 `PORT` 指定的端口），端口被占用时会报错，不会悄悄启动到另一个端口。

## 检查与备份

```bash
npm run check
npm test
npm run build
npm run db:backup
```

数据库默认位于 `data/voting.sqlite`，备份默认位于 `backups/`，两者均不纳入版本控制。生产部署请阅读[操作文档](docs/操作文档.md)；备份任务、站外副本和恢复演练需由部署者配置。当前“复制投票链接”复制的是完整 URL；聊天中的题目分享卡片尚未实现。

## 文档

- [设计文档](docs/设计文档.md)：产品规则、权限、数据模型与验收。
- [视觉规范](docs/视觉规范.md)：当前的浅色系统实验室风格及响应式规则。
- [部署文档](docs/部署文档.md)：生产环境、镜像发布、更新、验证与回退。
- [操作文档](docs/操作文档.md)：使用、开发、部署、备份和恢复。
- [项目状态](docs/项目状态.md)：已实现功能、验证结果与待办事项。

技术栈：Next.js 16、React 19、TypeScript、Tailwind CSS 4、SQLite、better-sqlite3、Zod；无 Prisma。`Dockerfile`、`compose.yml` 和 `Caddyfile` 对应单机 Docker Compose + Caddy 部署。
