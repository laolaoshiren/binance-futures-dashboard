// 当前活动标签
let currentTab = 'positions';
let currentTimeRange = 1; // 默认1天
let apiConfigured = false; // API 配置状态

// API 配置相关函数
async function checkApiStatus() {
  try {
    const response = await fetch('/api/config/status');
    const data = await response.json();
    apiConfigured = data.configured;
    return apiConfigured;
  } catch (error) {
    console.error('检查 API 状态失败:', error);
    return false;
  }
}

// 确保函数在全局作用域中
window.openSettings = function() {
  const modal = document.getElementById('settingsModal');
  if (!modal) {
    console.error('设置模态框未找到');
    return;
  }
  modal.style.display = 'flex';
  checkApiStatus().then(configured => {
    if (configured) {
      showConfigStatus('API 已配置', 'success');
    }
  });
};

window.closeSettings = function() {
  const modal = document.getElementById('settingsModal');
  const statusEl = document.getElementById('configStatus');
  if (modal) {
    modal.style.display = 'none';
  }
  if (statusEl) {
    statusEl.style.display = 'none';
    statusEl.className = 'config-status';
  }
};

window.saveApiConfig = async function() {
  const apiKey = document.getElementById('apiKey').value.trim();
  const apiSecret = document.getElementById('apiSecret').value.trim();
  
  if (!apiKey || !apiSecret) {
    showConfigStatus('请填写完整的 API Key 和 Secret', 'error');
    return;
  }
  
  try {
    const response = await fetch('/api/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ apiKey, apiSecret })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showConfigStatus('API 配置已保存！', 'success');
      apiConfigured = true;
      // 清空输入框
      document.getElementById('apiKey').value = '';
      document.getElementById('apiSecret').value = '';
      // 延迟关闭并刷新数据
      setTimeout(() => {
        closeSettings();
        refreshData();
      }, 1500);
    } else {
      showConfigStatus(data.error || '保存失败', 'error');
    }
  } catch (error) {
    showConfigStatus('保存失败: ' + error.message, 'error');
  }
};

window.clearApiConfig = async function() {
  if (!confirm('确定要清除 API 配置吗？')) {
    return;
  }
  
  try {
    const response = await fetch('/api/config/clear', {
      method: 'POST'
    });
    
    const data = await response.json();
    
    if (data.success) {
      showConfigStatus('API 配置已清除', 'success');
      apiConfigured = false;
      document.getElementById('apiKey').value = '';
      document.getElementById('apiSecret').value = '';
      // 清空显示的数据
      setTimeout(() => {
        location.reload();
      }, 1000);
    } else {
      showConfigStatus('清除失败', 'error');
    }
  } catch (error) {
    showConfigStatus('清除失败: ' + error.message, 'error');
  }
};

window.testApiConfig = async function() {
  const apiKey = document.getElementById('apiKey').value.trim();
  const apiSecret = document.getElementById('apiSecret').value.trim();
  
  if (!apiKey || !apiSecret) {
    showConfigStatus('请先填写 API Key 和 Secret', 'error');
    return;
  }
  
  showConfigStatus('正在测试连接...', 'success');
  
  try {
    // 先保存配置
    const saveResponse = await fetch('/api/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ apiKey, apiSecret })
    });
    
    const saveData = await saveResponse.json();
    
    if (!saveData.success) {
      showConfigStatus('保存配置失败: ' + (saveData.error || '未知错误'), 'error');
      return;
    }
    
    // 测试连接
    const testResponse = await fetch('/api/account');
    const testData = await testResponse.json();
    
    if (testData.success) {
      showConfigStatus('✅ 连接成功！API 配置正确', 'success');
      apiConfigured = true;
    } else {
      showConfigStatus('❌ 连接失败: ' + (testData.error || 'API 密钥可能无效'), 'error');
    }
  } catch (error) {
    showConfigStatus('测试失败: ' + error.message, 'error');
  }
};

function showConfigStatus(message, type) {
  const statusEl = document.getElementById('configStatus');
  statusEl.textContent = message;
  statusEl.className = `config-status ${type}`;
  statusEl.style.display = 'block';
}

// 检查 API 配置的包装函数
async function fetchWithApiCheck(url, options = {}) {
  if (!apiConfigured) {
    const configured = await checkApiStatus();
    if (!configured) {
      throw new Error('API_NOT_CONFIGURED');
    }
    apiConfigured = true;
  }
  
  const response = await fetch(url, options);
  
  if (response.status === 401) {
    apiConfigured = false;
    const data = await response.json();
    if (data.error && data.error.includes('API 配置未设置')) {
      throw new Error('API_NOT_CONFIGURED');
    }
  }
  
  return response;
}

// 分页状态
const paginationState = {
  trades: { currentPage: 1, pageSize: 20 },
  orders: { currentPage: 1, pageSize: 20 },
  income: { currentPage: 1, pageSize: 20 }
};

// 从localStorage加载持久化数据
function loadPersistedState() {
  try {
    const saved = localStorage.getItem('binanceAppState');
    if (saved) {
      const state = JSON.parse(saved);
      currentTimeRange = state.timeRange || 1;
      if (state.pagination) {
        Object.assign(paginationState, state.pagination);
      }
      
      // 更新时间范围按钮状态
      document.querySelectorAll('.time-range-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.getAttribute('data-days')) === currentTimeRange) {
          btn.classList.add('active');
        }
      });
    }
  } catch (error) {
    console.error('加载持久化数据失败:', error);
  }
}

// 保存持久化数据
function savePersistedState() {
  try {
    const state = {
      timeRange: currentTimeRange,
      pagination: paginationState
    };
    localStorage.setItem('binanceAppState', JSON.stringify(state));
  } catch (error) {
    console.error('保存持久化数据失败:', error);
  }
}

// 生成交易对颜色 - 使用真正的随机但一致的颜色
function getSymbolColor(symbol) {
  // 使用更好的哈希算法确保颜色分散
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    const char = symbol.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  
  // 使用多个种子生成不同的随机数
  const seed1 = Math.abs(hash);
  const seed2 = Math.abs(hash >> 8);
  const seed3 = Math.abs(hash >> 16);
  
  // 生成色相值 (0-360)，确保分散
  const hue = (seed1 * 137.508) % 360; // 使用黄金角度确保分散
  
  // 饱和度: 60-85%
  const saturation = 60 + (seed2 % 26);
  
  // 亮度: 40-50%
  const lightness = 40 + (seed3 % 11);
  
  return `hsla(${Math.round(hue)}, ${saturation}%, ${lightness}%, 0.4)`;
}

// 显示加载遮罩
function showLoading() {
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.id = 'loadingOverlay';
  overlay.innerHTML = `
    <div class="spinner"></div>
    <p>正在加载数据...</p>
  `;
  document.body.appendChild(overlay);
}

// 隐藏加载遮罩
function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.remove();
  }
}

// 切换时间范围
async function changeTimeRange(days, event) {
  currentTimeRange = days;
  
  // 更新按钮状态
  document.querySelectorAll('.time-range-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  if (event && event.target) {
    event.target.classList.add('active');
  }
  
  // 保存状态
  savePersistedState();
  
  // 显示加载动画并重新加载数据
  showLoading();
  
  // 重置当前标签页的内容
  const contentDiv = document.getElementById(`${currentTab}Content`);
  if (contentDiv) {
    contentDiv.innerHTML = '<div class="loading"><div class="spinner"></div><p>加载中...</p></div>';
  }
  
  // 延迟一下让用户感知到正在加载
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // 重新加载当前标签的数据
  await loadTabData(currentTab);
  
  hideLoading();
}

// 时区偏移（UTC+8）
const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;

// 过滤时间范围内的数据（按 UTC+8 计算）
function filterByTimeRange(data, timeField = 'time') {
  if (currentTimeRange === 0) return data; // 全部数据
  
  const now = Date.now() + TZ_OFFSET_MS;
  const rangeMs = currentTimeRange * 24 * 60 * 60 * 1000;
  const startTime = now - rangeMs;
  
  return data.filter(item => {
    const itemTime = (item[timeField] || item.time || item.updateTime || item.timestamp || 0) + TZ_OFFSET_MS;
    return itemTime >= startTime;
  });
}

// 切换标签
async function switchTab(tabName, event) {
  currentTab = tabName;
  
  // 更新按钮状态
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // 找到被点击的按钮
  if (event && event.target) {
    event.target.classList.add('active');
    event.stopPropagation();
  } else {
    // 如果没有event对象，通过onclick属性查找
    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach(btn => {
      if (btn.getAttribute('onclick').includes(`'${tabName}'`)) {
        btn.classList.add('active');
      }
    });
  }
  
  // 更新内容显示
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  const tabElement = document.getElementById(tabName);
  if (tabElement) {
    tabElement.classList.add('active');
  }
  
  // 始终重新加载数据，确保使用最新的时间范围设置
  // 对于需要时间过滤的标签页（statistics, calendar, trades, orders, income），始终重新加载
  // 对于不需要时间过滤的标签页（positions），只在未加载时加载
  const contentDiv = document.getElementById(`${tabName}Content`);
  const needsTimeFilter = ['statistics', 'calendar', 'trades', 'orders', 'income'].includes(tabName);
  
  if (contentDiv) {
    if (needsTimeFilter || contentDiv.innerHTML.includes('加载中')) {
      await loadTabData(tabName);
    }
  }
}

// 格式化数字
function formatNumber(num, decimals = 2) {
  if (num === undefined || num === null) return '0.00';
  return parseFloat(num).toFixed(decimals);
}

// 格式化时间（统一使用 UTC+8）
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// 加载账户信息
async function loadAccountInfo() {
  try {
    const response = await fetchWithApiCheck('/api/account');
    if (!response) return; // API 未配置时返回
    const result = await response.json();
    
    if (result.success) {
      const data = result.data;
      
      // 更新统计卡片
      document.getElementById('totalBalance').textContent = 
        `$${formatNumber(data.totalWalletBalance)}`;
      
      document.getElementById('availableBalance').textContent = 
        `$${formatNumber(data.availableBalance)}`;
      
      const unrealizedProfit = parseFloat(data.totalUnrealizedProfit);
      const profitElement = document.getElementById('unrealizedProfit');
      profitElement.textContent = `$${formatNumber(unrealizedProfit)}`;
      profitElement.parentElement.className = unrealizedProfit >= 0 ? 'stat-card positive' : 'stat-card negative';
    }
  } catch (error) {
    console.error('加载账户信息失败:', error);
  }
}

// 加载持仓信息
async function loadPositions() {
  try {
    const response = await fetchWithApiCheck('/api/positions');
    if (!response) return; // API 未配置时返回
    const result = await response.json();
    
    const contentDiv = document.getElementById('positionsContent');
    
    if (result.success) {
      const positions = result.data;
      
      // 更新持仓数量
      document.getElementById('positionCount').textContent = positions.length;
      
      if (positions.length === 0) {
        contentDiv.innerHTML = '<p style="text-align: center; padding: 40px; color: #a0a0b0;">暂无持仓</p>';
        return;
      }
      
      let html = '<div class="table-wrapper"><table><thead><tr>';
      html += '<th>交易对</th><th>方向</th><th>持仓量</th><th>开仓均价</th><th>当前价格</th>';
      html += '<th>未实现盈亏</th><th>持仓保证金</th><th>杠杆</th></tr></thead><tbody>';
      
      positions.forEach(pos => {
        const side = parseFloat(pos.positionAmt) > 0 ? 'LONG' : 'SHORT';
        const pnl = parseFloat(pos.unRealizedProfit);
        const pnlClass = pnl >= 0 ? 'positive-value' : 'negative-value';
        const symbolColor = getSymbolColor(pos.symbol);
        
        html += `<tr>
          <td><span class="symbol-badge" style="background: ${symbolColor};">${pos.symbol}</span></td>
          <td><span class="badge ${side === 'LONG' ? 'badge-success' : 'badge-danger'}">${side === 'LONG' ? '做多' : '做空'}</span></td>
          <td>${formatNumber(Math.abs(pos.positionAmt), 4)}</td>
          <td>$${formatNumber(pos.entryPrice)}</td>
          <td>$${formatNumber(pos.markPrice)}</td>
          <td class="${pnlClass}">$${formatNumber(pnl)}</td>
          <td>$${formatNumber(pos.isolatedMargin)}</td>
          <td>${pos.leverage}x</td>
        </tr>`;
      });
      
      html += '</tbody></table></div>';
      contentDiv.innerHTML = html;
    } else {
      contentDiv.innerHTML = `<div class="error">加载失败: ${result.error.msg || result.error}</div>`;
    }
  } catch (error) {
    if (error.message === 'API_NOT_CONFIGURED') {
      document.getElementById('positionsContent').innerHTML = 
        `<div class="error">⚠️ API 未配置，请点击右上角"设置"按钮配置 API Key 和 Secret</div>`;
      return;
    }
    console.error('加载持仓信息失败:', error);
    document.getElementById('positionsContent').innerHTML = 
      `<div class="error">加载失败: ${error.message}</div>`;
  }
}

// 合并交易记录
function mergeTradesIntoPositions(trades) {
  // 按交易对和时间分组
  const groups = {};
  const merged = [];
  
  // 将交易按时间排序
  trades.sort((a, b) => a.time - b.time);
  
  // 遍历所有交易
  for (let i = 0; i < trades.length; i++) {
    const trade = trades[i];
    const symbol = trade.symbol;
    
    // 如果还没有这个交易对的分组，创建一个
    if (!groups[symbol]) {
      groups[symbol] = {
        symbol: symbol,
        openTrades: [],
        closeTrades: [],
        startTime: trade.time,
        endTime: trade.time,
        isOpen: true
      };
    }
    
    const group = groups[symbol];
    
    // 判断是开仓还是平仓
    // 如果realizedPnl不为0，说明是平仓
    if (parseFloat(trade.realizedPnl) !== 0) {
      group.closeTrades.push(trade);
      group.endTime = trade.time;
    } else {
      group.openTrades.push(trade);
      if (group.openTrades.length === 1) {
        group.startTime = trade.time;
      }
    }
    
    // 检查是否完成一轮交易（有开仓也有平仓）
    if (group.openTrades.length > 0 && group.closeTrades.length > 0) {
      // 计算总数量
      const openQty = group.openTrades.reduce((sum, t) => sum + parseFloat(t.qty), 0);
      const closeQty = group.closeTrades.reduce((sum, t) => sum + Math.abs(parseFloat(t.qty)), 0);
      
      // 如果平仓数量 >= 开仓数量，说明这一轮结束了
      if (closeQty >= openQty * 0.99) { // 允许0.01的误差
        merged.push({
          symbol: group.symbol,
          startTime: group.startTime,
          endTime: group.endTime,
          side: group.openTrades[0].side,
          openTrades: [...group.openTrades],
          closeTrades: [...group.closeTrades],
          openCount: group.openTrades.length,
          closeCount: group.closeTrades.length,
          avgOpenPrice: group.openTrades.reduce((sum, t) => sum + parseFloat(t.price) * parseFloat(t.qty), 0) / openQty,
          avgClosePrice: group.closeTrades.reduce((sum, t) => sum + parseFloat(t.price) * Math.abs(parseFloat(t.qty)), 0) / closeQty,
          totalQty: openQty,
          totalCommission: [...group.openTrades, ...group.closeTrades].reduce((sum, t) => sum + parseFloat(t.commission), 0),
          realizedPnl: group.closeTrades.reduce((sum, t) => sum + parseFloat(t.realizedPnl), 0),
          duration: group.endTime - group.startTime
        });
        
        // 重置该交易对的分组
        delete groups[symbol];
      }
    }
  }
  
  // 处理未完成的交易（只有开仓没有平仓）
  Object.values(groups).forEach(group => {
    if (group.openTrades.length > 0) {
      const openQty = group.openTrades.reduce((sum, t) => sum + parseFloat(t.qty), 0);
      const closeQty = group.closeTrades.reduce((sum, t) => sum + Math.abs(parseFloat(t.qty)), 0);
      
      merged.push({
        symbol: group.symbol,
        startTime: group.startTime,
        endTime: group.endTime,
        side: group.openTrades[0].side,
        openTrades: [...group.openTrades],
        closeTrades: [...group.closeTrades],
        openCount: group.openTrades.length,
        closeCount: group.closeTrades.length,
        avgOpenPrice: group.openTrades.reduce((sum, t) => sum + parseFloat(t.price) * parseFloat(t.qty), 0) / openQty,
        avgClosePrice: closeQty > 0 ? group.closeTrades.reduce((sum, t) => sum + parseFloat(t.price) * Math.abs(parseFloat(t.qty)), 0) / closeQty : 0,
        totalQty: openQty,
        totalCommission: [...group.openTrades, ...group.closeTrades].reduce((sum, t) => sum + parseFloat(t.commission), 0),
        realizedPnl: group.closeTrades.reduce((sum, t) => sum + parseFloat(t.realizedPnl), 0),
        duration: group.endTime - group.startTime,
        isPartial: true
      });
    }
  });
  
  // 按结束时间倒序排列
  merged.sort((a, b) => b.endTime - a.endTime);
  
  return merged;
}

// 格式化持续时间
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}天${hours % 24}小时`;
  if (hours > 0) return `${hours}小时${minutes % 60}分`;
  if (minutes > 0) return `${minutes}分${seconds % 60}秒`;
  return `${seconds}秒`;
}

// 加载统计数据
async function loadStatistics() {
  try {
    const response = await fetchWithApiCheck('/api/trades?limit=1000');
    const result = await response.json();
    
    const contentDiv = document.getElementById('statisticsContent');
    
    if (result.success) {
      let trades = result.data;
      
      if (trades.length === 0) {
        contentDiv.innerHTML = '<p style="text-align: center; padding: 40px; color: #a0a0b0;">暂无交易数据</p>';
        return;
      }
      
      // 应用时间范围过滤
      trades = filterByTimeRange(trades, 'time');
      
      if (trades.length === 0) {
        contentDiv.innerHTML = '<p style="text-align: center; padding: 40px; color: #a0a0b0;">该时间范围内暂无交易数据</p>';
        return;
      }
      
      // 合并交易记录
      const mergedTrades = mergeTradesIntoPositions(trades);
      
      if (mergedTrades.length === 0) {
        contentDiv.innerHTML = '<p style="text-align: center; padding: 40px; color: #a0a0b0;">暂无完整交易记录</p>';
        return;
      }
      
      // 计算统计数据
      const stats = {
        totalCommission: 0,
        totalPnl: 0,
        totalOpenCount: 0,
        totalCloseCount: 0,
        totalTrades: mergedTrades.length,
        profitTrades: 0,
        lossTrades: 0,
        bySymbol: {}
      };
      
      mergedTrades.forEach(trade => {
        stats.totalCommission += parseFloat(trade.totalCommission);
        stats.totalPnl += parseFloat(trade.realizedPnl);
        stats.totalOpenCount += trade.openCount;
        stats.totalCloseCount += trade.closeCount;
        
        if (parseFloat(trade.realizedPnl) > 0) {
          stats.profitTrades++;
        } else if (parseFloat(trade.realizedPnl) < 0) {
          stats.lossTrades++;
        }
        
        // 按币种统计
        if (!stats.bySymbol[trade.symbol]) {
          stats.bySymbol[trade.symbol] = {
            symbol: trade.symbol,
            pnl: 0,
            commission: 0,
            trades: 0,
            profit: 0,
            loss: 0
          };
        }
        
        const symbolStat = stats.bySymbol[trade.symbol];
        symbolStat.pnl += parseFloat(trade.realizedPnl);
        symbolStat.commission += parseFloat(trade.totalCommission);
        symbolStat.trades++;
        
        if (parseFloat(trade.realizedPnl) > 0) {
          symbolStat.profit++;
        } else if (parseFloat(trade.realizedPnl) < 0) {
          symbolStat.loss++;
        }
      });
      
      // 将bySymbol转换为数组并排序（按盈亏降序）
      const symbolStats = Object.values(stats.bySymbol).sort((a, b) => b.pnl - a.pnl);
      
      // 生成HTML
      let html = '';
      
      // 总体统计卡片
      html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px;">';
      
      html += `<div style="background: linear-gradient(145deg, #1e1e2e, #2a2a3e); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
        <div style="font-size: 0.85rem; color: #a0a0b0; margin-bottom: 8px;">总盈亏</div>
        <div style="font-size: 1.8rem; font-weight: bold; color: ${stats.totalPnl >= 0 ? '#10b981' : '#ef4444'}; text-shadow: 0 0 10px ${stats.totalPnl >= 0 ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'};">
          $${formatNumber(stats.totalPnl)}
        </div>
      </div>`;
      
      html += `<div style="background: linear-gradient(145deg, #1e1e2e, #2a2a3e); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
        <div style="font-size: 0.85rem; color: #a0a0b0; margin-bottom: 8px;">总手续费</div>
        <div style="font-size: 1.8rem; font-weight: bold; color: #f59e0b; text-shadow: 0 0 10px rgba(245,158,11,0.5);">
          $${formatNumber(stats.totalCommission)}
        </div>
      </div>`;
      
      html += `<div style="background: linear-gradient(145deg, #1e1e2e, #2a2a3e); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
        <div style="font-size: 0.85rem; color: #a0a0b0; margin-bottom: 8px;">净收益</div>
        <div style="font-size: 1.8rem; font-weight: bold; color: ${(stats.totalPnl - stats.totalCommission) >= 0 ? '#10b981' : '#ef4444'}; text-shadow: 0 0 10px ${(stats.totalPnl - stats.totalCommission) >= 0 ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'};">
          $${formatNumber(stats.totalPnl - stats.totalCommission)}
        </div>
      </div>`;
      
      html += `<div style="background: linear-gradient(145deg, #1e1e2e, #2a2a3e); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
        <div style="font-size: 0.85rem; color: #a0a0b0; margin-bottom: 8px;">总开仓笔数</div>
        <div style="font-size: 1.8rem; font-weight: bold; color: #8b5cf6; text-shadow: 0 0 10px rgba(139,92,246,0.5);">
          ${stats.totalOpenCount}
        </div>
      </div>`;
      
      html += `<div style="background: linear-gradient(145deg, #1e1e2e, #2a2a3e); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
        <div style="font-size: 0.85rem; color: #a0a0b0; margin-bottom: 8px;">交易次数</div>
        <div style="font-size: 1.8rem; font-weight: bold; color: #3b82f6; text-shadow: 0 0 10px rgba(59,130,246,0.5);">
          ${stats.totalTrades}
        </div>
      </div>`;
      
      html += `<div style="background: linear-gradient(145deg, #1e1e2e, #2a2a3e); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
        <div style="font-size: 0.85rem; color: #a0a0b0; margin-bottom: 8px;">胜率</div>
        <div style="font-size: 1.8rem; font-weight: bold; color: #10b981; text-shadow: 0 0 10px rgba(16,185,129,0.5);">
          ${stats.totalTrades > 0 ? formatNumber((stats.profitTrades / stats.totalTrades) * 100, 1) : 0}%
        </div>
      </div>`;
      
      html += `<div style="background: linear-gradient(145deg, #1e1e2e, #2a2a3e); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
        <div style="font-size: 0.85rem; color: #a0a0b0; margin-bottom: 8px;">盈亏比</div>
        <div style="font-size: 1.2rem; font-weight: bold; color: #06b6d4; text-shadow: 0 0 10px rgba(6,182,212,0.5);">
          <span style="color: #10b981;">${stats.profitTrades}</span> / <span style="color: #ef4444;">${stats.lossTrades}</span>
        </div>
      </div>`;
      
      html += '</div>';
      
      // 按币种统计
      html += '<div style="background: linear-gradient(145deg, #1e1e2e, #2a2a3e); padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 4px 15px rgba(0,0,0,0.3);">';
      html += '<h3 style="color: #8b5cf6; margin-bottom: 15px; font-size: 1.2rem; text-shadow: 0 0 10px rgba(139,92,246,0.3);">📊 各币种盈亏统计</h3>';
      html += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px;">';
      
      symbolStats.forEach(stat => {
        const symbolColor = getSymbolColor(stat.symbol);
        const pnlClass = stat.pnl >= 0 ? '#10b981' : '#ef4444';
        const netProfit = stat.pnl - stat.commission;
        
        html += `<div style="background: rgba(30,30,46,0.5); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
          <div style="margin-bottom: 8px;">
            <span class="symbol-badge" style="background: ${symbolColor}; font-size: 0.85rem;">${stat.symbol}</span>
          </div>
          <div style="font-size: 1.3rem; font-weight: bold; color: ${pnlClass}; margin-bottom: 3px;">
            $${formatNumber(stat.pnl)}
          </div>
          <div style="font-size: 0.8rem; color: ${netProfit >= 0 ? '#10b981' : '#ef4444'}; margin-bottom: 5px;">
            净收益: $${formatNumber(netProfit)}
          </div>
          <div style="font-size: 0.75rem; color: #a0a0b0;">
            ${stat.trades}笔 (<span style="color: #10b981;">${stat.profit}</span>/<span style="color: #ef4444;">${stat.loss}</span>)
          </div>
          <div style="font-size: 0.75rem; color: #f59e0b;">
            手续费: $${formatNumber(stat.commission)}
          </div>
          <div style="font-size: 0.75rem; color: #06b6d4; margin-top: 3px;">
            胜率: ${stat.trades > 0 ? formatNumber((stat.profit / stat.trades) * 100, 1) : 0}%
          </div>
        </div>`;
      });
      
      html += '</div></div>';
      
      contentDiv.innerHTML = html;
    } else {
      contentDiv.innerHTML = `<div class="error">加载失败: ${result.error.msg || result.error}</div>`;
    }
  } catch (error) {
    console.error('加载统计数据失败:', error);
    document.getElementById('statisticsContent').innerHTML = 
      `<div class="error">加载失败: ${error.message}</div>`;
  }
}

// 加载交易历史
async function loadTrades() {
  try {
    const response = await fetchWithApiCheck('/api/trades?limit=1000');
    const result = await response.json();
    
    const contentDiv = document.getElementById('tradesContent');
    
    if (result.success) {
      let trades = result.data;
      
      if (trades.length === 0) {
        contentDiv.innerHTML = '<p style="text-align: center; padding: 40px; color: #a0a0b0;">暂无交易记录</p>';
        return;
      }
      
      // 应用时间范围过滤
      trades = filterByTimeRange(trades, 'time');
      
      if (trades.length === 0) {
        contentDiv.innerHTML = '<p style="text-align: center; padding: 40px; color: #a0a0b0;">该时间范围内暂无交易记录</p>';
        return;
      }
      
      // 合并交易记录
      const mergedTrades = mergeTradesIntoPositions(trades);
      
      if (mergedTrades.length === 0) {
        contentDiv.innerHTML = '<p style="text-align: center; padding: 40px; color: #a0a0b0;">暂无完整交易记录</p>';
        return;
      }
      
      // 应用分页
      const { currentPage, pageSize } = paginationState.trades;
      const totalPages = Math.ceil(mergedTrades.length / pageSize);
      const startIdx = (currentPage - 1) * pageSize;
      const endIdx = startIdx + pageSize;
      const paginatedTrades = mergedTrades.slice(startIdx, endIdx);
      
      // 生成表格
      let html = '<div class="table-wrapper"><table><thead><tr>';
      html += '<th>开仓时间</th><th>交易对</th><th>方向</th><th>开仓笔数</th><th>平仓笔数</th>';
      html += '<th>数量</th><th>开仓均价</th><th>平仓均价</th><th>手续费</th><th>实现盈亏</th><th>持续时间</th><th>状态</th></tr></thead><tbody>';
      
      paginatedTrades.forEach(trade => {
        const pnl = parseFloat(trade.realizedPnl);
        const pnlClass = pnl >= 0 ? 'positive-value' : 'negative-value';
        const symbolColor = getSymbolColor(trade.symbol);
        const isComplete = !trade.isPartial;
        
        html += `<tr>
          <td>${formatTime(trade.startTime)}</td>
          <td><span class="symbol-badge" style="background: ${symbolColor};">${trade.symbol}</span></td>
          <td><span class="badge ${trade.side === 'BUY' ? 'badge-success' : 'badge-danger'}">${trade.side === 'BUY' ? '做多' : '做空'}</span></td>
          <td>${trade.openCount}</td>
          <td>${trade.closeCount}</td>
          <td>${formatNumber(trade.totalQty, 4)}</td>
          <td>$${formatNumber(trade.avgOpenPrice)}</td>
          <td>${trade.avgClosePrice > 0 ? '$' + formatNumber(trade.avgClosePrice) : '-'}</td>
          <td>$${formatNumber(trade.totalCommission)}</td>
          <td class="${pnlClass}">$${formatNumber(pnl)}</td>
          <td>${formatDuration(trade.duration)}</td>
          <td><span class="badge ${isComplete ? 'badge-success' : 'badge-warning'}">${isComplete ? '已完成' : '部分平仓'}</span></td>
        </tr>`;
      });
      
      html += '</tbody></table></div>';
      
      // 添加分页控件
      html += renderPagination('trades', currentPage, totalPages, mergedTrades.length);
      
      contentDiv.innerHTML = html;
    } else {
      contentDiv.innerHTML = `<div class="error">加载失败: ${result.error.msg || result.error}</div>`;
    }
  } catch (error) {
    console.error('加载交易历史失败:', error);
    document.getElementById('tradesContent').innerHTML = 
      `<div class="error">加载失败: ${error.message}</div>`;
  }
}

// 加载订单历史
async function loadOrders() {
  try {
    const response = await fetchWithApiCheck('/api/orders?limit=500');
    const result = await response.json();
    
    const contentDiv = document.getElementById('ordersContent');
    
    if (result.success) {
      let orders = result.data;
      
      if (orders.length === 0) {
        contentDiv.innerHTML = '<p style="text-align: center; padding: 40px; color: #a0a0b0;">暂无订单记录</p>';
        return;
      }
      
      // 应用时间范围过滤
      orders = filterByTimeRange(orders, 'time');
      
      if (orders.length === 0) {
        contentDiv.innerHTML = '<p style="text-align: center; padding: 40px; color: #a0a0b0;">该时间范围内暂无订单记录</p>';
        return;
      }
      
      // 倒序排列，最新的在前面
      orders.reverse();
      
      // 应用分页
      const { currentPage, pageSize } = paginationState.orders;
      const totalPages = Math.ceil(orders.length / pageSize);
      const startIdx = (currentPage - 1) * pageSize;
      const endIdx = startIdx + pageSize;
      const paginatedOrders = orders.slice(startIdx, endIdx);
      
      let html = '<div class="table-container"><table><thead><tr>';
      html += '<th>时间</th><th>交易对</th><th>类型</th><th>方向</th><th>价格</th>';
      html += '<th>数量</th><th>已成交</th><th>状态</th></tr></thead><tbody>';
      
      const statusMap = {
        'NEW': { text: '新建', class: 'badge-info' },
        'FILLED': { text: '已完成', class: 'badge-success' },
        'PARTIALLY_FILLED': { text: '部分成交', class: 'badge-warning' },
        'CANCELED': { text: '已取消', class: 'badge-danger' },
        'EXPIRED': { text: '已过期', class: 'badge-danger' }
      };
      
      paginatedOrders.forEach(order => {
        const status = statusMap[order.status] || { text: order.status, class: 'badge-info' };
        const symbolColor = getSymbolColor(order.symbol);
        
        html += `<tr>
          <td>${formatTime(order.time)}</td>
          <td><span class="symbol-badge" style="background: ${symbolColor};">${order.symbol}</span></td>
          <td>${order.type}</td>
          <td><span class="badge ${order.side === 'BUY' ? 'badge-success' : 'badge-danger'}">${order.side === 'BUY' ? '买入' : '卖出'}</span></td>
          <td>$${formatNumber(order.price)}</td>
          <td>${formatNumber(order.origQty, 4)}</td>
          <td>${formatNumber(order.executedQty, 4)}</td>
          <td><span class="badge ${status.class}">${status.text}</span></td>
        </tr>`;
      });
      
      html += '</tbody></table></div>';
      
      // 添加分页控件
      html += renderPagination('orders', currentPage, totalPages, orders.length);
      
      contentDiv.innerHTML = html;
    } else {
      contentDiv.innerHTML = `<div class="error">加载失败: ${result.error.msg || result.error}</div>`;
    }
  } catch (error) {
    console.error('加载订单历史失败:', error);
    document.getElementById('ordersContent').innerHTML = 
      `<div class="error">加载失败: ${error.message}</div>`;
  }
}

// 加载收益记录
async function loadIncome() {
  try {
    const response = await fetchWithApiCheck('/api/income?limit=500');
    const result = await response.json();
    
    const contentDiv = document.getElementById('incomeContent');
    
    if (result.success) {
      let incomes = result.data;
      
      if (incomes.length === 0) {
        contentDiv.innerHTML = '<p style="text-align: center; padding: 40px; color: #a0a0b0;">暂无收益记录</p>';
        return;
      }
      
      // 应用时间范围过滤
      incomes = filterByTimeRange(incomes, 'time');
      
      if (incomes.length === 0) {
        contentDiv.innerHTML = '<p style="text-align: center; padding: 40px; color: #a0a0b0;">该时间范围内暂无收益记录</p>';
        return;
      }
      
      // 倒序排列，最新的在前面
      incomes.reverse();
      
      // 应用分页
      const { currentPage, pageSize } = paginationState.income;
      const totalPages = Math.ceil(incomes.length / pageSize);
      const startIdx = (currentPage - 1) * pageSize;
      const endIdx = startIdx + pageSize;
      const paginatedIncomes = incomes.slice(startIdx, endIdx);
      
      let html = '<div class="table-wrapper"><table><thead><tr>';
      html += '<th>时间</th><th>交易对</th><th>类型</th><th>金额</th><th>资产</th><th>信息</th></tr></thead><tbody>';
      
      const incomeTypeMap = {
        'REALIZED_PNL': '已实现盈亏',
        'FUNDING_FEE': '资金费用',
        'COMMISSION': '手续费',
        'TRANSFER': '转账',
        'WELCOME_BONUS': '欢迎奖金',
        'INSURANCE_CLEAR': '强平清算'
      };
      
      paginatedIncomes.forEach(income => {
        const amount = parseFloat(income.income);
        const amountClass = amount >= 0 ? 'positive-value' : 'negative-value';
        const symbolColor = income.symbol ? getSymbolColor(income.symbol) : 'rgba(100, 100, 120, 0.3)';
        
        html += `<tr>
          <td>${formatTime(income.time)}</td>
          <td>${income.symbol ? `<span class="symbol-badge" style="background: ${symbolColor};">${income.symbol}</span>` : '-'}</td>
          <td>${incomeTypeMap[income.incomeType] || income.incomeType}</td>
          <td class="${amountClass}">${formatNumber(amount, 8)}</td>
          <td>${income.asset}</td>
          <td>${income.info || '-'}</td>
        </tr>`;
      });
      
      html += '</tbody></table></div>';
      
      // 添加分页控件
      html += renderPagination('income', currentPage, totalPages, incomes.length);
      
      contentDiv.innerHTML = html;
    } else {
      contentDiv.innerHTML = `<div class="error">加载失败: ${result.error.msg || result.error}</div>`;
    }
  } catch (error) {
    console.error('加载收益记录失败:', error);
    document.getElementById('incomeContent').innerHTML = 
      `<div class="error">加载失败: ${error.message}</div>`;
  }
}

// 渲染分页控件
function renderPagination(tabName, currentPage, totalPages, totalItems) {
  const pageSize = paginationState[tabName].pageSize;
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  
  return `
    <div class="pagination-container">
      <div class="page-size-selector">
        <span style="color: #a0a0b0;">每页显示：</span>
        <select onchange="changePageSize('${tabName}', this.value)">
          <option value="10" ${pageSize === 10 ? 'selected' : ''}>10条</option>
          <option value="20" ${pageSize === 20 ? 'selected' : ''}>20条</option>
          <option value="50" ${pageSize === 50 ? 'selected' : ''}>50条</option>
          <option value="100" ${pageSize === 100 ? 'selected' : ''}>100条</option>
        </select>
      </div>
      
      <div class="pagination-info">
        显示 ${startItem}-${endItem} / 共 ${totalItems} 条
      </div>
      
      <div class="pagination-controls">
        <button class="pagination-btn" onclick="changePage('${tabName}', 1)" ${currentPage === 1 ? 'disabled' : ''}>
          首页
        </button>
        <button class="pagination-btn" onclick="changePage('${tabName}', ${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
          上一页
        </button>
        <span class="pagination-info">${currentPage} / ${totalPages}</span>
        <button class="pagination-btn" onclick="changePage('${tabName}', ${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
          下一页
        </button>
        <button class="pagination-btn" onclick="changePage('${tabName}', ${totalPages})" ${currentPage === totalPages ? 'disabled' : ''}>
          末页
        </button>
      </div>
    </div>
  `;
}

// 切换页码
function changePage(tabName, page) {
  paginationState[tabName].currentPage = page;
  savePersistedState();
  loadTabData(tabName);
}

// 改变每页显示数量
function changePageSize(tabName, size) {
  paginationState[tabName].pageSize = parseInt(size);
  paginationState[tabName].currentPage = 1; // 重置到第一页
  savePersistedState();
  loadTabData(tabName);
}

// 加载盈亏日历
async function loadCalendar() {
  try {
    const response = await fetchWithApiCheck('/api/income?limit=1000');
    const result = await response.json();
    
    const contentDiv = document.getElementById('calendarContent');
    
    if (result.success) {
      const incomes = result.data;
      
      if (incomes.length === 0) {
        contentDiv.innerHTML = '<p style="text-align: center; padding: 40px; color: #a0a0b0;">暂无收益数据</p>';
        return;
      }
      
      // 按天统计盈亏（统一按 UTC+8 分桶）
      const dailyStats = {};
      const today = new Date(Date.now() + TZ_OFFSET_MS);
      today.setUTCHours(0, 0, 0, 0);
      
      // 初始化最近30天
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setUTCDate(date.getUTCDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyStats[dateStr] = {
          date: new Date(date),
          dateStr: dateStr,
          pnl: 0,
          commission: 0,
          trades: 0,
          fundingFee: 0
        };
      }
      
      // 统计每天的数据
      incomes.forEach(income => {
        // 将时间转为 UTC+8 再分桶
        const incomeDate = new Date((income.time || 0) + TZ_OFFSET_MS);
        incomeDate.setUTCHours(0, 0, 0, 0);
        const dateStr = incomeDate.toISOString().split('T')[0];
        
        if (dailyStats[dateStr]) {
          const amount = parseFloat(income.income);
          
          if (income.incomeType === 'REALIZED_PNL') {
            dailyStats[dateStr].pnl += amount;
            dailyStats[dateStr].trades++;
          } else if (income.incomeType === 'COMMISSION') {
            dailyStats[dateStr].commission += amount;
          } else if (income.incomeType === 'FUNDING_FEE') {
            dailyStats[dateStr].fundingFee += amount;
          }
        }
      });
      
      // 生成日历格子
      let html = '<div class="calendar-grid">';
      
      Object.values(dailyStats).forEach(day => {
        const netPnl = day.pnl + day.commission + day.fundingFee;
        const pnlClass = netPnl > 0 ? 'profit' : netPnl < 0 ? 'loss' : 'no-trade';
        const pnlColor = netPnl > 0 ? '#10b981' : netPnl < 0 ? '#ef4444' : '#a0a0b0';
        
        const dateDisplay = `${day.date.getMonth() + 1}/${day.date.getDate()}`;
        const weekday = ['日', '一', '二', '三', '四', '五', '六'][day.date.getDay()];
        
        html += `
          <div class="calendar-day ${pnlClass}" title="${day.dateStr}">
            <div class="calendar-date">${dateDisplay} 周${weekday}</div>
            <div class="calendar-pnl" style="color: ${pnlColor};">
              ${netPnl !== 0 ? '$' + formatNumber(netPnl) : '-'}
            </div>
            <div class="calendar-trades">
              ${day.trades > 0 ? day.trades + '笔交易' : '无交易'}
            </div>
            ${day.pnl !== 0 ? `<div style="font-size: 0.7rem; color: #a0a0b0;">盈亏: $${formatNumber(day.pnl)}</div>` : ''}
            ${day.commission !== 0 ? `<div style="font-size: 0.7rem; color: #f59e0b;">手续费: $${formatNumber(day.commission)}</div>` : ''}
            ${day.fundingFee !== 0 ? `<div style="font-size: 0.7rem; color: #06b6d4;">资金费: $${formatNumber(day.fundingFee)}</div>` : ''}
          </div>
        `;
      });
      
      html += '</div>';
      
      // 添加统计摘要
      const totalPnl = Object.values(dailyStats).reduce((sum, day) => sum + day.pnl, 0);
      const totalCommission = Object.values(dailyStats).reduce((sum, day) => sum + day.commission, 0);
      const totalFundingFee = Object.values(dailyStats).reduce((sum, day) => sum + day.fundingFee, 0);
      const totalNet = totalPnl + totalCommission + totalFundingFee;
      const profitDays = Object.values(dailyStats).filter(day => (day.pnl + day.commission + day.fundingFee) > 0).length;
      const lossDays = Object.values(dailyStats).filter(day => (day.pnl + day.commission + day.fundingFee) < 0).length;
      const tradeDays = Object.values(dailyStats).filter(day => day.trades > 0).length;
      
      const summaryHtml = `
        <div style="margin-top: 25px; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
          <div style="background: linear-gradient(145deg, #1e1e2e, #2a2a3e); padding: 15px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); text-align: center;">
            <div style="font-size: 0.8rem; color: #a0a0b0; margin-bottom: 5px;">30日净收益</div>
            <div style="font-size: 1.5rem; font-weight: bold; color: ${totalNet >= 0 ? '#10b981' : '#ef4444'};">
              $${formatNumber(totalNet)}
            </div>
          </div>
          <div style="background: linear-gradient(145deg, #1e1e2e, #2a2a3e); padding: 15px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); text-align: center;">
            <div style="font-size: 0.8rem; color: #a0a0b0; margin-bottom: 5px;">总盈亏</div>
            <div style="font-size: 1.5rem; font-weight: bold; color: ${totalPnl >= 0 ? '#10b981' : '#ef4444'};">
              $${formatNumber(totalPnl)}
            </div>
          </div>
          <div style="background: linear-gradient(145deg, #1e1e2e, #2a2a3e); padding: 15px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); text-align: center;">
            <div style="font-size: 0.8rem; color: #a0a0b0; margin-bottom: 5px;">总手续费</div>
            <div style="font-size: 1.5rem; font-weight: bold; color: #f59e0b;">
              $${formatNumber(totalCommission)}
            </div>
          </div>
          <div style="background: linear-gradient(145deg, #1e1e2e, #2a2a3e); padding: 15px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); text-align: center;">
            <div style="font-size: 0.8rem; color: #a0a0b0; margin-bottom: 5px;">资金费用</div>
            <div style="font-size: 1.5rem; font-weight: bold; color: #06b6d4;">
              $${formatNumber(totalFundingFee)}
            </div>
          </div>
          <div style="background: linear-gradient(145deg, #1e1e2e, #2a2a3e); padding: 15px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); text-align: center;">
            <div style="font-size: 0.8rem; color: #a0a0b0; margin-bottom: 5px;">交易天数</div>
            <div style="font-size: 1.5rem; font-weight: bold; color: #8b5cf6;">
              ${tradeDays}/30
            </div>
          </div>
          <div style="background: linear-gradient(145deg, #1e1e2e, #2a2a3e); padding: 15px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); text-align: center;">
            <div style="font-size: 0.8rem; color: #a0a0b0; margin-bottom: 5px;">盈利天数</div>
            <div style="font-size: 1.5rem; font-weight: bold; color: #10b981;">
              ${profitDays}天
            </div>
          </div>
          <div style="background: linear-gradient(145deg, #1e1e2e, #2a2a3e); padding: 15px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); text-align: center;">
            <div style="font-size: 0.8rem; color: #a0a0b0; margin-bottom: 5px;">亏损天数</div>
            <div style="font-size: 1.5rem; font-weight: bold; color: #ef4444;">
              ${lossDays}天
            </div>
          </div>
          <div style="background: linear-gradient(145deg, #1e1e2e, #2a2a3e); padding: 15px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); text-align: center;">
            <div style="font-size: 0.8rem; color: #a0a0b0; margin-bottom: 5px;">胜率</div>
            <div style="font-size: 1.5rem; font-weight: bold; color: #10b981;">
              ${tradeDays > 0 ? formatNumber((profitDays / tradeDays) * 100, 1) : 0}%
            </div>
          </div>
        </div>
      `;
      
      contentDiv.innerHTML = summaryHtml + html;
    } else {
      contentDiv.innerHTML = `<div class="error">加载失败: ${result.error.msg || result.error}</div>`;
    }
  } catch (error) {
    console.error('加载盈亏日历失败:', error);
    document.getElementById('calendarContent').innerHTML = 
      `<div class="error">加载失败: ${error.message}</div>`;
  }
}

// 加载标签数据
function loadTabData(tabName) {
  switch(tabName) {
    case 'positions':
      loadPositions();
      break;
    case 'statistics':
      loadStatistics();
      break;
    case 'calendar':
      loadCalendar();
      break;
    case 'trades':
      loadTrades();
      break;
    case 'orders':
      loadOrders();
      break;
    case 'income':
      loadIncome();
      break;
  }
}

// 刷新所有数据
async function refreshData() {
  const btn = document.querySelector('.refresh-btn');
  btn.style.transform = 'rotate(360deg)';
  
  await loadAccountInfo();
  await loadTabData(currentTab);
  
  setTimeout(() => {
    btn.style.transform = '';
  }, 500);
}

// 为了兼容性，确保函数可以通过简单名称访问
// 这些函数已经绑定到 window 对象，但为了确保兼容性，我们也创建别名
if (typeof window !== 'undefined') {
  // 确保所有函数都在全局作用域中可用
  if (!window.openSettings && typeof window.openSettings === 'undefined') {
    // 如果由于某种原因 window.openSettings 未定义，重新定义
    window.openSettings = function() {
      const modal = document.getElementById('settingsModal');
      if (!modal) {
        console.error('设置模态框未找到');
        return;
      }
      modal.style.display = 'flex';
      checkApiStatus().then(configured => {
        if (configured) {
          showConfigStatus('API 已配置', 'success');
        }
      });
    };
  }
}

// 初始化
window.addEventListener('DOMContentLoaded', async () => {
  // 加载持久化状态
  loadPersistedState();
  
  // 检查 API 配置状态
  const configured = await checkApiStatus();
  if (!configured) {
    // 显示提示并打开设置
    setTimeout(() => {
      alert('⚠️ 请先配置 API Key 和 Secret 才能使用系统功能');
      if (typeof window.openSettings === 'function') {
        window.openSettings();
      } else if (typeof openSettings === 'function') {
        openSettings();
      }
    }, 500);
  } else {
    // API 已配置，加载数据
  loadAccountInfo();
  loadPositions();
  
  // 每30秒自动刷新
  setInterval(refreshData, 30000);
  }
});
