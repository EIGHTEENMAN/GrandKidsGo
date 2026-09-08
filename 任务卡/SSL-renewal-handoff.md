# 阿里云 STS 临时凭证 续签 SSL 流程（2026-09-01 童慧行用）

> **目的**：用阿里云 STS 临时凭证续签 grandand.com 通配 SSL 证书。
> **安全性**：STS 凭证默认有效期 3600 秒（1 小时），过期自动失效，不需要清理。
> **风险**：凭证会进入当前 Claude session 的 .jsonl 历史，但1 小时后失效，影响窗口极小。

---

## 📋 步骤

### 步骤 1：创建 RAM 角色 `acme-sh-renewer`（一次性）

1. 登录 https://ram.console.aliyun.com/
2. 左侧 → **角色** → **创建角色**
4. 选「**阿里云账号**」（不是 ECS 实例角色）
5. 信任主体：选「**其他云账号**」，填你主账号的 UID（在 https://home.console.aliyun.com/ 右上角头像能看到）
6. 角色名称：**`acme-sh-renewer`**
7. 点「完成」

### 步骤 2：给角色授权 DNS 权限

1. 角色列表 → 找到 `acme-sh-renewer` → 点角色名 → **权限管理** → **添加权限**
2. 系统策略 → 搜 **`AliyunDNSFullAccess`** → 勾选 → 确定
3. （可选，更严）自定义策略最小权限：
 ```json
 {
   "Version": "1",
   "Statement": [{
     "Effect": "Allow",
     "Action": [
       "dns:QueryDomain*",
       "dns:AddDomainRecord",
       "dns:DeleteDomainRecord",
       "dns:UpdateDomainRecord"
     ],
     "Resource": "*"
   }]
 }
 ```

### 步骤 3：拿到角色 ARN

- 角色详情页 → **基本信息** → **ARN**
- 形如：`acs:ram::1234567890123456:role/acme-sh-renewer`
- 复制保存

### 步骤 4：创建/使用一个主 AccessKey，加 sts:AssumeRole 权限

1. RAM 控制台 → **用户** → 选你主账号对应的 RAM 用户（或创建 `acme-sh-actor` 子用户）
2. **权限管理** → **添加权限** → 自定义策略：
 ```json
 {
   "Version": "1",
   "Statement": [{
     "Effect": "Allow",
     "Action": "sts:AssumeRole",
     "Resource": "acs:ram::*:role/acme-sh-renewer"
   }]
 }
 ```
3. （如果该用户还没有 AccessKey） **AccessKey 管理** → **创建 AccessKey** → 复制 ID + Secret

### 步骤 5：调 AssumeRole API 拿 STS Token

任选一种方式：

**方式 A：用阿里云 CLI（推荐，你 Mac 上）**
```bash
# 装阿里云 CLI（如已装跳过）
brew install aliyun-cli  # 或从 https://help.aliyun.com/document_detail/110244.html

# 配置 AccessKey
aliyun configure

# 调 AssumeRole
aliyun sts AssumeRole \
  --RoleArn "acs:ram::你的UID:role/acme-sh-renewer" \
  --RoleSessionName "acme-sh-renew-$(date +%s)"
```

输出 JSON 里有：
- `Credentials.AccessKeyId` → STS AccessKey ID（以 `STS.` 开头）
- `Credentials.AccessKeySecret` → STS AccessKey Secret
- `Credentials.SecurityToken` → STS Security Token

**方式 B：用 curl（无需 CLI）**
```bash
curl -s "https://sts.aliyuncs.com/?Action=AssumeRole&RoleArn=acs:ram::你的UID:role/acme-sh-renewer&RoleSessionName=acme-sh-renew&Format=JSON&AccessKeyId=你的主AKId&SignatureMethod=HMAC-SHA1&SignatureNonce=$(date +%s)&SignatureVersion=1.0&Timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)&Version=2015-04-01" | python3 -m json.tool
```
（这个签名比较麻烦，**建议方式 A**）

### 步骤 6：把 STS 三件套发给我

把这三个值**私聊**发我（不要贴公开渠道）：

```
AccessKeyId:     STS.xxxxxxxxxxxxx
AccessKeySecret: yyyyyyyyyyyyyyyy
SecurityToken:   zzzzzzzzzzzzzzzz...
```

⚠️ 这三个必须**同时**用，单独一个没用。

### 步骤 7：我做的事

拿到 STS 后我会立即：

1. SSH 到服务器，装 acme.sh：`curl https://get.acme.sh | sh`
2. 设置环境变量：
 ```bash
 export Ali_Key="STS.xxxxx"       # 你的 STS AccessKeyId
 export Ali_Secret="yyyyyy"      # 你的 STS AccessKeySecret
 export Ali_Token="zzzzzz"       # 你的 STS SecurityToken
 ```
3. 签发：`acme.sh --issue --dns dns_aliyun -d grandand.com -d "*.grandand.com"`
4. 安装到 nginx 路径：
 ```bash
 acme.sh --install-cert -d grandand.com \
   --cert-file /etc/letsencrypt/live/travel.grandand.com/cert.pem \
   --fullchain-file /etc/letsencrypt/live/travel.grandand.com/fullchain.pem \
   --key-file /etc/letsencrypt/live/travel.grandand.com/privkey.pem
 ```
5. `nginx -t && nginx -s reload`
6. **立即 unset Ali_Key/Secret/Token**
7. 跑 Playwright 测试验证 8 个全过
8. 写本地 Mac cron 自动续签（用 acme.sh + scp + ssh reload，每 60 天检查一次）

### 步骤 8（可选）：善后

1. STS Token 1 小时后自动失效（不需手动操作）
2. 你可以选择：
 - **保留主 AccessKey**（用于下次签证书时再 AssumeRole）
 - **删除 acme-sh-actor 子用户**（如果只为这次创建）
 - **保留 acme-sh-renewer 角色**（下次直接用）

---

## ⏱️ 耗时

| 项 | 预计耗时 |
|---|---|
| 创建 RAM 角色 + 授权 | 3 分钟 |
| 创建/使用 AccessKey + 加 AssumeRole 策略 | 2 分钟 |
| 装 aliyun-cli（如未装） | 5 分钟 |
| 调 AssumeRole 拿 STS Token | 30 秒 |
| **总用户操作** | **约 10 分钟** |
| 续签 + reload + 验证 | 5 分钟 |

---

## 🛡 与 AccessKey 方案对比

| 维度 | 长期 AccessKey | STS 临时凭证（推荐） |
|---|---|---|
| 有效期 | 永久 | 默认 3600 秒 |
| 泄露后自动失效 | ❌ | ✅ |
| 需要善后清理 | 必须 | 不需要 |
| 阿里云审计 | 看不出使用记录 | CloudTrail 完整 + 自动失效 |
| 适用场景 | 长期脚本/CI | 一次性 / 短期操作 |

---

**准备好把 STS 三件套发我。** 我立即动手。