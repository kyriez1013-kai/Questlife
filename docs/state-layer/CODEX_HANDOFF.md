# CODEX 交接：状态层 v0

> **所有结果都是 Web / 模拟环境结果，不等于手机上通过。规则是起点假设，需要用用户本人至少 30 天的数据校准。**

## 分支与提交
- worktree `~/dev/questlife-frontend-v2`，分支 `feature/state-layer-v0`，起点 `9c24c16`（`design/frontend-v2`）。
- 提交顺序：模型（纯函数 + 单测）→ 界面 → PWA → 文档。具体见 `git log 9c24c16..`。
- 未 push、未部署、未改后端；主目录 `QuestLife-v1` 只读，结束时 `git status` 与开始时一致。

## 代码地图（`src/state-layer/`）

| 文件 | 内容 |
|---|---|
| `types.ts` | `StateLayerPayload`、类型、动作 id、`Demand`、`BrainDumpRecord` |
| `baseline.ts` / `signals.ts` | 个人基线（中位数 / MAD），被动信号（睡眠、静息心率、HRV、训练、日程） |
| `classifyState.ts` | 13 条有序规则 → 5 类 + 说不准 |
| `explain.ts` / `copy.ts` | 理由行、没用到的信号、全部中英文案、研究出处一句话 |
| `actions.ts` / `reorder.ts` | 首选 / 备选、回访到期；重排算法 |
| `outcomes.ts` / `calendar.ts` | 回访结果计数；状态日历和滞后描述 |
| `brainDump.ts` | 切分、空档、生成日程块 |
| `checkIn.ts` | 构造签到记录 |
| `useStateLayerActions.ts` | 预览 → 确认 → DecisionEpisode → apply → 撤销 |
| `StateLayerToday.tsx` | Today 卡片 |
| `StateBrainDumpSheet.tsx` / `StateReorderSheet.tsx` | 两个 Sheet |
| `StateInsightsSection.tsx` | 洞察「状态」 |
| `state-layer.css` | 样式 |
| `featureFlag.ts` | `?state_layer=0` |

接入点：
- `HomeScreen.tsx`（`stateSlot`、首用建议让位）
- `V11IntegratedTodaySurface(.native).tsx`（新增 `stateSlot` 属性）
- `V11InsightsScreen.tsx`（「状态」标签）
- `SettingsScreen.tsx`（抛硬币开关）
- `App.web.tsx`（离线提示、注册 SW）
- `public/`（PWA）

## 验证命令
```
npx tsc --noEmit                         # 通过
npm run test:state-layer                 # 157 项检查：规则全覆盖（1200 种组合）、基线、信号、理由、重排+planPatch 往返、回访计数、日历、清空脑子、SyncV2 / 备份校验兼容
npm run test:first-start && npm run test:theme && npm run test:insights-v3 && npm run test:adaptive-decision
node tests/native/todayCommandWork.test.cjs
npm run build                            # Web 导出（含 manifest / sw.js）
```
浏览器脚本在 `~/dev/pw/`（不在仓库里）：
- `sl_flow.mjs`：完整流程，浅色 / 深色
- `sl_insights.mjs`、`sl_extra.mjs`：洞察和设置的截图
- `sl_worst.mjs`：最差状态测试（需要先 `npm run build`，再在 `dist/` 起 `python3 -m http.server 8123 --bind 127.0.0.1`）
- `sl_pwa.mjs`：PWA 安装与离线

## 剩余任务（按依赖排序；每条附验收标准）
1. **【必须真机】iPhone 上把 PWA 加到主屏幕**（部署步骤见下）。
   - 验收：从主屏幕打开时没有 Safari 地址栏；登录一次后杀进程再开，仍是登录状态；飞行模式下能打开 Today，看到最近数据和离线提示。
   - 同时确认安全区：底部 Tab 不被 Home 指示条压住；决定状态栏是否改成 `black-translucent`（决策 #18）。
2. **【必须真机】人手实测最差状态**：在真实的疲惫时刻，从点主屏幕图标到看到动作，用秒表计时 5 次。
   - 验收：中位数 ≤ 10 秒、2 次点按。脚本只测到机器时间（中位 0.22 秒），**人的阅读和决定时间没有测**。
3. **原生端**：
   - 状态卡在原生上用的是回退布局（主题底色，没有玻璃），没有在模拟器或真机上看过。
   - 洞察「状态」标签和离线提示只在 Web 上有。
   - 验收：iOS 模拟器截图，且 `NativeApp` 的 Today 能完成签到。
4. **30 天后校准规则**：导出所有 `stateLayer.correction` 和规则判断不一致的记录，看哪条规则错得最多。
   - 验收：给出新阈值，以及它在历史记录上的改正一致率（只用计数）。
5. **洞察「状态」的对照**：任务要求每个界面都有改前 / 改后。洞察和设置有（`S3`、`S4`），重排预览、清空脑子、回访是全新界面，只有改后截图。
6. 可选：把旧的 `RescueLog.triggerType`（overthinking / avoidance / sleep_debt…）映射到 5 种类型，统一成一套状态语言（见 `01_现有能力映射.md` §6）。
7. 可选：登录且开了 AI 时，「清空脑子」可以用 `/api/parse` 给建议时间。默认不调用。

## 后端缺口
- **无。** 新字段全部走现有实体的 JSON payload，单测证实 SyncV2 的 `validEntity` 和备份 schema 都接受。没有加 migration。
- 提示：
  - 回访记录和用户改正是以后校准规则的数据。如果后端将来要做分析，需要按 `stateLayer.kind` 区分签到和回访。
  - `overallFrom: 'energy'` 的记录，它们的 `overall` 不是独立测量，分析时要剔除。

## PWA 部署步骤（**未执行**，等你确认）
1. `npm run build` → `dist/`，里面有 `index.html`、`manifest.webmanifest`、`sw.js`、`icons/`。
2. 部署到任意 HTTPS 静态托管（例如现有 Vercel 项目的一个**预览**环境，不碰旧的 Owner Production）。需要 SPA 回退：所有路径都返回 `index.html`。
3. `sw.js` 和 `index.html` 设 `Cache-Control: no-cache`；`/_expo/static/*` 可以长期缓存。
4. iPhone Safari 打开地址 → 分享 → 添加到主屏幕。
5. 注意：iOS 主屏幕应用的存储和 Safari 是分开的，Safari 里的登录和本地数据**不会带过去**，需要在主屏幕应用里重新登录一次（或从备份恢复）。
