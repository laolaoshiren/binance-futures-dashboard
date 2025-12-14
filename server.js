const express = require('express');
const path = require('path');
const {
  getAccountInfo,
  getPositions,
  getTradeHistory,
  getOrderHistory,
  getIncomeHistory
} = require('./binanceAPI');

const app = express();
const PORT = process.env.PORT || 3000;

// 静态文件服务
app.use(express.static('public'));

// API路由
app.get('/api/account', async (req, res) => {
  try {
    const data = await getAccountInfo();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

app.get('/api/positions', async (req, res) => {
  try {
    const data = await getPositions();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

app.get('/api/trades', async (req, res) => {
  try {
    const { symbol, limit } = req.query;
    const data = await getTradeHistory(symbol, limit ? parseInt(limit) : 50);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const { symbol, limit } = req.query;
    const data = await getOrderHistory(symbol, limit ? parseInt(limit) : 50);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

app.get('/api/income', async (req, res) => {
  try {
    const { limit } = req.query;
    const data = await getIncomeHistory(limit ? parseInt(limit) : 100);
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
});
