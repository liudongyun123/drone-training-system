#!/bin/bash

# 批量修复常见未使用变量，添加 _ 前缀

FILES=$(find src -name "*.ts" -o -name "*.tsx")

for f in $FILES; do
  # 修复 const loading = ... 变为 const _loading = ...
  sed -i 's/const loading = /const _loading = /g' "$f"
  sed -i 's/const setLoading = /const _setLoading = /g' "$f"
  
  # 修复 const { loading, setLoading } = ... 变为 const { _loading, _setLoading } = ...
  sed -i 's/{ loading, setLoading }/{ _loading, _setLoading }/g' "$f"
  sed -i 's/{ loading }/{ _loading }/g' "$f"
  
  # 修复 const courses = ... 变为 const _courses = ...
  sed -i 's/const courses = /const _courses = /g' "$f"
  
  # 修复 const dialogOpen = ... 变为 const _dialogOpen = ...
  sed -i 's/const dialogOpen = /const _dialogOpen = /g' "$f"
  sed -i 's/const setDialogOpen = /const _setDialogOpen = /g' "$f"
  sed -i 's/{ dialogOpen, setDialogOpen }/{ _dialogOpen, _setDialogOpen }/g' "$f"
  
  # 修复 const bannerOpen = ...
  sed -i 's/const bannerOpen = /const _bannerOpen = /g' "$f"
  sed -i 's/const setBannerOpen = /const _setBannerOpen = /g' "$f"
  sed -i 's/{ bannerOpen, setBannerOpen }/{ _bannerOpen, _setBannerOpen }/g' "$f"
  
  # 修复 const config = ...
  sed -i 's/const config = /const _config = /g' "$f"
  
  # 修复 const showLabel = ...
  sed -i 's/const showLabel = /const _showLabel = /g' "$f"
  
  # 修复 const color = ...
  sed -i 's/const color = /const _color = /g' "$f"
  
  # 修复 const entry = ...
  sed -i 's/const entry = /const _entry = /g' "$f"
  
  # 修复 getPerformanceMetrics
  sed -i 's/const getPerformanceMetrics/const _getPerformanceMetrics/g' "$f"
  
  # 修复 getMemberRelationCount
  sed -i 's/const getMemberRelationCount/const _getMemberRelationCount/g' "$f"
  
  # 修复 phone 变量
  sed -i 's/const phone = /const _phone = /g' "$f"
  
  # 修复 membersLoading
  sed -i 's/const membersLoading = /const _membersLoading = /g' "$f"
  
  # 修复 _dayBeforeYesterdayLocal
  sed -i 's/_dayBeforeYesterdayLocal/__dayBeforeYesterdayLocal/g' "$f"
  
  # 修复 _activitiesLocal
  sed -i 's/_activitiesLocal/__activitiesLocal/g' "$f"
done

echo "Done!"
