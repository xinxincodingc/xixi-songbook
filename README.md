# xixi 的点歌平台

奶油白、墨黑与酒红色的响应式点歌网站，支持手机和电脑。

- 219 首歌曲，包含 6 首原创单曲；按原唱歌手和曲风筛选、搜索、分页。
- 使用提供的真实照片，黑胶持续旋转，可暂停，并尊重系统减少动画设置。
- 最多选择 5 首，选择保存在当前浏览器；可填写昵称、桌号和留言。
- 点击发送会打开访客的邮箱应用，并预填发送给 cwx0516@outlook.com 的点歌邮件；需要访客在邮箱内完成发送。
- 提供复制点歌内容按钮。当前没有服务端实时队列、自动发信、音频播放或歌手管理后台。
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

Chrome 本地验证：歌曲搜索、原唱筛选、欧美分类、点歌增删、刷新后保存、昵称/桌号/留言的完整复制、黑胶暂停。
320px 和 390px 手机宽度无横向溢出，桌面页面和全部照片正常加载，未出现 JavaScript 运行错误。

## 文件

- index.html：页面
- styles.css：设计及响应式布局
- songs.js：歌单与分类
- app.js：交互与邮件点歌
- assets/：照片及网站图标
