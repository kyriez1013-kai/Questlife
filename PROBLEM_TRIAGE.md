# QuestLife 问题分级(2026-07-11)

> 任务边界:只做问题分级与综合判断,不设计架构,不做产品方向推荐。
> 证据规则:confirmed = 代码/本机可验证;inferred = 有间接依据;unknown = 无证据。
> 分级定义:可解决 = 现阶段有具体可执行解法;部分可解决 = 可缓解不可根除;暂不可解决 = 卡点超出现阶段可处理范围。
> 勘误:审计原文为"执行记录总计 9 条/28 天,训练占比 unknown",非"训练 9 条/28 天"。

## A. 数据层

| # | 问题(来源) | 分级 | 理由 / 解法 / 卡点 |
|---|---|---|---|
| A1 | 记录成本过高:越细摩擦越高,越简 evidence 越不足(why_it_stalled) | 部分可解决 | 缓解:一句话 capture、粘贴解析(healthContextParser 已存在,confirmed)、事后补记。极限:一切自报数据都有边际成本,降不到零;根除需被动采集(HealthKit/传感器),当前是 RN Web,属中期投入 |
| A2 | 主观状态数据不稳定、随情绪漂移(weaknesses.data) | 部分可解决 | 缓解:客观 context 优先级已写入 prompt(confirmed)、after-state 三值化(up/same/down)已降噪。极限:主观量表的心理测量噪声无法工程消除 |
| A3 | 客观数据源不统一、格式兼容复杂(product_evolution) | 部分可解决 | 缓解:中文睡眠解析已有;每个源写 importer 是可执行工程。极限:无 API 集成前永远依赖手动搬运;`source: 'healthkit'/'sensor'/'import'` 枚举存在但无实现(confirmed types.ts) |
| A4 | 缺长期时间序列(weaknesses.data) | 暂不可解决 | 卡点:时间本身,无工程捷径。变得可解的条件:持续记录 × 数月——d045701 后积累才开始"算数"(此前数据困在单设备 localStorage,confirmed 审计) |
| A5 | 缺真实 ground truth:建议效果无标签(weaknesses.data / ai) | 暂不可解决 | 卡点:长期 outcome 需数周-数月显现且需要用户回填。条件:A4 成立 + 反馈机制(C4)长期运转 |
| A6 | 跨领域指标不可比、缺统一采集标准(weaknesses.data) | 暂不可解决 | 卡点:结构性——不同域的"好"不可通约(文档 core 结论)。条件:放弃跨域统一分数(这是止损/退出,不是解决) |
| A7 | 数据密度极稀:执行 9 条/28 天,睡眠 2 条/7 天,其余 unknown(审计) | 部分可解决 | 缓解:摩擦优化(A1 手段)+ 密度现在服务端可测量可跟踪(d045701 后 confirmed)。极限:天花板是本人记录意愿,无工程解 |
| A8 | 记录悖论:记录越少系统越不懂,越多越难坚持(core_paradoxes) | 部分可解决(可管理,不可消解) | 悖论不是 bug 是两难:只能选一个工作点(接受"懂得少"或"摩擦高"),护栏是明示当前 evidence 等级(evidenceRichness 字段已存在,confirmed) |

## B. 推断层

| # | 问题 | 分级 | 理由 / 卡点 |
|---|---|---|---|
| B1 | 变量过多:同一行为不同情境结果相反、大量交互效应(why_it_stalled) | 暂不可解决 | 卡点:单人观察数据无法识别混杂;不是模型问题,是识别条件不存在。条件:长期高密度数据 + 受控自我实验(n-of-1),且即便如此只对强效应有效 |
| B2 | 因果推断困难:前后变化≠当前行为造成、单日数据不足(why_it_stalled) | 暂不可解决 | 同 B1。现阶段上限是"关联信号 + 明示非因果"——patternMemory.ts 的 caution 文案已这样做(confirmed),但这是止损不是解决 |
| B3 | PatternMemory 把相关性当规律、错误 pattern 被放大、手动 accept ≠ 统计可靠(v1.5/1.6 limitations) | 部分可解决 | 缓解:证伪字段、置信度衰减、矛盾证据计数、needsReview 降级是具体可执行的机制(方案已成文)。极限:sampleN < 10 时任何机制都只是防呆,不产生统计显著性——上限压在 A7 |
| B4 | 个体差异大 + 同一人的规律随阶段漂移(why_it_stalled) | 暂不可解决 | 泛化到他人:需要多人长期数据,不存在。单人内部:退化为 B1/B2 同一卡点。条件:数据积累 + pattern 时效机制(B3 缓解其中"漂移"一角) |
| B5 | 时间尺度冲突:情绪按小时、训练按周、职业按年,统一 daily brief 覆盖不了(why_it_stalled) | 暂不可解决 | 卡点:无已知方案让单一日频输出同时服务三个尺度。条件:按域分尺度建模 + 足够长时序;域限缩可缓解但那是范围决策,不在本任务内 |
| B6 | 可量化性不足:关系/信仰/情绪/创造力抗拒数值化(why_it_stalled) | 暂不可解决(在这些域内) | 卡点:本体问题,不是工程问题。"不量化这些域"是可执行止损,但等于退出而非解决 |
| B7 | 书籍/学习难结构化:读完≠掌握、影响延迟出现(why_it_stalled) | 暂不可解决 | B6 的具体实例,同卡点;代理指标(时长/页数)已被文档判定无效 |
| B8 | schema 悖论:统一则过度抽象,专用则产品爆炸(core_paradoxes) | 部分可解决(可管理,不可消解) | 只能选工作点:少数域 × 专用 schema。训练域 schema 已是全库最完整(confirmed storage.ts:58-62),证明"单域专用"这个工作点可行;悖论本身消不掉 |

## C. AI 层

| # | 问题 | 分级 | 理由 / 解法 / 极限 |
|---|---|---|---|
| C1 | AI 语言能力掩盖证据不足(core_paradoxes / why_it_stalled) | 部分可解决 | 缓解已部分在位:evidence_basis 强制标注、quality flags(missingEvidence/overclaiming)、tentative tone、"说不知道"写进 prompt(confirmed api/brief.ts)。极限:LLM 生成连贯文本的倾向只能约束不能消除 |
| C2 | AI 过度解释、建议泛化(weaknesses.ai) | 部分可解决 | 同 C1 机制 + do_first 5-25 分钟可执行性约束(confirmed prompt)。极限同上 |
| C3 | natural schedule suggest 不可靠(known_technical_status) | 部分可解决 | 已做到的缓解即其极限形态:安全动作子集 move/shorten/protect 生产验证可靠(confirmed v1.7.1),自由建议锁定为 suggest-only 不可自动应用。自由生成的不可靠性不可根除 |
| C4 | 反馈闭环不足:useful/not useful 太粗、反馈稀疏、长期效果难标(v1.4 limitations) | 部分可解决 | 缓解:ExecutionLog 已有 predictedQualityRating/predictionDelta 字段(confirmed storage.ts:365)——预测 vs 实际的自动对比是可执行的,不依赖用户主动反馈。极限:outcome 滞后数周 + 用户回填意愿,连到 A5 |
| C5 | 建议难落地:洞察≠动作、复杂建议不能安全自动执行(why_it_stalled) | 部分可解决 | 缓解:first-step 约束 + confirm/apply/undo 安全框架已在位(confirmed)。极限:安全边界本身——生活类建议永远到"建议"为止 |
| C6 | 缺长期 outcome validation(weaknesses.ai) | 暂不可解决 | = A5 在 AI 侧的投影,同卡点同条件 |

## D. 产品 / UX 层

| # | 问题 | 分级 | 理由 / 解法 |
|---|---|---|---|
| D1 | 范围过宽、产品范围失控、每层依赖上一层数据质量(why_it_stalled) | 可解决 | 收敛清单已存在(context 文档 recommended_reduction 列了 9 条),执行是纯工程;冻结优先于删除可规避数据风险 |
| D2 | 核心价值难短期感知、需高频使用(weaknesses.product) | 部分可解决 | 对现存唯一真实用户(本人,confirmed):可用真实密度/pattern 数据可视化缓解"感知不到价值"。对普通用户:属 D3 范畴,现阶段无解法 |
| D3 | 普通用户理解成本高、onboarding 未简化(weaknesses.product) | 暂不可解决 | 卡点:理解成本源于概念数量(Goal/Module/Skill/Context/Pattern/Brief...),大幅砍概念与系统现有形态冲突,是范围决策不是打磨问题。条件:D1 收敛完成后重估 |
| D4 | 空状态/空卡片体验差、稀疏数据下产品感崩(weaknesses.product) | 可解决 | d045701 后空卡率首次可测量(服务端密度数据),按数据冻结常空卡片是可执行且可验收的 |
| D5 | Dashboard 假精确:数据不完整时漂亮分数制造不真实确定感(why_it_stalled) | 可解决 | 以"不假装"为目标可执行:空卡治理(D4)+ evidence 等级前置展示(字段已有)。注:数字解释力本身受 A7 限制,但"诚实展示"不受 |
| D6 | 信息层级过多、Today/Insights 拥挤、记录入口不前置(weaknesses.ux) | 可解决 | 纯 UX 工程;部分已做(collapse controls 已删,commit dd67841 confirmed) |
| D7 | 可编辑 dashboard(Control Center)自由度失控(product_evolution: rejected) | 可解决 | 产品层面已否决;代码实体 dashboardPreferences + DashboardLayoutControls(confirmed),冻结入口即完成 |

## E. 工程层(代码审计新发现)

| # | 问题 | 分级 | 状态 |
|---|---|---|---|
| E1 | 本地数据从未同步到服务器 | **已解决** | d045701,生产验证真实写入(confirmed) |
| E2 | /api/brief 无 schema 校验(Record<string,any> + key 存在性检查) | **已解决** | zod schema,畸形请求 400 + 逐字段 issue(confirmed) |
| E3 | 聚合/memory 逻辑纯客户端,api/brief.ts 零引用 | **已解决** | 服务端读写 Pattern/Decision Memory,server-only pattern 被真实引用验证(confirmed) |
| E4 | 使用数据无法独立验证(唯一密度数字来自一次性 debug 快照) | 可解决 | "不可验证"已随 E1 变为"可测量";剩余工作是持续化(密度视图/审计查询),具体可执行 |
| E5 | PatternMemory 晋升手动且藏在 ?debugDecision=1 后 | 可解决 | 入口前置 + 定时 derive 是工程问题。注意与 B3 区分:入口是工程,统计可靠性是 B3 的极限 |
| E6 | Legacy 与 AI 双路径并存的维护负担(weaknesses.engineering) | 可解决 | 选路已 flag 化(confirmed decisionService.ts),收敛为一条路径是可执行工程;Legacy 作为降级路径保留与否是一次明确决定 |
| E7 | 持续加法开发积累的复杂状态/技术债(weaknesses.engineering) | 部分可解决 | 冻结加法即止血(可执行);存量债务(如 store.tsx 千行级、迁移层层叠)清理需专门投入,且清理本身有数据风险(EXECUTION_RULES 铁律 8) |
| E8 | debug fixture 验证 ≠ 自然场景可靠(weaknesses.engineering) | 部分可解决 | 自然场景验证可做但依赖真实使用发生(连到 A7);fixture 已把"可验证子集"圈出来是正确止损 |
| E9 | .env 明文 DEEPSEEK_API_KEY / .env.local OIDC token 在工作树(审计;git 历史干净,confirmed) | 可解决 | 移入 Vercel env + 本地 placeholder;半小时工程 |

## 综合判断

**计数**:已解决 3(E1-E3)/ 可解决 8(D1、D4-D7、E4-E6、E9,含 E4)/ 部分可解决 13(A1-A3、A7、A8、B3、B8、C1-C5、D2、E7、E8)/ 暂不可解决 9(A4-A6、B1、B2、B4-B7、C6、D3;含重复投影 C6=A5)。

**结构性观察(比计数更重要)**:暂不可解决的 9 项不是随机分布的——它们全部落在同一层:**跨域、因果、泛化到他人、长期验证**。这恰好是原始愿景("把人生连成因果闭环的个人操作系统")的核心承诺层。而可解决 + 部分可解决的 21 项几乎全部落在:管线工程(已修)、单域数据质量、AI 输出诚实度、UX 收敛、可审计性。

**因此答案是双面的,取决于用什么目标衡量**:

1. 若以原始愿景为目标:核心问题确实大多暂不可解,没有一个角度真正走得通——这与 context 文档自己停止推进的判断一致,且审计和修复没有改变这一点(修复解决的是工程层,不是因果识别层)。
2. 若以收敛后的问题子集为目标(单人、少数域、关联级判断而非因果、可证伪可审计):可解决 + 部分可解决的集合内部自洽、互相支撑——D1 收敛使 A1 缓解生效,E1-E4 使 A7/D4 可测量,B3 机制使 C1 的诚实约束有据可依。**存在一个现在就值得推进的问题子集**。且推进它们是"暂不可解决"类未来重新分级的唯一路径:A4(长时序)和 A5(ground truth)只能靠持续记录 × 时间产生,没有别的入口。

**单点依赖警告**:全部 13 项"部分可解决"的天花板最终压在同一个变量上——本人持续记录意愿(A7 的极限)。它是整个分级中唯一没有任何工程解的活变量;它若归零,"可解决"类的完成也只是维护了一台没有输入的仪器。

**性质声明**:以上分级与综合判断基于代码现状(2026-07-11 审计 + d045701 修复验证)和产品历史文档的推理,**不是**基于真实用户行为数据验证过的结论——特别是所有涉及记录意愿、摩擦感知、价值感知的判断(A1、A7、D2),其验证所需的数据目前不存在,服务端数据本周才开始积累。
