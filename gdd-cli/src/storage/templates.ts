export interface DocumentTemplate {
  name: string;
  description: string;
  sections: string[];
  interviewQuestions: string[];
}

export const templates: Record<string, DocumentTemplate> = {
  'game-design': {
    name: '游戏策划文档',
    description: '完整的游戏策划文档模板',
    sections: [
      '游戏概述',
      '核心玩法',
      '系统设计',
      '关卡设计',
      '美术风格',
      '音效设计',
      '技术实现',
      '开发计划'
    ],
    interviewQuestions: [
      '游戏的核心玩法是什么？',
      '目标玩家群体是谁？',
      '游戏的独特卖点是什么？',
      '预计开发周期多长？'
    ]
  },

  'product-requirement': {
    name: '产品需求文档',
    description: '产品功能需求文档模板',
    sections: [
      '产品概述',
      '用户画像',
      '功能需求',
      '非功能需求',
      '用户体验设计',
      '技术方案',
      '开发排期',
      '风险评估'
    ],
    interviewQuestions: [
      '产品要解决什么问题？',
      '目标用户是谁？',
      '核心功能有哪些？',
      '有哪些技术限制？'
    ]
  },

  'technical-design': {
    name: '技术设计文档',
    description: '系统技术设计文档模板',
    sections: [
      '系统概述',
      '架构设计',
      '模块设计',
      '接口设计',
      '数据库设计',
      '安全设计',
      '性能优化',
      '部署方案'
    ],
    interviewQuestions: [
      '系统的核心功能是什么？',
      '预期的并发量是多少？',
      '有哪些技术栈要求？',
      '有哪些性能指标？'
    ]
  },

  'api-documentation': {
    name: 'API文档',
    description: 'RESTful API文档模板',
    sections: [
      'API概述',
      '认证方式',
      '接口列表',
      '数据模型',
      '错误码',
      '使用示例',
      '变更日志'
    ],
    interviewQuestions: [
      'API的主要用途是什么？',
      '使用什么认证方式？',
      '有哪些核心接口？',
      '数据格式是什么？'
    ]
  }
};

export function getTemplate(name: string): DocumentTemplate | undefined {
  return templates[name];
}

export function listTemplates(): Array<{ name: string; description: string }> {
  return Object.entries(templates).map(([key, template]) => ({
    name: key,
    description: template.description
  }));
}
