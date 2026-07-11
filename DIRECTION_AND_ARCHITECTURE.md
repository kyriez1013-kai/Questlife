# QuestLife 方向分析与目标架构(2026-07-11)

> 证据规则:confirmed = 代码或本机可验证;inferred = 有间接依据;unknown = 无证据。
> 输入:QuestLife_full_context JSON、代码审计(2026-07-11)、已修复管线(commit `d045701`,生产已验证真实写入)。

---

## 阶段一:五个方向的前提检验

### A. Personal Data Hub(跨产品数据入口和总览)

| 前提 | 状态 | 理由 |
|---|---|---|
| P1 存在多个垂直产品持续产出高质量数据 | **不成立** | 唯一候选 QuestFit 存在(confirmed:`/Users/kyrie/Documents/QuestFit/` 是真实 Expo 项目,有 src/ 和 dist/),但成熟度 unknown;睡眠/学习/工作无任何垂直产品(confirmed:磁盘无对应项目) |
| P2 有外部数据导入接口 | **不成立** | QuestLife 代码中零外部数据源集成;Objective Context 是手动粘贴(confirmed:审计,`source: 'manual'` 为主,healthkit/sensor/import 枚举值存在但无实现) |
| P3 hub 不承担底层记录 | 架构上成立 | — |

补齐性质:P1 需要**根本性投入**(先做出多个成熟垂直产品);P2 是中期工程(每个源一个 importer),但在 P1 成立前无意义。→ **现在不可选。**

### B. Decision Layer(消费垂直数据生成跨域决策)

| 前提 | 状态 | 理由 |
|---|---|---|
| P1 多个成熟垂直数据源 | **不成立** | 同 A-P1 |
| P2 跨域因果推断可靠 | **不成立** | 这正是文档记载的核心失败原因(why_it_stalled:变量过多、因果推断困难、core_paradoxes),不是工程问题,是数据+方法问题 |
| P3 服务端持久 memory/evidence 管线 | **成立(本周起)** | confirmed:`d045701` 后 /api/brief 服务端读写 Pattern/Decision Memory,生产验证 |

补齐性质:P1、P2 都是根本性投入。P3 的成立说明工程侧不再是瓶颈——但只满足 1/3。→ **是远期目标态,不是当前方向。注意:D(research mode)是它的前置路径。**

### C. Single-domain revival(单领域重做)

| 前提 | 状态 | 理由 |
|---|---|---|
| P1 该域可量化 | 训练域成立 | confirmed:schema 有 performance_log/e1RM/RPE/weight×sets×reps(storage.ts:58-62) |
| P2 记录摩擦低到可持续 | 部分成立(inferred) | 执行记录是最密的流(9 条/28 天,一次性 debug 快照),其中训练占比 unknown |
| P3 schema 支持 | 训练域成立 | confirmed,onboarding 首个模板即"提升力量/健身" |
| P4 不与已有垂直产品重叠 | **不成立** | **confirmed(本次新证据):QuestFit 项目真实存在。** 训练域重做 = 与 QuestFit 结构性撞车;context 文档自己也把"可能与其他产品重叠"列为该方向 risk |

换域检验:睡眠 P2 不成立(2 条/7 天,最稀);学习 P1 不成立(文档:读书/学习不能只看时长);情绪时间尺度不稳。→ **最强的域被 P4 挡死,次强的域 P1/P2 更差。训练域的价值应流经 QuestFit,不在 QuestLife 里重做。**

### D. Research mode(单用户研究仪器)

| 前提 | 状态 | 理由 |
|---|---|---|
| P1 单用户自用,无商业/大众 UX 要求 | 成立 | confirmed:唯一真实用户是本人(EXECUTION_RULES 措辞、匿名 analytics 无多用户迹象) |
| P2 evidence/memory 管线可用 | 成立 | confirmed:v1.25–v1.7 已实现,且 `d045701` 后服务端化 |
| P3 维护成本可承受 | 成立(inferred) | 冻结加法开发后维护面小;文档承认"仍有维护成本"是唯一 risk |
| P4 数据能沉淀到可研究的位置(不困在单设备 localStorage) | **成立(本周起)** | confirmed:`d045701` 前不成立(审计:本地数据从未同步),现在生产已验证真实写入 |

→ **唯一一个前提当前全部成立的方向。** 且 P4 是本周才翻转的——管线修复把 research mode 从"名义上的仪器"变成"真的能测量的仪器"。

### E. Event-driven reflection(事件驱动复盘)

| 前提 | 状态 | 理由 |
|---|---|---|
| P1 用户在关键事件后愿意复盘 | unknown | 无数据 |
| P2 稀疏数据也有价值 | 有张力 | 与 evidence pipeline 的密度需求矛盾(文档自己标注 risk:"数据更稀疏,难做趋势") |
| P3 有事件捕捉入口 | 不成立但**短期可补** | ContextLog.type 封闭 union 无此值(confirmed types.ts:730),加一个枚举值+入口即可 |

→ **不构成独立方向,但作为 D 内部的一种低摩擦记录模式成立**(研究仪器允许稀疏样本,产品才不允许)。

## 推荐:D(Research mode),吸收 E 作为记录模式;C 的训练域让给 QuestFit;A/B 作为 D 产出数据后的远期目标态

推理链:

1. 五个方向的失败前提有一个公因子:**数据可得性/记录摩擦,而不是工程能力**(context 文档 why_not_continue_now 直说;审计发现的工程缺口在一周内补齐并生产验证,也反证了这点)。
2. 因此,依赖"数据已经存在"的方向(A、B)现在必然不成立,且不是短期可补。
3. 依赖"高频记录将会发生"的方向(C)在其最强的域上与 QuestFit 结构性冲突(本次 confirmed),换域则前提更差。
4. 剩下 D 是唯一前提全部成立的方向——而且它不是消极兜底:D 的产出(哪些数据真实沉淀、哪些 pattern 被证伪、哪个域密度撑得住)**正是未来判断 A/B/C 是否可行的判据**。方向之间不是并列关系,是依赖关系,D 在依赖图的根部。
5. 文档自己的 recommended_position("长期 research / personal operating model lab / future decision layer")与此一致;本分析的增量在于:管线修复后 D 的关键前提 P4 从不成立翻转为成立,推荐从"合理的撤退"升级为"当前唯一前提齐备的进攻路线"。

### 推荐的性质声明

这是基于代码现状与产品历史的合理推理,**不是**被真实用户行为数据验证过的结论——验证所需的持续记录数据目前不存在(服务端数据从本周才开始积累)。一句话说清风险:**这个推荐最可能错在 D-P1 里隐含的动机假设——"降低范围后本人仍会持续记录";如果连 research mode 的记录都趋零,错的不是方向排序(其他方向前提更不成立),而是"QuestLife 还值得维护"这个更上游的判断,届时正确动作是归档。**

---

## 阶段二:Research mode 目标架构

重定义:QuestLife 从"给用户的产品"变为"单用户研究仪器"。仪器的四个能力:**测量**(记录,已有)、**沉淀**(服务端持久化,d045701 已有)、**检验**(pattern 证伪,缺)、**审计**(数据密度可视,缺)。架构工作 = 冻结产品面 + 补齐后两个能力。

### 1. 模块盘点(对照 recommended_reduction)

**保留(不动)**:Smart Capture、Goal/Module/Skill 最小结构、evidence pipeline(decisionPayload.ts)、Decision/Pattern Memory、confirm/apply/undo、/api/sync、/api/brief、状态打卡、Objective Context 粘贴。

**冻结(入口下线,数据不删)**:
- Control Center:代码实体是 `dashboardPreferences`(types.ts:854)+ `DashboardLayoutControls.tsx` + `dashboardCards.ts`(confirmed)。文档已 product_rejected,冻结入口即可。
- 常空 dashboard 卡片(StatsScreen/Insights):按审计面板(下文)的空卡率数据决定冻结名单,不凭感觉删。
- 激励类 UI(最低启动/rescue):保留但停止迭代。

**删除:无。** research mode 下删除的风险(EXECUTION_RULES 数据安全铁律、回滚成本)大于收益,一律冻结优先。

**新增(3 个,全部小)**:
1. **Research Audit 面板**——直接回答 recommended_if_reopened.audit_questions(哪些字段真实持续产生数据/哪些卡常空/哪些 pattern 被证伪/哪个域最稳)。数据源:Supabase 五表。挂在 SettingsScreen 现有 debug 区(复用 `decisionDebugVisible` 机制),不新增屏幕。
2. **Pattern 证伪机制**——回答 open_questions"PatternMemory 如何自动失效或降权"。
3. **event_reflection 捕捉**——吸收方向 E。

### 2. 数据结构调整(全部加法,零迁移风险)

- `PatternMemory` 增可选字段(types.ts,任务点名故可动):
  ```ts
  evidenceAgainst?: PatternMemorySupport[];   // 矛盾证据,与 support 对称
  contradictionCount?: number;
  lastValidatedAt?: string;                   // 最近一次有新支持证据的时间
  needsReview?: boolean;                      // 不加 status 枚举值,避免动 migrate 白名单
  ```
- `ContextLog.type` union 增 `'event_reflection'`(types.ts:730;migrateContextLog 默认 'custom',宽松,旧数据零影响)。
- Supabase:一个只读视图 `research_density`(domain × week 聚合),不新增表。
- 衰减规则(读取时计算,不改存储):`displayConfidence = confidence × 0.9^(距 lastValidatedAt 的整月数)`;accepted pattern 的 contradictionCount ≥ 2 → needsReview = true,brief prompt 中只能作 caution。

### 3. 实施步骤(每步验收 = 可被验证,非完成度)

| # | 步骤 | 验收标准 |
|---|---|---|
| 1 | 冻结 Control Center 入口(条件渲染掉布局编辑控件) | 生产页 Today/Insights 无布局编辑 UI;`questlife.v1` blob 中 dashboardPreferences 数据仍在(浏览器 console 读出) |
| 2 | `supabase/research_views.sql`:research_density 视图 | SQL editor 查询结果与 Settings debug 面板的本地计数一致(同一 anonymous_user_id) |
| 3 | `/api/research`(GET,聚合密度+pattern 状态流转) | curl 返回与视图一致;缺 user id 参数返回 400;匿名 key 访问被拒 |
| 4 | Research Audit 面板(SettingsScreen debug 区) | 面板数字 == /api/research == SQL 三方一致 |
| 5 | PatternMemory 证伪字段 + 读取时衰减(types.ts + patternMemory.ts + storage.ts migrate) | 构造 lastValidatedAt 为 2 个月前的 pattern → payload 中 confidence 按 0.81 倍呈现;构造 2 条矛盾 after-state → needsReview=true |
| 6 | brief prompt 规则:needsReview pattern 仅作 caution(api/brief.ts SYSTEM_PROMPT + sanitize) | 构造场景后真实调用,`pattern_references[].used_as === 'caution'` |
| 7 | event_reflection 入口(Smart Capture 加类型 + ContextLog union) | 生产记录一条,Supabase context_logs 出现 `type='event_reflection'` 行 |

顺序即依赖序:2→3→4 是一条链;1、5-7 独立可并行。每步单独 commit(EXECUTION_RULES 第 7 条),tsc 零报错 + 生产 web 实测(第 13 条)。

### 4. 判断方向走对的观察信号(窗口自定)

- **底线信号**:每周各域记录条数 > 0(现在服务端可直接量,不再靠 debug 快照)。趋零 = 触发性质声明里的归档判断。
- **仪器在检验而非只积累**:pattern 状态流转发生(candidate→accepted、accepted→needsReview 各至少出现过);evidenceAgainst 有非空记录。
- **个人化在增长**:brief 的 evidence_basis 分布中 population_prior 占比随时间下降。
- **界面诚实度**:audit 面板的空卡率下降(冻结名单生效)。
- **反信号**:brief 全部 population_prior 且 pattern 零流转持续多周 → 仪器测不到东西,回到归档判断。

### 明确不做

不做 ML/baseline 训练(阶段一推理不需要它,数据密度前提也不成立);不做商业化;不做新领域扩张;不做跨域因果结论(单域内关联 + 证伪为界)。
