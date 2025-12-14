#!/bin/bash

# GitHub 推送脚本
# 使用方法: ./push-to-github.sh <repository-url>

if [ -z "$1" ]; then
    echo "❌ 错误: 请提供 GitHub 仓库地址"
    echo ""
    echo "使用方法:"
    echo "  ./push-to-github.sh https://github.com/用户名/仓库名.git"
    echo "  或"
    echo "  ./push-to-github.sh git@github.com:用户名/仓库名.git"
    exit 1
fi

REPO_URL=$1

echo "🚀 开始推送到 GitHub..."
echo "📦 仓库地址: $REPO_URL"
echo ""

# 检查是否已配置远程仓库
if git remote get-url origin &>/dev/null; then
    echo "⚠️  已存在远程仓库，正在更新..."
    git remote set-url origin "$REPO_URL"
else
    echo "➕ 添加远程仓库..."
    git remote add origin "$REPO_URL"
fi

# 获取当前分支名
BRANCH=$(git branch --show-current)

echo "📤 推送到 GitHub (分支: $BRANCH)..."
git push -u origin "$BRANCH"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 推送成功！"
    echo "🌐 您可以在 GitHub 上查看代码:"
    echo "   $(echo $REPO_URL | sed 's/\.git$//')"
else
    echo ""
    echo "❌ 推送失败，请检查："
    echo "   1. 仓库地址是否正确"
    echo "   2. 是否有推送权限"
    echo "   3. 是否已配置 SSH 密钥或访问令牌"
    exit 1
fi

