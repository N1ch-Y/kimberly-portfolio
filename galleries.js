/* Original implementation inspired by the public 3D Tilt Wheel / Depth Wave demos.
   No tutorial/member source is used. Every source entry remains addressable. */
window.Galleries = (() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const mod=(n,m)=>((n%m)+m)%m;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let motionHandlers=[];
  reduced.addEventListener('change',()=>motionHandlers.forEach(fn=>fn()));
  let disposers=[];
  function markup(project,placement='home') {
    const wheel=project.galleryEffect==='wheel', n=project.detailImages.length;
    const id=`${placement}-${project.id}`;
    return `<section class="motion-gallery ${wheel?'tilt-wheel':'depth-wave'}" data-gallery="${project.id}" data-placement="${placement}" aria-label="${esc(project.fullName)}，全部 ${n} 张作品">
      <div class="gallery-topline"><span>${wheel?'VISUALS IN ORBIT':'CULTURE IN MOTION'}</span><span>${n} 张作品 · ${wheel?'环形展览':'波浪画廊'}</span></div>
      <div class="gallery-stage" role="region" tabindex="0" aria-label="${wheel?'环形画廊，可左右拖动或使用方向键':'波浪画廊，可左右拖动或使用方向键'}" aria-describedby="${id}-hint"><div class="gallery-space"></div></div>
      <div class="gallery-toolbar"><div class="gallery-nav"><button type="button" data-prev aria-label="上一张作品">←</button><label class="gallery-position"><span class="sr-only">作品编号</span><input data-index type="number" min="1" max="${n}" value="1" inputmode="numeric" aria-label="作品编号"><span>/ ${n}</span></label><button type="button" data-next aria-label="下一张作品">→</button></div><div class="gallery-actions">${wheel?'<button type="button" data-pause aria-pressed="false">暂停旋转</button>':''}<button type="button" data-open>放大当前作品 ↗</button><button type="button" data-grid aria-expanded="false">全部作品</button></div></div>
      <div class="gallery-bottomline"><p id="${id}-hint">${wheel?'移动鼠标轻轻倾斜 · 左右拖动旋转 · 滚动时展开':'左右拖动画面 · 松手自动停靠 · 点击作品放大'}</p><p class="gallery-caption" data-caption></p></div>
      <div class="gallery-overview" hidden><div class="overview-images"></div><button type="button" class="load-more" data-more>继续展开</button></div>
      <span class="sr-only" role="status" aria-live="polite" data-gallery-status></span>
    </section>`;
  }
  function dispose(){disposers.forEach(fn=>fn());disposers=[];motionHandlers=[];}
  function init(openImage){
    dispose();
    document.querySelectorAll('[data-gallery]').forEach(root=>{
      const p=PORTFOLIO.projects.find(p=>p.id===root.dataset.gallery), imgs=p.detailImages, n=imgs.length;
      const wheel=p.galleryEffect==='wheel';
      const stage=root.querySelector('.gallery-stage'),space=root.querySelector('.gallery-space');
      const number=root.querySelector('[data-index]');
      let position=0,target=0,selected=-1,paused=reduced.matches,visible=false,focused=false,hovered=false,dragging=false;
      let width=stage.clientWidth,height=stage.clientHeight,pointX=0,pointY=0,tiltX=0,tiltY=0;
      let previousTime=performance.now(),frame=0,disposed=false,scrollY=window.scrollY,spread=0;
      let startX=0,startY=0,startPosition=0,lastX=0,lastTime=0,velocity=0,moved=false,dragAxis=null;
      const slots=[];
      // Recycle only the back of the ring: every source stays reachable,
      // while 359 artworks never become 359 overlapping animated DOM nodes.
      const slotCount=wheel?Math.min(n,18):Math.min(n,13);
      for(let i=0;i<slotCount;i++){
        const button=document.createElement('button');button.type='button';button.className='gallery-tile';button.tabIndex=-1;
        button.innerHTML='<img alt="" draggable="false"><span class="tile-number" aria-hidden="true"></span>';
        space.append(button);slots.push({button,image:button.querySelector('img'),index:-1});
      }
      const bind=(slot,index)=>{
        if(slot.index===index)return;
        slot.index=index;slot.button.dataset.artwork=String(index);
        slot.image.src=imgs[index].thumb||imgs[index].src;
        slot.image.alt=imgs[index].alt||`${p.fullName} ${index+1}`;
        slot.button.setAttribute('aria-label',`放大作品 ${index+1}：${imgs[index].caption||p.fullName}`);
        slot.button.querySelector('.tile-number').textContent=String(index+1).padStart(3,'0');
      };
      const announce=()=>{root.querySelector('[data-gallery-status]').textContent=`第 ${selected+1} 张，共 ${n} 张。${imgs[selected].caption||''}`;};
      const updateUI=()=>{
        const current=mod(Math.round(position),n);
        if(current===selected)return;
        selected=current;root.dataset.current=String(current);
        if(document.activeElement!==number)number.value=String(current+1);
        root.querySelector('[data-caption]').textContent=imgs[current].caption||`作品 ${current+1}`;
        slots.forEach(slot=>{slot.button.tabIndex=slot.index===current?0:-1;slot.button.setAttribute('aria-current',String(slot.index===current));});
      };
      const paint=()=>{
        const compact=width<600;
        if(wheel){
          const radius=Math.min(width*.36,430)*(1+spread*.25);
          const tileW=compact?72:Math.max(110,Math.min(155,width*.12));
          const tileH=tileW*1.35;
          space.style.transform=reduced.matches?'none':`rotateX(${-13+tiltY*13}deg) rotateY(${tiltX*13}deg)`;
          const base=Math.round(position);
          slots.forEach((slot,i)=>{
            const logical=base+i-Math.floor(slotCount/2);
            bind(slot,mod(logical,n));
            const angle=(logical-position)/slotCount*Math.PI*2;
            const z=Math.cos(angle)*radius;
            slot.button.style.width=tileW+'px';slot.button.style.height=tileH+'px';
            slot.button.style.transform=`translate(-50%,-50%) translate3d(${Math.sin(angle)*radius}px,${Math.cos(angle)*radius*.08}px,${z}px)`;
            slot.button.style.zIndex=String(Math.round(z+1000));
          });
        }else{
          const tileW=Math.min(310,width*.4),tileH=Math.min(height*.78,tileW*1.414),spacing=tileW*1.15;
          const base=Math.round(position);
          slots.forEach((slot,j)=>{
            const logical=base+j-Math.floor(slotCount/2),index=mod(logical,n),offset=logical-position;
            bind(slot,index);
            // Cosine depth produces a broad near crest and receding side troughs.
            const z=reduced.matches?0:Math.cos(offset*.95)*900-900;
            const y=reduced.matches?0:Math.sin(offset*.7)*24;
            slot.button.style.width=tileW+'px';slot.button.style.height=tileH+'px';
            slot.button.style.transform=`translate(-50%,-50%) translate3d(${offset*spacing}px,${y}px,${z}px)`;
            slot.button.style.zIndex=String(Math.round(z+1000));
          });
        }
        updateUI();
      };
      let lastReduced=reduced.matches;
      const tick=now=>{
        if(disposed)return;
        if(lastReduced!==reduced.matches){lastReduced=reduced.matches;if(lastReduced){paused=true;pointX=pointY=tiltX=tiltY=0;position=target=Math.round(target);}updatePause();}
        const dt=Math.min(40,now-previousTime);previousTime=now;
        if(visible&&!document.hidden&&!document.querySelector('dialog[open]')){
          if(wheel&&!paused&&!reduced.matches&&!hovered&&!focused&&!dragging){target+=dt*.00018;}
          position=reduced.matches?target:position+(target-position)*(1-Math.exp(-dt/100));
          tiltX+=(pointX-tiltX)*.09;tiltY+=(pointY-tiltY)*.09;spread*=.965;
          if(Math.abs(position-target)<.0001)position=target;
          paint();
        }
        if(visible&&!document.hidden)frame=requestAnimationFrame(tick);else frame=0;
      };
      const wake=()=>{if(!frame&&!disposed&&visible&&!document.hidden){previousTime=performance.now();frame=requestAnimationFrame(tick);}};
      const setTarget=(value,say=true)=>{
        target=value;
        if(reduced.matches)position=target;
        if(!visible){position=target;paint();}else wake();
        if(say)setTimeout(()=>{if(!disposed)announce();},300);
      };
      const jump=index=>{
        const current=mod(Math.round(target),n);
        let difference=index-current;
        if(difference>n/2)difference-=n;if(difference<-n/2)difference+=n;
        setTarget(Math.round(target)+difference);
      };
      const on=(el,type,fn,options)=>{el.addEventListener(type,fn,options);disposers.push(()=>el.removeEventListener(type,fn,options));};
      on(root.querySelector('[data-prev]'),'click',()=>setTarget(Math.round(target)-1));
      on(root.querySelector('[data-next]'),'click',()=>setTarget(Math.round(target)+1));
      on(number,'change',()=>{const value=Math.round(Number(number.value));const safe=Number.isFinite(value)?Math.max(1,Math.min(n,value)):1;number.value=safe;jump(safe-1);});
      on(root.querySelector('[data-open]'),'click',()=>openImage(p,selected));
      const pause=root.querySelector('[data-pause]');
      const updatePause=()=>{if(pause){pause.textContent=reduced.matches?'静态模式':paused?'继续旋转':'暂停旋转';pause.disabled=reduced.matches;pause.setAttribute('aria-pressed',String(paused));}};
      if(pause)on(pause,'click',()=>{paused=!paused;if(!paused)focused=false;updatePause();});
      on(stage,'keydown',e=>{
        if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();setTarget(Math.round(target)+(e.key==='ArrowRight'?1:-1));}
        if(e.key==='Home'||e.key==='End'){e.preventDefault();jump(e.key==='Home'?0:n-1);}
        if((e.key==='Enter'||e.key===' ')&&e.target===stage){e.preventDefault();openImage(p,selected);}
      });
      on(root,'focusin',()=>{focused=true;});
      on(root,'focusout',e=>{if(!root.contains(e.relatedTarget))focused=false;});
      on(stage,'pointerenter',()=>{hovered=true;});
      on(stage,'pointerleave',()=>{hovered=false;pointX=0;pointY=0;});
      on(stage,'pointerdown',e=>{
        if(e.button!==0)return;
        dragging=true;moved=false;dragAxis=null;startX=lastX=e.clientX;startY=e.clientY;startPosition=target;lastTime=performance.now();velocity=0;
        stage.dataset.dragging='true';
      });
      on(stage,'pointermove',e=>{
        const r=stage.getBoundingClientRect();pointX=(e.clientX-r.left)/r.width*2-1;pointY=(e.clientY-r.top)/r.height*2-1;
        if(!dragging)return;
        const dx=e.clientX-startX,dy=e.clientY-startY;
        if(!dragAxis&&Math.hypot(dx,dy)>7){dragAxis=Math.abs(dx)>Math.abs(dy)?'x':'y';if(dragAxis==='x')stage.setPointerCapture(e.pointerId);}
        if(dragAxis==='y')return;
        if(dragAxis==='x'){
          moved=true;const time=performance.now();velocity=(e.clientX-lastX)/Math.max(1,time-lastTime);lastX=e.clientX;lastTime=time;
          target=startPosition-dx/(wheel?45:Math.min(245,width*.3));wake();
        }
      });
      const end=e=>{
        if(!dragging)return;dragging=false;stage.dataset.dragging='false';
        if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);
        if(moved){target=Math.round(target-Math.max(-3,Math.min(3,velocity*1.2)));wake();}
      };
      on(stage,'pointerup',end);on(stage,'pointercancel',end);
      on(window,'pointerup',end);
      on(stage,'click',e=>{if(moved){moved=false;return;}const tile=e.target.closest('[data-artwork]');if(tile)openImage(p,Number(tile.dataset.artwork));});
      // Native vertical scrolling stays available on mouse and touch devices.
      on(stage,'wheel',e=>{
        if(Math.abs(e.deltaX)>Math.abs(e.deltaY)||e.shiftKey){e.preventDefault();target+=(e.deltaX||e.deltaY)/180;wake();}
      },{passive:false});
      on(window,'scroll',()=>{
        const dy=window.scrollY-scrollY;scrollY=window.scrollY;
        if(visible&&wheel&&!reduced.matches&&!paused){spread=Math.min(1,spread+Math.abs(dy)*.004);target+=dy*.003;wake();}
      },{passive:true});
      const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)wake();},{rootMargin:'160px'});observer.observe(stage);
      const resize=new ResizeObserver(()=>{width=stage.clientWidth;height=stage.clientHeight;paint();});resize.observe(stage);
      on(document,'visibilitychange',wake);
      motionHandlers.push(()=>{if(reduced.matches){paused=true;pointX=pointY=tiltX=tiltY=0;position=target=Math.round(target);}updatePause();paint();});
      let overviewCount=0;
      const overview=root.querySelector('.gallery-overview'),grid=root.querySelector('[data-grid]');
      const appendOverview=()=>{
        const portion=imgs.slice(overviewCount,overviewCount+60);
        overview.querySelector('.overview-images').insertAdjacentHTML('beforeend',portion.map((img,j)=>`<button type="button" data-overview-index="${overviewCount+j}" aria-label="查看第 ${overviewCount+j+1} 张作品"><img src="${esc(img.thumb||img.src)}" alt="${esc(img.alt)}" width="${img.width}" height="${img.height}" loading="lazy"><span>${String(overviewCount+j+1).padStart(3,'0')}</span></button>`).join(''));
        overviewCount+=portion.length;
        const more=overview.querySelector('[data-more]');more.hidden=overviewCount===n;more.textContent=`继续展开（${overviewCount} / ${n}） ↓`;
      };
      on(grid,'click',()=>{overview.hidden=!overview.hidden;grid.setAttribute('aria-expanded',String(!overview.hidden));grid.textContent=overview.hidden?'全部作品':'收起总览';if(!overviewCount)appendOverview();});
      on(overview.querySelector('[data-more]'),'click',appendOverview);
      on(overview,'click',e=>{const button=e.target.closest('[data-overview-index]');if(button){const i=Number(button.dataset.overviewIndex);jump(i);openImage(p,i);}});
      paint();updatePause();
      disposers.push(()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();resize.disconnect();});
    });
  }
  return {markup,init,dispose};
})();
