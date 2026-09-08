# 步骤 4：给 RAM 用户添加 sts:AssumeRole 限定到角色 ARN（详细图文）

> **目的**：让"哪个 RAM 用户能 AssumeRole 哪个角色"显式限定。最小权限原则——不开放所有 AssumeRole，只允许 Assume 我们刚创建的 `acme-sh-renewer`。
> **位置**：RAM 控制台 → 用户 → 选你主账号对应 RAM 用户 → 权限管理 → 添加权限 → 自定义策略 → 粘贴 JSON

---

## 📋 详细步骤

### 4.1 找到你的 RAM 用户
1. 打开 https://ram.console.aliyun.com/users
2. 用户列表里找到**你日常登录用的那个用户**（一般用户名=你登录邮箱前缀，或专门管 RAM 的子账号）
3. **点击用户名**进入用户详情页

### 4.2 添加权限
4. 用户详情页左侧菜单 → **权限管理**
5. 点击页面右上角 **「+添加权限」** 按钮
7. 在「添加权限」弹窗里：
   - 授权范围**留默认**「整个云账号」（除非你想限定到特定资源组）
   - 权限类型选 **「自定义权限策略」**（不是「系统策略」）
   - 如果列表为空（你从没创建过自定义策略）：
     - 点 **「请先创建权限策略」** 或去 https://ram.console.aliyun.com/policies/new
     - 进策略创建页后选 **「脚本编辑」**（右上角 tab）
   - 如果已有自定义策略：
     - 直接搜「assume」看有没有现成的，没有就点 **「创建自定义权限策略」**

### 4.3 创建自定义策略（脚本编辑模式）

**策略名称**：`AllowAssumeRoleAcmeSh`

**「脚本编辑」**模式下粘贴以下 JSON：

```json
{
   "Version": "1",
   "Statement": [
      {
         "Effect": "Allow",
         "Action": "sts:AssumeRole",
         "Resource": "acs:ram::你的UID:role/acme-sh-renewer"
      }
   ]
}
```

**关键**：把 `你的UID` 替换成你主账号的 UID（数字字符串）。

#### 怎么查你的 UID？
- 打开 https://home.console.aliyun.com/
- 右上角**头像** → 鼠标悬停一会儿会看到「账号 ID」 或「UID」字样
- 或者直接 URL 里有：`https://home.console.aliyun.com/home/<UID>`
- 形如 `1234567890123456`

**示例**（假设你的 UID 是 `1773999888000111`）：
```json
{
   "Version": "1",
   "Statement": [
      {
         "Effect": "Allow",
         "Action": "sts:AssumeRole",
         "Resource": "acs:ram::1773999888000111:role/acme-sh-renewer"
      }
   ]
}
```

### 4.4 提交策略

8. 点「**确定**」/「**下一步**」创建策略
9. 返回用户详情 → 权限管理 tab → 重新点「**+添加权限**」
10. 这次在「自定义权限策略」下拉里能搜到刚创建的 `AllowAssumeRoleAcmeSh`
11. 勾选 → 「确定」

### 4.5 验证
- 用户详情 → 权限管理 tab 应该看到 `AllowAssumeRoleAcmeSh` 在「自定义策略」分类下

---

## 🎯 关键检查点

| 检查项 | 正确 | 错误 |
|---|---|---|
| Resource 格式 | `acs:ram::1234567890123456:role/acme-sh-renewer` | `acs:ram::*:role/*`（范围太大） |
| Action | `sts:AssumeRole` | `*` 或 `ram:*`（范围太大） |
| Effect | `Allow` | `Deny`（拒签就废了） |
| JSON 语法 | 必须用双引号 | 单引号会报错 |
| 策略挂载对象 | 你的 RAM 用户（不是角色） | 挂错位置 |

---

## ⚠️ 常见错误

**错误1：把策略加到角色上而不是用户上**
- 角色权限是「这个角色能做什么」（如改 DNS 记录）
- 用户权限是「这个用户能做什么」（如 AssumeRole）
- 你需要的是后者

**错误2：Resource 写错**
- ❌ `acs:ram:::role/acme-sh-renewer`（少了 UID）
- ❌ `acs:ram::1773999888000111/role/acme-sh-renewer`（少冒号）
- ✅ `acs:ram::1773999888000111:role/acme-sh-renewer`

**错误3：UID 写成阿里云账号登录名**
- 账号名（邮箱/手机号）和 UID（数字）不一样
- 一定要数字 UID

---

## 📍 完成后的下一步

回到 handoff 文档（`/Users/shibaxia/工作/童慧行/任务卡/SSL-renewal-handoff.md`）步骤 5：
- 装 aliyun-cli
- `aliyun configure` 配主 AK
- `aliyun sts AssumeRole` 拿 STS Token 三件套
- 发给我

---

## 🆘 如果卡住了

- 截图发我看（**注意脱敏**——UID 是公开的但别截 access key）
- 或描述「卡在第几步」「页面显示什么错误」「按钮在哪里找不到」
- 我实时解答