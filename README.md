# Binance Futures Dashboard

[![GitHub](https://img.shields.io/github/license/laolaoshiren/binance-futures-dashboard)](https://github.com/laolaoshiren/binance-futures-dashboard)
[![GitHub stars](https://img.shields.io/github/stars/laolaoshiren/binance-futures-dashboard)](https://github.com/laolaoshiren/binance-futures-dashboard/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/laolaoshiren/binance-futures-dashboard)](https://github.com/laolaoshiren/binance-futures-dashboard/network)

> 币安合约记录展示系统 | A real-time Binance Futures trading dashboard 

**项目地址**: [https://github.com/laolaoshiren/binance-futures-dashboard](https://github.com/laolaoshiren/binance-futures-dashboard)

一个基于 Node.js 和 Express 的币安合约交易记录可视化系统，提供实时账户信息、持仓、交易历史等数据的展示。

A Node.js and Express-based Binance Futures trading record visualization system that provides real-time account information, positions, trading history, and more.

## 🚀 一键安装（生产环境推荐）

```bash
# 使用 curl
curl -fsSL https://raw.githubusercontent.com/laolaoshiren/binance-futures-dashboard/main/install.sh | bash

# 或使用 wget
wget -qO- https://raw.githubusercontent.com/laolaoshiren/binance-futures-dashboard/main/install.sh | bash
```

> ⚠️ **注意**：
> - 安装脚本会自动检查 Docker 环境、从 GitHub Container Registry 拉取预构建镜像并启动服务
> - 镜像由 GitHub Actions 自动构建，每次代码推送都会自动更新
> - 启动后需要在网页上配置 API Key 和 Secret 才能使用
> - 如果镜像尚未构建，请访问 [GitHub Actions](https://github.com/laolaoshiren/binance-futures-dashboard/actions) 查看构建状态

## ✨ 功能特性

- 📊 **实时账户信息** - 查看账户余额、可用余额、未实现盈亏等
- 📈 **持仓管理** - 实时查看当前持仓情况
- 📝 **交易历史** - 查看历史交易记录，支持分页和时间筛选
- 📋 **订单历史** - 查看所有订单记录
- 💰 **收益记录** - 查看收益历史明细
- 📅 **盈亏日历** - 可视化展示每日盈亏情况
- 🎨 **现代化UI** - 美观的渐变主题界面

## 🚀 快速开始

### 环境要求

- Node.js >= 14.0.0
- npm 或 yarn

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/laolaoshiren/binance-futures-dashboard.git
cd binance-futures-dashboard
```

2. **安装依赖**
```bash
npm install
```

3. **启动服务**
```bash
npm start
```

4. **访问应用**

打开浏览器访问：`http://localhost:3031`

5. **配置 API**

- 点击页面右上角的 **"⚙️ 设置"** 按钮
- 输入您的币安 API Key 和 Secret
- 点击 **"保存配置"** 或 **"测试连接"** 验证配置
- 配置成功后即可使用系统功能

> 💡 **提示**：API 密钥仅存储在浏览器会话中，不会保存到服务器，关闭浏览器后需要重新配置。

## 🐳 Docker 部署

### 使用预构建镜像（推荐）

项目使用 GitHub Actions 自动构建 Docker 镜像并推送到 GitHub Container Registry。

**使用 Docker Compose：**

```bash
# 下载 docker-compose.yml
curl -fsSL https://raw.githubusercontent.com/laolaoshiren/binance-futures-dashboard/main/docker-compose.yml -o docker-compose.yml

# 拉取并启动服务
docker-compose pull
docker-compose up -d
```

**使用 Docker 命令：**

```bash
# 拉取镜像
docker pull ghcr.io/laolaoshiren/binance-futures-dashboard:latest

# 运行容器
docker run -d \
  --name binance-futures-viewer \
  -p 3031:3031 \
  ghcr.io/laolaoshiren/binance-futures-dashboard:latest
```

### 本地构建（开发环境）

如果需要本地构建镜像：

```bash
# 构建镜像
docker build -t binance-futures-viewer .

# 运行容器
docker run -d \
  --name binance-viewer \
  -p 3031:3031 \
  binance-futures-viewer
```

### 一键安装脚本

一键安装命令已移至文档最上方，请查看 [🚀 一键安装](#-一键安装生产环境推荐) 部分。

## 📖 API 接口

### 账户信息
```
GET /api/account
```

### 持仓信息
```
GET /api/positions
```

### 交易历史
```
GET /api/trades?symbol=BTCUSDT&limit=50
```

### 订单历史
```
GET /api/orders?symbol=BTCUSDT&limit=50
```

### 收益记录
```
GET /api/income?limit=100
```

## 🔧 配置说明

### 环境变量

| 变量名 | 说明 | 必填 | 默认值 |
|--------|------|------|--------|
| `PORT` | 服务端口 | 否 | 3031 |

### API 配置说明

- **配置方式**：在网页上通过设置界面配置，无需环境变量
- **存储方式**：API 密钥存储在浏览器会话（Session）中，关闭浏览器后需要重新配置
- **安全性**：密钥不会保存到服务器或数据库，仅在当前会话中有效

### 安全建议

1. **API密钥权限**：建议只授予"读取"权限，不要授予交易权限
2. **IP白名单**：在币安API设置中配置IP白名单
3. **会话安全**：使用 HTTPS 访问以保护会话安全
4. **定期更换**：定期更换 API 密钥以提高安全性

## 📁 项目结构

```
binance-futures-dashboard/
├── binanceAPI.js      # 币安API封装 | Binance API wrapper
├── server.js          # Express服务器 | Express server
├── package.json       # 项目配置 | Project configuration
├── Dockerfile         # Docker镜像配置 | Docker image configuration
├── docker-compose.yml # Docker Compose配置 | Docker Compose configuration
├── install.sh         # 一键安装脚本 | One-click installation script
├── public/            # 前端静态文件 | Frontend static files
│   ├── index.html     # 主页面 | Main page
│   └── app.js         # 前端逻辑 | Frontend logic
└── README.md          # 项目文档 | Project documentation
```

## 🛠️ 开发

### 开发模式

使用 `nodemon` 进行开发，支持热重载：

```bash
npm run dev
```

### 构建生产版本

```bash
npm install --production
```

## 📝 更新日志 | Changelog

### v1.0.0
- 初始版本发布 | Initial release
- 支持账户信息、持仓、交易历史查看 | Support for account info, positions, and trading history
- 支持盈亏日历可视化 | Profit/loss calendar visualization
- Docker 部署支持 | Docker deployment support
- GitHub Actions CI/CD 配置 | GitHub Actions CI/CD configuration

## 🤝 贡献 | Contributing

欢迎提交 Issue 和 Pull Request！

Contributions are welcome! Please feel free to submit a Pull Request.

- 📦 项目地址：[https://github.com/laolaoshiren/binance-futures-dashboard](https://github.com/laolaoshiren/binance-futures-dashboard)
- 🐛 问题反馈：[Issues](https://github.com/laolaoshiren/binance-futures-dashboard/issues)
- 💡 功能建议：[Pull Requests](https://github.com/laolaoshiren/binance-futures-dashboard/pulls)

## 📄 许可证 | License

MIT License

## ⚠️ 免责声明 | Disclaimer

本工具仅供学习和研究使用，使用本工具进行交易产生的任何损失，开发者不承担任何责任。请谨慎使用API密钥，确保账户安全。

This tool is for educational and research purposes only. The developers are not responsible for any losses incurred from using this tool for trading. Please use API keys with caution and ensure account security.

