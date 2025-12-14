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

# 检查是否为root用户
check_root() {
    if [ "$EUID" -ne 0 ]; then 
        print_error "请使用 root 用户运行此脚本"
        exit 1
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
    
    # 启动Docker服务
    if ! systemctl is-active --quiet docker; then
        print_info "启动 Docker 服务..."
        systemctl start docker
        systemctl enable docker
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
    PROJECT_DIR="/opt/binance-viewer"
    
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
    
    # 如果是从GitHub安装，可以在这里添加git clone或wget下载逻辑
    # 当前假设文件已经存在或通过其他方式提供
    
    if [ ! -f "docker-compose.yml" ]; then
        print_error "未找到 docker-compose.yml 文件"
        print_info "请确保项目文件已放置在 $PROJECT_DIR 目录"
        exit 1
    fi
}

# 配置说明
setup_info() {
    print_info "配置说明..."
    print_warning "⚠️  注意：API Key 和 Secret 需要在网页上配置"
    print_info "启动后访问 http://$(hostname -I | awk '{print $1}'):3031"
    print_info "点击右上角'设置'按钮配置 API Key 和 Secret"
}

# 拉取镜像并启动服务
start_service() {
    print_info "拉取 Docker 镜像..."
    docker-compose pull || true
    
    print_info "启动服务..."
    docker-compose up -d
    
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
    echo
    print_success "=========================================="
    print_success "  安装完成！"
    print_success "=========================================="
    echo
    print_info "项目目录: $PROJECT_DIR"
    print_info "访问地址: http://$(hostname -I | awk '{print $1}'):3031"
    print_warning "⚠️  首次使用请在网页上配置 API Key 和 Secret"
    echo
    print_info "常用命令:"
    echo "  查看日志: docker-compose logs -f"
    echo "  停止服务: docker-compose down"
    echo "  重启服务: docker-compose restart"
    echo "  查看状态: docker-compose ps"
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

