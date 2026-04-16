#!/usr/bin/env python3
"""生成 CloudBase 文件上传配置"""
import os
from pathlib import Path

DIST_DIR = Path("/Users/liudongyun/CodeBuddy/Claw/dist")

def get_all_files():
    """获取所有文件"""
    files = []
    for f in DIST_DIR.rglob("*"):
        if f.is_file():
            local_path = str(f.absolute())
            cloud_path = f"/{f.name}" if f.parent == DIST_DIR else f"/{f.name}"
            files.append({
                "localPath": local_path,
                "cloudPath": cloud_path
            })
    return files

if __name__ == "__main__":
    files = get_all_files()
    print(f"共 {len(files)} 个文件")
    
    # 生成 JSON 配置
    import json
    config = {
        "files": files
    }
    print(json.dumps(config, indent=2))
