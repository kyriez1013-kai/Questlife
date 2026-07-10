# QuestLife 两周可证伪实验:力量训练课质量预测

> 状态声明:本文档是一份**实验计划**,配套的是已修复并本地端到端验证过的数据管线代码(commit `d045701` 起)。
> 它**不是** QuestLife 的产品方向决策。方向决策等两周真实数据出来后再做。
> 证据规则:所有陈述标注 confirmed(代码/本对话中可验证)/ inferred(有间接依据)/ unknown。

## 0. 前提:管线状态

- 本地记录(ExecutionLog / ContextLog / StateCheckIn / DecisionResult / PatternMemory)现在会经 `/api/sync` 幂等 upsert 到 Supabase(confirmed,本地 e2e 已验证,见 PHASE1 验证记录)。
- 生产生效前还差两步人工操作:在 Supabase SQL editor 执行 `supabase/decision_ai_sync.sql`,然后 `git push` 部署。**实验计时从这两步完成后的第一条真实记录开始。**

## 1. 领域选择:力量训练(strength_training)

理由(按用户给出的两个筛选条件):

1. **记录密度相对最高**(inferred):PROJECT_STATUS.md 的一次性 debug 快照显示 28 天 9 条 execution 记录 vs 7 天仅 2 条 context(睡眠)记录。执行记录是现有最密的流;训练是其中可量化性最强的子集。训练在这 9 条中的确切占比 **unknown**——因此设第 3 天 go/no-go 检查点(见 §5)。
2. **时间尺度稳定**(confirmed by schema):训练按课次发生(天级),不像情绪按小时波动。schema 对该领域支持最完整:`metricConfig.performanceType='strength'`、`trackRPE`、`useEstimated1RM`、结构化 weight/sets/reps(src/storage.ts:58-62),onboarding 第一个模板就是"提升力量/健身"。
3. 排除项:情绪(小时级波动,用户明示排除);工作/学习(质量难量化,context 文档"学习不能只看投入时间");睡眠(数据最稀,2 条/7 天,且它更适合做输入变量而不是预测对象);生活维护(低价值)。

## 2. 预测目标与 ground truth

**目标变量**:每次力量训练课在完成记录时用户照常填写的 `qualityRating`(1–5)。
不新增任何记录动作——ground truth 就是现有表单里已有的字段(confirmed:ExecutionLog.qualityRating 存在于 types/storage)。

**预测时点**:当天第一次打开 app 时(或训练前),系统给出对今天训练课质量分的点预测(1–5 整数)。预测必须在训练记录提交**之前**生成并落库(decision_results / 或一条带 `predictedQualityRating` 的记录——schema 已有该字段,confirmed:storage.ts:365)。

## 3. 笨预测 baseline(两个,都必须被打败)

- **B1 惯性 baseline**:预测 = 上一次力量训练的 qualityRating(last-value / persistence)。
- **B2 众数 baseline**:预测 = 该用户历史训练质量分的众数(平票取较低值)。

**baseline 在现有数据上的表现:unknown。** repo 中没有可检验的数据文件(阶段一审计 confirmed:唯一的条数来自 PROJECT_STATUS.md 的一次性 debug 快照,且不含质量分数值)。因此实验第一周的前 3 次训练为纯收集期:只记录,不出预测,用它们初始化 B1/B2 并报告其表现。

## 4. 最小个体化方法(非 ML,规则冻结)

`prediction = clamp(B1 ± 调整项之和, 1, 5)`,三个调整项,输入全部来自已有 schema:

| 输入 | 来源(confirmed 存在) | 规则 |
|---|---|---|
| 前夜睡眠分钟 | ContextLog type='sleep'(healthContextParser 已能解析中文睡眠表达) | <360min → −1;≥450min → 0;缺失 → 0 |
| 距上次训练间隔 | ExecutionLog.date 差值 | 1 天 → −1;2–3 天 → 0;≥4 天 → −1 |
| 当天最近状态打卡 overall | StateCheckIn.overall(1–5) | ≤2 → −1;≥4 → +1;缺失 → 0 |

为什么理论上可能超过 B1:B1 完全忽略当天条件;这三个变量是天级、低噪声、且有运动科学 population prior(睡眠×表现、恢复间隔×表现)支持的输入。它比 ML 简单得多:无训练、无拟合、13 行代码能实现。

**防过拟合约束**:上表阈值即日冻结。两周内不得改动任何阈值或增删规则;改了就清零重新计时。

## 5. 判定标准(两周结束时,机械执行)

先过**数据量 gate**:
- 两周内 ≥6 次带 qualityRating 的力量训练记录,且 ≥8 天有睡眠 context。
- 第 3 天检查点:若前 3 天 0 条训练记录,实验对象改为当时密度最高的执行子类;若整体执行记录也为 0,实验直接判定失败(原因是记录摩擦,不是预测方法)。

**"值得继续投入"**(须同时满足):
1. 在 ≥6 个预测点上,规则法 MAE 比 B1 和 B2 都低 ≥0.3(或精确命中率高 ≥15 个百分点);
2. 至少 1 次预测在事前被看到并实际改变了当天训练决策(证明有行动价值,不只是数字准)。

**"该放弃、转 research mode"**(任一满足):
- 数据量 gate 未过(最窄、最可量化的领域都撑不起记录密度 → 印证 context 文档的"记录成本过高"结论,按其 future_revival_options 转 research mode / event-driven reflection);
- 规则法 MAE ≤ 任一 baseline 的优势不足 0.3 且命中率优势 <15pp(个体化信号弱于惯性 → 个体化假设在此领域证伪);
- 预测全对但两周内没有任何一次影响行为(准确≠有用)。

灰区(只赢一个 baseline、或优势在阈值边缘):延长两周、规则仍然冻结,不加新功能。

## 6. 再次声明

本实验的输出是**一个可证伪的判定结果**。"QuestLife 应该往哪走"(独立产品 / Decision Layer / research mode)的决策,依据的是 §5 的判定结果加两周真实数据,而不是本文档。
