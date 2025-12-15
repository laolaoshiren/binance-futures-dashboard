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
    
    # 检查是否安装了 git
    if command -v git &> /dev/null; then
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
            print_info "使用 git 克隆项目..."
            git clone -b "$GITHUB_BRANCH" "$GITHUB_REPO" .
        fi
    else
        print_warning "未安装 git，尝试直接下载必要文件..."
        
        # 即使文件已存在，也强制更新关键文件（特别是 docker-compose.yml）
        print_info "更新 docker-compose.yml..."
        curl -fsSL "https://raw.githubusercontent.com/laolaoshiren/binance-futures-dashboard/$GITHUB_BRANCH/docker-compose.yml" -o docker-compose.yml || {
            print_error "下载 docker-compose.yml 失败"
            exit 1
        }
        
        # 如果其他文件不存在，则下载
        if [ ! -f "Dockerfile" ]; then
            print_info "下载 Dockerfile..."
            curl -fsSL "https://raw.githubusercontent.com/laolaoshiren/binance-futures-dashboard/$GITHUB_BRANCH/Dockerfile" -o Dockerfile || {
                print_error "下载 Dockerfile 失败"
                exit 1
            }
        fi
        
        if [ ! -f "package.json" ]; then
            print_info "下载 package.json..."
            curl -fsSL "https://raw.githubusercontent.com/laolaoshiren/binance-futures-dashboard/$GITHUB_BRANCH/package.json" -o package.json || {
                print_error "下载 package.json 失败"
                exit 1
            }
        fi
        
        # 创建必要的目录和文件
        mkdir -p public
        if [ ! -f "public/index.html" ]; then
            print_info "下载前端文件..."
            curl -fsSL "https://raw.githubusercontent.com/laolaoshiren/binance-futures-dashboard/$GITHUB_BRANCH/public/index.html" -o public/index.html
        fi
        if [ ! -f "public/app.js" ]; then
            curl -fsSL "https://raw.githubusercontent.com/laolaoshiren/binance-futures-dashboard/$GITHUB_BRANCH/public/app.js" -o public/app.js
        fi
        
        if [ ! -f "server.js" ]; then
            print_info "下载后端文件..."
            curl -fsSL "https://raw.githubusercontent.com/laolaoshiren/binance-futures-dashboard/$GITHUB_BRANCH/server.js" -o server.js
        fi
        if [ ! -f "binanceAPI.js" ]; then
            curl -fsSL "https://raw.githubusercontent.com/laolaoshiren/binance-futures-dashboard/$GITHUB_BRANCH/binanceAPI.js" -o binanceAPI.js
        fi
    fi
    
    # 验证关键文件是否存在
    if [ ! -f "docker-compose.yml" ]; then
        print_error "下载失败：未找到 docker-compose.yml 文件"
        exit 1
    fi
    
    # 检查并移除 docker-compose.yml 中的废弃 version 字段
    if grep -q "^version:" docker-compose.yml 2>/dev/null; then
        print_info "移除 docker-compose.yml 中的废弃 version 字段..."
        sed -i '/^version:/d' docker-compose.yml
        # 移除 version 行后的空行（如果有）
        sed -i '/^$/N;/^\n$/d' docker-compose.yml
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

# 停止本地 Node.js 服务器
stop_local_server() {
    print_info "检查并停止本地开发服务器..."
    
    # 查找运行中的 node server.js 进程
    local pids=$(ps aux | grep "[n]ode.*server.js" | awk '{print $2}')
    if [ -n "$pids" ]; then
        print_warning "发现本地 Node.js 服务器进程，正在停止..."
        for pid in $pids; do
            kill -9 "$pid" 2>/dev/null && print_info "已停止进程 $pid" || true
        done
        sleep 2
    fi
    
    # 也检查是否有其他 Node.js 进程占用 3031 端口
    if command -v lsof &> /dev/null; then
        local port_pids=$(lsof -ti :3031 2>/dev/null)
        if [ -n "$port_pids" ]; then
            for pid in $port_pids; do
                # 检查是否是 node 进程
                if ps -p "$pid" -o comm= 2>/dev/null | grep -q node; then
                    print_warning "发现 Node.js 进程 $pid 占用端口 3031，正在停止..."
                    kill -9 "$pid" 2>/dev/null || true
                fi
            done
            sleep 2
        fi
    fi
}

# 检查端口占用并自动处理
check_port() {
    PORT=3031
    
    # 先停止本地服务器
    stop_local_server
    
    # 检查端口是否被占用的函数
    is_port_in_use() {
        if command -v netstat &> /dev/null; then
            netstat -tuln 2>/dev/null | grep -q ":$PORT "
        elif command -v ss &> /dev/null; then
            ss -tuln 2>/dev/null | grep -q ":$PORT "
        else
            # 使用 lsof 作为备选
            if command -v lsof &> /dev/null; then
                lsof -i :$PORT &>/dev/null
            else
                false
            fi
        fi
    }
    
    if is_port_in_use; then
        print_warning "端口 $PORT 已被占用，正在自动处理..."
        
        # 1. 尝试停止当前目录的 docker-compose 容器
        if [ -f "docker-compose.yml" ]; then
            print_info "停止现有 Docker Compose 容器..."
            docker-compose down 2>/dev/null || true
            sleep 2
        fi
        
        # 2. 查找并停止占用该端口的 Docker 容器（包括已停止的）
        # 查找运行中的容器
        CONTAINER_ID=$(docker ps --format "{{.ID}}\t{{.Ports}}" 2>/dev/null | grep ":$PORT" | awk '{print $1}' | head -1)
        if [ -n "$CONTAINER_ID" ]; then
            print_info "发现运行中的容器 $CONTAINER_ID 占用端口，正在停止..."
            docker stop "$CONTAINER_ID" 2>/dev/null || true
            docker rm "$CONTAINER_ID" 2>/dev/null || true
            sleep 2
        fi
        
        # 查找所有容器（包括已停止的）中占用该端口的
        ALL_CONTAINERS=$(docker ps -a --format "{{.ID}}\t{{.Names}}" 2>/dev/null)
        for container in $(echo "$ALL_CONTAINERS" | awk '{print $1}'); do
            container_name=$(echo "$ALL_CONTAINERS" | grep "^$container" | awk '{print $2}')
            # 检查容器的端口映射
            if docker port "$container" 2>/dev/null | grep -q ":$PORT"; then
                print_info "发现容器 $container ($container_name) 占用端口，正在停止并删除..."
                docker stop "$container" 2>/dev/null || true
                docker rm "$container" 2>/dev/null || true
                sleep 1
            fi
        done
        
        # 特别处理 binance-futures-viewer 容器
        if docker ps -a --format "{{.Names}}" 2>/dev/null | grep -q "binance-futures-viewer"; then
            print_info "发现 binance-futures-viewer 容器，正在停止并删除..."
            docker stop binance-futures-viewer 2>/dev/null || true
            docker rm binance-futures-viewer 2>/dev/null || true
            sleep 2
        fi
        
        # 3. 如果端口仍被占用，尝试查找进程并停止
        if is_port_in_use; then
            print_info "查找占用端口的进程..."
            if command -v lsof &> /dev/null; then
                PID=$(lsof -ti :$PORT 2>/dev/null | head -1)
                if [ -n "$PID" ]; then
                    print_warning "发现进程 $PID 占用端口，正在停止..."
                    kill -9 "$PID" 2>/dev/null || true
                    sleep 2
                fi
            elif command -v fuser &> /dev/null; then
                print_warning "使用 fuser 停止占用端口的进程..."
                fuser -k $PORT/tcp 2>/dev/null || true
                sleep 2
            fi
        fi
        
        # 4. 最后检查端口是否已释放
        if is_port_in_use; then
            print_error "无法自动释放端口 $PORT，请手动处理"
            print_info "可以使用以下命令查看占用端口的进程:"
            if command -v lsof &> /dev/null; then
                print_info "  lsof -i :$PORT"
            elif command -v netstat &> /dev/null; then
                print_info "  netstat -tuln | grep $PORT"
            elif command -v ss &> /dev/null; then
                print_info "  ss -tuln | grep $PORT"
            fi
            exit 1
        else
            print_success "端口 $PORT 已成功释放"
        fi
    fi
}

# 停止并删除现有容器
stop_existing_containers() {
    print_info "检查并清理现有容器..."
    
    # 1. 先停止并删除当前目录的 docker-compose 容器
    if [ -f "docker-compose.yml" ]; then
        print_info "停止现有 Docker Compose 服务..."
        docker-compose down 2>/dev/null || true
        docker-compose rm -f 2>/dev/null || true
        sleep 2
    fi
    
    # 2. 明确查找并删除 binance-futures-viewer 容器（无论状态如何）
    if docker ps -a --format "{{.Names}}" 2>/dev/null | grep -q "^binance-futures-viewer$"; then
        print_info "发现 binance-futures-viewer 容器，正在停止并删除..."
        docker stop binance-futures-viewer 2>/dev/null || true
        docker rm -f binance-futures-viewer 2>/dev/null || true
        sleep 2
    fi
    
    # 3. 查找所有可能相关的容器（通过名称模式匹配）
    EXISTING_CONTAINERS=$(docker ps -a --format "{{.ID}}\t{{.Names}}" 2>/dev/null | grep -E "binance-futures-viewer|binance-viewer" || true)
    if [ -n "$EXISTING_CONTAINERS" ]; then
        print_info "发现相关容器，正在清理..."
        echo "$EXISTING_CONTAINERS" | while read -r container_id container_name; do
            if [ -n "$container_id" ]; then
                print_info "停止并删除容器: $container_name ($container_id)"
                docker stop "$container_id" 2>/dev/null || true
                docker rm -f "$container_id" 2>/dev/null || true
            fi
        done
        sleep 2
    fi
}

# 强制更新项目文件（确保使用最新代码）
force_update_files() {
    print_info "强制更新项目文件到最新版本..."
    
    GITHUB_BRANCH="main"
    
    # 如果使用 git，直接拉取最新代码
    if [ -d ".git" ] && command -v git &> /dev/null; then
        print_info "使用 git 更新代码..."
        git pull origin "$GITHUB_BRANCH" || true
    else
        # 强制更新关键文件
        print_info "更新关键文件..."
        curl -fsSL "https://raw.githubusercontent.com/laolaoshiren/binance-futures-dashboard/$GITHUB_BRANCH/docker-compose.yml" -o docker-compose.yml 2>/dev/null || true
        curl -fsSL "https://raw.githubusercontent.com/laolaoshiren/binance-futures-dashboard/$GITHUB_BRANCH/public/app.js" -o public/app.js 2>/dev/null || true
        curl -fsSL "https://raw.githubusercontent.com/laolaoshiren/binance-futures-dashboard/$GITHUB_BRANCH/public/index.html" -o public/index.html 2>/dev/null || true
        curl -fsSL "https://raw.githubusercontent.com/laolaoshiren/binance-futures-dashboard/$GITHUB_BRANCH/server.js" -o server.js 2>/dev/null || true
        curl -fsSL "https://raw.githubusercontent.com/laolaoshiren/binance-futures-dashboard/$GITHUB_BRANCH/binanceAPI.js" -o binanceAPI.js 2>/dev/null || true
    fi
    
    # 检查并移除 docker-compose.yml 中的废弃 version 字段
    if [ -f "docker-compose.yml" ] && grep -q "^version:" docker-compose.yml 2>/dev/null; then
        print_info "移除 docker-compose.yml 中的废弃 version 字段..."
        sed -i '/^version:/d' docker-compose.yml
        sed -i '/^$/N;/^\n$/d' docker-compose.yml
    fi
}

# 拉取镜像并启动服务
start_service() {
    # 先停止本地开发服务器
    stop_local_server
    
    # 停止并删除现有容器（避免名称冲突）
    stop_existing_containers
    
    # 检查端口占用
    check_port
    
    # 强制更新文件到最新版本
    force_update_files
    
    print_info "构建 Docker 镜像..."
    docker-compose build --no-cache || {
        print_warning "构建失败，尝试拉取镜像..."
        docker-compose pull || true
    }
    
    print_info "启动服务..."
    docker-compose up -d --build || {
        print_error "启动失败，尝试清理后重新启动..."
        # 如果启动失败，再次清理并重试
        stop_existing_containers
        sleep 2
        docker-compose up -d --build || {
            print_error "服务启动失败，请检查日志: docker-compose logs"
            exit 1
        }
    }
    
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

