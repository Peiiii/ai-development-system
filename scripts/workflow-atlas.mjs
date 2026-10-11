import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Read the sequence directly from its owner; the website does not own workflow gates.
export async function readWorkflowAtlas(root) {
  const result = {};
  for (const name of ['initialization', 'standard', 'trivial', 'bugfix', 'major-delivery']) {
    const source = await readFile(path.join(root, 'payload/.agents/workflows', `${name}.md`), 'utf8');
    const heading = name === 'major-delivery' ? '流程与嵌套' : '顺序与门';
    const section = source.split(`## ${heading}\n`)[1]?.split('\n## ')[0]?.trim();
    const sequence = section?.split('\n\n')[0];
    if (!sequence?.includes(' → ')) throw new Error(`Missing workflow sequence: ${name}`);
    const steps = sequence.replace(/。$/, '').split(' → ');
    const condition = name === 'major-delivery'
      ? '跨工作项或上下文持续维护完整成果；子流程完成不关闭整体目标。'
      : source.split('## 进入条件\n')[1]?.split('\n## ')[0]?.trim();
    const notes = name === 'major-delivery'
      ? ['内层完成只关闭对应工作项；结果与证据交回外层，不直接关闭 parent-goal。', '选择工作项后执行适用基础工作流；返回外层集成验证，必要时继续循环。']
      : section.split('\n\n').slice(1).join('\n').split('。').map(text => text.trim()).filter(Boolean);
    result[name] = {
      id: `workflow-${name}`, title: source.match(/^# (.+?)(?: Workflow)?$/m)[1],
      subtitle: `${steps.length} 个顺序步骤 · 可继续展开`, source: `/workflows/${name}.md`,
      children: [
        ...steps.map((title, index) => ({ id: `${name}-step-${index+1}`, step: title, title: `${String(index+1).padStart(2,'0')} · ${title.replace('Review(mode=design)', '方案审查').replace('Review(mode=implementation)', '实现审查').replace('Validation(mode=acceptance)', 'AI 验收验证')}` })),
        {id:`${name}-gates`,title:'适用场景与流程门',children:[condition,...notes].filter(Boolean).map((title,index)=>({id:`${name}-gate-${index}`,title}))}
      ]
    };
  }
  return result;
}
