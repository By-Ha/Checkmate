# Checkmate
- Checkmate!: 一个仿generals.io的小游戏,generals->将军->checkmate(雾

## Demo

- [戳我打开Demo](http://175.24.85.24:8080), 没有守护所以可能并不在正常工作.

## 食用指南
- 您要是问为什么这么多步骤而且不弄自动建表等,我只能说我~~不会~~懒.
- 安装nodejs
- 安装git
- 执行`git clone https://github.com/By-Ha/Checkmate.git`
- 切换目录`cd Checkmate/`
- 安装依赖`npm install`
- 建立一个数据库并导入`/database/database_struct.sql`,此文件为数据表的结构
- 在`/database`下创建`database_data.js`,按照如下格式填写您的数据库账号密码:
    - `mysql.createConnection({host: '数据库host(localhost)',user: '访问数据库用户名',password: '数据库密码',database: '数据库名'});`
- 在`/cos`下创建`cos_data.js`,按照如下格式填写您的腾讯云COS的SecretId和SecretKey:
    - `new COS({SecretId: '您的SecretId',SecretKey: '您的SecretKey'});`
- 更改`public/js/game/client.js`第一行的ip到您的服务器的ip.
- 执行`npm start`.
- 打开`http://YourServerIpAdress:8080`开始玩耍.
- 注意,玩耍前请注册一个名字为`admin`的账户,并确保其`id=1`以免引起不必要的意外.
- 注意,`username`为`admin`可以对所有的微博进行前台管理,请务必确保设置强密码.
- ~~`http://YourServerIpAdress:8080/editor`为地图编辑器,导出后放入`public/maps/Mapsize`里即可自定义地图.~~
- 上面一条没了.

## 无法游玩?
- Q: 打不开网页?
    - A: 请看看有没有启动,启动后有没有报错, 8080和3002端口是否开启.

- Q: 如何建数据库?
    - A: 建议上宝塔

- Q: 腾讯云COS是什么?
    - A: 请回退到V2.2版本安装吧.

- Q: 什么垃圾游戏,好不容易安装了Bug这么多?
    - A: 是啊,哪个傻子写的!

- Q: 玩的时候卡死了?
    - A: 我也希望找到个人帮我写写优化啊,我是真的~~不会~~懒啊.

- Q: 你这操作逻辑和`Generals.io`不一样啊?
    - A: 咋的,没看见我说我是真的~~不会~~懒啊.

- Q: 仍然没有解决?
    - A: 请提issue.

## 更新日志

- V3.0.0 2020年5月2日 删除了沙雕bot(解决Bug),更换了巨强的外包装(真的只是包装),增加了多房间支持(稳定性有待考究).

- V2.2.0 2020年4月19日 增加了沙雕bot,由于强度不够,沙雕bot的皇冠产兵速度为2倍.

- V2.1.0 更改地图储存模式,不使用base64,增加地图名和作者,地图名使用unicode储存.

- V2.0.0 重写了部分代码(后端).

- V1.0.0 更新了所有的基础功能.