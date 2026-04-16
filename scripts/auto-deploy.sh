#!/bin/bash
# 自动部署云函数脚本
cd /Users/liudongyun/CodeBuddy/Claw

# 使用 expect 风格的自动回复
echo "y" | tcb fn deploy admin --dir cloudfunctions 2>&1 &
PID=$!

sleep 2

# 发送 y 确认覆盖
echo "y" > /dev/stdin
kill -0 $PID 2>/dev/null && sleep 2 && echo "y"

wait $PID
