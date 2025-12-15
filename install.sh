#!/bin/bash

# Binance Futures Dashboard - 一键安装脚本
# One-click installation script for production deployment

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查用户权限（不再强制要求 root）
check_root() {
    # 不再强制要求 root 用户，但如果是 root 用户会给出提示
    if [ "$EUID" -eq 0 ]; then
        print_warning "检测到使用 root 用户运行，项目将安装在 /root 目录下"
        print_info "如需安装到其他用户目录，请使用该用户运行此脚本"
    else
        print_info "使用当前用户运行，项目将安装在 $HOME 目录下"
    fi
}

# 检查Docker是否安装
check_docker() {
    print_info "检查 Docker 环境..."
    
    if ! command -v docker &> /dev/null; then
        print_warning "Docker 未安装，正在安装 Docker..."
        install_docker
    else
        print_success "Docker 已安装: $(docker --version)"
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_warning "Docker Compose 未安装，正在安装 Docker Compose..."
        install_docker_compose
    else
        print_success "Docker Compose 已安装: $(docker-compose --version)"
    fi
    
    # 启动Docker服务（需要 root 权限）
    if ! systemctl is-active --quiet docker 2>/dev/null; then
        if [ "$EUID" -eq 0 ]; then
            print_info "启动 Docker 服务..."
            systemctl start docker
            systemctl enable docker
        else
            print_warning "Docker 服务未运行，请使用 sudo 启动或联系管理员"
            print_info "可以使用: sudo systemctl start docker"
        fi
    fi
}

# 安装Docker
install_docker() {
    # 卸载旧版本
    yum remove -y docker docker-client docker-client-latest docker-common \
        docker-latest docker-latest-logrotate docker-logrotate docker-engine 2>/dev/null || true
    
    # 安装依赖
    yum install -y yum-utils device-mapper-persistent-data lvm2
    
    # 添加Docker仓库
    yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    
    # 安装Docker
    yum install -y docker-ce docker-ce-cli containerd.io
    
    # 启动Docker
    systemctl start docker
    systemctl enable docker
    
    print_success "Docker 安装完成"
}

# 安装Docker Compose
install_docker_compose() {
    # 下载Docker Compose
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    
    # 添加执行权限
    chmod +x /usr/local/bin/docker-compose
    
    # 创建软链接
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    print_success "Docker Compose 安装完成"
}

# 创建项目目录
create_project_dir() {
    # 获取当前登录用户的主目录
    if [ "$EUID" -eq 0 ]; then
        # 如果是 root 用户，尝试获取实际登录用户
        REAL_USER="${SUDO_USER:-${USER:-$(whoami)}}"
        if [ "$REAL_USER" = "root" ]; then
            # 如果确实是 root，使用 /root
            USER_HOME="/root"
        else
            # 获取实际用户的主目录
            USER_HOME=$(eval echo ~$REAL_USER)
        fi
    else
        # 非 root 用户，使用当前用户主目录
        USER_HOME="$HOME"
    fi
    
    PROJECT_DIR="$USER_HOME/binance-futures-dashboard"
    
    if [ ! -d "$PROJECT_DIR" ]; then
        print_info "创建项目目录: $PROJECT_DIR"
        mkdir -p "$PROJECT_DIR"
    else
        print_warning "项目目录已存在: $PROJECT_DIR"
    fi
    
    cd "$PROJECT_DIR"
}

# 下载或更新项目文件
download_project() {
    print_info "下载项目文件..."
    
    GITHUB_REPO="https://github.com/laolaoshiren/binance-futures-dashboard.git"
    GITHUB_BRANCH="main"
    
    # 如果项目目录不为空且已有 docker-compose.yml，跳过下载
    if [ -f "docker-compose.yml" ]; then
        print_info "项目文件已存在，跳过下载"
        return 0
    fi
    
    # 检查是否安装了 git
    if command -v git &> /dev/null; then
        print_info "使用 git 克隆项目..."
        if [ -d ".git" ]; then
            print_info "检测到 git 仓库，更新代码..."
            git pull origin "$GITHUB_BRANCH" || {
                print_warning "更新失败，尝试重新克隆..."
                cd ..
                rm -rf "$PROJECT_DIR"
                mkdir -p "$PROJECT_DIR"
                cd "$PROJECT_DIR"
                git clone -b "$GITHUB_BRANCH" "$GITHUB_REPO" .
            }
        else
            git clone -b "$GITHUB_BRANCH" "$GITHUB_REPO" .
        fi
    else
        print_warning "未安装 git，尝试直接下载必要文件..."
        
        # 下载必要的文件
        print_info "下载 docker-compose.yml..."
        curl -fsSL "https://raw.githubusercontent.com/laolaoshiren/binance-futures-dashboard/$GITHUB_BRANCH/docker-compose.yml" -o docker-compose.yml || {
            print_error "下载 docker-compose.yml 失败"
            exit 1
        }
        
        print_info "下载 Dockerfile..."
        curl -fsSL "https://raw.githubusercontent.com/laolaoshiren/binance-futures-dashboard/$GITHUB_BRANCH/Dockerfile" -o Dockerfile || {
            print_error "下载 Dockerfile 失败"
            exit 1
        }
        
        print_info "下载 package.json..."
        curl -fsSL "https://raw.githubusercontent.com/laolaoshiren/binance-futures-dashboard/$GITHUB_BRANCH/package.json" -o package.json || {
            print_error "下载 package.json 失败"
            exit 1
        }
        
        # 创建必要的目录和文件
        mkdir -p public
        print_info "下载前端文件..."
        curl -fsSL "https://raw.githubusercontent.com/laolaoshiren/binance-futures-dashboard/$GITHUB_BRANCH/public/index.html" -o public/index.html
        curl -fsSL "https://raw.githubusercontent.com/laolaoshiren/binance-futures-dashboard/$GITHUB_BRANCH/public/app.js" -o public/app.js
        
        print_info "下载后端文件..."
        curl -fsSL "https://raw.githubusercontent.com/laolaoshiren/binance-futures-dashboard/$GITHUB_BRANCH/server.js" -o server.js
        curl -fsSL "https://raw.githubusercontent.com/laolaoshiren/binance-futures-dashboard/$GITHUB_BRANCH/binanceAPI.js" -o binanceAPI.js
    fi
    
    # 验证关键文件是否存在
    if [ ! -f "docker-compose.yml" ]; then
        print_error "下载失败：未找到 docker-compose.yml 文件"
        exit 1
    fi
    
    print_success "项目文件下载完成"
    
    # 获取 Git commit hash 作为版本号
    if [ -d ".git" ]; then
        VERSION=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
        BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
    else
        VERSION="unknown"
        BRANCH="main"
    fi
}

# 配置说明
setup_info() {
    print_info "配置说明..."
    print_warning "⚠️  注意：API Key 和 Secret 需要在网页上配置"
    print_info "启动后访问 http://$(hostname -I | awk '{print $1}'):3031"
    print_info "点击右上角'设置'按钮配置 API Key 和 Secret"
}

# 检查端口占用
check_port() {
    PORT=3031
    if command -v netstat &> /dev/null; then
        if netstat -tuln 2>/dev/null | grep -q ":$PORT "; then
            print_warning "端口 $PORT 已被占用，尝试停止现有容器..."
            docker-compose down 2>/dev/null || true
            # 检查是否还有其他进程占用
            if netstat -tuln 2>/dev/null | grep -q ":$PORT "; then
                print_error "端口 $PORT 仍被占用，请手动停止占用该端口的服务"
                print_info "可以使用命令查看: netstat -tuln | grep $PORT"
                exit 1
            fi
        fi
    elif command -v ss &> /dev/null; then
        if ss -tuln 2>/dev/null | grep -q ":$PORT "; then
            print_warning "端口 $PORT 已被占用，尝试停止现有容器..."
            docker-compose down 2>/dev/null || true
            if ss -tuln 2>/dev/null | grep -q ":$PORT "; then
                print_error "端口 $PORT 仍被占用，请手动停止占用该端口的服务"
                print_info "可以使用命令查看: ss -tuln | grep $PORT"
                exit 1
            fi
        fi
    fi
}

# 拉取镜像并启动服务
start_service() {
    # 检查端口占用
    check_port
    
    print_info "构建 Docker 镜像..."
    docker-compose build || {
        print_warning "构建失败，尝试拉取镜像..."
        docker-compose pull || true
    }
    
    print_info "启动服务..."
    docker-compose up -d --build
    
    # 等待服务启动
    sleep 5
    
    # 检查服务状态
    if docker-compose ps | grep -q "Up"; then
        print_success "服务启动成功！"
        print_info "访问地址: http://$(hostname -I | awk '{print $1}'):3031"
        print_info "或访问: http://localhost:3031"
    else
        print_error "服务启动失败，请检查日志: docker-compose logs"
        exit 1
    fi
}

# 显示服务信息
show_info() {
    # 获取服务器 IP 地址
    SERVER_IP=$(hostname -I | awk '{print $1}')
    if [ -z "$SERVER_IP" ]; then
        SERVER_IP="localhost"
    fi
    
    # 获取版本信息
    if [ -z "$VERSION" ]; then
        if [ -d ".git" ]; then
            VERSION=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
        else
            VERSION="unknown"
        fi
    fi
    
    # 等待服务完全启动
    sleep 3
    
    # 检查服务状态
    if docker-compose ps | grep -q "Up"; then
        SERVICE_STATUS="✅ 运行中"
    else
        SERVICE_STATUS="⚠️  未运行"
    fi
    
    echo
    print_success "=========================================="
    print_success "  ✅ 部署成功！"
    print_success "=========================================="
    echo
    print_info "📦 部署版本: $VERSION"
    print_info "🌐 服务地址: http://$SERVER_IP:3031"
    print_info "📊 服务状态: $SERVICE_STATUS"
    echo
    print_info "项目目录: $PROJECT_DIR"
    print_warning "⚠️  首次使用请在网页上配置 API Key 和 Secret"
    echo
    print_info "常用命令:"
    echo "  查看日志: cd $PROJECT_DIR && docker-compose logs -f"
    echo "  停止服务: cd $PROJECT_DIR && docker-compose down"
    echo "  重启服务: cd $PROJECT_DIR && docker-compose restart"
    echo "  查看状态: cd $PROJECT_DIR && docker-compose ps"
    echo
}

# 主函数
main() {
    echo
    print_info "=========================================="
    print_info "  Binance Futures Dashboard - 一键安装"
    print_info "  One-click Installation"
    print_info "=========================================="
    echo
    
    check_root
    check_docker
    create_project_dir
    download_project
    setup_info
    start_service
    show_info
}

# 运行主函数
main

