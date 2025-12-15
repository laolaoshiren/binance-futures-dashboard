const express = require('express');
const path = require('path');
const session = require('express-session');
const {
  getAccountInfo,
  getPositions,
  getTradeHistory,
  getOrderHistory,
  getIncomeHistory
} = require('./binanceAPI');

const app = express();
const PORT = process.env.PORT || 3031;

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session 配置
app.use(session({
  secret: 'binance-futures-dashboard-secret-key-' + Date.now(),
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: false, // 生产环境使用 HTTPS 时设为 true
    maxAge: 24 * 60 * 60 * 1000 // 24小时
  }
}));

// 静态文件服务（禁用缓存以确保开发时获取最新文件）
app.use(express.static('public', {
  etag: false,
  lastModified: false,
  setHeaders: (res, path) => {
    if (path.endsWith('.js') || path.endsWith('.html')) {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    }
  }
}));

// 检查 API 配置的中间件
function checkApiConfig(req, res, next) {
  if (!req.session.apiKey || !req.session.apiSecret) {
    return res.status(401).json({ 
      success: false, 
      error: 'API 配置未设置，请先在设置页面配置 API Key 和 Secret' 
    });
  }
  next();
}

// API 配置接口
app.post('/api/config', (req, res) => {
  const { apiKey, apiSecret } = req.body;
  
  if (!apiKey || !apiSecret) {
    return res.status(400).json({ 
      success: false, 
      error: 'API Key 和 Secret 不能为空' 
    });
  }
  
  // 保存到 session
  req.session.apiKey = apiKey;
  req.session.apiSecret = apiSecret;
  
  res.json({ 
    success: true, 
    message: 'API 配置已保存' 
  });
});

// 获取配置状态
app.get('/api/config/status', (req, res) => {
  res.json({ 
    success: true, 
    configured: !!(req.session.apiKey && req.session.apiSecret),
    hasApiKey: !!req.session.apiKey
  });
});

// 清除配置
app.post('/api/config/clear', (req, res) => {
  req.session.apiKey = null;
  req.session.apiSecret = null;
  res.json({ 
    success: true, 
    message: 'API 配置已清除' 
  });
});

// API路由 - 需要先配置 API
app.get('/api/account', checkApiConfig, async (req, res) => {
  try {
    const data = await getAccountInfo(req.session.apiKey, req.session.apiSecret);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

app.get('/api/positions', checkApiConfig, async (req, res) => {
  try {
    const data = await getPositions(req.session.apiKey, req.session.apiSecret);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

app.get('/api/trades', checkApiConfig, async (req, res) => {
  try {
    const { symbol, limit } = req.query;
    const data = await getTradeHistory(
      req.session.apiKey, 
      req.session.apiSecret, 
      symbol, 
      limit ? parseInt(limit) : 50
    );
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

app.get('/api/orders', checkApiConfig, async (req, res) => {
  try {
    const { symbol, limit } = req.query;
    const data = await getOrderHistory(
      req.session.apiKey, 
      req.session.apiSecret, 
      symbol, 
      limit ? parseInt(limit) : 50
    );
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

app.get('/api/income', checkApiConfig, async (req, res) => {
  try {
    const { limit } = req.query;
    const data = await getIncomeHistory(
      req.session.apiKey, 
      req.session.apiSecret, 
      limit ? parseInt(limit) : 100
    );
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

// 首页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 币安合约记录展示系统已启动`);
  console.log(`📊 访问地址: http://localhost:${PORT}`);
  console.log(`⏰ 启动时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`💡 提示: 请在网页上配置 API Key 和 Secret 后使用`);
});
