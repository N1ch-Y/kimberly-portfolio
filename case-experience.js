/* Original local implementation inspired by React Bits Lanyard and Card Swap.
   Spring-driven badge and rope; native WAAPI card stack; no external runtime. */
window.CaseExperience=(()=>{
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const mod=(n,m)=>(n%m+m)%m, reduced=matchMedia('(prefers-reduced-motion:reduce)');let cleanups=[];
 function gate(p){const art=p.entryArt||{src:p.cover,alt:p.coverAlt};return `<section class="case-gate wrap" data-case-gate style="--accent:${esc(p.accent)};--surface:${esc(p.surface)}"><a class="back-link" href="#work">← 返回作品</a><div class="gate-layout"><div class="gate-copy"><span class="small-label">${esc(p.kind)} / ${esc(p.en)}</span><h1 tabindex="-1">${esc(p.name)}</h1><p>${esc(p.description)}</p><div class="gate-instruction"><span aria-hidden="true">↓</span><div>向下拉动吊牌，展开作品。<small>也可以点击下方按钮直接进入</small></div></div><button class="gate-enter" data-enter-case>直接查看 ${p.detailImages.length} 张作品 ↗</button></div><div class="lanyard-stage" data-lanyard><svg class="lanyard-rope" aria-hidden="true" viewBox="0 0 600 620" preserveAspectRatio="none"><path class="rope-shadow"/><path class="rope-main"/><path class="rope-stitch"/></svg><span class="lanyard-anchor" aria-hidden="true"></span><button class="lanyard-badge badge-${esc(p.id)}" data-badge aria-label="下拉展开${esc(p.name)}，或按 Enter 进入"><span class="badge-clip" aria-hidden="true"></span><span class="badge-face">${art.viewBox?`<svg role="img" aria-label="${esc(art.alt)}" viewBox="${esc(art.viewBox)}"><image href="${esc(art.src)}" width="${art.width}" height="${art.height}"/></svg>`:`<img src="${esc(art.src)}" alt="${esc(art.alt||p.name)}" draggable="false">`}<span class="badge-caption">${esc(p.entryCaption||(p.id==='culture'?'CULTURE / VISUAL STORIES':p.id==='cafeshare'?'CAFESHARE / BRAND DESIGN':'ÉCLAT / BRAND DESIGN'))}</span></span></button><div class="lanyard-label" data-pull-label aria-live="polite">PULL TO EXPLORE ↓</div></div></div></section>`;}
 function markup(p){return `<section class="swap-gallery" data-swap="${esc(p.id)}" aria-label="${esc(p.name)}，${p.detailImages.length} 张作品"><div class="gallery-head"><h2>作品与应用</h2><span>CARD SWAP / ${p.detailImages.length} WORKS</span></div><div class="swap-stage" tabindex="0" role="region" aria-label="卡片轮换画廊，使用左右方向键翻页"><div class="swap-deck"></div></div><div class="swap-toolbar"><div class="swap-nav"><button data-swap-prev aria-label="上一张作品">←</button><label><span class="sr-only">作品编号</span><input data-swap-index type="number" min="1" max="${p.detailImages.length}" value="1" aria-label="作品编号"> / ${p.detailImages.length}</label><button data-swap-next aria-label="下一张作品">→</button></div><div class="swap-actions"><button data-swap-pause aria-pressed="false">暂停轮换</button><button data-swap-open>放大当前作品 ↗</button><button data-swap-all aria-expanded="false">全部作品</button></div></div><p class="swap-caption" role="status" aria-live="polite"></p><div class="swap-overview" hidden>${p.detailImages.map((im,i)=>`<button data-swap-image="${i}" aria-label="打开第 ${i+1} 张：${esc(im.caption||p.name)}"><img src="${esc(im.thumb||im.src)}" alt="${esc(im.alt||p.name)}" width="${im.width}" height="${im.height}" loading="lazy"><span>${String(i+1).padStart(2,'0')} / ${esc(im.caption||'')}</span></button>`).join('')}</div></section>`;}
 function dispose(){cleanups.forEach(f=>f());cleanups=[];}
 function init(p,openImage){
  dispose();const gateRoot=document.querySelector('[data-case-gate]'),body=document.querySelector('[data-case-body]'),root=document.querySelector('[data-swap]');if(!root)return;
  let disposed=false,entered=false,index=0,paused=reduced.matches,hover=false,focused=false,visible=false,busy=false,timer=0,animations=[];
  const deck=root.querySelector('.swap-deck'),stage=root.querySelector('.swap-stage'),count=Math.min(4,p.detailImages.length),n=p.detailImages.length,slots=[];
  const on=(el,event,fn,options)=>{el.addEventListener(event,fn,options);cleanups.push(()=>el.removeEventListener(event,fn,options));};
  const transform=(i)=>{const small=innerWidth<700;return `translate(-50%,-50%) translate3d(${i*(small?20:43)}px,${-i*(small?23:38)}px,${-i*70}px) skewY(-${reduced.matches?0:4}deg)`;};
  const set=(slot,i)=>{slot.logical=mod(index+i,n);const im=p.detailImages[slot.logical];slot.button.dataset.swapArtwork=slot.logical;slot.image.src=im.src;slot.image.alt=im.alt||p.name;slot.button.setAttribute('aria-label',`放大第 ${slot.logical+1} 张：${im.caption||p.name}`);slot.button.style.zIndex=count-i;slot.button.style.transform=transform(i);slot.button.tabIndex=i===0?0:-1;slot.button.querySelector('span').textContent=String(slot.logical+1).padStart(2,'0');};
  for(let i=0;i<count;i++){const b=document.createElement('button');b.className='swap-card';b.type='button';b.innerHTML='<img draggable="false" alt=""><span></span>';deck.append(b);slots.push({button:b,image:b.querySelector('img'),logical:i});on(b,'click',()=>{if(!busy)openImage(p,Number(b.dataset.swapArtwork));});}
  const ui=()=>{root.dataset.current=index;root.querySelector('[data-swap-index]').value=index+1;root.querySelector('.swap-caption').textContent=p.detailImages[index].caption||`${p.name} · ${index+1}`;};
  const paint=()=>{slots.forEach(set);ui();};
  function schedule(){clearTimeout(timer);if(entered&&!paused&&!reduced.matches&&!disposed)timer=setTimeout(()=>{if(visible&&!hover&&!focused&&!document.hidden&&!document.querySelector('dialog[open]'))swap(1);else schedule();},4300);}
  const swap=async(direction)=>{
   if(busy||disposed)return;busy=true;clearTimeout(timer);
   if(reduced.matches){index=mod(index+direction,n);paint();busy=false;schedule();return;}
   const front=slots[0].button;
   const drop=front.animate([{transform:transform(0),opacity:1},{transform:'translate(-50%,-50%) translate3d(-25px,440px,40px) rotate(-9deg)',opacity:0}],{duration:440,easing:'cubic-bezier(.5,0,.8,.4)',fill:'forwards'});animations.push(drop);
   await drop.finished.catch(()=>{});if(disposed)return;
   index=mod(index+direction,n);drop.cancel();paint();
   animations=slots.map((slot,i)=>slot.button.animate([{transform:transform(i+1),opacity:i===count-1?0:1},{transform:transform(i),opacity:1}],{duration:650,delay:i*30,easing:'cubic-bezier(.2,.85,.2,1)',fill:'both'}));
   await Promise.all(animations.map(a=>a.finished.catch(()=>{})));animations.forEach(a=>a.cancel());animations=[];if(disposed)return;busy=false;schedule();
  };
  function enter(){if(entered)return;entered=true;gateRoot.hidden=true;body.hidden=false;paint();root.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});stage.focus({preventScroll:true});focused=false;schedule();}
  on(root.querySelector('[data-swap-prev]'),'click',()=>swap(-1));on(root.querySelector('[data-swap-next]'),'click',()=>swap(1));on(root.querySelector('[data-swap-open]'),'click',()=>openImage(p,index));
  on(root.querySelector('[data-swap-index]'),'change',e=>{if(busy)return;index=clamp(Math.round(Number(e.target.value)||1),1,n)-1;paint();schedule();});
  const pause=root.querySelector('[data-swap-pause]');const pauseUI=()=>{pause.textContent=reduced.matches?'静态模式':paused?'继续轮换':'暂停轮换';pause.disabled=reduced.matches;pause.setAttribute('aria-pressed',String(paused));};
  on(pause,'click',()=>{paused=!paused;pauseUI();schedule();});on(reduced,'change',()=>{paused=reduced.matches||paused;pauseUI();if(!busy)paint();schedule();});
  on(stage,'keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();swap(e.key==='ArrowLeft'?-1:1);}});on(root,'pointerenter',()=>hover=true);on(root,'pointerleave',()=>hover=false);on(root,'focusin',()=>focused=true);on(root,'focusout',e=>focused=root.contains(e.relatedTarget));
  on(root.querySelector('[data-swap-all]'),'click',e=>{const grid=root.querySelector('.swap-overview');grid.hidden=!grid.hidden;e.target.setAttribute('aria-expanded',!grid.hidden);e.target.textContent=grid.hidden?'全部作品':'收起总览';});
  on(root.querySelector('.swap-overview'),'click',e=>{const b=e.target.closest('[data-swap-image]');if(b)openImage(p,Number(b.dataset.swapImage));});
  const observer=new IntersectionObserver(e=>{visible=e[0].isIntersecting;});observer.observe(root);on(window,'resize',()=>{if(!busy)paint();});paint();pauseUI();
  mountGate(gateRoot,enter);
  cleanups.push(()=>{disposed=true;clearTimeout(timer);animations.forEach(a=>a.cancel());observer.disconnect();});
 }
 function initEntry(){
  dispose();const gateRoot=document.querySelector('[data-case-gate]'),body=document.querySelector('[data-case-body]');
  if(!gateRoot||!body)return;
  mountGate(gateRoot,()=>{gateRoot.hidden=true;body.hidden=false;const exhibition=body.querySelector('.interactive-exhibition');exhibition.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});const heading=exhibition.querySelector('h2');heading.tabIndex=-1;heading.focus({preventScroll:true});});
 }
 function mountGate(gateRoot,onEnter){
  let disposed=false,entered=false;
  const on=(el,event,fn,options)=>{el.addEventListener(event,fn,options);cleanups.push(()=>el.removeEventListener(event,fn,options));};
  const enter=()=>{if(entered)return;entered=true;onEnter();};
  const lanyard=gateRoot.querySelector('[data-lanyard]'),badge=gateRoot.querySelector('[data-badge]'),paths=[...lanyard.querySelectorAll('path')],label=gateRoot.querySelector('[data-pull-label]');
  let frame=0,last=0,x=0,y=0,vx=0,vy=0,angle=-.08,omega=0,drag=false,dx=0,dy=0,startX=0,startY=0,view=true;
  const draw=()=>{const w=lanyard.clientWidth,h=lanyard.clientHeight;const anchorX=w*.5,endX=w*.5+x,endY=145+y;badge.style.transform=`translateX(-50%) translate3d(${x}px,${y}px,0) rotate(${angle*180/Math.PI}deg) rotateY(${clamp(x/7,-18,18)}deg)`;const a=anchorX/w*600,b=endX/w*600,t=endY/h*620;const d=`M ${a} 0 C ${a} ${t*.3}, ${b-x*.8} ${t*.75}, ${b} ${t}`;paths.forEach(p=>p.setAttribute('d',d));label.textContent=drag?(y>72?'松手，展开作品 ↓':'再向下拉一点 ↓'):'PULL TO EXPLORE ↓';};
  const tick=now=>{frame=0;if(disposed||entered||document.hidden||!view)return;const dt=Math.min(.025,(now-(last||now))/1000)||.016;last=now;
   if(drag){x=dx;y=dy;angle=clamp(x/450,-.4,.4);vx=vy=0;}else{vx+=(-x*38-vx*10)*dt;vy+=(-y*48-vy*11)*dt;x+=vx*dt;y+=vy*dt;omega+=(-angle*24-omega*4)*dt;angle+=omega*dt;}
   draw();if(drag||Math.abs(x)+Math.abs(y)+Math.abs(vx)+Math.abs(vy)+Math.abs(angle)+Math.abs(omega)>.005)frame=requestAnimationFrame(tick);
  };
  const wake=()=>{if(!frame&&!disposed&&!entered&&!document.hidden){last=performance.now();frame=requestAnimationFrame(tick);}};
  on(badge,'pointerdown',e=>{if(e.button!==0)return;drag=true;startX=e.clientX-x;startY=e.clientY-y;dx=x;dy=y;badge.setPointerCapture(e.pointerId);badge.classList.add('dragging');wake();});
  on(badge,'pointermove',e=>{if(!drag)return;dx=clamp(e.clientX-startX,-130,130);dy=clamp(e.clientY-startY,-35,150);if(reduced.matches){x=dx;y=dy;draw();}else wake();});
  const release=e=>{if(!drag)return;drag=false;badge.classList.remove('dragging');if(badge.hasPointerCapture(e.pointerId))badge.releasePointerCapture(e.pointerId);if(dy>72&&e.type!=='pointercancel')enter();else{omega=dx/120;wake();}};
  on(badge,'pointerup',release);on(badge,'pointercancel',release);on(badge,'keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();enter();}});on(gateRoot.querySelector('[data-enter-case]'),'click',enter);
  const gateObserver=new IntersectionObserver(e=>{view=e[0].isIntersecting;if(view)wake();});gateObserver.observe(lanyard);on(window,'resize',draw);on(document,'visibilitychange',()=>{if(!document.hidden)wake();});draw();if(!reduced.matches)wake();
  cleanups.push(()=>{disposed=true;cancelAnimationFrame(frame);gateObserver.disconnect();});
 }
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));return {gate,markup,init,initEntry,dispose};
})();
