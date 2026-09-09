# Neural Blueprint 机制研究摘要

本研究基于仓库提交 `4696a94becf96256efa24c7fbab0f367230aa15c`，资料核验日期为2026-09-09。结论来自实际类型、计算链和UI代码，并与原始论文、官方政策及评审规则对照。本次交付仅新增研究文档；没有修改产品代码、构建应用或执行训练实验。

## 核心结论

**首要工作是明确指标含义和边界，再增加逆推、Lab和论文玩法。** 当前名为 `effectiveRank` 的字段是结构和标量分布驱动的解析代理；知识图的mastery、loss和accuracy也是模拟量。它们可以支持游戏决策，但尚不能当成真实模型能力、人的知识水平或论文质量的测量结果。

| 研究线 | 当前实际实现 | 结论与推荐 | 证据强度 |
|---|---|---|---|
| 容量与适应 | [updateInferencePoints](../../src/blueprint/neuralBlueprint/analysis/updateInferencePoints.ts#L16) 将前反rank代理相乘；多组按拓扑连通分量均值后相加；另有空间适配与方差指标 | 将 `capacityBudget / optimizationHealth / taskFit / computeCost` 分开；MVP采用活跃参数与任务瓶颈的可解释预算曲线，保留现rank作待验证分析指标 | Strong：源码与概念区别；Design heuristic：预算映射 |
| 知识图 | [memoryState](../../src/blueprint/knowledgeGraph/model/memoryState.ts#L30) 将正常分配统一阶段0；[reasoning](../../src/blueprint/knowledgeGraph/model/reasoning.ts#L47) 单阶段有额外一次依赖降成本；当前utility与旧项目说明不同 | 先做目标缺口解释和AND/OR前置追踪，再以冻结forward快照验证少量分配候选；诊断、路径、难度、执行四者分开 | Strong：审计与逻辑语义；Design heuristic：MVP算法 |
| Lab | [GameProgress](../../src/game/gameTypes.ts#L8) 只有seed/time/lab；已有NPC/工位和[训练资源估算](../../src/blueprint/neuralBlueprint/analysis/trainingResources.ts#L59)，尚无完整经济/科研流程 | 个人现金、受限科研经费、GPU额度、专注工时、日历等待分别记账；论文/竞赛用有条件的状态机，失败保留资产 | Strong：代码与具名政策；Design heuristic：游戏节奏 |
| 报告/论文 | `.rep`有桌面类型与入口，但[App](../../src/App.tsx#L102)没有报告工作台渲染分支，也没有模块评分引擎 | 建 `ReportDocument + ExperimentRun + VenueProfile`；论点和证据的关系优先于章节数量；资格门槛、连续质量、惩罚、不确定性分开 | Strong：代码与官方规则；Design heuristic：评分权重 |

`PROJECT_CONTEXT.md` 已有若干过时描述，不能按其“ReLU加1、只有Linear产记忆、全组平均、分阶段分配”的旧流程设计。各主题报告逐项指出冲突，并给出实际函数与行号。

## 最重要的风险

1. **失活与维度边界。** 前向Linear的rank代理可能大于输出维；dropout=1会生成全零分布却给满rank代理，因而确定失活通路仍可能产正记忆预算。结论是代码代数推导，尚未运行复现实验。验证需排除可学习偏置和旁路；一次loss梯度为零不等于模型无容量。见[研究一](01_EFFECTIVE_RANK_AND_ADAPTATION.md)。
2. **成本和效用尺度。** 知识图对有单位的requiredMemory取log并递归叠加，深链成本可饱和；node self/adjacent不在同一量纲，lambda=0的依赖仍可影响源节点utility。候选成本式应先通过整体单位缩放和图同构测试。见[研究二](02_KNOWLEDGE_GRAPH_REASONING.md)。
3. **验证循环。** 当前accuracy由mastery曲线生成，capacity loss还使用任务配置的最优容量；拿这些结果验证有效秩的科学预测力，会把结论先写进标签。必须另用真实训练的留出任务验证。证据记录需标 `simulated` 或 `externalMeasured`。
4. **资源和时间尚未连通。** 默认训练服务器是1TiB显存、1有效TFLOP/s的游戏设定，画面服务器数量不是实际可调度资源；[App.advanceTrainingTime](../../src/App.tsx#L65)跨天只推进时钟，未连接[advanceLabDay](../../src/lab/labProgress.ts#L43)。先保证资源事件、日历和NPC状态一致，再扩充随机事件。
5. **概率与评分被误读。** 单校资助、单届赛事/会议比例不能外推个人成功率；论文质量分也不能直接换算录用概率。无可靠数据时保留宽先验、情景范围和unknown，不输出装作现实统计的精确数字。

## 文献和现实证据如何影响选择

- **有效秩有测量价值，但对象和任务决定解释。** RankMe的结果限定于联合嵌入自监督学习（joint-embedding self-supervised learning），不能推出统一记忆点换算；监督分类的神经塌缩又表明末层表示变低维不必等于任务表现变差。[Garrido et al., ICML 2023](https://proceedings.mlr.press/v202/garrido23a.html)，[Papyan et al., PNAS 2020作者版](https://arxiv.org/abs/2008.08186)。证据Moderate，迁移到本游戏仍需实验。
- **后向找前置、解释错误和反向求概率不是同一问题。** 推荐MVP先做可解释规划，缺真实观测时不引入复杂诊断概率。[Poole & Mackworth, 2023：规则推理](https://artint.info/3e/html/ArtInt3e.Ch5.S3.html)、[溯因](https://artint.info/3e/html/ArtInt3e.Ch5.S8.html)。逻辑区分Strong，具体玩法Design heuristic。
- **生活成本必须有情境。** 学校住宿资格、资助发放月份、博士/硕士、非全日制/项目制、导师津贴统筹关系均会改变现金流；报告使用具名学校政策与明确限制的生活预算例，不构造全国CS研究生平均账单。见[研究三的地区与年份表](03_LAB_LIFE_SIMULATION.md)。
- **论文围绕论点与证据评价。** ICML2025的官方审查要求支持将报告建成可检查的论点—证据网络；NeurIPS复现清单也不意味着“不开源一律拒稿”。规则须按venue/年份/阶段冻结。[ICML Reviewer Instructions 2025](https://icml.cc/Conferences/2025/ReviewerInstructions)，[NeurIPS Paper Checklist滚动规则](https://neurips.cc/public/guides/PaperChecklist)。官方规则Strong，评分权重Design heuristic。

## 推荐优先级

| 优先级 | 后续工作 | 完成条件 |
|---|---|---|
| P0：先建立可信基线 | 指标命名与来源、无效/未知状态、失活与维度反例、预算守恒、成本换单位测试、profile复杂度同步检查 | 能准确解释每个数从何而来；无法确定时显示unknown；不靠静默回退制造高能力 |
| P1：最小可玩闭环 | 目标缺口→少量动作→单次训练/分配→不可变实验记录→模块化实验报告→反馈；加入基本GPU预约、个人/科研分账、跨日事件 | 无重复扣费/发奖/分配；逆推不直接创造掌握度；重复图表/证据不刷分 |
| P2：校准后的扩展 | probe activation/线性头、更多任务与资源情境、玩家BKT/IRT、多venue流程、真实artifact导入 | 在留出数据和任务上优于简单基线；概率有校准记录；反例与适用范围保留 |
| 长期研究 | KFAC/Jacobian/NTK容量指标、前置干预发现、异构调度和评审群体模型 | 额外复杂度带来可测收益；不把缺证据换成更多自由参数 |

最先做的五项实验：确定失活通路、等价图/单位缩放、rank与参数量的真实预测比较、小图逆推对枚举最优、`.rep`重复模块与缺证据反例。综合文档另给10项可证伪实验及三阶段路线。

## 推荐的系统边界

容量点是模型训练资源；玩家知识是观测驱动的独立状态；GPU显存是MiB；日历是分钟；主动工作是人时；论文质量是rubric评分；录用是有条件的评审事件。相同数值范围不代表它们可以互相直接赋值。

现实模式使用具体地区/学校/年份制度和真实日历，未知成本仍显示估算；游戏化模式可压缩等待、提供低资源恢复路线，但不暗改过去实验。两种模式共用事实来源和数据结构，分开平衡参数。

## 文档导航与交付边界

| 文件 | 主要内容 |
|---|---|
| [01_EFFECTIVE_RANK_AND_ADAPTATION.md](01_EFFECTIVE_RANK_AND_ADAPTATION.md) | 解析rank/方差/推理序/聚合审计；七类秩与维数；四套容量候选；真实验证设计 |
| [02_KNOWLEDGE_GRAPH_REASONING.md](02_KNOWLEDGE_GRAPH_REASONING.md) | 完整训练/推理/utility/正则/loss链；逆推方法比较、MVP伪代码和复杂度 |
| [03_LAB_LIFE_SIMULATION.md](03_LAB_LIFE_SIMULATION.md) | 地区/学校/学段经济、时间、GPU、同门、竞赛与论文状态机；现实与游戏模式 |
| [04_REPORT_PAPER_SYSTEM.md](04_REPORT_PAPER_SYSTEM.md) | 八类材料、官方评审规则、模块/边/验证、反刷分、权重/门槛/不确定性与人审边界 |
| [05_INTEGRATED_DESIGN_PROPOSAL.md](05_INTEGRATED_DESIGN_PROPOSAL.md) | 概念映射、接口与单位、公式/参数汇总、三阶段路线、10项可证伪实验 |
| [SOURCES.md](SOURCES.md) | 分类来源、年份、适用范围、访问限制及最终链接检查记录 |

这套文档是后续实现与实验的依据，不宣称候选模型已经通过实验，也不包含产品代码修复。最终文件、路径及外部链接检查结果在来源文档中单独记录。
