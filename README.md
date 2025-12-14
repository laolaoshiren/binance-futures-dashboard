# Binance Futures Dashboard

> 币安合约记录展示系统 | A real-time Binance Futures trading dashboard

一个基于 Node.js 和 Express 的币安合约交易记录可视化系统，提供实时账户信息、持仓、交易历史等数据的展示。

A Node.js and Express-based Binance Futures trading record visualization system that provides real-time account information, positions, trading history, and more.

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
git clone <repository-url>
cd binance-futures-dashboard
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**

创建 `.env` 文件并配置以下内容：
```env
BINANCE_API_KEY=your_api_key
BINANCE_API_SECRET=your_api_secret
PORT=3000
```

4. **启动服务**
```bash
npm start
```

5. **访问应用**

打开浏览器访问：`http://localhost:3000`

## 🐳 Docker 部署

### 使用 Docker Compose（推荐）

```bash
docker-compose up -d
```

### 使用 Docker 命令

```bash
# 构建镜像
docker build -t binance-futures-viewer .

# 运行容器
docker run -d \
  --name binance-viewer \
  -p 3000:3000 \
  -e BINANCE_API_KEY=your_api_key \
  -e BINANCE_API_SECRET=your_api_secret \
  binance-futures-viewer
```

### 一键安装脚本（生产环境）

```bash
# 下载并运行一键安装脚本
curl -fsSL https://raw.githubusercontent.com/your-repo/install.sh | bash

# 或使用 wget
wget -qO- https://raw.githubusercontent.com/your-repo/install.sh | bash
```

安装脚本会自动：
- 检查 Docker 环境
- 拉取最新镜像
- 配置环境变量
- 启动服务

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
| `BINANCE_API_KEY` | 币安API密钥 | 是 | - |
| `BINANCE_API_SECRET` | 币安API密钥 | 是 | - |
| `PORT` | 服务端口 | 否 | 3000 |

### 安全建议

1. **API密钥权限**：建议只授予"读取"权限，不要授予交易权限
2. **IP白名单**：在币安API设置中配置IP白名单
3. **环境变量**：生产环境使用环境变量或密钥管理服务，不要提交到代码仓库

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

## 📄 许可证 | License

MIT License

## ⚠️ 免责声明 | Disclaimer

本工具仅供学习和研究使用，使用本工具进行交易产生的任何损失，开发者不承担任何责任。请谨慎使用API密钥，确保账户安全。

This tool is for educational and research purposes only. The developers are not responsible for any losses incurred from using this tool for trading. Please use API keys with caution and ensure account security.

