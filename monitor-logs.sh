#!/bin/bash

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}🔍 Pro Upscaler System Log Monitor${NC}"
echo -e "${CYAN}===================================${NC}"
echo ""

# Function to get process ID for a port
get_pid_for_port() {
    local port=$1
    lsof -ti:$port 2>/dev/null | head -1
}

# Function to monitor logs for a service
monitor_service_logs() {
    local service_name=$1
    local port=$2
    local color=$3
    
    local pid=$(get_pid_for_port $port)
    
    if [ -z "$pid" ]; then
        echo -e "${RED}❌ $service_name (port $port) is not running${NC}"
        return 1
    else
        echo -e "${GREEN}✅ $service_name (port $port) - PID: $pid${NC}"
        return 0
    fi
}

# Check service status
echo -e "${YELLOW}📊 Checking service status...${NC}"
echo ""

PRO_UPSCALER_RUNNING=false
PRO_ENGINE_RUNNING=false

if monitor_service_logs "Pro Upscaler Server" "3002" "$BLUE"; then
    PRO_UPSCALER_RUNNING=true
fi

if monitor_service_logs "Pro Engine Desktop Service" "3007" "$PURPLE"; then
    PRO_ENGINE_RUNNING=true
fi

echo ""

# Provide monitoring options
if [ "$PRO_UPSCALER_RUNNING" = true ] && [ "$PRO_ENGINE_RUNNING" = true ]; then
    echo -e "${GREEN}🎯 Both services are running! Choose monitoring option:${NC}"
    echo ""
    echo -e "${CYAN}1)${NC} Monitor Pro Upscaler Server logs (port 3002)"
    echo -e "${CYAN}2)${NC} Monitor Pro Engine Desktop logs (port 3007)" 
    echo -e "${CYAN}3)${NC} Monitor both services (split screen)"
    echo -e "${CYAN}4)${NC} Show current process info"
    echo -e "${CYAN}q)${NC} Quit"
    echo ""
    read -p "Choose option [1-4, q]: " choice
    
    case $choice in
        1)
            echo -e "${BLUE}📱 Monitoring Pro Upscaler Server logs...${NC}"
            echo -e "${YELLOW}Press Ctrl+C to exit${NC}"
            echo ""
            tail -f /proc/$(get_pid_for_port 3002)/fd/1 2>/dev/null || echo "Could not access logs directly. Try: journalctl -f -u your-service-name"
            ;;
        2)
            echo -e "${PURPLE}🚀 Monitoring Pro Engine Desktop logs...${NC}"
            echo -e "${YELLOW}Press Ctrl+C to exit${NC}"
            echo ""
            tail -f /proc/$(get_pid_for_port 3007)/fd/1 2>/dev/null || echo "Could not access logs directly. Try: journalctl -f -u your-service-name"
            ;;
        3)
            echo -e "${CYAN}👥 Monitoring both services...${NC}"
            echo -e "${YELLOW}Press Ctrl+C to exit${NC}"
            echo ""
            # Use multitail if available, otherwise use a simple approach
            if command -v multitail >/dev/null 2>&1; then
                multitail -l "tail -f /proc/$(get_pid_for_port 3002)/fd/1" -l "tail -f /proc/$(get_pid_for_port 3007)/fd/1"
            else
                echo -e "${YELLOW}⚠️  multitail not available. Showing both logs in sequence:${NC}"
                echo ""
                echo -e "${BLUE}=== Pro Upscaler (3002) ===${NC}"
                tail -f /proc/$(get_pid_for_port 3002)/fd/1 &
                PID1=$!
                echo -e "${PURPLE}=== Pro Engine (3007) ===${NC}" 
                tail -f /proc/$(get_pid_for_port 3007)/fd/1 &
                PID2=$!
                
                # Wait for Ctrl+C
                trap "kill $PID1 $PID2 2>/dev/null; exit" INT
                wait
            fi
            ;;
        4)
            echo -e "${CYAN}📊 Current Process Information:${NC}"
            echo ""
            echo -e "${BLUE}Pro Upscaler Server (port 3002):${NC}"
            ps aux | grep -E "(PORT=3002|server\.js)" | grep -v grep | head -2
            echo ""
            echo -e "${PURPLE}Pro Engine Desktop (port 3007):${NC}"
            ps aux | grep -E "(PORT=3007|server\.js)" | grep -v grep | head -2
            echo ""
            echo -e "${YELLOW}Network connections:${NC}"
            netstat -tlnp | grep -E ":(3002|3007)"
            ;;
        q|Q)
            echo -e "${GREEN}👋 Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Invalid option${NC}"
            exit 1
            ;;
    esac
    
elif [ "$PRO_UPSCALER_RUNNING" = true ]; then
    echo -e "${YELLOW}⚠️  Only Pro Upscaler Server is running${NC}"
    echo -e "${BLUE}📱 Monitoring Pro Upscaler Server logs...${NC}"
    echo -e "${YELLOW}Press Ctrl+C to exit${NC}"
    echo ""
    tail -f /proc/$(get_pid_for_port 3002)/fd/1
    
elif [ "$PRO_ENGINE_RUNNING" = true ]; then
    echo -e "${YELLOW}⚠️  Only Pro Engine Desktop Service is running${NC}"
    echo -e "${PURPLE}🚀 Monitoring Pro Engine Desktop logs...${NC}"
    echo -e "${YELLOW}Press Ctrl+C to exit${NC}"
    echo ""
    tail -f /proc/$(get_pid_for_port 3007)/fd/1
    
else
    echo -e "${RED}❌ No services are running!${NC}"
    echo ""
    echo -e "${YELLOW}💡 To start the services:${NC}"
    echo -e "${CYAN}Pro Upscaler:${NC} cd /home/mranderson/desktophybrid/pro-upscaler/server && PORT=3002 node server.js &"
    echo -e "${CYAN}Pro Engine:${NC} cd /home/mranderson/desktophybrid/pro-engine-desktop/service && PORT=3007 node --expose-gc --max-old-space-size=8192 server.js &"
    exit 1
fi 