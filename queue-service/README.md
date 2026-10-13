# 共享今日点歌服务

此服务尚未部署，需要一个可部署 Cloudflare Workers 和 D1 的账号。
GitHub Pages 继续承载前端，本服务只保存和读取点歌记录；不会把任何管理密钥放进网页。

在本目录执行：

```bash
npx wrangler d1 create xixi-daily-requests
```

把返回的 `database_id` 填入 `wrangler.toml`，然后执行：

```bash
npx wrangler d1 execute xixi-daily-requests --remote --file schema.sql
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET
npx wrangler deploy
```

将部署返回的 Workers 公开 URL 填入上级 `queue-config.js` 的 `window.XIXI_QUEUE_API`，提交并推送至 GitHub 即可。
首次部署后打开 `admin.html`，用设置的管理员密码登录，保存初始歌单以启用访客点歌。
`SESSION_SECRET` 使用至少 32 字节的随机字符串。密码和签名密钥仅保存为 Worker Secret，不提交 GitHub。
管理页面支持新增歌曲、编辑歌名/原唱/曲风、下架和修改密码。修改密码后会立即使所有旧登录会话失效。
保存使用版本检查，避免两台设备同时编辑时覆盖对方的更新。
服务支持 `GET /requests` 和 `POST /requests`，按服务器北京时间过滤当日点歌，后台每天清除七天前的记录。
所有访客都能看到歌曲、昵称、桌号和留言。每日每个网络地址限制 30 次提交，提交间隔至少 10 秒。多次重试同一个请求 ID 不会重复插入。

上线验收必须使用两台设备或两个独立浏览器：

1. 第一台提交一首歌曲，第二台刷新后看到相同歌曲、昵称、桌号、留言。
2. 刷新页面数据仍存在；失败提交保留已选曲目并提示重试。
3. 到北京时间次日只显示新一天记录，前一天数据仍保留于数据库供短期恢复。

服务代码已提供，以上真实远程验收尚未执行，不能视为已上线。

2026-10-13 本地真实 Worker + SQLite 已验证：两个独立浏览器读取相同点歌；管理员新增歌曲后访客可以点歌；未登录写入返回 401；修改密码成功、旧令牌失效、新密码可以登录。远程部署仍等待 Cloudflare 登录授权。
