#!/usr/bin/env python3
"""
CloudBase 云函数部署脚本
"""
import os
import json
import subprocess
import time

def run_cmd(cmd):
    """执行命令并返回结果"""
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.returncode, result.stdout, result.stderr

def main():
    # 读取云函数目录
    func_dir = "/Users/liudongyun/CodeBuddy/Claw/cloudfunctions/admin"
    
    # 1. 读取 package.json
    with open(os.path.join(func_dir, "package.json"), "r") as f:
        pkg = json.load(f)
    
    print(f"云函数: admin")
    print(f"依赖: {pkg.get('dependencies', {})}")
    
    # 2. 删除旧云函数
    print("\n删除旧云函数...")
    code, out, err = run_cmd('echo "y" | tcb fn delete admin')
    if "deleted successfully" in out or code == 0:
        print("删除成功")
    else:
        print(f"删除结果: {out} {err}")
    
    time.sleep(2)
    
    # 3. 使用 heredoc 提供交互式输入
    script = '''#!/bin/bash
cd /Users/liudongyun/CodeBuddy/Claw
echo "y" | tcb fn deploy admin --dir cloudfunctions 2>&1
'''
    
    # 创建临时脚本
    with open("/tmp/deploy_admin.sh", "w") as f:
        f.write(script)
    os.chmod("/tmp/deploy_admin.sh", 0o755)
    
    # 执行部署
    print("\n部署云函数...")
    code, out, err = run_cmd("bash /tmp/deploy_admin.sh")
    print(f"部署输出:\n{out}")
    if err:
        print(f"错误:\n{err}")
    
    # 检查结果
    time.sleep(3)
    print("\n检查部署状态...")
    code, out, err = run_cmd("tcb fn list | grep admin")
    print(f"状态:\n{out}")

if __name__ == "__main__":
    main()
