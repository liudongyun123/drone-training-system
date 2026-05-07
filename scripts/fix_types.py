#!/usr/bin/env python3
"""
批量修复 TypeScript 类型错误
"""
import re
import os

# 定义修复规则: (文件路径模式, 旧代码正则, 新代码)
fixes = [
    # Fix 1: AdminRegistrations.tsx - Registration 类型缺少字段
    (
        'src/admin/pages/classes/AdminRegistrations.tsx',
        r'registration\.userName',
        'registration.studentName'
    ),
    # Fix 2: AdminRegistrations.tsx - userId -> studentId
    (
        'src/admin/pages/classes/AdminRegistrations.tsx',
        r'registration\.userId',
        'registration.studentId'
    ),
    # Fix 3: AdminProducts.tsx - status type
    (
        'src/admin/pages/shop/AdminProducts.tsx',
        r"status: 'draft' \| 'onsale' \| 'offsale'",
        "status: 'onsale' | 'offsale'"
    ),
]

def apply_fixes():
    applied = 0
    for file_path, old_pattern, new_text in fixes:
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if re.search(old_pattern, content):
                content = re.sub(old_pattern, new_text, content)
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                applied += 1
                print(f"✓ Fixed: {file_path}")
            else:
                print(f"⚠️  Pattern not found: {file_path}")
    
    print(f"\nApplied {applied} fixes")

if __name__ == '__main__':
    apply_fixes()
