const prompt = "请读取 https://ai-dev.nextclaw.io/SKILL.md，按照其中的步骤，把 擎天 接入当前项目。先检查现有规则和工作区改动，预览安装差异，完成后运行检查并告诉我改了什么。";
const toast = document.querySelector("#copy-toast");
let toastTimer;

for (const button of document.querySelectorAll("[data-copy-prompt]")) {
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      toast.textContent = "接入指令已复制";
    } catch {
      toast.textContent = "复制失败，请手动复制上方指令";
    }
    toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 3000);
  });
}

const flowButtons = [...document.querySelectorAll("[data-flow-button]")];
const flowPanels = [...document.querySelectorAll("[data-flow-panel]")];
for (const button of flowButtons) {
  button.addEventListener("click", () => {
    const selected = button.dataset.flowButton;
    for (const item of flowButtons) {
      const active = item.dataset.flowButton === selected;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    }
    for (const panel of flowPanels) panel.hidden = panel.dataset.flowPanel !== selected;
  });
}

const architecture = document.querySelector('#architecture-tree');
if (architecture) {
  const viewport = architecture.querySelector('.atlas-viewport');
  const scene = architecture.querySelector('.atlas-scene');
  const scaleOutput = architecture.querySelector('#atlas-scale');
  const selection = architecture.querySelector('#atlas-selection');
  const mobile = () => viewport.clientWidth < 600;
  const layers = [
    { id:'flow', title:'工作流层', subtitle:'组织工程过程', color:'#c6ed81', groups:[
      { id:'basic', title:'基础工作流', subtitle:'覆盖工程迭代周期常规场景', leaves:['初始化','标准需求开发','简单修改','缺陷修复'] },
      { id:'major', title:'大型交付', subtitle:'组合基础工作流，维护整体成果', leaves:['选择并组织工作项','接收结果、证据与剩余缺口','集成与整体验收'] },
      { id:'control', title:'流程控制', subtitle:'组织阶段与整体完成判断', leaves:['阶段推进','返工路由','完成判断'] }
    ]},
    { id:'method', title:'方法层', subtitle:'Skills · 执行方法与行为约束', color:'#79c9cf', groups:[
      { id:'execution', title:'执行方法', subtitle:'提供当前阶段的具体方法', leaves:['理解','设计','实现','验证','Review'] },
      { id:'behavior', title:'行为约束', subtitle:'做事时应遵循什么方法', leaves:['实现前审查方案','验证时检查真实行为'] },
      { id:'special', title:'专项方法', subtitle:'命中场景后按需使用', leaves:['验收治理','知识治理','工作记录'] }
    ]},
    { id:'materials', title:'知识与任务资料层', subtitle:'支撑判断、执行与接续', color:'#b8a1e1', groups:[
      { id:'wiki', title:'项目知识 · Wiki', subtitle:'持续维护的项目事实', leaves:['环境','架构','既有行为','稳定知识与决策'] },
      { id:'contract', title:'任务约定与方案', subtitle:'本次任务要满足什么条件', leaves:['任务目标、需求、范围与边界','验收合同：有效要求与成功标准','设计与计划：方案、取舍与安排'] },
      { id:'record', title:'工作记录与状态', subtitle:'过程历史与当前执行现场', leaves:['日志：输入、变化与执行历史','当前状态：进度、缺口与下一动作'] },
      { id:'evidence', title:'验证证据', subtitle:'支持对应范围的结果判断', leaves:['测试结果','实际运行观察','Review 与验收结论'] }
    ]}
  ];
  const opened = new Set(mobile() ? [] : layers.map(x=>x.id));
  let nodes=[], edges=[], bounds={width:1200,height:740}, selected='root';
  let camera={x:0,y:0,scale:1};
  const escape = value => String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const lines = (value, count=19) => { const chars=Array.from(value); const rows=[]; while(chars.length) rows.push(chars.splice(0,count).join('')); return rows; };
  function layout() {
    nodes=[];edges=[];
    const narrow=mobile();
    const root={id:'root',title:'AI 驱动开发体系',subtitle:'完整交付 · 多类型、多层级工作流',x:narrow?40:436,y:30,w:340,h:100,color:'#c6ed81',type:'root'};
    nodes.push(root);
    let nextY=190; let maxY=0;
    layers.forEach((layer,index)=>{
      const x=narrow?40:40+index*392;const y=narrow?nextY:190;
      const parent={...layer,x,y,w:340,h:94,type:'layer',tag:`0${index+1} / ${['WORKFLOWS','METHODS','MATERIALS'][index]}`, expandable:true};
      nodes.push(parent); edges.push({from:root,to:parent,color:layer.color});
      let groupY=y+132;
      if(opened.has(layer.id)) for(const group of layer.groups) {
        const node={...group,x:x+18,y:groupY,w:322,h:84,color:layer.color,type:'group',expandable:true,parent:layer.id};
        nodes.push(node); edges.push({from:parent,to:node,color:layer.color,side:true});groupY+=110;
        if(opened.has(group.id)) group.leaves.forEach((title,leafIndex)=>{
          const rowCount=lines(title).length;
          const leaf={id:`${group.id}-${leafIndex}`,title,x:x+44,y:groupY-8,w:296,h:rowCount>1?66:54,color:layer.color,type:'leaf',parent:group.id};
          nodes.push(leaf);edges.push({from:node,to:leaf,color:layer.color,side:true});groupY+=leaf.h+16;
        });
        groupY+=opened.has(group.id)?10:0;
      }
      maxY=Math.max(maxY,groupY);if(narrow)nextY=groupY+20;
    });
    bounds={width:narrow?430:1220,height:maxY+24};
  }
  function render() {
    layout();
    const paths=edges.map(({from,to,color,side})=>{
      const startX=side?from.x+9:from.x+from.w/2;
      const startY=side?from.y+from.h:from.y+from.h;
      const endX=side?to.x:to.x+to.w/2;const endY=side?to.y+to.h/2:to.y;
      const d=side?`M ${startX} ${startY} V ${endY-9} Q ${startX} ${endY} ${startX+9} ${endY} H ${endX}`:`M ${startX} ${startY} C ${startX} ${startY+30}, ${endX} ${endY-30}, ${endX} ${endY}`;
      return `<path class="atlas-edge" style="stroke:${color}" d="${d}"/>`;
    }).join('');
    scene.innerHTML=paths+nodes.map(node=>{
      const titleRows=lines(node.title,node.type==='leaf'?19:18);
      const ty=node.type==='leaf'?(node.h-titleRows.length*20)/2+15:node.tag?46:32;
      return `<g class="atlas-node is-${node.type}${selected===node.id?' is-selected':''}" data-node="${node.id}" transform="translate(${node.x} ${node.y})" style="--node-color:${node.color}" role="button" tabindex="0" aria-label="${escape(node.title)}${node.expandable?'，点击展开或收起':''}" ${node.expandable?`aria-expanded="${opened.has(node.id)}"`:''}><rect width="${node.w}" height="${node.h}" rx="10"/>${node.tag?`<text class="node-tag" x="18" y="22">${node.tag}</text>`:''}<text class="node-title" x="18" y="${ty}">${titleRows.map((row,i)=>`<tspan x="18" dy="${i?20:0}">${escape(row)}</tspan>`).join('')}</text>${node.subtitle?`<text class="node-subtitle" x="18" y="${node.tag?72:node.type==='root'?76:58}">${escape(node.subtitle)}</text>`:''}${node.expandable?`<text class="node-toggle" x="${node.w-30}" y="${node.tag?48:32}">${opened.has(node.id)?'−':'+'}</text>`:''}<circle class="atlas-port" cx="${node.w/2}" cy="${node.h}" r="3"/></g>`;
    }).join('');
    applyCamera();
  }
  function applyCamera(){scene.setAttribute('transform',`translate(${camera.x} ${camera.y}) scale(${camera.scale})`);scaleOutput.value=`${Math.round(camera.scale*100)}%`;}
  function fit(){const w=viewport.clientWidth,h=viewport.clientHeight;camera.scale=Math.min(1.05,(w-36)/bounds.width,(h-36)/bounds.height);camera.x=(w-bounds.width*camera.scale)/2;camera.y=(h-bounds.height*camera.scale)/2;applyCamera();}
  function zoom(factor,px=viewport.clientWidth/2,py=viewport.clientHeight/2){const old=camera.scale;camera.scale=Math.min(2,Math.max(.15,old*factor));camera.x=px-(px-camera.x)*camera.scale/old;camera.y=py-(py-camera.y)*camera.scale/old;applyCamera();}
  function focusNode(node){const children=nodes.filter(n=>n.parent===node.id);const height=children.length?Math.max(...children.map(n=>n.y+n.h))-node.y+35:node.h+65;camera.scale=Math.min(1.1,(viewport.clientWidth-70)/380,(viewport.clientHeight-70)/height);camera.x=(viewport.clientWidth-node.w*camera.scale)/2-node.x*camera.scale;camera.y=35-node.y*camera.scale;applyCamera();}
  function activate(id){const node=nodes.find(n=>n.id===id);if(!node)return;selected=id;selection.textContent=id==='root'?'三层架构总览':node.title;if(node.expandable){if(opened.has(id))opened.delete(id);else opened.add(id);render();focusNode(nodes.find(n=>n.id===id));}else if(id==='root'){render();fit();}else{render();focusNode(nodes.find(n=>n.id===id));}architecture.querySelector(`[data-node="${id}"]`)?.focus({preventScroll:true});}
  scene.addEventListener('click',e=>{const node=e.target.closest('[data-node]');if(node)activate(node.dataset.node);});
  scene.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const node=e.target.closest('[data-node]');if(node){e.preventDefault();activate(node.dataset.node);}}});
  let drag=null;
  viewport.addEventListener('pointerdown',e=>{if(e.target.closest('[data-node],button'))return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,cx:camera.x,cy:camera.y};viewport.setPointerCapture(e.pointerId);viewport.classList.add('is-dragging');});
  viewport.addEventListener('pointermove',e=>{if(drag&&drag.id===e.pointerId){camera.x=drag.cx+e.clientX-drag.x;camera.y=drag.cy+e.clientY-drag.y;applyCamera();}});
  const endDrag=()=>{drag=null;viewport.classList.remove('is-dragging');};viewport.addEventListener('pointerup',endDrag);viewport.addEventListener('pointercancel',endDrag);
  viewport.addEventListener('wheel',e=>{e.preventDefault();const r=viewport.getBoundingClientRect();zoom(Math.exp(-e.deltaY*.0015),e.clientX-r.left,e.clientY-r.top);},{passive:false});
  for(const button of architecture.querySelectorAll('[data-arch-action]')){
    if(button.dataset.archAction==='fullscreen'&&!document.fullscreenEnabled)button.hidden=true;
    button.addEventListener('click',async()=>{const action=button.dataset.archAction;
      if(action==='expand'){layers.forEach(l=>{opened.add(l.id);l.groups.forEach(g=>opened.add(g.id));});render();fit();}
      if(action==='collapse'){opened.clear();if(!mobile())layers.forEach(l=>opened.add(l.id));selected='root';selection.textContent='三层架构总览';render();fit();}
      if(action==='fit')fit();if(action==='zoom-in')zoom(1.2);if(action==='zoom-out')zoom(1/1.2);
      if(action==='fullscreen'){try{if(document.fullscreenElement===architecture)await document.exitFullscreen();else await architecture.requestFullscreen();}catch{button.hidden=true;}}
    });
  }
  document.addEventListener('fullscreenchange',()=>{const button=architecture.querySelector('[data-arch-action="fullscreen"]');button.textContent=document.fullscreenElement===architecture?'退出全屏':'全屏查看';button.setAttribute('aria-pressed',String(document.fullscreenElement===architecture));});
  new ResizeObserver(()=>{render();fit();}).observe(viewport);
  render();fit();
}
