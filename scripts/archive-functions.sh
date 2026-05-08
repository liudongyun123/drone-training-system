#!/bin/bash
# 归档初始化云函数脚本
# 这些是一次性数据初始化函数，完成任务后可以安全归档

set -e

ENV_ID="rcwljy-5ghmq2ex26764978"

# 需要归档的云函数列表（按优先级分类）
ARCHIVE_LIST=(
  # 初始化函数 - 已完成任务
  "init-dictionaries"
  "init-caac-data"
  "init-renshe-classes"
  "init-renshe-classes-new"
  "init-renshe-classes-v2"
  "init-renshe-courses-v2"
  "init-test-data"
  "init-data"
  "init-database"
  "init-uav"
  "init-uav-collections"
  
  # 同步函数 - 已完成任务
  "sync-caac-classes-category"
  "sync-class-level"
  "sync-class-source"
  "sync-course-source"
  "sync-course-categories"
  "sync-course-levels"
  "sync-renshe-category-source"
  
  # 清理函数 - 已完成任务
  "cleanup-old-courses"
  "clean-classes"
  "clean-classes-fix"
  "clearCourseSchedules"
  "clearEmptyCollections"
  
  # 修复函数 - 已完成任务
  "fix-class-category"
  "fix-featured"
  "fix-member-levels"
  
  # 更新函数 - 已完成任务
  "update-course-covers"
  "add-real-courses"
  
  # 迁移函数 - 已完成任务
  "migrate-passwords"
  "migrate-permissions"
  "migrate-uav"
  "migration-old-data"
)

echo "开始归档云函数..."
echo "========================"

# 归档计数器
archived=0
failed=0

for func_name in "${ARCHIVE_LIST[@]}"; do
  echo "[$((++i))/${#ARCHIVE_LIST[@]}] 检查: $func_name"
  
  # 检查云函数是否存在
  if tcb fn list --envId "$ENV_ID" 2>/dev/null | grep -q "$func_name"; then
    echo "  -> 发现云函数: $func_name"
    
    # 移动本地目录到归档
    local_dir="cloudfunctions/$func_name"
    if [ -d "$local_dir" ]; then
      # 创建归档目录
      archive_dir="cloudfunctions/_archived/$func_name"
      mkdir -p "$(dirname "$archive_dir")"
      
      # 移动到归档
      mv "$local_dir" "$archive_dir"
      echo "  -> 本地目录已归档到: $archive_dir"
    fi
    
    # 从云端删除（可选，取消注释执行）
    # echo "  -> 从云端删除..."
    # tcb fn delete "$func_name" --envId "$ENV_ID" 2>/dev/null || true
    
    ((archived++))
  else
    echo "  -> 不存在，跳过"
  fi
  
  echo ""
done

echo "========================"
echo "归档完成！"
echo "总计处理: ${#ARCHIVE_LIST[@]} 个函数"
echo "成功归档: $archived 个"
echo "失败: $failed 个"
echo ""
echo "注意: 云端函数尚未删除，请手动确认后执行删除"
echo "查看归档目录: cloudfunctions/_archived/"
