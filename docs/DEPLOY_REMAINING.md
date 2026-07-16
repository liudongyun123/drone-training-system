# 班级移出/调班/重新加入 修复 — 剩余部署与回填清单

> 配套脚本：`scripts/deploy-remaining.sh`
> 适用环境：需要能正常访问腾讯云 CloudBase 的网络（本机若报 `ENOTFOUND ...cos.ap-shanghai.tencentcos.cn` 即为 DNS 被拦截，换可访问环境执行）。

环境信息：
- 环境 ID：`rcwljy-5ghmq2ex26764978`
- Web 静态托管域名：`https://rcwljy-5ghmq2ex26764978-1318564729.tcloudbaseapp.com/`
- 本次构建版本：`v20260716-1030-class-remove-rejoin-fix`

---

## 1. Web 静态托管部署（B2/B3 前端生效）

构建产物已生成在 `dist/`，上传即可：

```bash
cd /Users/liudongyun/Desktop/drone-training-system-new
npx cloudbase hosting:deploy dist -e rcwljy-5ghmq2ex26764978
# 或新版命令：
# npx tcb hosting deploy dist / -e rcwljy-5ghmq2ex26764978
```

上传后 CDN 缓存通常几分钟内刷新；若旧版本残留可手动刷新 CDN 或等待。

---

## 2. 小程序重新发布（B1 端上同步生效）

B1 的代码改动已在 `miniprogram/utils/http.ts`（对 `orders` 过滤 `!item.enrollmentCancelled`），
但小程序与 Web 静态托管是**两套独立发布流程**，必须单独上传小程序才能让端上同步。

需用 **微信开发者工具** 或 **miniprogram-ci** 上传（需小程序 AppID + 上传私钥）：

```bash
# 方式 A：微信开发者工具「上传」按钮（推荐，最稳）
#   打开 miniprogram/ 目录 → 工具右上角「上传」→ 填写版本号 v20260716-1030-class-remove-rejoin-fix

# 方式 B：miniprogram-ci 命令行（需提前准备 private.key 与 appid）
npx miniprogram-ci upload \
  --pp ./miniprogram \
  --pkp ./private.key \
  --appid <你的小程序AppID> \
  --uv 1 \
  --desc "v20260716-1030-class-remove-rejoin-fix"
```

> 注意：本仓库未提交 `private.key`（私钥不可入库）。首次使用 miniprogram-ci 请按微信官方文档生成上传密钥。

---

## 3. 历史数据回填（B4：补齐老移出学员的同步标记）

`scripts/db-migration/backfill-enrollment-cancelled.js` 会扫描 `cancelled/dropped` 的 enrollments，
为对应班级订单补 `enrollmentCancelled=true` 并收回该班视频权限（与 `removeMember` 行为一致）。
脚本**幂等、非破坏性（只 update 不 delete）**。

```bash
# 第 1 步：只统计，不写入（确认影响范围）
node scripts/db-migration/backfill-enrollment-cancelled.js --dry-run

# 第 2 步：确认无误后正式执行
node scripts/db-migration/backfill-enrollment-cancelled.js
```

可通过环境变量覆盖端点（默认指向生产 db-init）：
```bash
DB_INIT_URL=https://rcwljy-5ghmq2ex26764978.service.tcloudbase.com/db-init \
  node scripts/db-migration/backfill-enrollment-cancelled.js --dry-run
```

---

## 一键执行

```bash
# 部署 Web 静态托管 + 执行 B4 回填（回填默认 dry-run，加 --apply 才真正写库）
bash scripts/deploy-remaining.sh

# 直接正式回填（谨慎）：
bash scripts/deploy-remaining.sh --apply
```

小程序发布（第 2 项）因依赖微信私钥/工具，无法在脚本内一键完成，请按上方「方式 A/B」手动上传。
