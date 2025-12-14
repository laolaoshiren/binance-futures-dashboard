const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const API_KEY = process.env.BINANCE_API_KEY;
const API_SECRET = process.env.BINANCE_API_SECRET;
const BASE_URL = 'https://fapi.binance.com';

// 服务器时间偏移量
let timeOffset = 0;

// 获取服务器时间并计算偏移量
async function syncServerTime() {
  try {
    const response = await axios.get(`${BASE_URL}/fapi/v1/time`);
    const serverTime = response.data.serverTime;
    const localTime = Date.now();
    timeOffset = serverTime - localTime;
    console.log(`⏰ 时间同步成功，偏移量: ${timeOffset}ms`);
  } catch (error) {
    console.error('时间同步失败:', error.message);
  }
}

// 获取同步后的时间戳
function getSyncedTimestamp() {
  return Date.now() + timeOffset;
}

// 生成签名
function generateSignature(queryString) {
  return crypto
    .createHmac('sha256', API_SECRET)
    .update(queryString)
    .digest('hex');
}

// 初始化时同步时间
syncServerTime();
// 每小时重新同步一次
setInterval(syncServerTime, 3600000);

// 获取账户信息
async function getAccountInfo() {
  try {
    const timestamp = getSyncedTimestamp();
    const queryString = `timestamp=${timestamp}`;
    const signature = generateSignature(queryString);
    
    const response = await axios.get(`${BASE_URL}/fapi/v2/account`, {
      headers: {
        'X-MBX-APIKEY': API_KEY
      },
      params: {
        timestamp,
        signature
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('获取账户信息失败:', error.response?.data || error.message);
    throw error;
  }
}

// 获取持仓信息
async function getPositions() {
  try {
    const timestamp = getSyncedTimestamp();
    const queryString = `timestamp=${timestamp}`;
    const signature = generateSignature(queryString);
    
    const response = await axios.get(`${BASE_URL}/fapi/v2/positionRisk`, {
      headers: {
        'X-MBX-APIKEY': API_KEY
      },
      params: {
        timestamp,
        signature
      }
    });
    
    // 只返回有持仓的数据
    return response.data.filter(pos => parseFloat(pos.positionAmt) !== 0);
  } catch (error) {
    console.error('获取持仓信息失败:', error.response?.data || error.message);
    throw error;
  }
}

// 获取交易历史
async function getTradeHistory(symbol = '', limit = 50) {
  try {
    const timestamp = getSyncedTimestamp();
    let queryString = `timestamp=${timestamp}&limit=${limit}`;
    if (symbol) {
      queryString = `symbol=${symbol}&${queryString}`;
    }
    const signature = generateSignature(queryString);
    
    const params = {
      timestamp,
      signature,
      limit
    };
    
    if (symbol) {
      params.symbol = symbol;
    }
    
    const response = await axios.get(`${BASE_URL}/fapi/v1/userTrades`, {
      headers: {
        'X-MBX-APIKEY': API_KEY
      },
      params
    });
    
    return response.data;
  } catch (error) {
    console.error('获取交易历史失败:', error.response?.data || error.message);
    throw error;
  }
}

// 获取订单历史
async function getOrderHistory(symbol = '', limit = 50) {
  try {
    const timestamp = getSyncedTimestamp();
    let queryString = `timestamp=${timestamp}&limit=${limit}`;
    if (symbol) {
      queryString = `symbol=${symbol}&${queryString}`;
    }
    const signature = generateSignature(queryString);
    
    const params = {
      timestamp,
      signature,
      limit
    };
    
    if (symbol) {
      params.symbol = symbol;
    }
    
    const response = await axios.get(`${BASE_URL}/fapi/v1/allOrders`, {
      headers: {
        'X-MBX-APIKEY': API_KEY
      },
      params
    });
    
    return response.data;
  } catch (error) {
    console.error('获取订单历史失败:', error.response?.data || error.message);
    throw error;
  }
}

// 获取收益历史
async function getIncomeHistory(limit = 100) {
  try {
    const timestamp = getSyncedTimestamp();
    const queryString = `timestamp=${timestamp}&limit=${limit}`;
    const signature = generateSignature(queryString);
    
    const response = await axios.get(`${BASE_URL}/fapi/v1/income`, {
      headers: {
        'X-MBX-APIKEY': API_KEY
      },
      params: {
        timestamp,
        signature,
        limit
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('获取收益历史失败:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  getAccountInfo,
  getPositions,
  getTradeHistory,
  getOrderHistory,
  getIncomeHistory
};
