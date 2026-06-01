# QuestLife 执行端通用铁律 (EXECUTION_RULES.md)

任何 AI 执行端（Claude Code / Codex / Cline 等）在本项目改代码前，必须先读本文件并全程遵守。违反任一条视为任务失败。

## 通用铁律
1. 不整页替换已有屏幕文件。只在其中【新增】，现有内容一律不删不改，除非该任务明确要求改某处。
2. 不新增写死的颜色/圆角/间距/字号。所有视觉值取自 getQuestTheme() 的 theme.colors.* / radius.* / spacing.* / typography.*。
3. 新 UI 用项目现有的 QuestCard / QuestEntityIcon 等包装组件，保持视觉一致。
4. 所有文案走 i18n：t(lang, key)，lang 取 data.settings.language ?? preferredLanguage。禁止任何写死的中/英文字符串出现在 JSX。新增 key 必须 zh 和 en 同时补全。
5. 状态/质量着色一律调用 tokens.ts 的 getStateToneColor(value, theme)，不自造配色分支。
6. 数据唯一入口 const { data } = useStore()。不引入新 store、不改数据模型、不动数据读写/迁移层。
7. 开工前先 git commit 当前状态（项目无 git 则先 git init）。完成后单独 commit，便于回滚。

## 数据安全（最高优先级）
8. 本项目有真实用户数据在使用中。任何任务都禁止触碰 AsyncStorage 的读写/迁移逻辑，除非任务明确要求。如必须改，先导出现有数据做备份。

## 质量门槛
9. 时间维度一律用 new Date(x.createdAt).getHours() 取本地小时，禁止 UTC。
10. 完成前必须 tsc 编译零报错。
11. 完成前在手机宽度（~390px）下检查新 UI 不溢出、不重叠。
12. 在 cleanFocus(浅) 和 deepWork(深) 两个主题下都要正常显示。
13. 验收必须在真实 web UI 上端到端实测。"API 测试通过""tsc 零报错""单元逻辑正确"都不等于完成——必须在部署后的线上 web 页面，用真实用户操作走完整条链路（点击→确认→数据真正写入→刷新后仍在），亲自验证后才算完成。报告里要写明"已在真实 web UI 实测"及具体操作步骤与结果。
14. 注意 web 与原生差异。本项目通过浏览器(RN Web)访问，部分 React Native API 在 web 上行为不同或失效（已知：Alert.alert 在 web 是空实现 no-op）。涉及确认弹窗、原生交互、存储等功能时，必须确认其在 web 环境真正生效，web 不可用的 API 要提供 web 等价实现（如 window.confirm）。

## 不可触碰区（除非任务点名）
数据模型(types.ts)、导航、Today/Goals/Schedule/Settings 各屏。

## 完成报告格式
新建文件清单 / 改动位置清单 / 新增 i18n key 数 / 上述每条的自检结果。
