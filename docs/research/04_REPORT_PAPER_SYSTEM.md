# 研究四：`.rep` 报告与论文的模块化、验证和评分

审计基线：`4696a94becf96256efa24c7fbab0f367230aa15c`；检索日期：2026-09-09。本文只提出研究结论和未来设计，不包含产品代码变更。源码链接相对本目录，行号对应上述提交。`Current implementation` 表示已核实代码；`Evidence` 表示来源支持的事实；`Design heuristic` 表示游戏设计；`Calibration unknown` 表示待实测参数。证据等级评价的是建议的依据，不代表公式已经验证。

核心建议是把 `.rep` 设计为**可追溯的论点—证据图，加上可切换的文档模板和评审规则**。章节数量不决定质量；蓝图能力点、模拟训练损失也不能直接成为现实论文质量。最小可玩版本首先提供实验报告、证据导入、缺口诊断与修改反馈，再接入 Lab 的投稿状态机。所有分数均为教学或游戏质量分，不是现实录用概率。

## 1. Current implementation audit：当前实现审计

已先阅读 [PROJECT_CONTEXT.md](../../PROJECT_CONTEXT.md) 与 [README.md](../../README.md)，再沿文件类型、打开入口、存储、Lab 回调及训练快照读取实现。README 仍是 Vite 模板介绍；PROJECT_CONTEXT 的默认报告文件描述与当前默认文件列表不一致，应以代码为准。

| 已实现对象 | 准确位置 | 核实行为及边界 |
| --- | --- | --- |
| 桌面文件类型 | [`DesktopFileType`、`DesktopFileDefinition`、`DesktopFile`](../../src/desktop/desktopTypes.ts#L4) | 联合类型包含 `nbp`、`rep`；文件拥有 ID、名称、位置、可删除/可见/完成标志、依赖文件 ID 等，没有报告正文、论点、证据、评审字段。`config` 仍是 `BlueprintTaskFeatureConfig`。 |
| 报告创建入口 | [`desktopFileModules`、`handleDragStart`、`DesktopLeftPanel`](../../src/desktop/leftPanel.tsx#L15) | 左侧面板确实提供 `rep` 拖拽类型；有“创建实验报告文件”的中文标签。类型可创建不等于工作台已经实现。 |
| 打开路由 | [`DesktopCanvas.handleOpenFile`](../../src/desktop/DesktopCanvas.tsx#L85)、[`FileWorkspaceType`](../../src/dataStorage/systemType.ts#L3) | 非 `nbp` 映射为 `report` 工作区，并调用 `openFile`。 |
| 实际渲染 | [`App.openFile`](../../src/App.tsx#L72)、[`App` 条件渲染](../../src/App.tsx#L102) | `blueprint` 分支渲染 `BlueprintCanvas`；其余文件分支 L112–119 渲染 `DesktopCanvas`。没有实际 `ReportWorkspace` 分支。 |
| 默认文件 | [`DESKTOP_FILE_DEFINITIONS`](../../src/taskData/desktopDefaults.ts#L13)、[`createInitialDesktopFiles`](../../src/taskData/desktopDefaults.ts#L141) | 当前定义全部为 `nbp`，没有 PROJECT_CONTEXT 所述的默认 `Experimental Report`。不能据旧文档宣称有默认报告内容。 |
| 清理与存储 | [`clearDesktopFileRuntime`](../../src/dataStorage/fileReset.ts#L8) | 只处理 `nbp`，其他类型返回 `false`。当前 `src/dataStorage/` 没有报告内容存储模块；桌面图标元数据存储不能替代报告存储。 |
| 任务类型 | [`TaskFileInitialState`、`TaskFileConfig`](../../src/taskData/taskFileTypes.ts#L26)、[`TaskGuideCondition`](../../src/taskData/taskGuideTypes.ts#L70) | 初态是蓝图、知识图、预训练来源；教程条件对应画布/模块/训练统计等。没有课程报告评分、论文投稿或 rebuttal 条件。 |
| Lab 论文语义 | [`LabProgress`、`LabReward`](../../src/lab/labTypes.ts#L8)、[`GameProgress`](../../src/game/gameTypes.ts#L8) | Lab 状态是工位、NPC 出勤、已完成话题和奖励回执；`LabReward.kind` 为通用字符串。没有论文项目、文稿版本、评审者或投稿尝试类型。 |
| Lab 交互 | [`completeLabTopic`](../../src/lab/labProgress.ts#L90)、[`LabWorkspace.completeTopicHandler`](../../src/lab/LabWorkspace.tsx#L125) | 话题按 `day:npcId:topicId` 去重，抽样后追加奖励回执；本流程没有将奖励转为论文模块或投稿进度。 |
| 书架/服务器展示 | [`LabWorkspace` notice 配置](../../src/lab/LabWorkspace.tsx#L166)、[书架点击](../../src/lab/LabWorkspace.tsx#L218)、[notice 渲染](../../src/lab/LabWorkspace.tsx#L289) | 是可点击提示，不是论文库存或审稿界面；装饰性 paper 图形不构成报告功能。 |
| 可复用的实验记录雏形 | [`TrainingCurveSnapshot`](../../src/dataStorage/trainingCurveStorage.ts#L6)、[`TrainingProcessWorkspace.saveCurve`](../../src/blueprint/trainingProcess/TrainingProcessWorkspace.tsx#L73) | 保存 epoch、loss 历史、图生成设置、网络记忆/推理点及种子；UI 只保留最近 20 条。没有完整模型版本、数据切分哈希、优化器参数、硬件实测记录或实验来源类型。 |
| 图边语义 | [`KnowledgeEdgeKind`](../../src/blueprint/knowledgeGraph/model/types.ts#L9) | 当前知识图只有 `dependency / substitute / interference`。不能把它们原样解释为论文中的支持、反驳、重复。 |

**审计结论〔Strong：源码事实〕：** 本次研究是为尚未实现的 `.rep` 内容系统设计。已有复用点是桌面文件身份、画布交互经验、存储适配器和训练曲线快照；并不存在需要“还原”的论文评分公式。后续接入必须新增明确的领域对象，而不是往 `DesktopFile.completed` 或通用 `LabReward.data` 塞入整套评审状态。

当前实验快照属于知识图模拟系统的输出。若未来引用为 `.rep` 图表，应标 `origin = simulated`；其可复算性只能证明该模拟的记录一致，不能证明真实网络在真实数据集上的科学结论。该限制来自快照字段及生成路径，而不是对已运行真实实验的评价。

## 2. Evidence-backed findings：证据支持的发现

### 2.1 八类材料应共享证据对象，分别配置目的与结构

下表“典型结构”是参考材料的归纳，不是世界通用的必选章节表。实际 hard gate 必须绑定具体课程、学校、venue、年份和稿件阶段。

| 材料 | 主要任务与典型结构 | 必要性与差异 | 来源、时间和范围 |
| --- | --- | --- | --- |
| 课程报告（course report） | 题目/问题、所学方法、数据或推导、结果与讨论、分工、引用 | 证明理解和完成课程目标；创新要求按课程配置，复现和失败分析也可以完成学习目标。不能将“论文接收”作为所有课程及格条件。 | Stanford CS229 2016 项目指南允许应用、算法、理论方向；配套结构指南明确结构齐全并不保证分数，且理论与应用项目栏目不同。[P17](https://cs229.stanford.edu/materials/project-guidelines-spr16.pdf)、[P18](https://cs229.stanford.edu/final-report-guidelines.pdf)。仅该课程案例。 |
| 实验报告（laboratory report） | 目标/假设、装置或环境、方法与协议、观测、误差/失败分析、结论 | 强调按可追踪协议解释观察；可没有新方法。原始观察与推断应区分。 | CMU 的 IMRD 写作指导给出引言—方法—结果—讨论骨架，未声明发表年份。[P10](https://www.cmu.edu/student-success/other-resources/resource-descriptions/imrd.html)。是写作指导，不是所有实验课程的评分标准。 |
| 研究计划（research proposal） | 动机、相关/初步工作、研究目标、拟用方法、评估标准、资源与时间表、风险/替代方案、引用 | 未来结果可未知；应评估可行性及检验计划。不能为“尚无最终实验”自动扣到零。 | MIT EECS 学位研究计划指导，未标发表年，2026 检索。[P09](https://mitcommlab.mit.edu/eecs/commkit/thesis-proposal/)。限研究计划，不代表已完成学位论文。 |
| 技术报告（technical report） | 管理/读者摘要、问题/范围、系统或方法、详细结果、限制、建议、实现/操作附录 | 服务具体受众，允许更详细的设计、环境和负面结果；不天然具有同行评审或新颖性认证。 | CMU 官方课程服务器上的 technical report 写作指导，未标发表年。[P11](https://www.cs.cmu.edu/~rapidproto/handouts/techreps.html)。范围为技术沟通。 |
| 会议论文（conference paper） | 摘要、问题、相关工作、贡献与方法、适配方法的证据、讨论/局限、引用、附录与清单 | 有固定截稿及主文可读性预算；理论稿可用证明，实证稿需支持其经验论点，不能统一强制“所有论文都做消融”。 | NeurIPS 2025、ICML 2025、ICLR 2025 官方评审/作者规则。[P01](https://neurips.cc/Conferences/2025/ReviewerGuidelines)、[P03](https://icml.cc/Conferences/2025/ReviewerInstructions)、[P04](https://icml.cc/Conferences/2025/AuthorInstructions)、[P05](https://iclr.cc/Conferences/2025/ReviewerGuide)。 |
| 期刊论文（journal article） | 与研究论文共享结构，按期刊增加完整分析、复现材料、利益披露和投稿信 | 不能用“会议稿多添背景页”代表实质扩展；修回流程也不能套单一通用状态机。 | JMLR 作者/评审指南，页面无稳定发表年，2026 检索。JMLR 接受会议扩展但要求实质增量，其决策为 accept/reject，部分拒稿允许获准重投。[P07](https://www.jmlr.org/author-info.html)、[P08](https://www.jmlr.org/reviewer-guide.html)。不可泛化所有期刊。 |
| 学位论文（thesis/dissertation） | 前置页与声明、中英文摘要、目录、绪论/综述、彼此关联的研究章、综合结论、参考文献、附录等 | 呈现完整培养成果；硕博、学术/专业学位以及院系要求有差异。应另设学位与答辩流程。 | 清华大学研究生院《研究生学位论文写作指南》，2025-03，官方院系公开 PDF；文件明确院系/项目另有要求时按其要求。[P12](https://www.dhs.tsinghua.edu.cn/wp-content/uploads/2023/12/2025032107444819.pdf)。不是全国统一评分表。 |
| 作者答辩回复（rebuttal/author response） | 评审问题 ID、回答、证据定位、必要澄清/修订、未解决问题与适用边界 | 是对具体评审意见的有界回复，不是再提交一篇全新论文；能改变何种内容必须按该轮规则处理。 | ICML 2025 的作者回复/讨论说明要求回应与更新评审，详细限制见当年规则。[P03](https://icml.cc/Conferences/2025/ReviewerInstructions)。此处不外推统一字数上限。 |

**建议〔Strong 支持“按类型区分”；具体 schema 为 Design heuristic〕：** 用 `DocumentKind × StudyMethod × VenueProfile × Phase` 选择规则，而不是仅用“课程/顶会/顶刊”三个难度档。`StudyMethod` 至少区分 `empirical / theoretical / replication / proposal / systems`；综述、用户研究、数据集论文以后单独扩展。

### 2.2 官方标准支持多维审查，不支持通用录用公式

| 证据事实 | 对游戏设计的作用 | 证据等级和边界 |
| --- | --- | --- |
| NeurIPS 2025 分开评价 quality、clarity、significance、originality，还单列 confidence、limitations 和伦理问题；原创性可来自对已有方法的新认识。 | 方法名称新奇不应独占创新分；评审自信程度与文章质量分开。 | **Strong**，限 2025 该会议。[P01](https://neurips.cc/Conferences/2025/ReviewerGuidelines)。 |
| ICML 2025 主轨明确要求逐项审查 claims and evidence、方法/评估合理性、证明及实验设计，同时区分 position paper 的评审表。 | 评分单位优先为“论点是否被适当证据支持”；同会议不同轨道也需不同模板。 | **Strong**，限当年规则。[P03](https://icml.cc/Conferences/2025/ReviewerInstructions)。 |
| NeurIPS checklist 要求说明假设、复现路径、实验设置、误差条含义、计算资源等；不公开代码本身通常不能成为单独拒稿理由，贡献核心为开源基准等情况除外。 | “有没有 GitHub 链接”和“是否能验证关键结果”必须拆分；只勾选清单不应视为内容已证实。 | **Strong**，公开滚动指南 2026 检索；不能冒充冻结的 2025 文本。[P02](https://neurips.cc/public/guides/PaperChecklist)。 |
| NeurIPS 伦理指南和 ICML 2025 伦理规则要求针对研究情境识别风险并适当处理。 | 风险披露、风险缓解、是否违规三者分开；主动披露局限与伦理问题不能自动降低质量。 | **Strong**，官方规则；应用判断仍需专家。[P06](https://neurips.cc/public/EthicsGuidelines)、[P16](https://icml.cc/Conferences/2025/PublicationEthics)。 |
| POPL 2025 artifact evaluation 是可选流程，不参加不影响该论文的接收；考察与论点一致、覆盖、文档和复用，Functional/Reusable 与 Available 有不同条件。 | artifact 徽章作为独立产出；一个可下载 ZIP 不等于功能验证，更不等于论文贡献获认可。 | **Strong**，只对 POPL 2025 及其采用的 ACM 徽章解释成立。[P13](https://popl25.sigplan.org/track/POPL-2025-artifact-evaluation)。 |
| ACM SIGSOFT 实证标准按研究方法列 essential、desirable、extraordinary 属性。 | 验证条件必须识别实证方法，禁止给所有研究强制同一组实验。 | **Strong**，软件工程方法标准；迁移到机器学习游戏是 **Moderate**。[P14](https://www2.sigsoft.org/EmpiricalStandards/)。 |
| NeurIPS 2021 一致性实验中 882 篇重复评审稿件有 203 篇在两委员会间出现接收/拒绝差异（23.0%）。 | 需要表达评审分歧；不能把同篇论文所有不确定性压成一个精确分数。 | **Moderate**：官方实验统计，特定双委员会与撤稿口径；23% 不是个人论文被“误判”的概率。[P15](https://blog.neurips.cc/2021/12/08/the-neurips-2021-consistency-experiment/)。 |
| NeurIPS 2019 可复现性项目的 JMLR 2021 报告把清单、代码与独立复现作为互补措施。 | 文件齐全与结论可复现需要不同状态；独立验证应有自己的运行记录。 | **Moderate**：项目报告，不能推导任何固定清单加分对应多少录用率。[P19](https://www.jmlr.org/papers/v22/20-303.html)。 |

需要显式保留规则冲突。ICML 2025 作者说明将超过 8 页主文列为自动拒稿，而 NeurIPS 2025 reviewer 指南允许对可修正的轻微格式问题有所宽容；JMLR 又有自己的格式与编辑判断。由此不能定义“所有文章多一页立即失败”，也不能认为所有页数限制都是 soft score。[P04](https://icml.cc/Conferences/2025/AuthorInstructions)、[P01](https://neurips.cc/Conferences/2025/ReviewerGuidelines)、[P07](https://www.jmlr.org/author-info.html)。

还需版本化工具使用规则：ICML 2025 reviewer instructions 禁止生成式 AI 审稿；ICLR 2025 页面则允许其作为一般辅助并由署名者负责。这是不同 venue/年份的政策差异，并非对任意真实稿件自动审稿的统一授权。游戏中的合成评审只作用于游戏数据；未来真实论文工作台需单独读取相应 policy。[P03](https://icml.cc/Conferences/2025/ReviewerInstructions)、[P05](https://iclr.cc/Conferences/2025/ReviewerGuide)。

## 3. Design implications：面向产品的模块与数据设计

### 3.1 三层分离

1. **内容层**：可复用章节、论点、证据、引用和限制，定义研究表达了什么。
2. **校验层**：根据模板判断结构、数值及证据追踪是否一致，输出错误、风险和未知项。
3. **评审与进度层**：具体 venue/轮次对冻结文稿给出判断；Lab 消耗时间和资源，改变投稿状态。

这三层分离是 **Design heuristic**，获得官方多维评审和 artifact 独立流程的 **Moderate** 支持。修改草稿不能追溯改变已完成投稿的内容；换 venue 只改变适用规则及读者关注点，不改变既有实验观测。

建议的类型草图如下，仅为文档中的未来接口，不是当前已有类型：

```ts
type ReportDocument = {
  schemaVersion: number;
  id: string;
  kind: DocumentKind;
  studyMethod: StudyMethod;
  profileId: string;          // 包含 venue/course/school + year + version
  revision: string;
  moduleIds: string[];
  edges: ReportEdge[];
  submissionAttemptIds: string[];
};

type ModuleBase = {
  id: string;
  kind: ModuleKind;
  revision: string;
  title: string;
  content: string;
  status: "planned" | "draft" | "checked" | "frozen";
  origin: "simulated" | "externalMeasured" | "literature" | "authorAssertion";
  provenanceIds: string[];
};

type ReportEdge = {
  id: string;
  kind: "contains" | "supports" | "dependsOn" | "contradicts"
      | "duplicates" | "cites" | "qualifies" | "answers";
  sourceId: string;
  targetId: string;
  rationale: string;
  checked: "yes" | "no" | "unknown";
};

type ValidationIssue = {
  ruleId: string;
  status: "pass" | "fail" | "unknown" | "notApplicable";
  severity: "gate" | "warning" | "info";
  moduleIds: string[];
  evidenceIds: string[];
  message: string;
  remedy: string;
};
```

`checked` 只表示对应边被何种检查确认；具体检查器、版本、检查者和时间应保存在校验记录中，不能由玩家随意把 `checked=yes` 当证据。真实外部记录的哈希证明引用版本一致，不证明数据没有造假。`authorAssertion` 的主张可以存在，但不能与已经验证的结果混同。

### 3.2 推荐模块、关键属性和连接

| 模块 | 专用关键属性 | 核心连接与校验 |
| --- | --- | --- |
| `Section` 章节 | `role`、排序、字数/版面估计、读者层级 | `contains → Module`；每个展示实例一个容器，正文结构无环；允许同一证据跨章节引用。 |
| `ResearchQuestion` 问题 | 任务、对象、场景、成功标准、适用范围 | 被贡献/论点回应；不是“给问题起名”就有问题价值。 |
| `Claim` 论点 | `claimType`、明确陈述、作用域、量词、指标方向、重要度、验证义务 | `Evidence/Proof/Claim supports Claim`；核心论点必须有符合类型的证明义务或证据缺口说明。 |
| `Method` 方法 | 算法版本、输入/输出、假设、计算成本、代码/蓝图修订号 | `Experiment dependsOn Method`；参数和结果必须引用同一版本。 |
| `Assumption` 假设 | 条件、适用域、已知违背场景 | `Claim dependsOn Assumption`；不满足假设时标越界，不能仍把理论结论当实证保证。 |
| `Experiment` 实验设计 | 目标论点、协议、数据切分、基线、对照、指标、种子方案、资源计划 | `Experiment dependsOn Method/DataAsset`；`Evidence dependsOn Experiment`。计划与完成记录不同。 |
| `Evidence` 观测证据 | `runIds`、数据集版本、聚合方法、重复样本单位、不确定区间、排除规则 | `supports/contradicts → Claim`；只在作用域兼容时算覆盖。负结果可以支持“方法存在局限”的论点。 |
| `Proof` 证明 | 定理陈述、假设 ID、证明文本/脚本、检查记录 | `supports → Claim`；有完整证明文本不等于证明已正确，人审/形式检查分开。 |
| `Figure/Table` 图表 | 数据引用、变换说明、单位、轴/图例、caption、误差条类型、渲染版本 | `dependsOn → Evidence`；图表引用证据，不凭图表数量产生新证据。 |
| `Citation` 引用 | DOI/URL、作者、标题、年份/未知、版本、页/节定位、访问日期、引用用途 | `Claim/Method cites Citation`；`mentions` 与 `supports` 不是同一判定。链接可访问不能证明引文支持当前说法。 |
| `Limitation/Ethics` 限制/伦理 | 影响对象、严重性、范围、缓解措施、处理状态 | `qualifies → Claim/Method/Experiment`；限制应收窄结论适用域，不是默认负分卡。 |
| `Conclusion` 结论 | 所引用核心论点、未解决问题 | `dependsOn → Claim`；禁止摘要/结论偷偷扩大数据范围、提高比较强度。 |
| `Artifact` 研究材料 | 版本、许可证、获取路径、运行说明、资源需求、验证状态 | `supports → Evidence` 或 `dependsOn → Method`；`available`、`functional`、`reusable` 分开记录。 |
| `ReviewIssue/Response` 评审问题/回复 | `attemptId`、评审者 ID、问题 ID、严重性、答案、文稿差异、证据定位 | `Response answers ReviewIssue`；必须指向该次投稿，不能通过回复“感谢”直接消除技术缺口。 |

**连接方向约定〔Design heuristic〕：** `supports` 从证据指向主张；`dependsOn` 从依赖者指向所需对象；`contradicts` 与 `duplicates` 在展示和查找中对称；`qualifies` 从限制指向被限制内容。因两种有向边表达相反的阅读习惯，计算时先转成统一的“前提 → 结论”逻辑图，不能直接沿混合原始边求拓扑序。

`duplicates` 建立“相同信息的等价组”，不建立越叠越大的惩罚；合理复用证据不等于学术重复发表。重复发表/抄袭判断另有 venue policy 和人工程序。正文与附录可引用同一图表数据，显示来源即可。

### 3.3 六组验证规则

| 检查 | 可确定规则 | 仍需人工/模型辅助的语义风险 |
| --- | --- | --- |
| 结构完整性 | ID 存在、边端点类型合法、容器无环、模板必需角色和声明是否填写 | 章节内容是否真的满足目的；“空壳 Methods”不能凭标题判通过。 |
| 论点—证据闭环 | 每个核心论点有验证义务，义务关联至少一个适配的证据/证明；论证子图不能自我支持 | 证据是否足够有说服力、假设合理性、方法正确性。结构闭合不保证逻辑有效。 |
| 实验覆盖 | 固定 `claim × obligation` 清单；比较型论点检查共同协议与基线，因果型论点检查干预/识别说明 | 基线是否公平/有竞争力；实证相关能否支持因果，不能靠 `supports` 一条边认定。 |
| 引用支撑 | 可解析标识、元数据和定位；同一 DOI 去重；撤回/更正状态来源可追踪 | 引用的段落是否蕴含结论；文献遗漏是否改变新颖性判断。 |
| 跨章节一致性 | 摘要、表格、图、结论引用同一 `metricId/runId`；单位、数据切分、模型版本、样本量匹配 | “更高准确率”是否被夸为“所有任务更好”；语义量词与范围扩张。 |
| 复现与伦理 | 必填材料有无、运行说明/版本/资源字段、风险问题是否已回答 | 材料是否有效、法律/伦理充分性、真实造假；未知不得自动变成通过或定罪。 |

每条问题必须有 `ruleId → affectedModules → evidence → remedy`。玩家看见“C2 在未见数据分布上宣称通用，但 E1 只覆盖数据集 A”的具体反馈，比“论文质量 63”更能指导下一步。

## 4. Candidate models/formulas：候选评分机制与参数

### 4.1 三套候选模型

| 方案 | 定义及输出 | 统计量与成本 | 稳定性、解释性、待调项 | 建议 |
| --- | --- | --- | --- | --- |
| A：规则完成度 | 模板义务通过比例，另列未知与阻断项；无“创新自动分” | 图、角色和表单字段；`O(V+E+K)` | 最容易解释；风险是玩家只补字段。参数是模板义务及严重性。 | 适合首次报告教程；**Design heuristic**。 |
| B：义务覆盖＋多维质量 | 按论点义务去重覆盖，结合人工/规则分项分、范围及错误扣分 | 来源、运行记录、论点/证据边；已分组时 `O(V+E+K)` | 不奖励无关数量；每个分项能追溯。需校准重要度、权重、证据等级映射。 | **推荐 MVP**；方向有 **Moderate** 支持，数值是 **Design heuristic**。 |
| C：分层评审模型 | 真实数据拟合维度、评审者偏差和 venue/轮次差异，输出分布与校准诊断 | 有授权的多评审数据、稿件版本、人工标签；训练成本取决于模型，推断约 `O(BJD)` | 能表达分歧；可辨识性、选择偏差和泄漏风险高，解释难度更高。 | 长期研究；没有校准前不能宣传现实预测能力，**Weak**。 |

其中 `V` 为模块数、`E` 为边数、`K` 为模板义务数、`D` 为评分维度数、`J` 为模拟评审者数、`B` 为不确定性采样数，均为无量纲整数。

### 4.2 模板义务与去重覆盖

先把一条主张拆成不可互相替代的验证义务，例如“比基线更准确且更快”至少需要准确性比较和计算成本比较。任何一组内部允许 OR 替代路径，不同义务之间默认 AND。该逻辑划分由任务模板/作者初始计划与检查者确认，不能由玩家在投稿后删掉困难义务刷覆盖率。

```text
u[c,k] = max over admissible evidence groups g of evidenceQuality[c,k,g]
coverage[c] = min over required obligations k of u[c,k]
Coverage = sum_c importance[c] * coverage[c] / sum_c importance[c]
```

`u`、`coverage`、`Coverage` 均无量纲，范围 `[0,1]`。`importance > 0` 是固定的主张重要度；建议 MVP 用核心/辅助两档 `2/1`，这是游戏权重。每个证据组指独立的信息来源/协议组，重复拷贝和同 seed 重跑不可形成新组。`evidenceQuality` 代表规则/人工给定的支持质量，**不是证据为真的概率**。初始离散档可用 `0 / 0.5 / 1`，另存 `unknown`，不能把未知写作 0.5 已知质量。

边界：无适配证据令 `u=0`；无主张或无验证义务时返回 `notApplicable/invalidTemplate`，绝不能令空集合覆盖率为 100%。任一 AND 义务未满足，核心主张不会靠其他义务重复堆叠补齐；OR 路径用最大值，不随复制数增加。`min` 连续但在相等点不可导，适用于无需梯度的游戏检查；分档存在跳跃，UI 应显示离下一档缺什么。计算按义务和入边一次扫描，`O(K+E)`。

同一协议的独立重复试验应更新一个证据组的区间精度，而不是增加“新颖证据数量”。共享测试集的多个 seed 主要估计训练随机性，不能伪装为覆盖多个独立总体。这里的统计解释来自复现规范对变异来源的要求；组定义和取最大值是 **Design heuristic**。[P02](https://neurips.cc/public/guides/PaperChecklist)。

### 4.3 分项质量、权重与 hard gates

建议以相同的 11 个维度形成雷达/条形评分视图。表中数值是**为游戏初始平衡提出的百分权重**，每列合计 100；并非任何会议真实评分表或录用模型。

| 维度 `d` | 实证研究论文 | 课程/实验报告 | 研究计划 | 可自动确定的部分 |
| --- | ---: | ---: | ---: | --- |
| 问题价值 | 10 | 5 | 20 | 是否明确问题与目标；价值本身人审 |
| 相关工作定位 | 8 | 5 | 12 | 引用可追踪；覆盖与定位人审 |
| 方法正确性 | 20 | 20 | 15 | 类型/维度/约束；理论正确性人审 |
| 新颖性/新增认识 | 12 | 0 | 13 | 新增内容差异提示；实质新颖性人审 |
| 实验/验证充分性 | 15 | 20 | 12 | 研究计划在此评价验证方案，不要求最终观测 |
| 统计可靠性 | 10 | 15 | 8 | 聚合和区间可复算；设计合理性需审查 |
| 可复现性/可执行性 | 10 | 15 | 8 | 材料与字段校验；研究计划评价资源可行性 |
| 写作清晰度 | 7 | 10 | 6 | 结构/术语检查；可读性人审 |
| 图表质量 | 3 | 5 | 1 | 数据绑定、单位、轴和图例；表达效果人审 |
| 局限与范围一致性 | 3 | 3 | 3 | 已知限制是否关联论点 |
| 伦理与材料责任 | 2 | 2 | 2 | 披露和状态校验，不能以小权重抵消违规 |

理论稿不把“实验/统计”简单判零，应切换为“证明义务覆盖/论证可靠性”；预先定义适用集合 `A`，重归一化 `w'[d]=w[d]/sum_{k in A}w[k]`。不适用必须由模板规则和理由确认，不能让作者自行把所有低分项设为 NA。`sum w=0` 为配置错误。

```text
Q = 100 * sum_d w[d] * q[d]
P = min(Pmax, sum over unique issue families f of max_{issue in f} penalty[issue])
S = clamp(Q - P, 0, 100)
```

`q[d] ∈ [0,1]`，`w[d] ≥ 0` 且总和为 1；`Q/P/S` 单位为质量分。`Pmax` 建议 `10–20` 分；单个次要/主要可修复一致性问题可从 `1–3 / 4–8` 分试调，均为 **Calibration unknown / Design heuristic**。同一根因在摘要、图、表被多次报告只计一次。已在维度评分扣除的问题不得再重复扣罚；每个规则要声明唯一 `scoreOwner`。严重正确性或违规问题走 gate/人工裁定，不允许靠其他分项抵消。

| 类别 | 建议机制 | 判断依据 |
| --- | --- | --- |
| `hard gate` | 只定义明确的提交资格或已确认重大问题：损坏/无法读取的文档、特定 venue 必交材料缺失、当年明确自动拒稿的页数/匿名规则、人工确认的核心论证致命问题或不合规 | `pass/fail/unknown/notApplicable`；未知进入待确认，不自动判违规。格式门槛绑定规则版本。 |
| `soft scores` | 论点支持程度、技术完整性、表达质量、适当实验等 | 连续/有序档分，附支持证据；可以逐步改进。 |
| `penalties` | 可修复、未在维度中计入的矛盾/错误 | 限幅、根因去重；不得用“增加限制章节”触发罚分。 |
| `reviewer preference` | 受众兴趣、某贡献对该领域的重要程度、可修复问题的严重性判断 | 单独给评审者/venue 变化范围，不当客观事实。 |

最终输出应是 `{eligibility, unresolvedIssues, dimensionScores, qualityInterval, explanation}`。即使有 gate 失败仍可显示诊断维度，但不能把它改写成“论文质量 0”，更不能把 `S/100` 当作 `P(accept)`。

### 4.4 不确定性与评审者差异

MVP 对每个维度保存 `[l[d],u[d]] ⊆ [0,1]`；客观可复算字段可以是点区间，尚未人审的新颖性等维度保持较宽区间。若扣分区间为 `[Pl,Pu]`：

```text
Slo = clamp(100 * sum_d w[d] * l[d] - Pu, 0, 100)
Shi = clamp(100 * sum_d w[d] * u[d] - Pl, 0, 100)
```

这是条件于所选 rubric 的**保守范围**，不是 95% 统计置信区间；相关维度的不确定性不靠“平均很多项”自动消失。成本 `O(D)`。缺少人审时可只展示维度状态和宽范围，不给假精确中位数。

第二阶段如需要三位模拟评审，可采用：

```text
R[j] = clamp(100 * (sum_d reviewerWeight[j,d] * q[d] + bias[j] + noise[j]) - P, 0, 100)
```

`reviewerWeight` 非负且总和 1；`bias/noise` 是无量纲质量差异。玩法先验可试 `bias ~ TruncatedNormal(0, 0.04, -0.10, 0.10)`，`noise ~ Normal(0, sigma)`、`sigma ∈ [0.02,0.08]`；对应常见波动约数个质量分，**全部是待校准游戏参数**。不从 NeurIPS 的 23% 分歧直接换算这些标准差。文章本身的 `q` 不确定性应一次抽样、共同作用于所有评审者；否则会把共同盲点当作可平均掉的独立噪声。随机种子由 `attemptId + reviewerId + rubricVersion` 固定并保存结果，避免反复打开界面刷新分数。

模拟评审应说明“为什么不同”：一人关注统计、另一人关注范围外推，而不是只有随机数。官方反馈重视可行动问题，数值扰动是为游戏设计提出的近似。[P01](https://neurips.cc/Conferences/2025/ReviewerGuidelines)、[P03](https://icml.cc/Conferences/2025/ReviewerInstructions)。

长期可在有标签数据上拟合有序回归或分层模型。公开 OpenReview 数据存在 venue/年份、撤稿与公开选择偏差；不能只用已录用论文训练“全体稿件接收概率”。需要时间外推、领域外推、评审者留出与校准曲线；没有这些验证时只做风险提示。

### 4.5 实验数值与成本不能刷分

对于同一预先指定对比，在配对之间独立、差值近似正态或有充分的均值近似依据时，可记录配对均值区间；公式参考 NIST 统计手册，仅使用其配对区间公式，不据“区间包含零”判定两方法等效。[P20](https://itl.nist.gov/div898/handbook/prc/section3/prc312.htm)

```text
d[r] = metricMethod[r] - metricBaseline[r]
meanDiff = mean(d)
CI = meanDiff ± tQuantile(1-alpha/2, n-1) * sampleStd(d) / sqrt(n)
```

`n≥2` 是独立配对运行数，`alpha∈(0,1)` 是名义错误率；`sampleStd(d)` 使用分母 `n-1`，`tQuantile` 是自由度 `n-1` 的 Student t 分布分位数，区间与指标同单位。`n=1` 无法从运行间方差计算该区间，必须显示未知，不能以零误差条替代。若指标是准确率，明确用 `[0,1]` 比例还是百分点；`0.02` 比例差是 2 个百分点，不是 2% 相对提升。共享同一测试集不会估计所有数据总体不确定性。不满足假设时选适配重采样/模型并解释采样单位。单次聚合时间 `O(n)`、额外内存 `O(1)`；适配区间方法的选择与实际效应判断需检查者确认。

MVP 可先记录 `3–5` 个 seed 的探索结果，正式比较再试 `5–10` 个独立配对运行以估计方差；这些是**实验设计起点，非统计充分性的保证**。样本数最终由最小有意义效应、观察方差与资源预算决定，不设“跑够 5 次必得统计满分”。对于确定性证明或结果，不为装饰添加随机误差条。

计算成本记录 `gpuHours = gpuCount × wallHours`、`moneyCNY = Σ usage × rate`；`gpuHours` 是设备占用核算，异构 GPU 不可据此直接比较算力。`peakVRAM_GiB` 不与总 GPU 显存简单相加代替单设备可运行性。额外 GPU、种子和图表只在填补论点义务或减少相关不确定性时改善报告，不直接加质量分。

## 5. Recommended MVP：最小可玩版本及升级路线

### 5.1 第一版推荐闭环

**推荐〔Moderate 支持证据追踪；实现范围与时间预算为 Design heuristic〕：** 先做“实验报告”和“课程报告”两个 profile；允许问题、方法、实验/证据、图表、结论、引用、限制七类核心内容，章节作为容器自动生成。一次教程只要求一个可检验主张、一个对照或合适证明、一个范围明确的结论。不要在第一版强制长文写作或多个 venue 全流程。

1. 玩家从蓝图/知识图模拟训练创建带来源的 `ExperimentRun`，或导入明确标记的外部实测记录。
2. 选定一条主张及其验证义务，绑定方法和运行数据；改变模型后需生成新 revision，旧结果保留。
3. 自动生成引用同一数据源的结果表/图，选择结论范围；数值由证据引用读取。
4. 检查器指出缺失对照、错误单位、无数据来源、范围外推或未填限制。玩家补实验、收窄主张或解释不适用。
5. 生成 `Assessment`，显示 eligibility、维度和未知项；冻结一次 `ReportRevision` 作为 Lab 任务交付物。
6. NPC 指导可提供一个具体检查结果、帮助获取材料或减少工作时间；不直接赐予“新颖性 +20”或真实有效性保证。

推荐算法草图：

```text
evaluateReport(document, profile, runStore):
    validateSchemaAndReferences()
    checkContainmentDAG()
    collapseExactDuplicateInformation()
    logicalGraph = orientPremisesToClaims()
    rejectCircularSupport(logicalGraph)          # 引用/讨论环不等于逻辑支持环
    obligations = instantiate(profile, claimScopes)
    for obligation in obligations:
        candidates = indexedCompatibleEvidence(obligation)
        evaluateDataVersionUnitsAndScope(candidates)
        recordSupportRangeAndMissingReason(obligation)
    checkCrossSectionMetricBindings()
    gates = evaluateVersionedGatesWithUnknown()
    scores = evaluateApplicableDimensions()
    penalties = deduplicateIssuesByRootCauseAndScoreOwner()
    return explain(gates, scores, penalties, uncertainty)
```

若 `duplicates` 已由哈希/显式来源建立，检查成本约 `O(V+E+K+R)`，`R` 为读取的运行记录条数；内存 `O(V+E+K)`。强连通分量检测为 `O(V+E)`。自然语言相似度全对全搜索会成为 `O(V²)`，不进入 MVP 主路径；以后可用倒排/向量候选筛选，但其误报只能提示。每次编辑只重新检查受影响的引用闭包；提交时再做全量检查以防缓存遗漏。

### 5.2 必须先建立的实验记录接口

未来 `ExperimentRun` 至少保存：`runId, origin, simulatorVersion/codeRevision, blueprintRevision, knowledgeGraphRevision, datasetId/version, splitHash, seedRoles, methodConfig, metricDefinitions, metricValues, stoppingRule, computeUsage, createdAt`。对真实实验还需环境/硬件与可追踪原始输出；对模拟实验要把模型假设版本显式写入。`seedRoles` 区分图生成、初始化、数据划分和训练随机性，不以一个 seed 覆盖所有来源。

当前 `TrainingCurveSnapshot` 可作为导入适配起点，但无法事后恢复缺失的全配置。旧快照导入应标 `provenanceCompleteness=partial`，将缺失项显示为未知；不能猜配置并生成完整记录。新报告引用实验记录不受 UI 最近 20 条展示上限影响；删除仍被报告引用的记录时应保留归档或显式断链，不能静默改写证据。

### 5.3 第二阶段与长期版

| 层级 | 交付能力 | 完成门槛 |
| --- | --- | --- |
| MVP | 两类报告、证据引用、七类内容、规则问题列表、确定性评分/区间、版本存储 | 删除/复制模块不刷分；旧记录不被新训练覆盖；所有扣分可解释；无真实录用概率。 |
| 第二阶段 | 理论/复现/研究计划模板；自定义 venue profile；Lab 投稿尝试、评审问题与 rebuttal；artifact 独立任务 | 同一篇内容在不同 profile 下有可解释差异；三值 gate 生效；反馈修正只影响新版本。 |
| 长期研究版 | 真实实验导入、文稿导出、引用片段核验、协作审阅、专业实证方法模板、研究材料验证；经校准的评审分布 | 专家盲评与领域外验证；权限与政策版本可追踪；模型建议和人工裁决明确分开。 |

Lab 中 `SubmissionAttempt` 应引用冻结的 `reportRevision` 和 `venueProfileVersion`，保存 `submittedAtGameMinute, phase, reviewIds, decision, resubmissionParentId`。编辑文稿、提交行为与评审决定是不同事件；论文录用可以奖励学术进度，artifact 可再获得独立复现/共享奖励。已证实无效的主张应撤销或限定相关证据状态，不从知识图删除全部相关知识。

现实模式使用具体 venue 当年限制、显式未知的耗时/决定和可核实数据；游戏化模式使用压缩的工作量、明确标记的虚构 venue 与有界随机评审。两个模式共享来源与论证规则，数值节奏分开配置。

## 6. Validation plan：验证计划

本次仅规划验证，不运行应用构建或改变产品。后续最值得先做的可证伪实验如下。

| 实验 | 操作与观察 | 可推翻推荐的结果 | 建议起始样本/成本性质 |
| --- | --- | --- | --- |
| 复制攻击 | 同一图表/证据复制 1、10、100 次，或拆为不同章节 | 主张覆盖或质量上升即失败 | 规则合成用例；应完全确定、无需统计显著性。 |
| 证据删减与 scope 扩张 | 删除关键对照；把“数据集 A”改成“所有任务” | 没有新义务/风险，或分数不反映缺口 | 配对构造 20–40 个案例，数量为设计起点。 |
| 相关重复与独立重复 | 同 seed 复制记录，比较新增独立运行/数据集 | 复制带来虚假的区间缩窄，或独立证据无合理作用 | 数值与来源校验，检查采样单位。 |
| 模板公平性 | 正确理论稿、严谨负结果复现、可行计划与实证方法稿混评 | 因缺少无关实验/新方法而系统性低分 | 每类型先 8–12 个受控文档，请 2–3 位相应方法专家复核；不据小样本宣称普适有效。 |
| 跨章节矛盾 | 修改数据 split、单位、模型版本，保留旧摘要数字 | 静默通过、误将不同实验合并 | 确定性变异测试。 |
| 缺失与 gate | 把无开源、页数越界、未知伦理审批分别输入不同 profile | 未开源一律拒稿，或未知直接判违规 | 规则版本快照+人工确认案例。 |
| 评审一致性与效用 | 同一草稿独立专家标核心缺陷/建议顺序，与系统比较 | 高总分频繁掩盖致命缺陷；建议不能指导修复 | 报告缺陷召回、误报、维度一致性和区间覆盖，不只报告与总分相关。 |
| 玩家目标变化 | 比较“堆章节分”和“论点缺口反馈”两种界面，观察下一步选择 | 玩家仍主要堆模块，或理解成本/挫败明显上升 | 小型对照试玩；预先记录任务完成率、修复关键缺陷比例、阅读反馈时间及主观负担。 |
| 模拟来源混淆 | 混排模拟、外部实测、文献结果，询问何种结论可声称 | 玩家把模拟曲线普遍理解为真实网络验证 | 来源标签与文案实验；这是上线前重要教育风险门槛。 |

数值验收优先用不变量：复制不增分、无证据不满覆盖、未知不变成通过、同 revision 同 profile 结果稳定、删除关键证据不能改善被支持程度。人审标签不能当无噪声真值；先测评审者间一致性，分析分歧原因，再决定可接受阈值。计划样本量和评分阈值全部标为待校准，不伪造功效分析结果。

## 7. Risks, unknowns, and rejected alternatives：风险、未知与不采用方案

| 风险/方案 | 处理与拒绝原因 | 等级 |
| --- | --- | --- |
| 模块数量、引用数、GPU 时长直接加分 | 与证据独立性、必要性不一致，容易优化数量而损害研究；只通过义务/精度改变相关维度。 | **Design heuristic**，需攻击测试。 |
| 把 `effectiveRank`、记忆点或低 loss 直接换论文创新分 | 属于跨层偷换概念；最多影响模拟实验行为，不决定问题价值与证据真实性。 | **Strong：当前来源边界；Design heuristic：层间接口。** |
| 为每篇论文固定“数据集×基线×消融×seed”配方 | 对理论、研究计划、负结果与部分系统研究不适用；按主张类型决定验证义务。 | **Strong** 官方方法差异；具体义务库待建。 |
| 向 `.rep` 直接复用知识图三类边及其 mastery 传播公式 | 相关知识的掌握和论点证据支持不是同一对象；掌握度高不能使断言变真，循环支持不能产生证据。 | **Design heuristic**，语义一致性要求。 |
| 任意 `No` 清单项都判拒稿 | 混淆“不适用、未公开、有解释、真实缺陷”；与 NeurIPS checklist 对代码公开的处理不符。 | **Strong**，限所引规则。 |
| 用 `score / 100` 当录用率 | 缺少选择过程、venue、评审者与时间条件；质量分和接收事件不是同一量。 | **Strong：不可由定义推出；具体概率长期待校准。** |
| 每次打开页面重新投骰子 | 玩家可刷结果，修改反馈无法解释；保存 attempt 级评审结果。 | **Design heuristic**。 |
| LLM 自动核验所有论点、新颖性、伦理并直接裁决 | 难以保证来源完整性和事实正确；还受真实 venue 审稿政策限制。只给可定位候选问题，由人复核。 | **Moderate** 方法风险；政策以当年官方规则为准。 |
| 来源哈希齐全即“真实” | 哈希只验证版本与内容绑定，不能证明观测诚实。真实导入需要记录来源与检查范围。 | **Strong** 技术边界。 |
| 含局限、负结果的文稿天然低分 | 鼓励隐瞒，且违背诚实评估的原则；评价问题价值、证据和认识增量，而非只看正向结果。 | **Strong** 官方指导方向，分数设计待校准。 |
| 把清华/Stanford 模板推广为中国全部高校要求 | 地区、学位类型与院系标准差异未覆盖；只作具名示例。 | **Strong** 适用范围限制。 |

尚无证据确定：各质量维度的游戏权重、玩家可接受的评审随机幅度、不同主张需要多少有效证据、现实稿件可自动判定的正确性上限、课程模式与研究模式的节奏、专家评审分布的跨 venue 可迁移性。建议先冻结小型义务库和来源接口，通过上述反例实验决定是否扩展，而不是把尚未验证的参数当规则事实。

## 8. Sources：本主题来源索引

以下来源均于 2026-09-09 检索。`未标年` 不以网站页脚或搜索抓取时间伪充发表年；滚动页面应在未来实现 profile 时保留文本版本/哈希。事实摘要只覆盖本文实际使用部分。

| ID | 来源与链接 | 年份 | 类型 | 使用结论、范围与访问限制 |
| --- | --- | --- | --- | --- |
| P01 | [NeurIPS Reviewer Guidelines](https://neurips.cc/Conferences/2025/ReviewerGuidelines) | 2025 | 会议官方规则 | 四个质量维度、confidence、局限、可行动反馈与格式处理；限当年会议。正文已打开。 |
| P02 | [NeurIPS Paper Checklist Guidelines](https://neurips.cc/public/guides/PaperChecklist) | 滚动页；2026 检索 | 官方清单 | 复现路径、统计变异来源、资源和代码公开边界；不是冻结 2025 版本。正文已打开。 |
| P03 | [ICML Reviewer Instructions](https://icml.cc/Conferences/2025/ReviewerInstructions) | 2025 | 会议官方规则 | claims/evidence、主轨/position 差别、回复与审稿工具规则；限该年。正文已打开。 |
| P04 | [ICML Author Instructions](https://icml.cc/Conferences/2025/AuthorInstructions) | 2025 | 会议官方规则 | 主文页数、匿名和补充材料；限投稿阶段与该年。正文已打开。 |
| P05 | [ICLR Reviewer Guide](https://iclr.cc/Conferences/2025/ReviewerGuide) | 2025 | 会议官方规则 | 审阅/讨论及辅助工具责任；HTML 标题残留“2022”，正文标题明确 ICLR 2025，应以正文识别。 |
| P06 | [NeurIPS Ethics Guidelines](https://neurips.cc/public/EthicsGuidelines) | 滚动页；2026 检索 | 官方伦理指导 | 情境化风险评估；2025 reviewer 页实际指向该公共链接。错误猜测的年度路径未采用。 |
| P07 | [JMLR Information for Authors](https://www.jmlr.org/author-info.html) | 未标年；2026 检索 | 期刊官方规则 | 论点支持、实质会议扩展、格式/流程；仅 JMLR。正文已打开。 |
| P08 | [JMLR Reviewer Guide](https://www.jmlr.org/reviewer-guide.html) | 未标年；2026 检索 | 期刊官方指导 | 期刊审查标准与反馈；仅 JMLR。正文已打开。 |
| P09 | [MIT EECS Thesis Proposal](https://mitcommlab.mit.edu/eecs/commkit/thesis-proposal/) | 未标年；2026 检索 | 大学官方写作指导 | 研究计划的目标、前期工作、资源、时间和可行性；不是所有院校硬性格式。 |
| P10 | [CMU IMRD Structure](https://www.cmu.edu/student-success/other-resources/resource-descriptions/imrd.html) | 未标年；2026 检索 | 大学官方写作指导 | 科技材料常用结构；不是实验报告普适 rubric。正文已打开。 |
| P11 | [CMU Designing Technical Reports](https://www.cs.cmu.edu/~rapidproto/handouts/techreps.html) | 未标年；2026 检索 | 大学课程写作资料 | 技术报告受众与结构；旧网页，仅用于稳定的文体概念。正文已打开。 |
| P12 | [清华大学研究生学位论文写作指南](https://www.dhs.tsinghua.edu.cn/wp-content/uploads/2023/12/2025032107444819.pdf) | 2025-03 | 大学官方指南 PDF | 学位论文完整结构和院系差异；公开副本，非全国统一标准。53 页 PDF 已打开，封面日期确认。 |
| P13 | [POPL Artifact Evaluation](https://popl25.sigplan.org/track/POPL-2025-artifact-evaluation) | 2025（流程始于 2024） | ACM SIGPLAN 会议官方 | artifact 与论文判断分开、功能/复用/持久获取区别；只外推设计原则。正文已打开。ACM 总政策页抓取错误，本文未依赖其未读正文。 |
| P14 | [ACM SIGSOFT Empirical Standards](https://www2.sigsoft.org/EmpiricalStandards/)；[具体标准](https://www2.sigsoft.org/EmpiricalStandards/docs/standards) | 2020 起；2026 检索 | 专业学会方法标准 | 按方法选择义务与属性；软件工程范围，迁移 ML 需再校验。两个官方页面已核验。 |
| P15 | [The NeurIPS 2021 Consistency Experiment](https://blog.neurips.cc/2021/12/08/the-neurips-2021-consistency-experiment/) | 2021 | 会议官方实验报告 | 882 篇双委员会样本、203 篇判断不一致；保留撤稿与双份接收设计口径，不等同误判率。 |
| P16 | [ICML Publication Ethics](https://icml.cc/Conferences/2025/PublicationEthics) | 2025 | 会议官方伦理规则 | 情境化伦理问题与审查；不是自动合规裁决。正文已打开。 |
| P17 | [Stanford CS229 Final Project Guidelines](https://cs229.stanford.edu/materials/project-guidelines-spr16.pdf) | 2016 春 | 大学课程官方 PDF | 应用/算法/理论项目、阶段交付和评价方向；只作历史课程实例。5 页已打开。 |
| P18 | [Stanford CS229 Final Report Guidelines](https://cs229.stanford.edu/final-report-guidelines.pdf) | 未标年；2026 检索 | 大学课程官方 PDF | 章节结构不保证分数、不同项目适用栏目；不能与 P17 混用成同年度规则。4 页已打开。 |
| P19 | [Pineau et al., Improving Reproducibility in Machine Learning Research](https://www.jmlr.org/papers/v22/20-303.html) | 2021；报告 2019 项目 | 同行评审 JMLR | 清单、代码与复现活动互补；不支持固定清单—录用概率映射。开放论文页已打开。 |
| P20 | [NIST Confidence intervals for differences between means](https://itl.nist.gov/div898/handbook/prc/section3/prc312.htm) | 未标年；2026 检索 | 官方统计手册 | 配对均值 t 区间公式；需检查独立性和分布假设，不据区间含零推导等效。正文已打开。 |

访问限制补充：ACM 总政策 HTML 多次返回抓取错误，ACM 公共政策 PDF 返回 403；CMU 某单课程实验报告 PDF 超时。本文使用已读取的 POPL 官方规则、CMU IMRD 与 Stanford 课程材料替代对应论据，没有把搜索摘要当作已阅读全文。未标年的网页在最终参数化前仍需重新核验，不把历史课表、旧政策或滚动页面变成永久规则。
