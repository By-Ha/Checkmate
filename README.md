# Checkmate
- Checkmate!: 一个仿generals.io的小游戏,generals->将军->checkmate(雾

## Demo 

- [戳我打开Demo](http://175.24.85.24:8080), 没有守护所以可能并不在正常工作.

## 食用指南
- 安装nodejs
- 安装git
- 执行`git clone https://github.com/By-Ha/Checkmate.git`
- 切换目录`cd Checkmate/`
- 安装依赖`npm install`
- 创建`db_data.js`,按照如下格式填写您的数据库账号密码:
    - `mysql.createConnection({host: '数据库host(localhost)',user: '访问数据库用户名',password: '数据库密码',database: '数据库名'});`
- 更改`public/client.js`第一行的ip到您的服务器的ip
- 执行`node index.js`
- 打开`http://YourServerIpAdress:8080`开始玩耍
- `http://YourServerIpAdress:8080/editor`为地图编辑器,导出后放入`public/maps/Mapsize`里即可自定义地图.

## 更新日志

- V2.2.0 2020年4月19日 增加了沙雕bot,由于强度不够,沙雕bot的皇冠产兵速度为2倍. 

- V2.1.0 更改地图储存模式,不使用base64,增加地图名和作者,地图名使用unicode储存.

- V2.0.0 重写了部分代码(后端).

- V1.0.0 更新了所有的基础功能.