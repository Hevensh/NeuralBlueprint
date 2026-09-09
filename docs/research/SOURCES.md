# 来源与核验记录

本清单对应代码基线 `4696a94becf96256efa24c7fbab0f367230aa15c`，统一检索/核验日期2026-09-09。共77个主题来源条目：容量15、知识图15、Lab27、报告20；同一条目可提供出版页、作者版或官方PDF。年份优先正式发表年；预印本/正式版差异、滚动规则与未标年网页在各行注明。页面抓取时间不视为发表时间。

证据分为：**Current code**（仅该提交的实现）、**Strong**（定义/明确规则/直接核验）、**Moderate**（限定设置实证）、**Weak**（证据稀少或跨域外推）、**Design heuristic**（玩法或未校准模型）。来源权威不代表使用结论可以无限外推。文档里的点数换算、学习阈值、工时先验、评分权重和随机事件均是设计参数，不以引用包装成现实统计。

## 代码与文档基线

- [PROJECT_CONTEXT.md](../../PROJECT_CONTEXT.md)：已读；部分流程过时，冲突按实际代码处理。
- [README.md](../../README.md)：已读；当前主要为Vite模板，不承担机制证据。
- [研究一](01_EFFECTIVE_RANK_AND_ADAPTATION.md)、[研究二](02_KNOWLEDGE_GRAPH_REASONING.md)、[研究三](03_LAB_LIFE_SIMULATION.md)、[研究四](04_REPORT_PAPER_SYSTEM.md)：逐项源码路径、函数和提交对应行号。
- [综合设计](05_INTEGRATED_DESIGN_PROPOSAL.md)：建议接口、单位与参数汇总；明确标识尚未创建的代码结构。

源文件链接相对 `docs/research/` 解析，`#L` 行号固定到审计提交；后续代码变化后应更新审计基线。研究没有构建应用、执行训练或修改产品代码，文中验证计划不是已完成实验。

## 有效秩、容量与优化

| ID | 来源、链接 | 年份 | 类型 / 范围 | 本文使用结论 | 访问状态 |
|---|---|---|---|---|---|
| R01 | Roy & Vetterli, [The Effective Rank: A Measure of Effective Dimensionality](https://www.eurasip.org/Proceedings/Eusipco/Eusipco2007/Papers/a5p-h05.pdf)；[DOI记录](https://doi.org/10.5281/zenodo.40328) | 2007 | EUSIPCO 原论文；矩阵谱维数 | 奇异值熵秩原始定义与代数秩区别 | 最终直接HTTP读取5页PDF，并核验印刷页606–607定义及性质；网页抓取仍失败、Zenodo超时；R02作交叉核验 |
| R02 | Gauch et al., [Few-Shot Learning by Dimensionality Reduction in Gradient Space](https://proceedings.mlr.press/v199/gauch22a.html)；[全文](https://proceedings.mlr.press/v199/gauch22a/gauch22a.pdf) | 2022 | CoLLAs/PMLR 原论文；特定动力系统少样本迁移 | 梯度二阶矩低维子空间、中心化选择；§3式(3)复核entropy rank定义 | 页面与PDF可读 |
| R03 | Sanyal et al., [Stable Rank Normalization for Improved Generalization in Neural Networks and GANs](https://arxiv.org/abs/1906.04659)；[正式评审记录](https://openreview.net/forum?id=H1enKkrFDB) | 2020（预印本2019） | ICLR 原论文作者版本；分类/GAN特定架构 | stable rank定义、控制秩与泛化的有条件关系 | arXiv摘要与PDF可读；OpenReview直开需浏览器验证，官方论文索引可核对年份 |
| R04 | Li et al., [Measuring the Intrinsic Dimension of Objective Landscapes](https://arxiv.org/abs/1804.08838) | 2018 | ICLR 原论文；随机参数子空间训练 | 目标景观内在维数与参数数/表示秩不同 | 作者摘要与论文入口可读 |
| R05 | Garrido et al., [RankMe](https://proceedings.mlr.press/v202/garrido23a.html) | 2023 | ICML/PMLR 原论文；JE-SSL与下游表征评价 | 秩可作限定场景诊断，不能外推统一知识容量 | 官方页面可读 |
| R06 | Hu et al., [LoRA: Low-Rank Adaptation of Large Language Models](https://arxiv.org/abs/2106.09685)；[正式评审记录](https://openreview.net/forum?id=nZeVKeeFYf9) | 2022（预印本2021） | ICLR 原论文；预训练语言模型低秩更新 | 更新秩超参数与激活秩不同 | 作者页面可读；OpenReview直开需浏览器验证 |
| R07 | Kunstner et al., [Limitations of the Empirical Fisher Approximation for Natural Gradient Descent](https://arxiv.org/abs/1905.12558) | 2019 | NeurIPS 原论文；曲率近似分析与反例 | empirical Fisher不一般等价true Fisher/Hessian | 作者页及官方PDF索引可读 |
| R08 | Martens & Grosse, [Optimizing Neural Networks with Kronecker-factored Approximate Curvature](https://proceedings.mlr.press/v37/martens15.html)；[全文](https://proceedings.mlr.press/v37/martens15.pdf) | 2015 | ICML/PMLR 原论文；K-FAC分块近似 | 正确因子对象、Kronecker近似及成本动机 | 页面和PDF可读 |
| R09 | Jacot et al., [Neural Tangent Kernel: Convergence and Generalization in Neural Networks](https://arxiv.org/abs/1806.07572) | 2018 | NeurIPS 原论文；无限宽/核动力学 | 参数Jacobian核、谱与目标方向决定局部学习动力学 | 作者页面可读 |
| R10 | Papyan et al., [Prevalence of Neural Collapse during the Terminal Phase of Deep Learning Training](https://arxiv.org/abs/2008.08186) | 2020 | PNAS 原论文作者版本；图像分类终末阶段 | 类内变异减少、低维类几何不能直接视为能力下降 | 作者页和原文索引可读 |
| R11 | Zhang et al., [Understanding Deep Learning Requires Rethinking Generalization](https://arxiv.org/abs/1611.03530) | 2017（预印本2016） | ICLR 原论文；图像分类随机标签实验 | 训练记忆与测试泛化必须分开 | 作者页面可读 |
| R12 | Maddox et al., [Rethinking Parameter Counting in Deep Models: Effective Dimensionality Revisited](https://arxiv.org/abs/2003.02139) | 2020 | 原研究预印本；有效维数、曲率、正则化 | 维数依谱与尺度；不以裸参数数代替局部约束 | 摘要和PDF可读；本表不未经核实宣称venue |
| R13 | Dinh et al., [Sharp Minima Can Generalize For Deep Nets](https://proceedings.mlr.press/v70/dinh17b.html) | 2017 | ICML/PMLR 原论文；重参数化反例 | 曲率/平坦度并非无条件函数不变量 | 官方页面可读 |
| R14 | Glorot & Bengio, [Understanding the Difficulty of Training Deep Feedforward Neural Networks](https://proceedings.mlr.press/v9/glorot10a.html) | 2010 | AISTATS/PMLR 原论文；初始化与信号传播 | 前后向方差和Jacobian诊断动机，不支持知识点换算 | 官方页面及PDF索引可读 |
| R15 | Luo et al., [Understanding the Effective Receptive Field in Deep Convolutional Neural Networks](https://arxiv.org/abs/1701.04128) | 2016（预印本2017） | NeurIPS 原论文作者版本；CNN感受野 | 理论跨度不等于有效影响范围 | 作者页、官方PDF索引可读 |

## 知识图、诊断、课程与图消息

| ID | 来源、链接 | 年份 / 类型 | 使用结论与适用范围 / 访问情况 |
|---|---|---|---|
| K01 | Poole & Mackworth, [Propositional Definite Clauses](https://artint.info/3e/html/ArtInt3e.Ch5.S3.html) | 2023 / 剑桥教材作者公开版 | 正向/后向链、Horn AND规则、证明；公开全文，非概率掌握模型 |
| K02 | Poole & Mackworth, [Abduction](https://artint.info/3e/html/ArtInt3e.Ch5.S8.html) | 2023 / 教材作者公开版 | 一致最小解释与诊断；公开全文 |
| K03 | Poole & Mackworth, [Exact Probabilistic Inference](https://www.cs.ubc.ca/~poole/aibook/3e/html/ArtInt3e.Ch9.S5.html) | 2023 / 教材作者公开版 | 贝叶斯因子分解、变量消元、treewidth；公开全文 |
| K04 | Murphy, Weiss & Jordan, [Loopy Belief Propagation for Approximate Inference](https://www.cs.ubc.ca/~murphyk/papers/loopy_uai99.pdf) | 1999 / UAI原始论文、作者修正版 | 含环推理可能振荡/错误；四类网络，公开PDF |
| K05 | Corbett & Anderson, [Knowledge tracing: Modeling the acquisition of procedural knowledge](https://link.springer.com/article/10.1007/BF01099821) | 1995 / 同行评审论文 | 编程辅导BKT、观测误差与学习状态；摘要可读，全文可能需订阅；卷号4造成部分索引标1994，采用出版页1995 |
| K06 | Piech et al., [Deep Knowledge Tracing](https://papers.neurips.cc/paper_files/paper/2015/file/bac9162b47c56fc8a4d2a519803d51b3-Paper.pdf) | 2015 / NeurIPS原始论文 | 答题序列RNN预测；公开PDF，不证明因果课程边 |
| K07 | Khajah, Lindsey & Mozer, [How deep is knowledge tracing?](https://arxiv.org/abs/1604.02416) | 2016 / 作者预印本 | 增强BKT基线与DKT比较；范围限定其数据/设置，公开 |
| K08 | Chen et al., [Item Response Theory—A Statistical Framework](https://arxiv.org/abs/2108.08604) | 2021 / 作者综述预印本 | IRT能力/题目、识别约束与观测建模；公开，不作项目参数来源 |
| K09 | Bengio et al., [Curriculum Learning](https://icml.cc/Conferences/2009/papers/119.pdf) | 2009 / ICML原始论文 | 课程顺序的任务依赖作用；公开PDF |
| K10 | Graves et al., [Automated Curriculum Learning for Neural Networks](https://proceedings.mlr.press/v70/graves17a.html) | 2017 / ICML原始论文 | 学习进展与非平稳bandit；三类LSTM课程，公开 |
| K11 | Vygotsky, [Mind in Society](https://doi.org/10.2307/j.ctvjf9vz4) | 1978 / Harvard University Press原著 | ZPD原始发展心理学语境；出版/目录可访问，全文依权限；无游戏阈值证据 |
| K12 | Peters et al., [Causal Discovery with Continuous Additive Noise Models](https://www.jmlr.org/beta/papers/v15/peters14a.html) | 2014 / JMLR原始论文 | 观测因果识别依赖假设；连续加性噪声DAG，公开 |
| K13 | Roy, Madhyastha, Lawrence & Rajan, [Inferring Concept Prerequisite Relations from Online Educational Resources](https://arxiv.org/abs/1811.12640) | 2018初稿/2019修订与IAAI录用 / 作者预印本 | 课程/概念标签推断prerequisite；不等于干预因果效应，公开 |
| K14 | Baker, Saxe & Tenenbaum, [Action understanding as inverse planning](https://web.mit.edu/9.s915/www/classes/cognition2009.pdf) | 2009 / Cognition原始论文、MIT副本 | 简化行动观察中的意图反推；公开PDF，不能直接量化科研行为 |
| K15 | Gilmer et al., [Neural Message Passing for Quantum Chemistry](https://proceedings.mlr.press/v70/gilmer17a.html) | 2017 / ICML原始论文 | MPNN计算框架，原实验证据限分子预测；公开 |

## 研究生生活、实验室资源与科研流程

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

## 报告结构、论文评审与证据质量

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

## 来源冲突与不可泛化范围

- 容量文献中的高rank诊断、低rank适配和神经塌缩研究对象不同，不能合并成单向能力定律；优先检查矩阵对象、归一化、任务与训练阶段。
- BKT/DKT/IRT主要来自教育观测；知识图模拟没有同样的观测似然，不能直接继承其概率解释。课程先后关系与因果前置关系分开。
- 学校资助是具名资格制度，国际招生生活预算不是本土CS学生抽样均值；机时额度、导师津贴与助研报酬可能重叠。年份更替时须更新最终执行文件。
- 竞赛每阶段的分母分别为报名/有效作品/决赛/评奖；会议总体录用比不代表某类个人概率，退出、desk reject和重投口径不能互换。
- venue作者、reviewer、ethics和artifact规则的年份/阶段不同。JMLR/TMLR与年度会议流程不同；公开artifact不等于论文录用，评分权重是本项目设计。
- 直接抓取失败、订阅限制或验证墙不等于来源不存在；表内明确了实际读取范围。R01最终通过直接HTTP取得官方PDF并核验原始定义，R02作交叉验证；无法读取的其他内容不承担超出可读部分的新事实结论。

## 最终链接与路径检查

检查包括七份指定文件、必需主题章节、代码/本地文档目标、源码行号范围、Markdown围栏和表格列数，并对去重后的HTTP(S)目标进行访问检查。成功响应只证明端点当时可达，不证明其支持某一论点；论据匹配由主题审计单独核验。外部验证墙、403、超时与断链分别记录，不笼统标为“全部通过”。

2026-09-09最终检查结果：

| 检查项 | 结果 |
|---|---|
| 交付文件 | 7/7份指定Markdown文件齐全；四份主题报告均含7个必需章节 |
| 本地文档/源码链接 | 225处引用全部存在，源码行号均在对应文件范围内；无指向仓库外的本地链接 |
| Markdown | 围栏配对、表格列数、UTF-8替换字符检查通过 |
| 来源登记 | 77个主题条目，84个去重HTTP(S)目标 |
| 直接HTTP检查 | 82/84返回2xx（含Range请求206），其中2个OpenReview目标进入challenge页，不能按正文已读计；未发现404/410响应 |
| HTTP例外 | NVIDIA历史产品公告发生TLS连接异常，随后网页读取成功并再次核对日期/规格；Zenodo DOI记录超时，保留元数据链接且提供已读取的EURASIP原文 |
| 验证墙 | OpenReview的LoRA、Stable Rank Normalization页面可到达验证页；采用已可读的作者论文版本，不声称通过了验证墙 |
| 代码变更边界 | 仅新增docs/research下7份文档；无应用构建、产品代码变更或训练实验 |

HTTP检查使用GET/Range并跟随重定向；它检查端点访问，不把验证页、订阅页或只读元数据当完整正文。主题文档中的既有访问说明记录正文读取范围，优先于仅凭HTTP状态作出的推断。代码路径检查验证存在与行号范围，函数语义则由实际源码审计和交叉复核承担。
