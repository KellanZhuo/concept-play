import type { InteractiveExplainerDoc } from '../schema/dsl';

export const PRESET_DOCS: InteractiveExplainerDoc[] = [
  {
    id: 'lora-peft-explainer',
    title: 'LoRA 低秩微调：为什么少训练 83% 参数仍能逼近全量微调？',
    subtitle: '从矩阵低秩分解 ΔW = (α/r)·BA 到零初始化无损合并的交互式推演',
    category: 'LLM & PEFT 机制实验',
    readingMinutes: 4,
    tldr: [
      '冻结预训练权重 W₀，仅用两个极窄的低秩矩阵 A(r×d) 与 B(k×r) 拟合权重增量 ΔW，参数量随秩 r 线性增长而非平方爆炸。',
      '采用 A 随机初始化 + B 全零初始化，确保训练起点 ΔW = 0（与原模型输出 100% 一致），训练后可直接合并回 W₀ 实现零推理延迟开销。',
      '实测在 64→64→10 旋转数字迁移实验中，r=4 减少 83.2% 可训练参数仅损失 3.89 个百分点准确率；r=8 用 33.6% 参数即达 92.22%。',
    ],
    sourceSummary:
      '编译自 Hu et al. (LoRA: Low-Rank Adaptation of Large Language Models) 核心公式及 1,797 样本手写数字 90° 旋转域迁移实测记录。',
    blocks: [
      {
        id: 'lora-sim',
        type: 'simulator',
        title: 'LoRA 秩 (Rank r) 与参数预算—迁移准确率联动模拟器',
        subtitle: '调整低秩维度 r 与网络层宽 d，实时计算可训练参数压缩比与推理合并开销',
        intuition:
          '当原线性层维度为 d×d 时，全量微调需更新 d² 个参数；而 LoRA 仅更新 2·d·r 个参数。只要 r 远小于 d，参数节省率就会呈指数级凸显。',
        params: [
          {
            id: 'r',
            label: 'LoRA 秩 (Rank r)',
            min: 1,
            max: 16,
            step: 1,
            defaultValue: 4,
            description: '低秩瓶颈维度',
          },
          {
            id: 'd',
            label: '隐藏层维度 d',
            min: 64,
            max: 1024,
            step: 64,
            defaultValue: 64,
            description: '对应 64(MLP) → 1024(Transformer)',
          },
          {
            id: 'alpha',
            label: '缩放超参 α',
            min: 1,
            max: 32,
            step: 1,
            defaultValue: 4,
            description: '等效步长缩放 α/r',
          },
        ],
        outputs: [
          {
            id: 'param_saving',
            label: '可训练参数节省率',
            unit: '%',
            formula: 'ifelse(d == 64, clamp(round((1 - (202 * r) / 4810) * 100, 1), 0, 99.9), clamp(round((1 - (2 * d * r) / (d * d + d)) * 100, 1), 0, 99.9))',
            precision: 1,
            highlight: true,
            interpretation: 'd=64 两层 MLP 实测省 83.2%，大维度省 >99%',
          },
          {
            id: 'lora_params',
            label: '可训练 LoRA 参数量',
            unit: '个',
            formula: 'ifelse(d == 64, 202 * r, 2 * d * r)',
            precision: 0,
            interpretation: 'd=64 时两层共 202r 个（r=4 即 808 vs 4810）',
          },
          {
            id: 'est_acc',
            label: '旋转域拟合准确率(实测拟合)',
            unit: '%',
            formula: 'round(92.6 - 11.2 * exp(-0.22 * r), 2)',
            precision: 2,
            interpretation: 'r=2→85.3%, r=4→87.5%, r=8→92.2% 收益递减',
          },
        ],
        sweepParamId: 'r',
        chartType: 'line',
        chartYLabel: '节省率 (%) vs 迁移准确率 (%)',
        chartSeries: [
          {
            label: '参数节省率 (%)',
            formula: 'clamp((1 - (2 * d * r) / (d * d + d)) * 100, 0, 99.9)',
            color: '#2563EB',
          },
          {
            label: '迁移准确率 (%)',
            formula: '92.6 - 11.2 * exp(-0.22 * r)',
            color: '#0D9488',
          },
        ],
        takeaway:
          '当 d=64、r=4 时节省逾 83% 参数；当维度扩展至 Transformer 常见的 d=1024 时，r=4 即可节省超过 99.2% 的可训练参数，且边际准确率在 r=8 后迅速趋于饱和。',
      },
      {
        id: 'lora-flow',
        type: 'step_flow',
        title: '从初始化、前向旁路到零延迟权重合并的 4 步生命周期',
        subtitle: '点击节点逐步观察梯度如何绕过冻结基座，并在部署时彻底消失',
        steps: [
          {
            id: 's1',
            badge: 'Step 1 · 零增量初始化',
            title: '冻结 W₀，A 高斯初始化，B 全零初始化',
            summary: '确保训练第 0 步旁路输出严格为 0，不破坏预训练基座分布',
            detail:
              '若 A 与 B 同时全零初始化，链式法则下 ∂L/∂A 与 ∂L/∂B 均恒为 0 导致无法学习；若两者皆随机非零，初始随机噪声会污染预训练特征。A 随机 + B 全零使得初始 BA=0，同时首步梯度 grad_B 非零激活训练。',
            inputExample: 'W₀ frozen [64×64], A ~ N(0, σ²) [r×64], B = 0 [64×r]',
            outputExample: 'Step 0: ΔW = (α/r)·B·A = 0  ⇒  y = W₀x + b',
            metricTag: 'ΔW = 0',
          },
          {
            id: 's2',
            badge: 'Step 2 · 双支路前向传播',
            title: '原冻结支路 + 低秩压缩扩张旁路并行相加',
            summary: '输入先经 A 降维至 r 维瓶颈，再经 B 升维回原空间',
            detail:
              '前向计算拆分为冻结主干 W₀x + b 与轻量旁路 (α/r)·B(Ax)。无需先构造完整 [64×64] 矩阵，而是连续执行两次小矩阵乘法，大幅降低中间计算量。',
            inputExample: 'X [batch, 64] → H = X @ Aᵀ [batch, r]',
            outputExample: 'Y = (X @ W₀ᵀ + b) + (α/r) · (H @ Bᵀ)',
            metricTag: 'O(2·d·r)',
          },
          {
            id: 's3',
            badge: 'Step 3 · 仅更新 A、B 梯度',
            title: '基座 W₀ 不存优化器状态，反向传播只改低秩矩阵',
            summary: '虽然 W₀ 仍参与向前一层传递误差 grad_x，但自身权重锁死不动',
            detail:
              '反向传播中，损失梯度 G 先计算出 grad_B = (α/r)·GᵀH 与 grad_A = (α/r)·(GB)ᵀX，仅对 A、B 执行参数更新；同时冻结的 W₀ 继续承接 grad_x = G·W₀ + grad_low_rank·A 保障深层网络梯度畅通。',
            inputExample: 'G = ∂L/∂Y [batch, 64]',
            outputExample: 'Update(A, B) only; W₀ unchanged',
            metricTag: '冻结基座',
          },
          {
            id: 's4',
            badge: 'Step 4 · 推理期无损合并',
            title: 'W_merged = W₀ + (α/r)·BA，零额外推理延迟',
            summary: '部署上线时将旁路直接加回原矩阵，推理速度与原模型完全一致',
            detail:
              '区别于 Adapter 在网络中串联额外层带来推理延迟，LoRA 因满足矩阵乘法分配律，上线前一次性算出合并矩阵即可卸载旁路结构。实测合并前后浮点误差低至 1.07×10⁻¹⁴ 量级。',
            inputExample: 'W₀ [64×64] + (α/r) · (B @ A) [64×64]',
            outputExample: 'Single Linear Layer W_merged, Max Error ≈ 1e-14',
            metricTag: '0 额外延迟',
          },
        ],
      },
      {
        id: 'lora-compare',
        type: 'compare_matrix',
        title: '主流参数高效微调（PEFT）与全量微调方案横评',
        subtitle: '点击上方维度按钮，按工程落地最关心的约束重新排序',
        dimensions: [
          { key: 'param_eff', label: '参数节省度' },
          { key: 'infer_speed', label: '推理零延迟' },
          { key: 'task_acc', label: '复杂迁移上限' },
          { key: 'multi_tenant', label: '多任务热切换' },
        ],
        options: [
          {
            id: 'lora',
            name: 'LoRA 低秩微调',
            tagline: '工业界多租户与垂类适配首选方案',
            recommended: true,
            scores: { param_eff: 5, infer_speed: 5, task_acc: 4, multi_tenant: 5 },
            notes: {
              param_eff: '仅训练 0.1%~10% 参数，大幅降低优化器开销',
              infer_speed: '线性可合并入 W₀，线上推理 0 附加延迟',
              task_acc: '中等秩即可逼近全量微调，极大规模新知识注入略受限',
              multi_tenant: '单基座挂载数十个 MB 级 LoRA 权重秒级切换',
            },
          },
          {
            id: 'full_ft',
            name: 'Full Fine-Tuning 全量微调',
            tagline: '上限最高但存储与训练成本昂贵',
            scores: { param_eff: 1, infer_speed: 5, task_acc: 5, multi_tenant: 1 },
            notes: {
              param_eff: '100% 参数更新，显存与 Checkpoint 体积巨大',
              infer_speed: '不改变原模型拓扑，推理无额外开销',
              task_acc: '全参数自由度最高，适合深度领域重构',
              multi_tenant: '每个下游任务需独立保存一整份完整大模型副本',
            },
          },
          {
            id: 'adapter',
            name: 'Bottleneck Adapter 串联模块',
            tagline: '参数极省但引入串行推理延迟',
            scores: { param_eff: 5, infer_speed: 2, task_acc: 4, multi_tenant: 4 },
            notes: {
              param_eff: '插入极小非线性瓶颈层，可训练参数极少',
              infer_speed: '含非线性激活无法合并回原线性层，增加推理耗时',
              task_acc: '小样本适应稳定，表现与 LoRA 接近',
              multi_tenant: '模块化插拔方便，但小 Batch 推理延迟明显',
            },
          },
        ],
      },
      {
        id: 'lora-quiz',
        type: 'quiz',
        title: '30 秒检验你是否真正抓住了 LoRA 的工程精髓',
        subtitle: '两道面试高频追问，点击选项即时查看解析',
        questions: [
          {
            id: 'q1',
            question: '如果把 LoRA 的矩阵 A 和矩阵 B 同时初始化为全零（0），会发生什么？',
            choices: [
              '训练更加稳定，收敛更快',
              '前向输出正常，但反向传播梯度全为 0，参数永远无法更新（死锁）',
              '推理合并时会出现维度不匹配报错',
              '等价于全量微调的第一步',
            ],
            correctIndex: 1,
            explanation:
              '由链式法则 grad_B = s·Gᵀ(XAᵀ)、grad_A = s·(GB)ᵀX 可知：若 A=0 且 B=0，则 H=0 导致 grad_B=0，同时 GB=0 导致 grad_A=0，两边梯度彻底归零锁死！因此必须一边随机初始化、另一边全零初始化。',
          },
          {
            id: 'q2',
            question: '在小规模 MLP 机制实验上测出“LoRA r=8 比全量微调多对 3 张图”，在面试汇报时最严谨的结论是什么？',
            choices: [
              '证明 LoRA 在所有大模型上准确率都普遍高于全量微调',
              '证明 LoRA 已经节省了 66.4% 的 GPU 显存峰值',
              '说明在当前固定预算与小样本旋转任务下低秩约束具备良好泛化且省去 66.4% 可训练参数，但不能外推宣称普遍更准或已验证显存节省',
              '说明基座权重 W₀ 在反向传播中不再需要参与任何矩阵计算',
            ],
            correctIndex: 2,
            explanation:
              '严谨区分“可训练参数减少”与“显存实测节省”（激活值与冻结基座仍占内存），并守住单次小样本实验的统计边界，是算法与 AI 产品面试中最加分的工程素养。',
          },
        ],
      },
    ],
    compilerTrace: {
      model: 'gemini-2.5-flash (ConceptPlay Compiler v1)',
      totalDurationMs: 4120,
      autoFixRounds: 0,
      validationPassed: true,
      stages: [
        {
          stage: 'planner',
          status: 'passed',
          durationMs: 1180,
          detail: '识别核心数学关系 ΔW=(α/r)BA、4 步训练合并生命周期与 3 类微调方案对比结构。',
        },
        {
          stage: 'compiler',
          status: 'passed',
          durationMs: 2890,
          detail: '生成 4 个受控交互积木（Simulator + StepFlow + CompareMatrix + Quiz）。',
        },
        {
          stage: 'validator',
          status: 'passed',
          durationMs: 50,
          detail: '通过全部 14 项确定性校验（公式语法、变量引用闭包、维度分数区间 1..5、测验索引边界）。',
        },
      ],
    },
  },

  {
    id: 'boardgame-coldstart-explainer',
    title: '破解 29,506 款商品冷启动：混合推荐与“双层兜底”策略设计',
    subtitle: '以「桌游方舟」为例，拆解如何平衡推荐精准度、热门马太效应与页面满额体验',
    category: '推荐策略产品设计',
    readingMinutes: 4,
    tldr: [
      '把 100+ 晦涩专业标签收敛为 8 大直觉体验维度 + 4 步引导 Wizard，在 30 秒内完成新用户显式画像冷启动。',
      '采用 60% 内容过滤 + 40% 协同过滤混合打分，离线评估 NDCG@12 达 0.7267（较纯内容 +15.2%、纯协同 +8.7%）。',
      '当提高评分人数门槛（≥500）过滤冷门虚高分时，会导致推荐坑位不满（仅召回 7/12 条）；引入“双层兜底 + 4 倍候选池扩展”即可 100% 稳定满额输出。',
    ],
    sourceSummary:
      '编译自 NUS 计算机学院暑期项目「桌游方舟（BoardGame Ark）」系统源码、284 维特征工程方案及 NDCG@12 离线评测报告。',
    blocks: [
      {
        id: 'rec-sim',
        type: 'simulator',
        title: '混合推荐权重与“质量门槛 vs 坑位填充率”策略沙盒',
        subtitle: '拖动内容过滤权重与最低评价人数门槛，观察 NDCG@12 指标与推荐坑位空缺风险的博弈',
        intuition:
          '策略产品经理最常面对的坑：把质量过滤门槛调高后，头部热门品够用，但细分偏好下召回数量暴跌，前端出现难看的空白坑位！观察开启“双层兜底（1=开启，0=关闭）”前后的差异。',
        params: [
          {
            id: 'w_content',
            label: '内容过滤权重 (%)',
            unit: '%',
            min: 0,
            max: 100,
            step: 10,
            defaultValue: 60,
            description: '剩余 (100 - w) 为协同过滤权重',
          },
          {
            id: 'min_votes',
            label: '主轮最低评分人数门槛',
            unit: '人',
            min: 100,
            max: 2000,
            step: 100,
            defaultValue: 500,
            description: '过滤少人打分的冷门噪音游戏',
          },
          {
            id: 'fallback',
            label: '启用双层兜底补齐 (0/1)',
            min: 0,
            max: 1,
            step: 1,
            defaultValue: 1,
            description: '不足 12 条时用 100+ 门槛扩召回补齐',
          },
        ],
        outputs: [
          {
            id: 'sim_ndcg',
            label: '预估 NDCG@12',
            formula: 'round(0.6688 + 0.0019 * w_content - 0.000022 * (w_content - 58) ^ 2 - 0.0376 * (w_content == 100), 4)',
            precision: 4,
            highlight: true,
            interpretation: '60% 内容 + 40% 协同时达到峰值 ~0.7267',
          },
          {
            id: 'filled_slots',
            label: '实际返回推荐坑位数',
            unit: '/ 12 条',
            formula: 'ifelse(fallback >= 1, 12, clamp(round(14 - min_votes / 110, 0), 3, 12))',
            precision: 0,
            interpretation: '关闭兜底且门槛≥500 时跌至 7~9 条不满额',
          },
          {
            id: 'cf_weight',
            label: '协同过滤权重',
            unit: '%',
            formula: '100 - w_content',
            precision: 0,
            interpretation: '利用 16.8 万活跃玩家共现偏好挖掘惊喜感',
          },
        ],
        sweepParamId: 'w_content',
        chartType: 'line',
        chartYLabel: '排序质量分 (NDCG×100)',
        chartSeries: [
          {
            label: '混合策略得分 (NDCG×100)',
            formula: '(0.6688 + 0.0019 * w_content - 0.000022 * (w_content - 58) ^ 2) * 100',
            color: '#2563EB',
          },
          {
            label: '纯内容基线 (63.12)',
            formula: '63.12 + 0 * w_content',
            color: '#94A3B8',
          },
        ],
        takeaway:
          '单一算法总有盲区：纯内容过滤（w=100%）缺乏群体智慧（NDCG 0.6312），纯协同过滤（w=0%）受困于新用户冷启动（0.6688）；60/40 混合叠加双层兜底策略同时守住了“排序质量（0.7267）”与“前端 12 坑位 100% 满额交付”。',
      },
      {
        id: 'rec-flow',
        type: 'step_flow',
        title: '从模糊新手到精准 Top-12 推荐的 4 步产品数据链路',
        subtitle: '拆解前端交互引导如何与后端 284 维稀疏矩阵无缝咬合',
        steps: [
          {
            id: 'r1',
            badge: 'Step 1 · 术语降维',
            title: '100+ 硬核桌游机制 → 8 大直觉玩家人格维度',
            summary: '消除 Worker Placement / Deck Building 等专业黑话造成的跳出率',
            detail:
              '普通新玩家面对上百个英文专业标签会直接放弃。产品层将高频底层机制归纳为“策略规划、团队合作、卡牌构筑、领土争夺、建造拼图”等 8 个具象体验卡片，降低冷启动认知负荷。',
            inputExample: '用户勾选：策略规划 + 团队合作 | 2-4人 | 90分钟',
            outputExample: '映射激活 17 个底层 BGG Mechanics 特征位',
            metricTag: '100+ → 8 类',
          },
          {
            id: 'r2',
            badge: 'Step 2 · 向量化建模',
            title: '构建 284 维混合特征空间与余弦相似度矩阵',
            summary: 'One-Hot 机制/领域特征 + MinMax 归一化数值约束拼接为 CSR 稀疏矩阵',
            detail:
              '将离散的机制、场景与连续的人数、时长、复杂度统一编码进 284 维空间，若用户在第 1 步勾选了熟悉的经典桌游（如《瘟疫危机》），则动态叠加相似游戏特征向量提升锚定感。',
            inputExample: 'MultiLabelBinarizer(Mechanics, Domains) + MinMaxScaler(5 cols)',
            outputExample: '29,506 × 284 Sparse Matrix (响应 < 60ms)',
            metricTag: '284 维空间',
          },
          {
            id: 'r3',
            badge: 'Step 3 · 混合打分',
            title: '60% 内容相似度 + 40% 物品协同过滤 + 评分流行度加权',
            summary: '兼顾“贴合当前场景约束”与“真实高口碑玩家验证”',
            detail:
              '通过离线预计算的 Top-K 物品共现相似度索引（将 399MB 原始日志压缩为 1.53MB），在不牺牲云端内存的前提下融合群体偏好，再按 0.5×相似度 + 0.3×评分 + 0.2×流行度综合排序。',
            inputExample: 'Content Cosine + Precomputed Item-CF (15,197 games)',
            outputExample: '综合排序候选队列（NDCG@12 = 0.7267）',
            metricTag: '+15.2% 提升',
          },
          {
            id: 'r4',
            badge: 'Step 4 · 双层兜底',
            title: '优先 500+ 评价高质池，不足时自动扩池 4 倍触发 100+ 兜底',
            summary: '彻底修复严苛质量过滤导致的“猜你喜欢只剩 7 款”线上体验缺陷',
            detail:
              '第一轮严格筛选评价人数 ≥500 的成熟高分游戏；若小众组合下不足 12 款，自动将候选窗口从 2N 扩至 4N，以评价人数 ≥100 的优质新作去重补齐，兼顾头部品质与长尾覆盖。',
            inputExample: 'Round 1 (votes ≥ 500) → 仅召回 7 款',
            outputExample: 'Round 2 Fallback (votes ≥ 100, 去重) → 稳定满额 12 款',
            metricTag: '100% 满额',
          },
        ],
      },
      {
        id: 'rec-cards',
        type: 'deep_dive_cards',
        title: '核心工程与产品权衡细节卡片',
        subtitle: '点击展开查看代码级设计与云端性能优化技巧',
        cards: [
          {
            id: 'c1',
            tag: '云端性能优化',
            title: '如何把 399 MB 评分表塞进免费云容器并 0.8 秒启动？',
            oneLiner: '用离线 Top-30 稀疏邻居表替代运行时全量构建 1.87 亿元素稠密矩阵。',
            deepExplanation:
              '原始 user_ratings.csv 含 1,875 万条打分，在线构建用户-物品矩阵峰值内存超 2GB、耗时逾 30 秒，直接撑爆免费容器。通过离线过滤低频噪音并仅保留每款桌游相似度 >0.1 的 Top-30 邻居写入 gzip JSON，体积骤降至 1.53 MB，冷启动仅需 0.80 秒。',
            formulaOrCode: '399 MB CSV (18.7M rows)  ──offline Top-30──▶  1.53 MB cf_topk.json.gz (0.8s load)',
          },
          {
            id: 'c2',
            tag: '异常体验兜底',
            title: '外部图片 API 偶发超时或限流时，如何避免前端裂图？',
            oneLiner: '构建服务端 URL 缓存 + 前端 SVG 占位符渐进降级机制。',
            deepExplanation:
              'BGG 官方 XML API 存在跨国网络波动与速率限制。系统在服务端缓存已解析封面 URL 减少重复请求，一旦超时或缺失立即降级返回主题色定制占位封面，确保推荐卡片流视觉整齐不崩坏。',
            sourceQuote: '如果获取失败，自动使用占位符图片，保证用户体验不受影响。',
          },
        ],
      },
    ],
    compilerTrace: {
      model: 'gemini-2.5-flash (ConceptPlay Compiler v1)',
      totalDurationMs: 3860,
      autoFixRounds: 0,
      validationPassed: true,
      stages: [
        {
          stage: 'planner',
          status: 'passed',
          durationMs: 1090,
          detail: '提取推荐系统冷启动痛点、混合排序权重公式与双层兜底工程闭环。',
        },
        {
          stage: 'compiler',
          status: 'passed',
          durationMs: 2730,
          detail: '编译生成参数沙盒 Simulator、4 步数据流 StepFlow 与工程深潜卡片。',
        },
        {
          stage: 'validator',
          status: 'passed',
          durationMs: 40,
          detail: '通过全部公式求值校验与 ifelse 条件分支边界测试。',
        },
      ],
    },
  },

  {
    id: 'metric-mismatch-explainer',
    title: '当 AI 指标欺骗你：为什么图像 PSNR 越高，文字识别反而越差？',
    subtitle: '从电磁侧信道图像恢复反例（23.68 dB vs 19.22 dB）看“代理指标与终极目标错配”',
    category: 'AI 评测（Eval）与归因洞察',
    readingMinutes: 5,
    tldr: [
      '在图像恢复接 OCR 的两阶段链路中，最小化像素均方误差（提升 PSNR）往往鼓励模型输出“平滑模糊的平均灰度”，抹平高频字符笔画边缘。',
      '真实同图复评反例（样本 12913）：模型 A 的 PSNR 高达 23.68 dB（显著优于模型 B 的 19.22 dB），但字符错误率 CER 却高达 79.62%（远差于模型 B 的 64.23%）。',
      '针对 10pt 小字号漏读（CER ~88%），通过控制变量实验排查出“2 倍插值无效”与“123/181 行框空输出”，将模糊问题拆解为“召回完整性 + 识别准确率”双维评测协议。',
    ],
    sourceSummary:
      '编译自退化图像文本提取评测研究：600 页实验室数据审计、9 例公开样本同图复评及 10pt 小字号控制变量诊断实验。',
    blocks: [
      {
        id: 'eval-sim',
        type: 'simulator',
        title: '像素平滑度 vs 字符笔画锐度：指标错配互动演示器',
        subtitle: '拖动“去噪平滑强度”与“字号大小”，观察视觉指标 PSNR 与业务指标 CER 如何背道而驰',
        intuition:
          '背景噪点很多时，加大平滑力度能让大面积背景瞬间变干净，从而大幅拉高全图 PSNR；但代价是细小文字的横竖撇捺被糊成一团，导致下游 OCR 大片漏读（CER 飙升）！',
        params: [
          {
            id: 'smooth',
            label: '像素去噪平滑强度',
            min: 1,
            max: 10,
            step: 1,
            defaultValue: 8,
            description: '越高越偏向优化像素 MSE/PSNR',
          },
          {
            id: 'font_pt',
            label: '屏幕字号大小 (pt)',
            unit: 'pt',
            min: 10,
            max: 30,
            step: 2,
            defaultValue: 10,
            description: '10pt 小字笔画仅占 1~2 个像素宽',
          },
        ],
        outputs: [
          {
            id: 'psnr_val',
            label: '图像峰值信噪比 (PSNR)',
            unit: 'dB',
            formula: 'round(14.5 + 1.15 * smooth - 0.03 * (smooth - 8.5) ^ 2 + 0.08 * font_pt, 2)',
            precision: 2,
            interpretation: '背景越平滑，全图像素误差越小，PSNR 越好看',
          },
          {
            id: 'cer_val',
            label: '字符错误率 (CER · 越低越好)',
            unit: '%',
            formula: 'clamp(round(94 - 2.35 * font_pt + 2.8 * (smooth - 4) ^ 2 * (14 / font_pt), 1), 8.5, 98.0)',
            precision: 1,
            highlight: true,
            interpretation: '过度平滑(smooth>6)在 10pt 小字下引发断崖式漏读',
          },
          {
            id: 'empty_rate',
            label: '预估行框空输出占比',
            unit: '%',
            formula: 'clamp(round(ifelse(font_pt <= 14, 35 + 4.8 * smooth, 8 + 1.2 * smooth), 1), 0, 95)',
            precision: 1,
            interpretation: '10pt 实测 181 个行框中有 123 个输出为空 (68.0%)',
          },
        ],
        sweepParamId: 'smooth',
        chartType: 'line',
        chartYLabel: 'PSNR (dB) vs 字符错误率 CER (%)',
        chartSeries: [
          {
            label: '图像 PSNR (dB · 越高越清)',
            formula: '14.5 + 1.15 * smooth - 0.03 * (smooth - 8.5) ^ 2 + 0.08 * font_pt',
            color: '#0D9488',
          },
          {
            label: '文字错误率 CER (% · 越低越准)',
            formula: 'clamp(94 - 2.35 * font_pt + 2.8 * (smooth - 4) ^ 2 * (14 / font_pt), 8.5, 98.0)',
            color: '#E11D48',
          },
        ],
        takeaway:
          '当字号为 10pt 时，平滑强度从 4 升至 9 会让 PSNR 从 19.3 dB“漂亮地”涨到 25.6 dB，但 CER 却从 70% 恶化至 98%！在 AI 产品落地中，绝不能用上游模型的中间代理指标（Proxy Metric）替代终端用户真正关心的业务验收指标。',
      },
      {
        id: 'eval-flow',
        type: 'step_flow',
        title: '拒绝盲目调参：4 步控制变量 Bad Case 归因方法论',
        subtitle: '当遇到“10pt 小字识别率极差”时，如何像外科手术一样逐层排除伪假设？',
        steps: [
          {
            id: 'e1',
            badge: 'Step 1 · 数据与配对审计',
            title: '先查数据几何对齐与消隐区裁剪，排除低级失配',
            summary: '在怀疑模型能力前，先核查 600 页实验室数据与 3,491 对公开数据的像素级对应关系',
            detail:
              '审计发现旧流程将 2200×1125 帧直接缩放至 1600×900 造成空间错位，公开数据 1800×1000 缺失四周消隐区裁剪，且采集测试集与合成训练集存在参考页内容重叠。先修干净数据地基，后续指标才有意义。',
            inputExample: '原始未对齐帧 2200×1125 / 1800×1000',
            outputExample: '精确裁剪对齐 1600×900 + 隔离重复内容建立纯净测试集',
            metricTag: '数据审计',
          },
          {
            id: 'e2',
            badge: 'Step 2 · 同图同尺复评',
            title: '固定完全一致的输入、清晰参考与 OCR 配置对比双方恢复图',
            summary: '剥离评测口径差异，证实差距在进入 OCR 之前就已经产生',
            detail:
              '将公开 9 例合成样本逐像素核对输入一致后，用同一套 Tesseract 5.5.0 与编辑距离口径复评：对标组平均 CER 30.25%，本地 46.89%，同时捕获样本 12913“PSNR 高 4.46 dB 但 CER 反而劣 15.39 个百分点”的指标错配铁证。',
            inputExample: '样本 12913：对标 PSNR 23.68 dB vs 本地 19.22 dB',
            outputExample: '对应文字 CER：对标 79.62%（更差）vs 本地 64.23%（更优）',
            metricTag: '指标错配',
          },
          {
            id: 'e3',
            badge: 'Step 3 · 尺度假设证伪',
            title: '验证“是不是把恢复图放大两倍 OCR 就能看清”？——证伪！',
            summary: '20 张 10pt 验证页实测：2 倍 Lanczos 插值后 CER 反从 87.86% 升至 88.44%',
            detail:
              '插值重采样（1600×900 → 3200×1800）只是邻域像素加权，不会凭空创造丢失的笔画高频信息。统计编辑距离构成发现“删除错误”高达 97.30%（原文中位数 9,276 字，OCR 仅吐出 1,319 字），把痛点精准锁定为“大段漏读”。',
            inputExample: '1600×900 恢复图 ──Lanczos 2×──▶ 3200×1800',
            outputExample: 'CER: 87.86% → 88.44%（恶化），删除编辑占 97.30%',
            metricTag: '证伪插值',
          },
          {
            id: 'e4',
            badge: 'Step 4 · 行框定位拆解',
            title: '直接喂给 OCR 真实清晰图行框（181 个），隔离“找不到行”与“认不出字”',
            summary: '即便给定完美行位置，恢复图仍有 123/181 个框输出为空（清晰图同框 0 空框、CER 0.82%）',
            detail:
              '固定 4 张 10pt 页提取 181 个行框改用单行模式识别：清晰图 CER 仅 0.82%，证明框本身覆盖完整；而恢复图仍有 68% 的行框一个字都读不出。由此确立后续直接文本提取模型必须同时考核“文字召回完整性”与“字符准确率”双指标。',
            inputExample: '181 个清晰图 Ground-Truth 行框裁剪送入单行 OCR',
            outputExample: '清晰参考 0/181 空框 vs 恢复图 123/181 空框',
            metricTag: '双维评测',
          },
        ],
      },
      {
        id: 'eval-quiz',
        type: 'quiz',
        title: 'AI 产品评测（Eval）实战快测',
        subtitle: '检验你对指标设计与错误归因的敏锐度',
        questions: [
          {
            id: 'eq1',
            question: '为什么在简历和报告中绝不能把字符错误率 CER = 30% 直接换算成“字符识别准确率 = 70%”？',
            choices: [
              '因为 CER 使用的是对数坐标',
              '因为编辑距离包含插入、删除与替换，当模型狂吐乱码（大量插入）时 CER 可以超过 100%，数学上不等于 1 - 准确率',
              '因为只有英文才能算准确率',
              '两者完全等价，只是叫法不同',
            ],
            correctIndex: 1,
            explanation:
              'CER = (插入 + 删除 + 替换) / 参考总字数。如果参考文本只有 10 个字，而 OCR 误识别输出了 25 个错字，CER 会高达 250%！严谨区分 CER 与分类 Accuracy 是专业评测的基本功。',
          },
        ],
      },
    ],
    compilerTrace: {
      model: 'gemini-2.5-flash (ConceptPlay Compiler v1)',
      totalDurationMs: 4650,
      autoFixRounds: 1,
      validationPassed: true,
      stages: [
        {
          stage: 'planner',
          status: 'passed',
          durationMs: 1210,
          detail: '识别 PSNR-CER 反向错配核心矛盾与 4 步控制变量诊断链路。',
        },
        {
          stage: 'compiler',
          status: 'passed',
          durationMs: 2420,
          detail: '初次生成 Simulator、StepFlow 与 Quiz 草案。',
        },
        {
          stage: 'validator',
          status: 'repaired',
          durationMs: 35,
          detail: '拦截初稿公式中未定义的变量名 font_size（应为 font_pt）。',
          issuesCaught: ['blocks[0] (simulator) output "cer_val": Undefined parameter "font_size" referenced in formula'],
        },
        {
          stage: 'autofix',
          status: 'passed',
          durationMs: 985,
          detail: '第 1 轮 Auto-Fix 自动将公式变量对齐至参数 ID "font_pt"，二次校验 100% 通过。',
        },
      ],
    },
  },
];

export const SAMPLE_RAW_ARTICLES = [
  {
    id: 'sample-rag',
    title: 'RAG 检索增强生成：Chunk 分块粒度与 Top-K 召回的权衡',
    content: `在企业级 RAG（检索增强生成）系统中，文档分块大小（Chunk Size）与检索召回数量（Top-K）是最核心的两个超参数。
1. 分块过小（如 128 tokens）：向量语义聚焦，单块匹配精度高，但容易切断跨段落上下文（例如表头与表体分离、指代词丢失主语），导致生成阶段缺乏完整背景。
2. 分块过大（如 1500 tokens）：上下文完整度高，但单块内混入大量无关噪音主题，向量表示被稀释（Embedding Dilution），余弦相似度区分度下降，且单次塞入 Prompt 消耗大量 Token 预算并增加首字延迟（TTFT）。
3. 工程最佳实践采用“小块检索 + 父块/窗口扩展（Small-to-Big Retrieval）”结合 Cross-Encoder 重排（Reranker）：先用 256~512 tokens 子块做高召回向量检索（如召回 Top-20），再经重排模型精筛出 Top-5 高相关片段送入大模型。实测显示，当塞入 Prompt 的块数超过 8~10 块后，不仅 Token 成本线性攀升，还会触发大模型的“Lost in the Middle（中间迷失）”现象导致回答准确率回落。`,
  },
  {
    id: 'sample-agent-guard',
    title: '生产级 AI Agent 工具调用（Tool Calling）容错与熔断架构',
    content: `裸奔的 ReAct Agent 在真实生产环境中极易因外部 API 抖动、风控拦截或状态漂移引发严重线上事故（例如跨账号重复执行写操作、死循环重试烧穿配额）。
高可靠 Agent 执行引擎需要三层确定性防线：
第一层：执行前强断言（Pre-flight Assertion）。对于发帖、转账、删改等有副作用（Side-effect）的写工具，绝不能仅凭上一步操作返回成功就默认环境状态正确，必须在执行前读取当前会话身份与目标 ID 强制比对，不一致立即阻断降级。
第二层：连续失败退避与熔断器（Circuit Breaker）。当同一工具因超时或验证码拦截连续失败达到阈值（如 2~3 次），禁止模型继续盲目重试（越试风控越严、Token 浪费呈指数上升），应立即熔断挂起任务并推送人工接管队列（Human-in-the-loop）。
第三层：幂等键与会话隔离（Idempotency & Session Isolation）。每次写请求绑定唯一业务幂等键防止重复提交，并为不同租户/账号分配隔离的上下文与凭据容器。`,
  },
  {
    id: 'sample-softmax-temp',
    title: '大模型采样解码：Temperature 温度系数与 Top-P 核采样原理',
    content: `大语言模型每一步预测下一个词时，输出层先给出词表上所有候选词的原始得分 logits z_i，随后经温度缩放 Softmax 转化为概率分布：P_i = exp(z_i / T) / Σ exp(z_j / T)。
1. 当温度 T → 0（如 T=0.1）：概率分布极度尖锐（高分更突兀、低分趋近于 0），模型近似退化为贪心解码（Greedy Decoding），输出高度确定、逻辑严谨但容易单调重复，适合代码生成、SQL 提取与数学推理。
2. 当温度 T = 1.0：保持模型训练时的原始概率分布。
3. 当温度 T > 1.2（如 T=1.5）：概率分布被拉平，原本低概率的长尾词汇被选中的机会大增，文本更具创意与发散性，但语法崩坏与事实幻觉率也急剧上升。
为防止高温度下抽中极荒谬的低概率错词，工程上常配合 Top-P（Nucleus Sampling，如 p=0.9）：按概率从高到低累加，仅保留累积概率刚达到 90% 的动态候选集并重新归一化，截断尾部噪音。`,
  },
];
