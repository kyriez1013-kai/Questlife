# CODEX 交接

> 所有截图与测试都是 **Web / 本地模拟** 结果，**不等于手机上通过**。

## 起点与分支
- worktree：`~/dev/questlife-frontend-v2`，分支 `design/frontend-v2`，起点 `wip/today-perf` @ `7b10a17`。
- 提交顺序：`2bd3908` 阶段 A 文档 → `60eb8ab` / `7faecae` **新方向探索（已冻结，不继续）** → 精修提交（见 `git log`）。
- 主目录 `QuestLife-v1` 全程只读；未部署、未 push、未改后端。

## 已完成（并有对照图，见 `06_精修记录.md`）
Today 与 Capture 的细节精修（T1–T6、C1–C2）；首用「怎么开始」新路径（F1–F3）。现有玻璃/材质/主题/动效未动。
第二轮 R1–R6：Today 动作优先层级、删除重复记录入口、首用玻璃化、Capture 聚焦/发送键/底部、首用建议与 Today 同源（`src/onboarding/useFirstStart.ts`）、浅/深对照总览。

## 验证命令
```
npx tsc --noEmit                      # 通过
npm run test:first-start              # 新：首用建议规则（含 zh/en 全组合）
npm run test:theme && npm run test:insights-v3 && npm run test:adaptive-decision   # 基线通过
node tests/native/todayCommandWork.test.cjs   # 5/5
npm run build                         # Web 导出通过
```
开发服务：`EXPO_NO_TELEMETRY=1 npx expo start --web --port 8101`（**不要加 `CI=1`**：会关掉文件监听，服务旧包——我踩过）。

## 剩余任务（按依赖排序）
1. **【必须真机】** 首用新屏的键盘 / 安全区 / 小屏（iPhone SE）检查。目标：「看今天的建议」按钮在 3 个选项都选完后无需滚动即可点到。验收：真机截图。
2. **【必须真机】** 重装 iOS 包。现状见 `01_现状地图.md` §5：物理机装的是 `8f23b19`，且免费 Personal Team 描述文件已于 2026-10-22 01:15 (CST) 过期，App 很可能已打不开。之后的 Capture 输入框高度修复（`a0c0e8e`）从未装到手机。
3. Capture 提交后的确认卡（`HomeCapturePending`）精修：本轮未做（本地无后端走不通解析）。需要带后端或 mock 的 `/api/parse` 才能验收。
4. 第 3 / 7 / 21 天的 Today 行为验证（S0–S3 门槛在 `src/v11/todayPresentation.ts`）：写 Playwright 脚本按日注入数据并断言「证据阶段」措辞。可与 1 并行。
5. 原生检查首用玻璃卡片的回落样式（Web 才有 backdrop-filter；原生是主题 surface 色），以及 R4 聚焦样式在 iOS 上的表现（CSS 只作用于 Web）。
6. `onDirectLog` 已不渲染；如确认不再需要，可在后续清理 prop 链（`HomeScreen` → `V11IntegratedTodaySurface`）。

## 后端缺口（我没动后端，只记录）
- `/api/parse` 需要登录账号；本地无法验证云端解析链路与失败态。
- `ExecutionLog.durationMinutes` 非可选，0 = 未记录（`store.tsx` 注释已写明）。UI 必须继续把 0 显示为「未记录」而不是 0 分钟。
- 睡眠自评（1–3）用独立单位「睡眠自评1-3」写入 `ContextLog`；任何统计**不得**与睡眠分钟混用。后端若做关联分析需按 `unit` 分组。

## 已知未解决
- 冻结的 `src/v2` 探索里，`~/dev/pw/v2states.mjs`（失败态 E2E）第 3 段「保存失败后重试」未调通。它不影响现有界面（`questlife_v2_ui` 默认关闭）。若将来要复用 `src/v2/screens/useCapture.ts` 的「ACK 之后才算成功 + 重试不重复创建」模式，需先把这段测通。
- 我的 Playwright 脚本在 `~/dev/pw/`（不在仓库内，避免动 lockfile）。需要的话可迁入 `tests/`。
