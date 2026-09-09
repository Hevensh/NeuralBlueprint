# 研究三：Lab 中研究生科研生存模拟

审计基线：`4696a94becf96256efa24c7fbab0f367230aa15c`；资料核验日期：2026-09-09。本报告只提出研究与设计，不修改运行代码。研究对象主要是中国计算机科学（Computer Science, CS）和人工智能（Artificial Intelligence, AI）研究生；国际调查、留学生生活指南、单校政策都单独限定范围。

本文以 **[Implemented]** 标记当前实现，**[Evidence]** 标记来源支持的事实，**[Assumption]** 标记游戏假设，**[Calibration]** 标记待校准参数。证据强度分为 **Strong / Moderate / Weak / Design heuristic**；Strong 指来源对所述具体范围的直接支持，不代表能推广到全国。文中价格、时间、奖金均保留原始币种、年份和分母。

核心建议是把 Lab 做成“安排注意力与资源、积累可检查的科研证据”的系统。先接通统一时间、GPU 作业和证据资产，再加入资金、同门与投稿。不要把学术录用当作点击按钮后的固定概率，也不要把国家助学金、导师项目经费、云机时和模型适应点合并成一种货币。

## 1. Current implementation audit（当前实现审计）

### 1.1 阅读范围与当前系统边界

已阅读 [PROJECT_CONTEXT.md](../../PROJECT_CONTEXT.md)、[README.md](../../README.md)，并沿实际状态、时间推进、训练资源和 UI 调用链审计。README 仍以 Vite 模板说明为主，不能作为 Lab 机制依据。

| 已核实内容 | 文件、函数和位置 | 实际行为与限制 |
|---|---|---|
| 游戏根状态 | [gameTypes.ts:8](../../src/game/gameTypes.ts#L8)，`GameProgress`；[gameProgress.ts:7](../../src/game/gameProgress.ts#L7)，`createInitialGameProgress` | 只有 `seed`、`time`、`lab`；开局第 1 天 09:00。没有个人现金、资助合同、精力、课程或论文项目状态。 |
| Lab 持久状态 | [labTypes.ts:47](../../src/lab/labTypes.ts#L47)，`LabProgress` | 保存场景种子、工位分配、玩家工位、到场 NPC、完成话题和奖励收据；没有 NPC 入学时间、学段、毕业进度、关系值或技能。 |
| 工位和服务器外观 | [labSceneLayout.ts:56](../../src/lab/labSceneLayout.ts#L56)，`createLabSceneLayout`；[labNpcRegistry.ts:112](../../src/lab/labNpcRegistry.ts#L112)，`DEFAULT_LAB_DAY_CONFIG` | 默认 6–8 个工位、3 个 NPC；画面随机生成 2–4 个服务器，`trainingCapacity` 等于其数量。全仓调用检索未发现此容量进入训练估算；外观数量尚不是实际 GPU 资源数。 |
| 名册、到场 | [labProgress.ts:10](../../src/lab/labProgress.ts#L10)，`createInitialLabProgress`；[:121](../../src/lab/labProgress.ts#L121) `selectRoster`；[:143](../../src/lab/labProgress.ts#L143) `selectAttendance` | 在默认 5 人池中洗牌取 3 人；到场人数在 1、2、3 中均匀抽取，再洗牌抽取对应人数。不是每位 NPC 各自独立的出勤模型，也不区分周末、组会或远程工作。 |
| 日更新与毕业 | [labProgress.ts:43](../../src/lab/labProgress.ts#L43)，`advanceLabDay`；[:58](../../src/lab/labProgress.ts#L58)，`graduateLabSenior` | 两个函数已定义，但源代码调用检索仅发现声明，没有接入根时间更新。毕业函数只允许 `role='senior'`，随机从未占位池找替代者，没有学制或毕业条件；无候选人则保持原状。 |
| 对话奖励 | [labProgress.ts:90](../../src/lab/labProgress.ts#L90)，`completeLabTopic`；[:159](../../src/lab/labProgress.ts#L159)，`pickWeighted`；[LabNpcDialog.tsx:34](../../src/lab/LabNpcDialog.tsx#L34)，`selectTopic` | 点选话题即完成，按 `day:npcId:topicId` 去重。正权重归一化抽取一份奖励；总权重不正则无奖励。默认 [NPC registry](../../src/lab/labNpcRegistry.ts#L3) 的话题均未配置 `rewards`，目前只有对话内容，没有落地的科研奖励。 |
| 随机性 | [labRandom.ts:1](../../src/lab/labRandom.ts#L1)，`createSeededRandom`；[:17](../../src/lab/labRandom.ts#L17)，`shuffleWith` | 基于字符串种子的可重复伪随机；重访同一日同一话题不会重抽，下一日是不同 encounter。重置实验室 [LabWorkspace.tsx:143](../../src/lab/LabWorkspace.tsx#L143) 会用时间戳生成新种子，清空 Lab 进度。 |
| 场景交互 | [LabWorkspace.tsx:125](../../src/lab/LabWorkspace.tsx#L125)，`completeTopicHandler`；[:165](../../src/lab/LabWorkspace.tsx#L165)，`noticeContent`；[LabLeftPanel.tsx:7](../../src/lab/LabLeftPanel.tsx#L7) | 对话只改 `lab`，不消耗时间；书架、白板、服务器点击显示说明。教室按钮禁用。服务器说明“当前没有后台训练任务”来自 [label.zh.ts:24](../../src/i18n/label.zh.ts#L24)，并非查询真实作业队列。 |
| 时间 | [academicTime.ts:22](../../src/time/academicTime.ts#L22)，`advanceGameTime`；[:31](../../src/time/academicTime.ts#L31)，`getAcademicTime`；[App.tsx:65](../../src/App.tsx#L65)，`advanceTrainingTime` | 非负整分钟推进，1440 分钟进一天，7 天一周、20 周一学期，连续学期不含假期。App 训练回调只改 `time`，没有跨天结算或 NPC 刷新。 |
| 训练资源 | [trainingResources.ts:58](../../src/blueprint/neuralBlueprint/analysis/trainingResources.ts#L58)，`estimateTrainingResourceProfile`；[:215](../../src/blueprint/neuralBlueprint/analysis/trainingResources.ts#L215)，`estimateTrainingRun` | 按节点形状估参数、激活元素和运算量，区分 Adam 优化器状态，已有显存 fit gate 和 epoch 时间估算。不是实际 CUDA 训练实测，也不是 Lab 队列。 |
| 训练执行入口 | [useBlueprintDataController.ts:163](../../src/blueprint/dataController/useBlueprintDataController.ts#L163)，`trainingRunEstimate`；[:172](../../src/blueprint/dataController/useBlueprintDataController.ts#L172)，`startTraining`；[:286](../../src/blueprint/dataController/useBlueprintDataController.ts#L286)，训练计时 effect | 未初始化、已有活动训练或显存不够时返回。即时模式调用 `runTrainingEpochs` 并一次推进全部游戏分钟；等待模式每 tick 推进 1 游戏分钟，到 epoch 边界运行模拟。`activeTrainingRun` 属于该 controller 的局部状态，不是跨场景持久队列。 |
| UI 与保存 | [TrainingResourceWindow.tsx:9](../../src/blueprint/trainingProcess/TrainingResourceWindow.tsx#L9)，`TrainingResourceWindow`；[gameStorage.ts:7](../../src/dataStorage/gameStorage.ts#L7)，`loadGameProgress` | UI 展示显存、参数、GFLOP/sample、TFLOP/epoch 和游戏分钟。游戏以 `neural-blueprint:game-progress:v2` JSON 保存；加载直接类型断言，新增系统需版本迁移和输入验证。 |

**[Implemented] 负面范围结论：**沿 `src/game`、`src/lab`、训练 controller、`src/taskData` 及全仓关键词/引用检索，未发现研究生现金流、奖助合同、课程时间表、竞赛报名/晋级、科研选题/投稿/rebuttal 的运行状态机。现有教学任务配置不能解释为现实竞赛或论文流程。这里是对本提交的静态审计结论，不是对未提交分支的推断。

### 1.2 现有 GPU 公式和单位

令 `P` 为参数个数，`A` 为每样本累计激活元素数，`B=max(1,floor(batchSize))`，`F` 为每样本前向浮点运算数（FLOP），`N=max(1,floor(sampleCount))`，`r` 为服务器有效 TFLOP/s。代码在 [trainingResources.ts:188](../../src/blueprint/neuralBlueprint/analysis/trainingResources.ts#L188) 和 [:221](../../src/blueprint/neuralBlueprint/analysis/trainingResources.ts#L221) 实现：

```text
M_parameter_gradient = 8P / 2^20                         MiB
M_saved_activation   = 8BA / 2^20                       MiB
M_peak = 256 + M_parameter_gradient + 1.5M_saved_activation
         + I(optimizer='adam') * 8P / 2^20              MiB
workTflopPerEpoch = 3FN / 10^12                         TFLOP
gameMinutesPerEpoch = max(1, ceil(workTflopPerEpoch / max(0.001,r) / 60))
fitsInVram = profile.valid && M_peak <= server.vramMiB
```

默认 `B=64`；FP32 每元素 4 字节；两个激活副本、工作区乘数 1.5、固定 256 MiB 保留、训练 FLOP/前向 FLOP 比值 3 都是当前常数。推荐显存以 512 MiB 向上取整，且最低 512 MiB；run 层另加 Adam 状态。估算复杂度约 `O(V+K)`，`V` 为模块数，`K` 为残差模块内部卷积总数，不依赖样本逐条计算。

**[Implemented] 最重要尺度风险：**[DEFAULT_TRAINING_SERVER](../../src/blueprint/neuralBlueprint/analysis/trainingResources.ts#L16) 配置 `1_048_576 MiB=1024 GiB=1 TiB`、`effectiveTflops=1`、label 为 `Research GPU 1T`。这不是“一张 1 GB GPU”，也不代表 1 TB/s 带宽。多数小网络会被 1 分钟/epoch 下限抹平速度差；大显存又弱化资源取舍。无效 profile 虽会阻止开训，但模型只读首个 predecessor 的形状来估若干层输入，累加所有保存激活，不模拟生命周期/内存复用；`Sum` 只按一次逐元素运算计，不随汇入分支数增加。混合精度、冻结权重、检查点重计算（activation checkpointing）、注意力 KV 缓存、分布式通信、I/O、编译、共享干扰均未在此实现。

**建议 [Design heuristic]：**保留估算器作为可解释的初值，新增 `estimatorVersion`、`assumptions` 和误差区间；任何真实设备卡都需对任务族实测标定。先实现实体资源与队列，再让服务器外观数量从资源状态派生。不要通过改一个 TFLOP 常数同时补偿算法误差和游戏节奏。

## 2. Evidence-backed findings（证据支持的发现）

### 2.1 收入、资助资格和支出：先建立情境，再给数值

| 地区/对象/年份、资料口径 | 可直接使用的现实锚点 | 适用范围与证据强度 |
|---|---|---|
| 北京化工大学 2025 级收费与奖助制度；单校政策，无抽样 | 普通全日制学硕及电子信息等普通专硕学费 8000 元/学年；享受住宿者 520–1200 元/学年。标准学制内、符合资格者硕士助学金 500 元/月、博士 1250 元/月；硕博身份转换后按博士标准。 | **Strong**，限该校、该类学生。国家奖学金是竞争奖励，硕士 2 万/年、博士 3 万/年，不能默认每人有。延期、休学、固定工资等资格限制需建模。[L01](https://graduate.buct.edu.cn/_upload/article/files/52/ce/8356350e4f1fb0822b75215c4e81/2e9b14e7-ee01-4ae1-8a96-1f119f785ed3.pdf) |
| 深圳大学 2025 级章程；2024 年公布 | 全日制学硕 8000 元/年、专硕 10000–19500 元/年；全日制宿舍 1200–1500 元/年；非全日制不提供住宿。 | **Strong**，该校制度，不代表所有深圳学校。不能把高价非 CS 专业学费套在 CS 学生身上。[L02](https://yz.szu.edu.cn/info/1002/12974.htm) |
| 深圳大学 2025 级全日制非定向硕士奖助表；2024-08 发布 | 国家助学金 6000 元/年、校助学金 2000 元/年，各按 10 个月发放，即发放月 600+200 元；三助表列每岗每月 1000 元、按 10 个月，覆盖有限；导师津贴由经费和工作量决定。 | **Strong**，资格和公告范围内。不能把学业奖、三助、优质生源奖励都计为保证收入。表中“约 3%”是该版国家奖学金口径，不能当 2026 年全国获奖率。[L03](https://yz.szu.edu.cn/info/1041/12983.htm) |
| 北大校本部 2025–2026 专业学位/单列项目通知；2025-06 | 合资格专硕国家助学金 6000 元/学年、专博 15000 元/学年；学术学位国家助学金已统筹进其他奖学金，不另设一笔。 | **Strong**，该通知明确排除医学部、深圳研究生院、软件与微电子学院；禁止跨项目复制和重复记账。[L04](https://grs.pku.edu.cn/jzgz/dtxx1/tzgg1/50118yjsy390189.htm) |
| 平顶山学院 2025 年三助设聘，河南地方院校 | 理工医助研最低 300 元/生月，具体导师决定；助教每节课 20 元、一般每周 2–4 小时，岗位周期有规定。 | **Strong**，这是小城市地方院校制度样例，不是全部地方 CS 实验室工资分布，也不能把“每节”当“每小时”。[L05](https://yjsc.pdsu.edu.cn/info/1047/1459.htm) |
| 北大深圳研究生院 Admissions_2024 国际项目预算页 | 餐饮 1500–2000 元/月、交通 100–200 元/月；单人宿舍 15840 元/年。 | **Moderate**，面向国际招生、含法学/商学情境的学校预算估计，不是本土 CS 研究生开支调查。单人国际宿舍不能替代上行深大本土宿舍标准。[L07](https://english.pkusz.edu.cn/Admissions_2024/Costs___Scholarships.htm) |
| 长安大学国际教育学院，西安，页面未标更新年 | 不含学费住宿的生活预算估计 12000–15000 元/年，包含衣食、交通、通信、书籍与旅行。 | **Weak** 用作跨地区预算锚点；无样本、无当前物价保证，不能据此精算中国学生的生存线。[L08](https://ies.chd.edu.cn/en/8894/list.htm) |

这些差异至少来自 `city`、`institutionPolicy`、`degreeLevel`、`degreeTrack`、`fullTime`、`employmentStatus`、`fundingContract`、`housingType`、`fundingMonths`，不是一个“学校排名加成”即可解释。2024年财教〔2024〕181号把研究生国家奖学金名额由4.5万增至9万；另自2025年提高中央高校学业奖学金财政支持标准，具体覆盖面和等级由学校确定。招生季旧表与后续执行可能不同。[财政部文告2024年第10期，印刷页16–17，L25](https://www.mof.gov.cn/gkml/caizhengwengao/wg2024/wg202410/202501/P020250109539041693223.pdf) 正文已核验；这不是个人获奖概率或人人到账金额。现实模式必须按入学年份和学校最终执行文件锁定资助表。

**建议 [Strong：分账原则；Design heuristic：游戏数值]：**资金至少分“个人可支配现金”“学费/住宿应付”“受限科研经费”“不可兑现机时券”。`RA`（Research Assistant，助研）可能就是导师科研津贴的发放形式，不应默认二者可叠加；`TA`（Teaching Assistant，助教）必须绑定工作义务。报销承诺是应收款，不是当前现金。家庭支持和外部实习收入须显式选情境；无资助研究生保留兼职、困难补助申请、缩小课题等恢复路径。

### 2.2 时间结构与导师/同门资源

**[Evidence, Moderate]** 2019 年 Nature/Shift Learning 原始调查有 6320 份清理后的在读博士样本，在线招募且覆盖多国多学科；76% 自报每周博士相关工作至少 41 小时，27% 在 41–50 小时、25% 在 51–60 小时。报告约半数每周一对一导师接触少于 1 小时；图中 49% 与正文 51% 有差异，故此处不精确化。该调查不是随机全国样本，不能作为中国 CS 生工时制度或“加班提升产出”的因果证据。[L09，2019，研究背景与第 18 页](https://cdn-media.web-view.net/i/zxexafdswsu2/Nature_PhD_survey_2019_Report_v1_1.pdf)

**[Evidence, Strong]** 哈尔滨工业大学 2025 春季助教通知明确 18 教学周、周工作时长上限 8 小时，要求周志和期末总结；这是课程占用与可审计劳动的实例，并非所有助研岗位上限。[L06](https://hituc.hit.edu.cn/2025/0222/c17860a363306/page.htm)

**[Evidence, Moderate]** 美国国家科学院 2019 年 STEMM 导师制共识报告强调持续关系、技能支持、心理社会支持及多导师结构，支持把指导与同门帮助建成有内容的关系；报告不提供“闲聊一次增加 10% 科研成功率”的通用系数。[L26](https://nap.nationalacademies.org/catalog/25568/the-science-of-effective-mentorship-in-stemm)

**[Assumption, Design heuristic]** MVP 用以下“可分配注意工时模板”，而非把它宣称为现实平均日程；睡眠、吃饭、通勤、照护等不在该表的工作工时内。

| 周模板 | 课程/作业 | 科研阅读/分析 | 编码/实验操作 | 写作/图表 | 组会/指导 | 三助/行政/突发任务 | 合计 |
|---|---:|---:|---:|---:|---:|---:|---:|
| 硕士入门学期 | 14 h | 8 h | 8 h | 2 h | 3 h | 5 h | 40 h |
| 常规研究期 | 2 h | 10 h | 16 h | 8 h | 3 h | 5 h | 44 h |
| 投稿冲刺周 | 0 h | 5 h | 14 h | 23 h | 4 h | 2 h | 48 h |
| 实习兼课题 | 0 h | 4 h | 6 h | 2 h | 2 h | 26 h（含实习） | 40 h |

这些类别互斥记账：同一助研实验只能算一次注意工时；GPU 跑 24 小时只消耗机器时长，启动、排错与结果分析另占注意工时。多人工作可并行，个人不可同时以全效率上课、写作和开会。突发需求先改变计划、留下恢复窗口；休息有机会成本和恢复作用，不能无限刷恢复，也不能设计成持续通宵总是最优。

### 2.3 GPU：容量、吞吐和排队是三种不同约束

**[Evidence, Strong]** NVIDIA 2022 年 RTX 4090 官方发布信息为 24 GB 显存、起价 1599 美元，属于当年发布价，不是 2026 中国购买价格。[L10](https://nvidianews.nvidia.com/news/nvidia-delivers-quantum-leap-in-performance-introduces-new-era-of-neural-rendering-with-geforce-rtx-40-series) A100 官方资料列 80 GB 与不同精度性能；不得把稀疏 Tensor Core 峰值直接填成任意网络的持续有效 FLOP/s。[L11](https://www.nvidia.com/content/dam/en-zz/Solutions/Data-Center/a100/pdf/a100-80gb-datasheet-update-a4-nvidia-1485612-r12-web.pdf)

**[Evidence, Strong，限定论文设置]** QLoRA（Quantized Low-Rank Adaptation，量化低秩适配）论文在 2023 年展示 65B 模型可在单张 48 GB GPU 微调，并报告特定 Guanaco 设置单卡约 24 小时；不意味着任意数据、序列长度和目标都只要一天，更不是从头预训练。[L12](https://proceedings.neurips.cc/paper_files/paper/2023/hash/1feb87871436031bdc0f2beaa62a049b-Abstract-Conference.html) BERT 2019 年论文附录 A.2 则分别使用 16/64 个 TPU 芯片预训练 BASE/LARGE，各约 4 天，且 90% 步数为长度 128、其余长度 512。芯片时长不能直接等同 GPU 时长。[L13](https://aclanthology.org/N19-1423.pdf)

| 工作负载卡 | 显存/时间如何设定 | MVP 初值，仅为 [Calibration / Design heuristic] |
|---|---|---|
| 小型 MLP、表格数据、小图像教学 CNN | 由实际 blueprint 估算，CPU 也允许；关注启动/I/O 下限 | GPU 预算卡 4–8 GiB；单次作业 1–30 分钟，需同构基准修正 |
| 预训练视觉编码器迁移、单数据集 CNN 训练 | 输入分辨率、batch、冻结层数和 epoch 显式指定 | 8–24 GiB；0.5–12 GPU·h/实验，而非每篇论文 |
| 小规模语言编码器微调 | token 长度、batch、优化器、精度改变峰值 | 12–40 GiB；1–24 GPU·h/实验 |
| 7B/13B 级量化适配任务 | `baseWeights` 与 `trainableParameters` 分开，测量工作区/激活 | 16–48 GiB；2–48 GPU·h/实验；不能据此保证任何 13B 配置可放入 16 GiB |
| 65B QLoRA 历史案例 | 使用论文具体配置作为验证卡 | 48 GB 与约一天为论文锚点；参数、数据或实现变化即撤销该保证 |
| 大规模预训练/高分辨率视频 | 多 GPU、通信、数据吞吐，需专项模型 | MVP 作为受限合作项目；不给“8 卡固定一周成功”捷径 |

**[Evidence, Strong]** 北大高性能计算平台 2025-07-02 执行收费：GPU80G 低/正常/高优先级分别 4/6/8 元每卡小时；GPU3090 为 2/3/4 元每卡小时。该平台有配额与管理费；论文奖励机时不可提现、不可转让并跨年清零。该价格是校级平台收费，不是全国商业云 GPU 市价，也不据分区名擅自认定 GPU80G 的芯片型号。[L14](https://hpc.pku.edu.cn/guide_6.html)

**[Evidence, Strong]** Lambda 官方页面在 2026-09-09 抓取时，1 卡实例示例 A100 40 GB 1.99 美元/GPU·h、H100 PCIe 80 GB 3.29 美元/GPU·h、H100 SXM 80 GB 4.29 美元/GPU·h，另加适用税费；8 卡 A100 80 GB 表示每卡 2.79 美元/GPU·h，整个实例需乘 8。报价/库存会变化，不能拿最低多卡单价充当可买到的单卡价格，也不应以固定汇率混入人民币表。[L15](https://lambda.ai/instances)

**[Evidence, Strong]** Slurm 的优先级调度和回填（backfill）根据所需资源及预计运行时长安排作业，回填的前提是低优先级作业不推迟高优先级预留作业；队列等待不是固定服务时间。[L16](https://slurm.schedmd.com/sched_config.html)

**建议 [Moderate + Design heuristic]：**个人 GPU 提供无需排队的受限容量；实验室 GPU 共享但受配额/预约约束；云资源通过科研经费换取弹性。等待期间允许阅读、写作与休息。GPU `outOfMemory` 是配置门槛；训练结果不佳是科学结果；断电/抢占是运行中断，三者必须分别记录，不能用一次“失败”骰子混合。

### 2.4 实验室资源和同门系统

实验室资源建议按“有什么、谁有权限、何时可用”建模 **[Design heuristic]**：

| 资源 | 状态单位 | 消耗/限制 | 有价值的游戏结果 |
|---|---|---|---|
| 工位、会议空间 | 个、可预约时段 | 入组/搬迁、占用日历 | 降低协调成本；不要直接加模型有效秩 |
| 服务器 | 设备 ID、GPU 型号、显存 MiB、benchmark profile | 每卡的时间、权限、并发、维护 | 扩大可执行实验集合 |
| 导师指导 | 分钟/周、方向匹配、反馈类型 | 可预约窗口与审阅队列 | 识别错误假设、收缩论点、改善实验方案 |
| 同门帮助 | 专长、可用时间、关系历史 | 对方研究/课程/毕业计划 | 复现脚本、数据处理笔记、一次代码检查 |
| 数据与代码 | 版本、许可、可见范围、复现状态 | 存储、标注、治理与学习成本 | 解锁可比较基线，减少重复准备 |
| 内部论文审阅 | 合作者/导师的审阅小时 | 同一截止日前拥挤、作者确认 | 完成内部风险清单；不是“导师批准则必录” |
| 会议差旅 | 经费预算、资格、审批状态 | 录用后注册、交通、住宿和报销延迟 | 展示、交流、可解释的人际事件 |

没有可靠证据支持“名校实验室固定有几台服务器”或“每个导师每年能发几篇论文”的全国抽样分布。所谓“论文额度”建议只表示学校/项目规则下的审阅和差旅支持额度；科学录用机会不是可消耗的行政物品。公开机时奖励案例只说明一种制度存在，不能默认所有高校都有同样奖励。[L14，2025](https://hpc.pku.edu.cn/guide_6.html)

NPC 的合理随机性来自明确状态：`inLab / remote / course / internship / leave / graduated`，日历中先确定课程、休假与答辩，再对可到场窗口加入扰动。同一组会造成共同到场相关性，不能逐人独立投骰后仍强制每天至少一人。毕业由里程碑和可公开窗口驱动；毕业后留下代码、实验日志与可联系的校友，替换者从招生 cohort 入组，允许空位过渡。短缺专长可以通过远程指导/书架资产补足，避免关键任务永远卡在一个随机缺席 NPC。以上具体机制均为 **Design heuristic**；指导结构的方向性依据为 [L26，2019](https://nap.nationalacademies.org/catalog/25568/the-science-of-effective-mentorship-in-stemm)，不把其当毕业或出勤概率。

### 2.5 竞赛：至少两种流程，保留实际分母

**[Evidence, Strong]** 2025 年第七届研究生 AI 创新大赛官方邀请函规定初赛与决赛两阶段；团队最多 4 人、身份比例/队长要求明确，并可有最多 2 名导师；资格审查后队伍信息锁定。初赛需要项目文档和视频，决赛为展示与答辩。报名窗口 5 月 27 日–8 月 22 日、作品截至 9 月 1 日、初赛评审 9 月 2–28 日，原公告决赛为 10 月 28–30 日。[L17](https://cpipc.acge.org.cn/cw/detail/2c9088a5696cbf370169a3f8101510bd/2c90801596f758370197102a8e331d58)

**[Evidence, Strong]** 结果公告称 2025-10-31 闭幕；3421 队参赛、2847 件有效作品、252 队入围决赛，64 个一等奖、186 个二等奖、746 个三等奖。下列均为对该届官方总数的计算，既不是个人预测，也不是所有 AI 赛事的成功率：[L18](https://cpipc.acge.org.cn/pw/news/detail/2c9080159a537b96019a7c33d44363fa?page=2)

```text
有效作品 / 报名队伍 = 2847/3421 ≈ 83.2%
决赛入围 / 有效作品 = 252/2847 ≈ 8.85%
一等奖 / 决赛入围 = 64/252 ≈ 25.4%
一般一二三等奖 / 有效作品 = (64+186+746)/2847 ≈ 35.0%
```

`3421-2847=574` 不能全解释为中途退出，可能还含无效材料或不同统计环节；`252-(64+186)=2` 的原因未披露，不设为“决赛退出率”。若要跨年份预测，应按年份、赛道、规则和进入阶段的队伍质量分层；同队专项奖不重复计作独立获奖队伍。初始安排和实际闭幕相差一天，提示 `scheduledAt` 与 `actualAt` 需要分别保存。

**[Evidence, Strong]** 2024 年研究生数学建模赛正式作答是 9 月 21 日 08:00–9 月 25 日 12:00，100 小时；论文哈希锁定、PDF 与附件分时提交，比赛期间禁止与队外人员讨论赛题。它不同于历时数月的 AI 作品开发赛，不能统一套“准备→初赛→复赛→决赛”四次概率判定。[L19](https://cpipc.acge.org.cn/cw/detail/4/2c90801791c6c0a80191f9a6b0366533) 官方 2024 评审公告：20247 队交卷，242/2742/3927 队获一/二/三等，总 6911 队约 34.13%；分母是交卷队伍。[L20](https://cpipc.acge.org.cn/cw/contestNews/list/4/4)

**建议 [Design heuristic]：**通用竞赛状态容纳可选阶段，但模板显式声明实际阶段。组队与准备耗时缺乏普适统计，采用游戏先验：组队 1–3 周、探索/原型 2–8 周、准备展示 1–2 周；对现成基线允许更短，对跨模态硬件项目允许长尾。备赛时间、成果复用权限、评审门槛和退出成本比一条“难度”参数更重要。失败保留可复用资产；竞赛奖金额须注明每队、分配规则和额外补贴，不能给每位队员复制整个团队奖金。

### 2.6 论文：作者工时、外部等待、质量与录用分开

**[Evidence, Strong]** ICLR 2025 主会官方事实表记录 11603 投稿、3704 录用，约 31.9%，官方四舍五入为 32%。范围是该届投稿总体，没有给出新手/硕士/学校分层成功率。[L21](https://media.iclr.cc/Conferences/ICLR2025/ICLR2025_Fact_Sheet.pdf) 当届日程为 2024-10-01 全文截止，11-13 开始讨论，作者最后回复日 11-27，2025-01-22 通知结果；全文截止到结果约 113 个日历日。这是外部流程时间，不是写一篇论文需要 113 天。[L22](https://iclr.cc/Conferences/2025/Dates)

**[Evidence, Strong：规则；Weak：未来实际时长]** TMLR FAQ 当前表述对常规稿件目标约 9 周出决定，但不保证；讨论期 2–4 周，长于 12 页正文有更长评审时程。[L23](https://www.jmlr.org/tmlr/faq.html) JMLR FAQ 称平均决定时间约 3 个月并明确不保证；其统计页的口径是**送外审稿件**的投稿到决定时间，包含中位数与 25–75/10–90 分位区间，不包括同一口径之外的 desk reject，也不是最终出版等待。[L24](https://jmlr.org/faq.html)、[L27](https://www.jmlr.org/stats.html) 本次未读取图中具体年份数值，不把旧 FAQ 平均数当完整分布。

没有从这些材料得到“选题成功率”“复现成功率”“rebuttal 翻盘率”“修改后独立重投录用率”。已录用论文附录会过度代表成功路径；OpenReview 上的有分数稿件又不一定包括全部初筛拒稿。**建议 [Moderate + Design heuristic]：**录用由 `.rep` 的论点和证据、venue 规则、评审者差异与竞争情境共同产生；资源只通过实验覆盖和作者工作影响质量，不能把 GPU 数直接乘到录用率上。

## 3. Design implications（转化为系统设计）

### 3.1 现实模式与游戏化模式分别定义契约

| 维度 | 现实模式 | 游戏化模式 |
|---|---|---|
| 日历 | 选定真实学年、地区、学校政策；假期/投稿窗口保持实际长度 | 底层整分钟，30 分钟预约格、30–120 分钟主要行动、每日结算与事件快进；可压缩学期，但压缩系数独立记录 |
| 钱 | 人民币现金，按合同的真实月份入账；税费/币种/报销滞后注明 | 仍可显示人民币或“生活预算点”；若换点数，固定兑换只用于游戏，不声称购买力等价 |
| 工时 | 可并行的机器运行与个人注意时间分开；休假、照护可选 | 每天 4 个主要行动作为界面组织方式，长任务可续接；课程/组会另作预约，每周留弹性时段，自动处理重复生活支出 |
| GPU | 用匹配硬件和软件的 benchmark；队列与共享配额 | 少量性能档、固定任务卡耗用区间，明确抽象系数 |
| 同门 | 生命周期由学制/里程碑与角色日历驱动；缺席不等于懈怠 | 有预告的毕业、补位和专长轮换；关键帮助有替代渠道 |
| 竞赛/论文 | 历史模板与实际条件比例，只在对应范围引用 | “容易/普通/挑战”改变内容、资源缓冲和竞争对手；所有胜率都标游戏设定 |
| 失败 | 拒稿、负结果、复现受阻、资金紧张分别显示 | 保留证据和技能进度；困难通过调整计划可恢复，不以不可预测事件永久清档 |

**关键建议 [Design heuristic]：**同一个存档不要混用“现实贷款数额+两天学期+每天随机大奖”。时间压缩应成套作用于租金结算、资助发放、课程和评审截止；工资总额按战役跨度换算，不能只压缩成本而保持全年收入。

默认常规档可安排总主动工作 40–44 h/周，其中科研专注 24–36 h/周；课程、组会、助教与行政也占注意工时，却不全计作科研专注。第 2.2 节的入门期、研究期与冲刺期分别是阶段模板；48 h 冲刺周不是持续常态。上述数值均为 **Design heuristic**，不是中国研究生平均劳动时间。

### 3.2 情境与难度不互相冒充

现实情境采用组合字段，而不是城市标签决定学生能力：

```text
LabScenario:
  policyYear, cityCostProfileId, institutionPolicyId
  degreeLevel: master | doctoral
  degreeTrack: academic | professional
  studyMode: fullTime | partTime
  employmentStatus, fundingContractIds, housingType
  academicCalendarId, resourcePoolId, venueCalendarIds
  mode: reality | game, timeCompression, calibrationVersion
```

**[Calibration / Design heuristic] 参数卡初值：**餐饮 25–60 元/日，交通 0–200 元/月，通信/日用品 100–500 元/月；宿舍使用选定学校实际年费，校外合租 800–3500 元/月仅作宽情境先验，不是跨城统计；电脑/外设一次性 4000–12000 元、国内学术活动总包 1000–6000 元、国际会议总包 10000–30000 元均为预算探索区间，必须在具体行程/配置时换报价。论文注册费、机票、签证、住宿不能视为同一种固定“版面费”。

现实模式下，上述无当地证据的项目显示“待确认估算”，禁止输出精确结余承诺。游戏化模式可用简单档位：宽裕档生活缓冲 4–6 月、GPU 竞争较少；普通档 2–3 月；挑战档 1–2 月且项目紧，但均提供不依赖中奖的保底任务。`income` 仍由资格合同产生；不要以“挑战档所有人少发国家助学金”冒充现实制度。

### 3.3 与 Blueprint、知识图和 `.rep` 的接点

1. Blueprint 的 `trainingResources` 产生 **JobDemand**；知识图训练生成 **TrainingObservation**。模型适应点与 GPU 显存没有天然换算比例。
2. 玩家读论文、请教同门形成 **PlayerSkillObservation**，使用单独 namespace；不要直接修改神经网络模拟里的 `mastery/overfit` 来表达人的知识。
3. 成功、失败、负结果均可生成 **EvidenceAsset**：配置哈希、数据版本、随机种子、计算预算、曲线、验证/测试划分、结论边界。
4. `.rep` 的实验模块引用 asset ID，论文阶段完成由相关证据/论点完整性驱动；同一 asset 可多处引用但不能被复制成多份独立证据刷分。
5. 投稿冻结 **SubmissionVersion**；rebuttal 关联原评审意见和版本差异，新增实验仍走同一资源系统。录用结果不回写实验指标。

以上为 **Design heuristic**；变量/边界与 [综合设计](05_INTEGRATED_DESIGN_PROPOSAL.md)、[报告系统研究](04_REPORT_PAPER_SYSTEM.md) 一致时再进入实现。

## 4. Candidate models/formulas（候选模型与公式）

### 4.1 两套候选模拟内核

| 候选 | 统计/状态 | 成本 | 解释与稳定性 | 建议 |
|---|---|---|---|---|
| A. 每日账本 + 有限状态机 | 个人现金、资助合同、注意时段、GPU FIFO 队列、stage 工时/门槛、NPC 日历 | 每日 `O(C+N+P+J log J)`；`C` 合同数、`N` NPC 数、`P` 项目数、`J` 作业数 | 易展示“为什么今天做不了”；无需猜测现实成功率 | **Recommended MVP, Design heuristic** |
| B. 离散事件 + 分层贝叶斯校准 | A 加任务族 benchmark、资源抢占、阶段长尾分布、评审潜变量、分层观察数据 | `E` 事件约 `O(E log E)`，另加资源匹配与离线拟合 | 支持并行、跨天和不确定性；参数辨识与验证成本较高 | 第二阶段；有日志后升级，不在无数据时一次堆满 |

### 4.2 现金流、受限经费与成本

```text
cash(t+Δt) = cash(t) + eligiblePaymentsReceived
             + reimbursementsReceived + otherEarnedIncomeReceived
             - livingBillsPaid - tuitionBillsPaid - personalPurchasesPaid

researchBalance(t+Δt) = researchBalance(t) + grantsReceived
                       - eligibleResearchCharges - expiredCredits

cloudCost = gpuCount * billedHours * pricePerGpuHour
            + storageCost + transferCost + applicableTax
```

`cash` 和上述余额的单位为 CNY，若云报价 USD 则先保留 USD 账单，只有显式给定 `exchangeRate(CNY/USD)` 才转换。只有实际到账/支付事件进入现金式；到期未发资助记应收、未付账单记应付。三类入款按交易分类互斥，不能把同一份助研津贴再算作 `otherEarnedIncomeReceived`。所有 payment 有 `paymentId` 去重；资助“8000 元/年按 10 个月”表示十次 800 元而非十二次。现金不足先创建 `unpaidLiability` 或拒绝可选采购，不静默 `max(0,cash)` 抹掉债务；助学贷款本金不是收入。计算成本 `O(到期账单数)`。

科研额度应存 `amount + unit(CNY|gpuHour) + resourceClass + expiresAt`：北大论文奖励机时费是按元计价的受限额度，不能直接改名为 GPU 小时；跨设备、优先级的可购买小时不同。不同单位的额度不相加，元计价余额才适用上述 `researchBalance` 公式。余额不得为负，超限任务进入等待经费或改用另一付款账户；到期扣除仅作用于该批次尚未消费的额度。

`Δt≥0` 与账本时钟同单位，`gpuCount` 为正整数，`billedHours≥0`，单价和附加费用非负；启动最低计费、按小时向上取整等由具体供应商规则产生 `billedHours`，不能把这些视为所有云平台的共同政策。费用估算本身 O(1)，发票分行数量另计。

个人设备的每运行小时成本候选：

```text
costPerRunHour = purchaseCost / plannedLifetimeRunHours
                 + systemPowerKW * electricityCnyPerKWh
                 + maintenancePerRunHour
```

分母为预计实际运行小时且须大于 0，不能默认一年 8760 小时满载；`systemPowerKW` 包括整机必要开销。所有费用/功率项非负，零利用率情境只比较总持有成本，不定义每运行小时单价。闲置和折旧不一定在游戏每日扣现金，可用于采购比较。电费与采购价需地区和日期；此公式是单位守恒的预算模型 **[Strong：会计单位；Design heuristic：折旧口径]**，不是现实 GPU 投资建议。

### 4.3 人工进度与机器进度

```text
Δwork_j = attentionHours_j * skillFit_j * readiness_j * focus_j
workRemaining_j' = max(0, workRemaining_j - Δwork_j)
stageComplete = (workRemaining_j' == 0) && all(requiredArtifactsValid)
```

`workRemaining` 单位为基准有效工时；`skillFit∈[0.5,1.5]`、`readiness∈[0,1]`、`focus∈[0.5,1]` 为无量纲游戏调节项，均是 **[Calibration, Design heuristic]**。`readiness=0` 时不允许“苦熬时长完成缺数据的实验”，但可执行诊断行动获取下一步；没有工作投入时不凭时间自动写成论文。避免将所有弱项乘成零，MVP 可把硬性前提做独立 gate，软因素取加权平均；每项目更新 `O(所需证据/前提数)`。

机器部分建议：

```text
runSeconds = startupSeconds + workFlop / throughputFlopPerSecond + ioSeconds
finishAt = dispatchAt + runSeconds
wallCompletionDelay = queueSeconds + runSeconds
machineCostHours = gpuCount * billedRunSeconds / 3600
```

各时间单位秒；吞吐必须 `>0`，无可用设备时状态为 `queued`，不把除零裁成很慢的完成；工作量为 0 的 dry-run 只产生启动/检查耗时。`throughput` 是任务族和配置的有效值；如果已测有效吞吐，不再乘另一个利用率重复打折。多 GPU 并行效率 `η∈(0,1]` 只能在有分布式实现时使用 `throughput≈g*r*η`，显存也不自动相加。无分片的两个 24 GiB 卡不能运行峰值 40 GiB 的单卡作业。

估算显存改为分量表达：

```text
M_peak = M_baseWeights + M_trainableWeights + M_gradients
         + M_optimizer + M_liveActivations + M_workspace + M_runtime
```

每项为非负 MiB；`M_baseWeights` 仅计冻结基础权重，`M_trainableWeights` 仅计可训练权重，二者不重复。冻结基础权重无梯度/优化器状态，量化有比例尺与元数据开销，不能只算 `parameterCount * 0.5 bytes`。MVP 用当前估算器，允许附加 `memorySafetyFactor∈[1.1,1.5]` 的敏感性分析，并通过实测更换；该区间不是论文支持的 universal error bound。

### 4.4 阶段时长与未知成功率的先验

**[Design heuristic]** 无数据的作者阶段工作量先用三角分布 `Triangular(min,mode,max)`，单位有效工时；直观、可控制最短/典型/最长投入。外审或队列等待更适合保留实际日程或有右尾的分布；严禁将某阶段概率按天反复抽，使等得越久必然录用。

| 阶段 | 建议有效工时先验 `min / mode / max` | 完成门槛、可退回处 |
|---|---:|---|
| 选题与计划 | 8 / 24 / 60 h | 有问题、可检验假设、资源可行性；可缩小范围 |
| 复现与数据准备 | 8 / 40 / 120 h | 基线在已知设置可运行；失败可产生诊断资产 |
| 核心实验/消融操作与分析 | 16 / 60 / 160 h | 预先声明的对照/覆盖完成；GPU 时长另算 |
| 写作与图表 | 16 / 40 / 100 h | `.rep` 结构、论证与引用检查通过 |
| 内部审核与修订 | 4 / 12 / 40 h | 作者确认、关键问题处理；排队等待另外计 |
| rebuttal | 4 / 12 / 30 h | 逐条回应；承认/澄清/补证据，非随机加分 |
| 拒稿后修改重投 | 8 / 32 / 100 h | 根据意见选择保留、补实验、改论点或改 venue |

这些数值是小型教学科研项目的初始游戏参数，不是调查出的真实论文工时；论文理论难点、硬件实验和数据审批可远超最大值。现实模式允许超时与重新估计，游戏化模式才用有界长尾保护节奏。

条件通过率设 `p_s(x)=P(pass_s | entered_s, x, venue, year)`。`x` 可含基线复现状态、团队技能、证据覆盖、规则符合度；不能含未经支持的“学校血统”直接加成。若只有 `k` 次通过、`n` 个同口径尝试，用 Beta 更新：

```text
p_s ~ Beta(α,β)
p_s | data ~ Beta(α+k, β+n-k)
```

`α,β>0` 无量纲；完全未知阶段用 `Beta(1,1)` 只表示宽先验，不表示现实成功率 50%。有可比赛事的弱迁移，用总强度 `κ=2–10` 的 `Beta(κ*m,κ*(1-m))` 做敏感性分析；`m` 来自同阶段、同赛道的历史比例，但迁移强度是游戏假设。单届全体计数无需装作随机样本算“当届真实率置信区间”；预测未来届才需层次模型并承认规则/人群漂移。连续状态通过同一个项目随机效应产生相关性，不用独立重抽实现“多投必中过”。

更新要求 `n,k` 为整数且 `0≤k≤n`。迁移先验的均值必须 `0<m<1`；历史全成/全败时先用显式平滑，例如 `m=(k+1)/(n+2)`，不得构造参数为 0 的 Beta 分布。单个阶段更新成本 O(1)；分层拟合成本由年份/团队层数和采样方法决定，MVP 不在线拟合。

**[Calibration]** 若 MVP 必须直接配置游戏概率，可暂给“具备基线后完成有效作品”0.6–0.95、“关键假设获支持”0.2–0.8 的宽调参范围，并在 UI 中叫“游戏预测”。不将它们写为现实事实；上线前必须验证玩家行动能改变可解释的中间证据，而不是只改变藏在背后的骰子。

### 4.5 同门奖励、出勤与毕业

```text
availableMinutes(npc, day) = max(0, scheduledAvailability - committedMeetings)
helpValue(k) = baseValue * exp(-λ*k)
```

可用时间和两项占用单位为分钟，范围 0–1440；超额预约须另报冲突，不能靠裁剪掩盖。`k≥0` 为整数，是同一知识资产/帮助类型的重复次数，`λ∈[0.3,1]` 为无量纲设计衰减；有新问题/新证据时开启新交互目标。`baseValue≥0` 应是省下的准备工时，`helpValue` 同单位，重复无限次时趋近 0；具体唯一资产按 ID 发放而不进行数值相乘。奖励不直接变成论文录用率。MVP 用首份资产唯一领取、后续复习仅有少量熟练度；不把每天重复点对话当赚钱主循环。每次计算 O(1)，查重表平均 O(1)。

NPC 入组时抽取一次 `graduationWindow` 并保存；到达窗口还需课程、论文/答辩和行政里程碑满足。若学校学制规定缺失，只用“预计第几学期”且标情境假设。出勤可先完全按表，后续加入每天 `0–20%` 的临时变动概率作为 **Design heuristic** 并设置提前通知；不能称为研究生请假率。每 NPC 日更新 `O(事件数)`。

## 5. Recommended MVP（推荐最小可玩版本）

### 5.1 数据结构和一次结算流程

建议结构是未来模块合同，尚未实现：

```ts
type LabSimulationState = {
  schemaVersion: number;
  scenarioId: string;
  clock: { absoluteMinute: number; calendarId: string };
  personalLedger: LedgerEntry[];
  researchAccounts: ResearchAccount[];
  people: NpcState[];
  resources: ComputeResource[];
  jobs: ComputeJob[];
  projects: ResearchProject[];
  assets: EvidenceAsset[];
  processedEventIds: string[];
};
// Every stochastic event stores seedKey + distributionVersion + sampledValue.
// Resource: id, vramMiB, benchmarkProfileId, availability, accountId.
// Job: id, configHash, dataVersion, stage, workFlop, minVramMiB,
//      submittedAt, dispatchedAt, completedAt, checkpointId, payerId.
// Project: stage, workRemainingHours, requiredArtifactIds, deadline,
//          submissionVersionIds, reviewEvents, ownerIds.
// EvidenceAsset: id, provenance, method, result, uncertainty, limitations,
//                validForClaims, codeVersion, datasetVersion, seed.
```

```text
advanceTo(targetMinute):
    require targetMinute >= clock.absoluteMinute
    while nextEvent.time <= targetMinute:
        accrue running jobs to nextEvent.time
        accrue only explicitly scheduled attention work
        settle due payments exactly once by paymentId
        apply job completion / interruption; create evidence or error record
        apply day boundary / NPC schedule / semester policy event
        validate project transition against required artifacts
        dispatch feasible queued jobs in configured priority order
        record event receipt; never redraw previous random outcomes
    accrue to targetMinute and persist one consistent snapshot
```

按时间最小堆处理 `E` 个事件成本约 `O(E log E + E*J*R)`，后项是 MVP 朴素扫描 `J` 个待调度作业与 `R` 个资源；小 Lab 可接受。只有同质独占单卡 FIFO 时可简化到 `O(J log R)`，不能把多资源匹配也宣称同样复杂度。跨日批量推进必须处理每个关键事件，不能只对最终一天调用一次 `advanceLabDay`。

### 5.2 项目状态机

论文流程：

```text
idea → plan → reproduce → experiment → draft → internalReview → ready
ready → submitted → underReview → rebuttal → decision
decision → accepted → cameraReady → published
decision → rejected → revisionPlan → experiment | draft | archived
underReview → withdrawn
any active stage → blocked(reason) → previousStage
```

`experiment→draft` 可并行：可写已完成部分，但提交 gate 检查整体证据。没有 rebuttal 的 venue 可跳过该阶段；期刊可有多轮修订；rebuttal 不保证撤销拒稿。`published` 与 `presented` 分离，避免无差旅预算就抹掉录用。

AI 作品竞赛：

```text
teamForming → eligible → registered → prototype → submitted
submitted → preliminaryReview → finalist | eliminated
finalist → presentationPrepared → finalReview → award | noAward
registered/prototype/finalist → withdrawn(reason)
```

数学建模模板则是 `registered→problemReleased→working→hashLocked→uploaded→reviewed→award`，极少数获邀再进入“数模之星答辩”；不能虚构所有参赛者都经历复赛。正式比赛期间帮助权限遵守对应规则：例如数学建模赛中队外 NPC 不提供赛题辅导，但日常备赛可帮助。[L19，2024](https://cpipc.acge.org.cn/cw/detail/4/2c90801791c6c0a80191f9a6b0366533)

### 5.3 实现优先级与可玩验收

1. **P0 [Design heuristic]：统一时间与幂等事件。**修复“时间跨天但 Lab 不更新”的设计断点；在恢复存档、即时/等待模式切换、跨场景时得到相同账本与作业结果。这里只提出后续改动，不在此次改代码。
2. **P0 [Moderate]：资源实体与 3 类作业。**教学 CNN、小规模迁移学习、参数高效微调；明确需要的显存/排队/机器小时，允许小 batch 或更小模型解决容量不足。
3. **P1 [Design heuristic]：一个可完成科研循环。**选题→复现→至少一个对照实验→`.rep`→模拟评审；随机种子改变意见或实验噪声但不改变已记录数据。
4. **P1 [Moderate]：资金与指导。**一个政策已核验的学校资助情境、日常支出和受限科研账本；3 名不同专长 NPC，1 次有预告毕业和资产交接。
5. **P2 [Design heuristic]：竞赛和困难档。**加入一种 AI 作品赛、一个短时数学建模模板；用同一证据资产/版本系统，不另造刷奖副系统。

战役目标可为“在一个研究阶段内完成可信的研究报告并合理管理资源”，录用只是多条结局之一。游戏失败应优先体现可修正的方案缺陷，负结果能支持局限性模块；最终奖励分别显示科研证据、课程/学位里程碑、资金与生活状态。

## 6. Validation plan（验证计划）

### 6.1 现实校准与证据收集

**[Calibration]** 先招募自愿匿名参与的 12–24 名 CS/AI 研究生做 4 周时间/资源日志：覆盖硕/博、校内宿舍/校外、至少 3 个城市或资源情境；这只够发现模型缺项，不估全国比例。收入只问资助类型、金额区间、发放月份、是否包含国家补助，不搜集姓名、银行卡或非必要敏感信息。额外访谈导师/平台管理者核对报销与排队规则。

记录 `plannedAttentionHours`、`actualAttentionHours`、`gpuRequested`、`gpuAllocated`、`queueTime`、`actualRuntime`、`peakMemory`、中断原因、阶段进入/退出时间和产出资产。真实数据与游戏测试各用独立标签和校准版本。迟迟未完成的项目保留右删失（right censoring），不能删掉再平均出“写论文很快”。

### 6.2 六个优先可证伪实验

| 实验 | 设计与指标 | 推翻/调整条件 |
|---|---|---|
| 时间引擎一致性 | 同一随机种子分别即时、逐分钟、跨天、退出恢复；比较事件和余额 | 任意丢失/重复扣款、NPC 与日期不一致、作业恢复改变结果即不通过 |
| GPU 估算是否有用 | 小 MLP、CNN/残差、不同输入分辨率；batch 16/64/128，SGD/Adam，记录峰值 MiB 和时间 | 若任务族内中位相对误差持续 >30% 或设备排序频繁颠倒，停止展示单点“精确耗时”；30% 是工程验收目标 |
| 队列与行动取舍 | 相同任务，两种队列负载；记录被动等待占比、写作/阅读穿插率 | 增加资源压力只增加空等而不改变计划，说明队列玩法失败；调整可并行行动或压缩等待 |
| 资助现金流 | 10 月/12 月发放、学费年付、报销延迟、无资助四个情境；逐笔核对 | 出现一笔补贴重复计入、奖学金当保底、贷款当净收入即失败；普通档过半测试者无可恢复路径是调参失败 |
| NPC 与资产交接 | 比较纯随机缺席与日历/预告毕业；记录关键任务受阻率、求助多样性、重复点击收益 | 玩家主要靠刷同一话题升级或毕业完全抹除知识资产，拒绝该机制 |
| 论文/竞赛预测校准 | 按阶段收集真实或游戏独立标签，时间上划分训练/验证年份；用 Brier score、log loss、可靠性图 | 仅用总投入时间不弱于新模型，说明复杂因素没有增量效用；跨届校准崩溃时禁用旧概率，仅保留区间/规则 |

最后一个实验的真实样本不可用游戏骰子产生的结果验证，因为那只会证明实现复现了自己。论文判断还应由多个领域评审对脱敏报告独立评分，测评审分歧；阶段进度、质量和录用分别检验。是否好玩则以选择是否有意义、过程是否可解释、失败是否可恢复为指标，不能拿真实录用率低来证明游戏应该频繁惩罚玩家。

## 7. Risks, unknowns, and rejected alternatives（风险、未知与不采用方案）

| 风险/被拒绝方案 | 为什么不采用 | 后续条件 |
|---|---|---|
| 用学校排名/城市层级直接决定科研能力 | 资源、选择和制度混杂；没有因果证据 | 只把经核验的具体资源/政策作为输入，保留个体差异 |
| 单一“穷研究生”月预算 | 宿舍资格、发放月份、学费统筹差异可完全改变现金流 | 建按学年和资格的政策包，不汇总成全国精确平均 |
| 把国际学生预算视作本土 CS 生活费 | 住宿标准、学费、生活方式与样本口径不同 | 仅用作宽区间外部锚点，收集目标人群日志 |
| 服务器越多必然成果越好 | 显存、吞吐、队列、设计与证据链是不同变量 | 先验证资源是否解除实际瓶颈；保留算法/方法效率路线 |
| 论文每阶段固定概率、每次重投独立抽奖 | 选择偏差与项目相关性被抹掉；易出现无限重投刷中 | 按版本/证据/venue 生成评审，保存项目与评审随机效应 |
| 强制现实竞赛都有初赛/复赛/决赛 | 数学建模与作品赛流程不同 | 模板声明可选 stage 与实际门槛 |
| 临时事件无预告地摧毁进度 | 无数据支持其频率；损害规划和恢复体验 | 中断优先损失可恢复时间，checkpoint 保留；关键事件预告 |
| 把到场等同科研投入、把疲劳等同疾病 | 无法从点击或出勤诊断个人健康；远程工作也可有效 | `fatigue` 只作虚构资源，不输出健康判断或现实风险概率 |
| 金钱/同门/课程直接增加网络 rank 或论文质量 | 跨层单位错误，奖励绕过科研过程 | 奖励具体数据、代码、指导时间、实验权限，影响中间过程 |
| 用当前资源常数冒充真实硬件 | 1 TiB、1 TFLOP/s 与分钟取整属于现有设定 | 给设备与估计模型版本，并实测标定 |
| 一次调研固化 2026 价格/奖助政策 | 价格与执行规则随年份变化，网页会更新 | 保存来源年份、核验日与政策版本，先用历史情境避免伪实时 |

开放问题：目标用户愿意接受多长的外部等待；哪些生活支出应自动结算；导师审阅是否稀缺到足以成为核心机制；异质 GPU 的公平共享怎样解释；真实选题/复现失败的可靠分母如何获得。这些应由原型和日志回答，不用补写精确数值掩盖。

## 8. 本主题来源表

以下主要来源均在 2026-09-09 打开核验；“动态”指页面不提供稳定发表年份，以核验日为准。`L25` 明确属于抓取受限的补充背景，其余关键数字有可读官方正文或 PDF 支持。来源统一汇总见 [SOURCES.md](SOURCES.md)。

| ID | 来源、链接与年份 | 类型/适用范围 | 使用结论与访问限制 |
|---|---|---|---|
| L01 | [北京化工大学研究生教育收费及奖助体系简介](https://graduate.buct.edu.cn/_upload/article/files/52/ce/8356350e4f1fb0822b75215c4e81/2e9b14e7-ee01-4ae1-8a96-1f119f785ed3.pdf)，2025-07-15 | 学校官方政策；2025 级相应研究生 | 学费、住宿、国家助学金、奖学金及资格边界；PDF 正文已读，非抽样调查 |
| L02 | [深圳大学2025年硕士研究生招生章程](https://yz.szu.edu.cn/info/1002/12974.htm)，2024 发布/2025 级 | 学校官方章程 | 学制、学费、宿舍资格；公开正文 |
| L03 | [深圳大学硕士研究生奖助体系（2025级）](https://yz.szu.edu.cn/info/1041/12983.htm)，2024-08 | 学校官方资助表；全日制非定向 | 年额、发放 10 月、岗位与导师津贴不可泛化；公告后政策可能更新 |
| L04 | [北大2025–2026专硕及单列项目国家助学金通知](https://grs.pku.edu.cn/jzgz/dtxx1/tzgg1/50118yjsy390189.htm)，2025-06-23 | 学校官方实施通知；特定院系/项目 | 统筹关系和排除范围，防重复记账；公开正文 |
| L05 | [平顶山学院2025年硕士助研助教设聘](https://yjsc.pdsu.edu.cn/info/1047/1459.htm)，2025 | 地方高校官方岗位通知 | 助研最低标准、助教计酬和时间；非 CS 特定收入调查 |
| L06 | [哈尔滨工业大学2025春季助教聘任通知](https://hituc.hit.edu.cn/2025/0222/c17860a363306/page.htm)，2025-02-22 | 学校官方教学通知 | 18 周、周 8 h 上限、日志要求；适用于该岗位 |
| L07 | [PKU Shenzhen Costs & Scholarships](https://english.pkusz.edu.cn/Admissions_2024/Costs___Scholarships.htm)，Admissions_2024 | 学校国际招生预算页；无调查样本 | 餐饮/交通/国际宿舍预算范围；不得当本土 CS 实际均值 |
| L08 | [Chang’an University Fees](https://ies.chd.edu.cn/en/8894/list.htm)，未标年/2026 核验 | 大学国际教育学院预算估计 | 西安不含房租学费的年生活预算；无样本、年份不明，Weak |
| L09 | [Nature PhD Survey 2019 Report, Elsie Lauchlan / Shift Learning](https://cdn-media.web-view.net/i/zxexafdswsu2/Nature_PhD_survey_2019_Report_v1_1.pdf)，2019 | 原始在线调查报告；6320 名多国多学科博士 | 工时与指导接触分布、选择偏差；公开 PDF，非同行评审因果研究 |
| L10 | [NVIDIA RTX 40 Series 官方发布](https://nvidianews.nvidia.com/news/nvidia-delivers-quantum-leap-in-performance-introduces-new-era-of-neural-rendering-with-geforce-rtx-40-series)，2022-09-20 | 厂商产品公告 | RTX4090 24 GB、当年起价 1599 USD；不是当前中国售价 |
| L11 | [NVIDIA A100 Tensor Core GPU datasheet](https://www.nvidia.com/content/dam/en-zz/Solutions/Data-Center/a100/pdf/a100-80gb-datasheet-update-a4-nvidia-1485612-r12-web.pdf)，2020 产品/资料修订版，2026 核验 | 厂商硬件规格 | 80 GB 与精度性能区分；不拿峰值当实测吞吐 |
| L12 | [Dettmers et al., QLoRA](https://proceedings.neurips.cc/paper_files/paper/2023/hash/1feb87871436031bdc0f2beaa62a049b-Abstract-Conference.html)，NeurIPS 2023 | 同行评审原始研究；量化适配的特定设置 | 65B/48 GB 及 Guanaco 单 GPU 一天案例；范围不是预训练 |
| L13 | [Devlin et al., BERT](https://aclanthology.org/N19-1423.pdf)，NAACL 2019，附录 A.2 | 同行评审原始论文 | 16/64 TPU 芯片、各 4 天、训练配置；不能换算任意 GPU 时间 |
| L14 | [北大高性能计算平台收费标准](https://hpc.pku.edu.cn/guide_6.html)，2025-07-02 执行 | 校级平台官方计费 | 卡小时/QOS、管理费与不可兑现机时；只适用该平台 |
| L15 | [Lambda On-demand Instances](https://lambda.ai/instances)，动态/2026-09-09 核验 | 厂商报价 | USD/GPU·h 与多卡实例差异；税费/库存/价格动态 |
| L16 | [Slurm Scheduling Configuration Guide](https://slurm.schedmd.com/sched_config.html)，动态/2026 核验 | 官方调度器文档 | 优先级、回填、等待时间依赖资源和时限；不提供实验室平均队列时间 |
| L17 | [第七届研究生AI创新大赛邀请函](https://cpipc.acge.org.cn/cw/detail/2c9088a5696cbf370169a3f8101510bd/2c90801596f758370197102a8e331d58)，2025-05-27 | 赛事官方规则 | 组队/材料/初决赛/原始日程；会重定向但正文公开 |
| L18 | [AI创新大赛青岛总决赛官方结果](https://cpipc.acge.org.cn/pw/news/detail/2c9080159a537b96019a7c33d44363fa?page=2)，2025-11-01 | 主办方比赛统计；该届全体计数 | 3421/2847/252 与奖项分母；不臆测未提交或缺额原因 |
| L19 | [第二十一届研究生数学建模开赛公告](https://cpipc.acge.org.cn/cw/detail/4/2c90801791c6c0a80191f9a6b0366533)，2024-09-16 | 赛事官方规则 | 100 小时、哈希锁定、禁止队外赛题讨论、每队奖金；公开重定向 |
| L20 | [2024数学建模评审公告（官方通知列表含全文）](https://cpipc.acge.org.cn/cw/contestNews/list/4/4)，2024-11-11 | 赛事官方评审计数 | 20247 交卷、6911 获奖；列表已读，部分详情 click 抓取失败 |
| L21 | [ICLR 2025 Fact Sheet](https://media.iclr.cc/Conferences/ICLR2025/ICLR2025_Fact_Sheet.pdf)，2025 | 会议官方汇总 | 11603 投稿、3704 录用；公开 PDF，不含人群条件率 |
| L22 | [ICLR 2025 Dates and Deadlines](https://iclr.cc/Conferences/2025/Dates)，2024–2025 赛季 | 会议官方日程 | 113 日外部流程、讨论与回复窗口；不是作者工时 |
| L23 | [TMLR FAQ](https://www.jmlr.org/tmlr/faq.html)，动态/2026-09-09 核验 | 期刊官方规则 | 约 9 周目标、讨论窗口、长稿差异且不保证；规则可能更新 |
| L24 | [JMLR FAQ](https://jmlr.org/faq.html)，未标更新年/2026 核验 | 期刊官方说明 | 约 3 个月措辞与不保证，需配统计口径；不导出全部阶段概率 |
| L25 | [关于调整高等教育阶段和高中阶段国家奖助学金政策的通知](https://www.moe.gov.cn/jyb_xxgk/moe_1777/moe_1779/202410/t20241029_1159726.html)；[财政部文告PDF](https://www.mof.gov.cn/gkml/caizhengwengao/wg2024/wg202410/202501/P020250109539041693223.pdf)，2024-10-25（文告2024年第10期） | 财政部、教育部、人社部政策；全国奖励名额与中央高校支持口径 | MOE页面抓取受限，财政部PDF印刷页16–17全文已核验；名额与支持标准变化不等于个体概率或每人实领 |
| L26 | [National Academies, The Science of Effective Mentorship in STEMM](https://nap.nationalacademies.org/catalog/25568/the-science-of-effective-mentorship-in-stemm)，2019 | 权威共识研究报告；STEMM 导师关系 | 支持持续和多来源指导，不能推出固定游戏倍率；公开简介已读，PDF 下载需登录/访客流程，未下载 |
| L27 | [JMLR Statistics](https://www.jmlr.org/stats.html)，动态/2026 核验 | 期刊官方统计方法说明 | 外审稿件时间与分位数口径；图像数值未读取，不报具体分位值 |
