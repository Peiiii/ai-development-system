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

const workflowAtlas = await fetch('/workflow-atlas.json').then(response=>{if(!response.ok)throw new Error('工作流数据加载失败');return response.json();});
const architecture = document.querySelector('#architecture-tree');
if (architecture) {
  const viewport = architecture.querySelector('.atlas-viewport');
  const scene = architecture.querySelector('.atlas-scene');
  const scaleOutput = architecture.querySelector('#atlas-scale');
  const selection = architecture.querySelector('#atlas-selection');
  const mobile = () => window.innerWidth < 600;
  const layers = [
    { id:'flow', title:'工作流层', subtitle:'组织工程过程', color:'#c6ed81', groups:[
      { id:'basic', title:'基础工作流', subtitle:'覆盖工程迭代周期常规场景', children:['initialization','standard','trivial','bugfix'].map(id=>workflowAtlas[id]) },
      { ...workflowAtlas['major-delivery'], id:'major', title:'大型交付', subtitle:'外层组合流程（试用）· 7 个步骤' },
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
  function normalize(node,color,depth=0,parent){
    const children=(node.children||node.groups||node.leaves||[]).map((child,index)=>normalize(typeof child==='string'?{id:`${node.id}-${index}`,title:child}:child,node.color||color,depth+1,node.id));
    return {...node,color:node.color||color,parent,depth,children,type:depth===0?'root':depth===1?'layer':children.length?'group':'leaf',expandable:depth>0&&children.length>0};
  }
  const tree=normalize({id:'root',title:'AI 驱动开发体系',subtitle:'完整交付 · 多类型、多层级工作流',children:layers},'#c6ed81');
  function allBranches(node=tree){return [node,...node.children.flatMap(child=>allBranches(child))].filter(item=>item.expandable);}
  const opened = new Set(mobile() ? [] : layers.map(x=>x.id));
  let nodes=[], edges=[], bounds={width:1200,height:740}, selected='root';
  let camera={x:0,y:0,scale:1};
  const escape = value => String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const lines = (value, count=19) => { const chars=Array.from(value); const rows=[]; while(chars.length) rows.push(chars.splice(0,count).join('')); return rows; };
  function layout() {
    nodes=[];edges=[];
    const heightOf=node=>node.type==='root'?100:node.type==='layer'?94:node.type==='leaf'?lines(node.title).length*20+26:Math.max(84,lines(node.title,18).length*20+(node.subtitle?56:34));
    const childrenOf=node=>node===tree||opened.has(node.id)?node.children:[];
    const spanOf=node=>Math.max(heightOf(node),childrenOf(node).reduce((total,child)=>total+spanOf(child)+22,-22));
    function place(model,top){
      const span=spanOf(model),h=heightOf(model);
      const node={...model,x:model.depth?410+(model.depth-1)*400:24,y:top+(span-h)/2,w:model.type==='root'?316:model.type==='layer'?340:model.type==='leaf'?296:322,h};
      if(model.type==='layer')node.tag=`0${layers.findIndex(layer=>layer.id===model.id)+1} / ${model.id==='flow'?'WORKFLOWS':model.id==='method'?'METHODS':'MATERIALS'}`;
      nodes.push(node);const children=childrenOf(model);let childY=top+(span-children.reduce((total,child)=>total+spanOf(child)+22,-22))/2;
      for(const child of children){const target=place(child,childY);edges.push({from:node,to:target,color:target.color});childY+=spanOf(child)+22;}
      return node;
    }
    place(tree,24);bounds={width:Math.max(...nodes.map(node=>node.x+node.w))+24,height:spanOf(tree)+48};
  }
  function render() {
    layout();
    const paths=edges.map(({from,to,color})=>{
      const startX=from.x+from.w,startY=from.y+from.h/2;
      const endX=to.x,endY=to.y+to.h/2,midX=(startX+endX)/2;
      return `<path class="atlas-edge" style="stroke:${color}" d="M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}"/>`;
    }).join('');
    scene.innerHTML=paths+nodes.map(node=>{
      const titleRows=lines(node.title,node.type==='leaf'?19:18);
      const ty=node.type==='leaf'?(node.h-titleRows.length*20)/2+15:node.tag?46:32;
      return `<g class="atlas-node is-${node.type}${selected===node.id?' is-selected':''}" data-node="${node.id}" transform="translate(${node.x} ${node.y})" style="--node-color:${node.color}" role="button" tabindex="0" aria-label="${escape(node.title)}${node.expandable?'，点击展开或收起':''}" ${node.expandable?`aria-expanded="${opened.has(node.id)}"`:''}><rect width="${node.w}" height="${node.h}" rx="10"/>${node.tag?`<text class="node-tag" x="18" y="22">${node.tag}</text>`:''}<text class="node-title" x="18" y="${ty}">${titleRows.map((row,i)=>`<tspan x="18" dy="${i?20:0}">${escape(row)}</tspan>`).join('')}</text>${node.subtitle?`<text class="node-subtitle" x="18" y="${node.tag?72:node.type==='root'?76:32+(titleRows.length-1)*20+26}">${escape(node.subtitle)}</text>`:''}${node.expandable?`<text class="node-toggle" x="${node.w-30}" y="${node.tag?48:32}">${opened.has(node.id)?'−':'+'}</text>`:''}<circle class="atlas-port" cx="${node.w}" cy="${node.h/2}" r="3"/></g>`;
    }).join('');
    applyCamera();
  }
  function applyCamera(){scene.setAttribute('transform',`translate(${camera.x} ${camera.y}) scale(${camera.scale})`);scaleOutput.value=`${Math.round(camera.scale*100)}%`;}
  function fit(){if(mobile()){focusNode(nodes.find(node=>node.id==='root'));return;}const w=viewport.clientWidth,h=viewport.clientHeight;camera.scale=Math.min(1.05,(w-36)/bounds.width,(h-36)/bounds.height);camera.x=(w-bounds.width*camera.scale)/2;camera.y=(h-bounds.height*camera.scale)/2;applyCamera();}
  function zoom(factor,px=viewport.clientWidth/2,py=viewport.clientHeight/2){const old=camera.scale;camera.scale=Math.min(2,Math.max(.15,old*factor));camera.x=px-(px-camera.x)*camera.scale/old;camera.y=py-(py-camera.y)*camera.scale/old;applyCamera();}
  function focusNode(node){
    const children=nodes.filter(n=>n.parent===node.id);
    // On small screens, bring the newly revealed column into view at readable size.
    const visible=mobile()&&children.length?children:[node,...children];
    const left=Math.min(...visible.map(n=>n.x)),top=Math.min(...visible.map(n=>n.y));
    const width=Math.max(...visible.map(n=>n.x+n.w))-left,height=Math.max(...visible.map(n=>n.y+n.h))-top;
    camera.scale=Math.min(1.1,(viewport.clientWidth-48)/width,(viewport.clientHeight-64)/height);
    camera.x=(viewport.clientWidth-width*camera.scale)/2-left*camera.scale;
    camera.y=(viewport.clientHeight-height*camera.scale)/2-top*camera.scale;applyCamera();
  }
  let motion=0;
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  function stopMotion(){cancelAnimationFrame(motion);motion=0;}
  function transition(update){
    stopMotion();
    const beforeCamera={...camera};
    const before=new Map([...scene.querySelectorAll('[data-node]')].map(element=>{
      const matrix=element.transform.baseVal[0].matrix;
      return [element.dataset.node,{x:matrix.e,y:matrix.f,opacity:Number(element.style.opacity||1)}];
    }));
    update();
    if(reducedMotion.matches)return;
    const targetCamera={...camera};
    const elements=new Map([...scene.querySelectorAll('[data-node]')].map(element=>[element.dataset.node,element]));
    const paths=[...scene.querySelectorAll('.atlas-edge')];
    const starts=new Map(nodes.map(node=>[node.id,before.get(node.id)||{x:node.x-36,y:node.y,opacity:0}]));
    const started=performance.now();
    function frame(now){
      const progress=Math.min(1,(now-started)/360),ease=1-Math.pow(1-progress,3);
      const positions=new Map();
      for(const node of nodes){
        const start=starts.get(node.id),x=start.x+(node.x-start.x)*ease,y=start.y+(node.y-start.y)*ease;
        const opacity=start.opacity+(1-start.opacity)*ease;
        const element=elements.get(node.id);element.setAttribute('transform',`translate(${x} ${y})`);element.style.opacity=opacity;
        positions.set(node.id,{x,y,opacity});
      }
      edges.forEach(({from,to},index)=>{
        const a=positions.get(from.id),b=positions.get(to.id);
        const x=a.x+from.w,y=a.y+from.h/2,endX=b.x,endY=b.y+to.h/2,mid=(x+endX)/2;
        paths[index].setAttribute('d',`M ${x} ${y} C ${mid} ${y}, ${mid} ${endY}, ${endX} ${endY}`);
        paths[index].style.opacity=.65*Math.min(a.opacity,b.opacity);
      });
      camera={x:beforeCamera.x+(targetCamera.x-beforeCamera.x)*ease,y:beforeCamera.y+(targetCamera.y-beforeCamera.y)*ease,scale:beforeCamera.scale+(targetCamera.scale-beforeCamera.scale)*ease};
      applyCamera();motion=progress<1?requestAnimationFrame(frame):0;
    }
    frame(started);
  }
  function activate(id){
    const node=nodes.find(n=>n.id===id);if(!node)return;
    const element=scene.querySelector(`[data-node="${id}"]`),position=element.transform.baseVal[0].matrix;
    const anchor={x:position.e*camera.scale+camera.x,y:position.f*camera.scale+camera.y};
    selected=id;selection.textContent=id==='root'?'三层架构总览':node.title;
    transition(()=>{
      if(node.expandable){
        if(opened.has(id))opened.delete(id);else opened.add(id);
        render();const updated=nodes.find(n=>n.id===id);
        if(mobile())focusNode(updated);
        else {camera.x=anchor.x-updated.x*camera.scale;camera.y=anchor.y-updated.y*camera.scale;applyCamera();}
      }else if(id==='root'){render();fit();}else{render();}
    });
    architecture.querySelector(`[data-node="${id}"]`)?.focus({preventScroll:true});
  }
  scene.addEventListener('click',e=>{const node=e.target.closest('[data-node]');if(node)activate(node.dataset.node);});
  scene.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const node=e.target.closest('[data-node]');if(node){e.preventDefault();activate(node.dataset.node);}}});
  let drag=null;
  viewport.addEventListener('pointerdown',e=>{if(e.target.closest('[data-node],button'))return;stopMotion();drag={id:e.pointerId,x:e.clientX,y:e.clientY,cx:camera.x,cy:camera.y};viewport.setPointerCapture(e.pointerId);viewport.classList.add('is-dragging');});
  viewport.addEventListener('pointermove',e=>{if(drag&&drag.id===e.pointerId){camera.x=drag.cx+e.clientX-drag.x;camera.y=drag.cy+e.clientY-drag.y;applyCamera();}});
  const endDrag=()=>{drag=null;viewport.classList.remove('is-dragging');};viewport.addEventListener('pointerup',endDrag);viewport.addEventListener('pointercancel',endDrag);
  viewport.addEventListener('wheel',e=>{e.preventDefault();stopMotion();const r=viewport.getBoundingClientRect();zoom(Math.exp(-e.deltaY*.0015),e.clientX-r.left,e.clientY-r.top);},{passive:false});
  for(const button of architecture.querySelectorAll('[data-arch-action]')){
    if(button.dataset.archAction==='fullscreen'&&!document.fullscreenEnabled)button.hidden=true;
    button.addEventListener('click',async()=>{const action=button.dataset.archAction;
      if(action==='expand')transition(()=>{allBranches().forEach(node=>opened.add(node.id));render();fit();});
      if(action==='collapse')transition(()=>{opened.clear();if(!mobile())layers.forEach(l=>opened.add(l.id));selected='root';selection.textContent='三层架构总览';render();fit();});
      if(action==='focus')transition(()=>focusNode(nodes.find(node=>node.id===selected)||nodes[0]));if(action==='fit')transition(fit);if(action==='zoom-in')transition(()=>zoom(1.2));if(action==='zoom-out')transition(()=>zoom(1/1.2));
      if(action==='fullscreen'){try{if(document.fullscreenElement===architecture)await document.exitFullscreen();else await architecture.requestFullscreen();}catch{button.hidden=true;}}
    });
  }
  document.addEventListener('fullscreenchange',()=>{const button=architecture.querySelector('[data-arch-action="fullscreen"]');button.textContent=document.fullscreenElement===architecture?'退出全屏':'全屏查看';button.setAttribute('aria-pressed',String(document.fullscreenElement===architecture));});
  new ResizeObserver(()=>{stopMotion();render();fit();}).observe(viewport);
  render();fit();
}
