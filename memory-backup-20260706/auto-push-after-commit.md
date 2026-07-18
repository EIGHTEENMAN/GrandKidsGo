---
name: auto-push-after-commit
description: "commit 成功后自动 git push，无需等用户再说\"推\""
metadata: 
  node_type: memory
  type: feedback
  originSessionId: ddcba3fe-1838-46eb-b16e-be74d11c22be
---

commit 成功后直接 `git push origin <current-branch>`，不要等用户再次指令。

**Why:** 用户认为 commit 和 push 是一步操作，分开等指令是多余的流程。手动等待只会让用户觉得啰嗦。

**How to apply:** 每次 commit 成功后，立即以当前分支名执行 git push。如果推送失败（如分支保护、远程冲突），再报告给用户让用户决定。
