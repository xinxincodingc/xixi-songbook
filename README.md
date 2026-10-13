# xixi 的点歌平台

奶油白、墨黑与酒红色的响应式点歌网站，支持手机和电脑。

- 219 首歌曲，包含 6 首原创单曲；按原唱歌手和曲风筛选、搜索、分页。
- 使用提供的真实照片，黑胶持续旋转，可暂停，并尊重系统减少动画设置。
- 最多选择 5 首，选择保存在当前浏览器；可填写昵称、桌号和留言。
- 点歌直接显示在网站里的“今日点歌单”，按北京时间每日切换。
- **当前线上为本机记录模式**：存储在当前浏览器，不同设备之间不共享，xixi 的手机无法看到其他访客的记录。页面和提交窗口明确显示此限制。
- 已提供 Cloudflare Workers + D1 共享点歌服务代码，配置服务地址后即可切换为多人共享模式，每 15 秒刷新。该服务尚未部署，不能把当前页面当作已接通的多人点歌服务。
- `admin.html` 提供管理员登录、歌曲新增/编辑/下架和修改密码。共享服务未连接时不可登录；接通后保存会更新所有访客的曲库。
- 不提供音频播放或歌手管理后台。邮箱仅保留为演出合作联系方式。
- 原唱不确定的歌曲显示“原唱待确认”。歌单在 songs.js 中维护。

## 本地打开

直接打开 index.html，或在此目录执行：

```bash
python3 -m http.server 4173
```

访问 http://localhost:4173。剪贴板 API 在 HTTPS 或 localhost 下可用，其他环境提供复制回退。

## GitHub Pages

网站：https://xinxincodingc.github.io/xixi-songbook/

仓库：https://github.com/xinxincodingc/xixi-songbook

使用 `main` 分支的根目录发布 GitHub Pages，无需构建和额外依赖。
更新网页、歌单或图片后，提交并推送至 `main`，GitHub Pages 会自动重新发布。
图片和脚本均使用相对路径，适配 GitHub Pages 的仓库子路径。

这是第三方免费托管地址，不同地区的网络可达性可能不同。

## 已验证

Chrome 验证：歌曲搜索、分类、点歌增删、本机提交、刷新后保存、跨日不显示前一天记录、留言安全显示。
320px、390px、430px 手机宽度无横向溢出，标题与黑胶并排，歌名 16px，点歌按钮 44px。“THE SONGBOOK” 21px。

## 文件

- index.html：页面
- styles.css：设计及响应式布局
- songs.js：歌单与分类
- app.js：分类、选歌与今日点歌提交
- mobile.css：手机布局及今日点歌单设计
- queue-config.js：共享服务公开地址（当前未配置）
- queue-service/：待部署的共享点歌后端
- admin.html / admin.js / admin.css：手机歌单管理后台
- assets/：照片及网站图标
