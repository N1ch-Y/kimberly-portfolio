/* Independent implementations of the public Particle Morph / Scroll Portal
   interaction descriptions. No React Bits Pro source or assets are included. */
window.Transitions=(()=>{
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 let disposeCurrent=()=>{};
 function sample(word){
  const c=document.createElement('canvas');c.width=640;c.height=300;const ctx=c.getContext('2d');
  ctx.font='700 230px "Microsoft YaHei", sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(word,320,158,610);
  const pixels=ctx.getImageData(0,0,640,300).data,points=[];
  for(let y=0;y<300;y+=3)for(let x=0;x<640;x+=3)if(pixels[(y*640+x)*4+3]>140)points.push([(x-320)/640,(y-150)/640]);
  return points.length?points:[[0,0]];
 }
 function renderer(canvas,words){
  const starts=sample(words[0]),ends=sample(words[1]),n=matchMedia('(max-width:700px)').matches?2400:7600,arr=new Float32Array(n*7);
  let seed=7481;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<n;i++){const a=starts[Math.floor(random()*starts.length)],b=ends[Math.floor(random()*ends.length)];arr.set([...a,...b,random(),random(),random()],i*7);}
  const gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false});
  if(!gl){const ctx=canvas.getContext('2d');return {resize:(w,h,d)=>{canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0);},draw:o=>{ctx.clearRect(0,0,o.w,o.h);ctx.fillStyle='#5c6267';for(let i=0;i<n;i++){let j=i*7,x=(arr[j]*(1-o.p)+arr[j+2]*o.p)*o.scale+o.from[0]*(1-o.p)+o.to[0]*o.p,y=(arr[j+1]*(1-o.p)+arr[j+3]*o.p)*o.scale+o.from[1]*(1-o.p)+o.to[1]*o.p;ctx.beginPath();ctx.arc(x,y,.9,0,7);ctx.fill();}},destroy:()=>{}};}
  const vertex=`attribute vec2 aStart;attribute vec2 aEnd;attribute vec3 aSeed;uniform vec2 uResolution,uFrom,uTo,uPointer;uniform float uProgress,uTime,uScale,uDpr,uMotion;varying vec3 vColor;varying float vAlpha;
  void main(){float p=smoothstep(0.,1.,uProgress);float flow=sin(p*3.14159265);vec2 pos=mix(aStart,aEnd,p)*uScale+mix(uFrom,uTo,p);float angle=aSeed.x*6.283185+p*3.2;pos+=vec2(cos(angle),sin(angle))*(35.+aSeed.y*130.)*flow;pos+=vec2(sin(uTime*.5+aSeed.x*18.),cos(uTime*.4+aSeed.y*14.))*1.8*uMotion;vec2 delta=pos-uPointer;float d=length(delta);pos+=normalize(delta+vec2(.001))*(1.-smoothstep(0.,110.,d))*20.*uMotion;vec2 clip=pos/uResolution*2.-1.;gl_Position=vec4(clip.x,-clip.y,0.,1.);gl_PointSize=(1.3+aSeed.z*1.25+flow*.4)*uDpr;vColor=mix(vec3(.13,.15,.17),vec3(.50,.55,.59),aSeed.z*.8);vAlpha=.68+aSeed.y*.28;}`;
  const fragment=`precision mediump float;varying vec3 vColor;varying float vAlpha;void main(){float d=length(gl_PointCoord-vec2(.5));float a=1.-smoothstep(.23,.5,d);gl_FragColor=vec4(vColor,a*vAlpha);}`;
  const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment),program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Particle shader link failed');gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,arr,gl.STATIC_DRAW);
  [['aStart',2,0],['aEnd',2,2],['aSeed',3,4]].forEach(([name,size,offset])=>{const loc=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,28,offset*4);});
  const u={};['Resolution','From','To','Pointer','Progress','Time','Scale','Dpr','Motion'].forEach(name=>u[name]=gl.getUniformLocation(program,'u'+name));gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  return {resize:(w,h,d)=>{canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);gl.viewport(0,0,canvas.width,canvas.height);},draw:o=>{gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.uniform2f(u.Resolution,o.w,o.h);gl.uniform2fv(u.From,o.from);gl.uniform2fv(u.To,o.to);gl.uniform2fv(u.Pointer,o.pointer);gl.uniform1f(u.Progress,o.p);gl.uniform1f(u.Time,o.time);gl.uniform1f(u.Scale,o.scale);gl.uniform1f(u.Dpr,o.dpr);gl.uniform1f(u.Motion,reduced.matches?0:1);gl.drawArrays(gl.POINTS,0,n);},destroy:()=>{gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);gl.getExtension('WEBGL_lose_context')?.loseContext();}};
 }
 function init(){
  disposeCurrent();const root=document.querySelector('[data-morph-scene]'),portal=document.querySelector('[data-portal]');if(!root)return;
  const hero=root.querySelector('.hero'),space=root.querySelector('.morph-space'),canvas=root.querySelector('canvas'),frames=[...portal.querySelectorAll('.portal-frame')],sticky=portal.querySelector('.portal-sticky');
  let paint;try{paint=renderer(canvas,PORTFOLIO.morphLabels);}catch(e){canvas.hidden=true;space.classList.add('static-morph');space.dataset.label=PORTFOLIO.morphLabels[0];}
  let raf=0,visible=true,dead=false,progress=0,portalProgress=0,last=0,metrics={},pointer=[-9999,-9999];
  const measure=()=>{const h=hero.getBoundingClientRect(),s=space.getBoundingClientRect(),mobile=innerWidth<=700;metrics={w:h.width,h:h.height,dpr:Math.min(devicePixelRatio||1,2),from:[s.left-h.left+s.width/2,s.top-h.top+s.height/2],to:mobile?[s.left-h.left+s.width/2,s.top-h.top+s.height/2]:[h.width*.5,h.height*.43],scale:s.width*(mobile?1.1:1.28)};paint?.resize(metrics.w,metrics.h,metrics.dpr);wake();};
  const update=now=>{
   raf=0;if(dead||document.hidden)return;const dt=Math.min(60,now-(last||now));last=now;
   const r=root.getBoundingClientRect(),q=portal.getBoundingClientRect(),mobile=innerWidth<=700;
   const target=reduced.matches?0:mobile?clamp(-r.top/Math.max(1,r.height*.65)):clamp(-r.top/Math.max(1,r.height-hero.clientHeight));
   const targetPortal=reduced.matches?0:clamp(-q.top/Math.max(1,q.height-sticky.clientHeight));
   const ease=1-Math.exp(-Math.max(dt,16)/100);progress+=(target-progress)*ease;portalProgress+=(targetPortal-portalProgress)*ease;
   const onScreen=r.bottom>0&&r.top<innerHeight,portalVisible=q.bottom>0&&q.top<innerHeight;
   if(onScreen){paint?.draw({...metrics,p:clamp(progress/.78),pointer,time:now/1000});hero.style.setProperty('--morph-progress',progress.toFixed(4));hero.style.setProperty('--copy-opacity',mobile?1:1-clamp((progress-.1)/.45));hero.style.setProperty('--destination-opacity',mobile?0:clamp((progress-.62)/.2));root.dataset.progress=progress.toFixed(3);}
   if(portalVisible){const camera=portalProgress*1800;frames.forEach((frame,i)=>{const z=camera-i*800;frame.style.transform=`translateZ(${z}px)`;frame.style.opacity=clamp((920-z)/260);});const shade=Math.round(32+213*clamp((portalProgress-.72)/.28));sticky.style.backgroundColor=`rgb(${shade},${shade},${shade})`;sticky.style.setProperty('--portal-ink',portalProgress>.86?'#202020':'#f5f5f4');portal.dataset.progress=portalProgress.toFixed(3);}
   const moving=Math.abs(progress-target)>.0005||Math.abs(portalProgress-targetPortal)>.0005;
   if(!reduced.matches&&((onScreen&&visible)||moving))raf=requestAnimationFrame(update);
  };
  function wake(){if(!raf&&!dead&&!document.hidden)raf=requestAnimationFrame(update);}
  const move=e=>{if(e.pointerType==='touch'||reduced.matches)return;const r=hero.getBoundingClientRect();pointer=[e.clientX-r.left,e.clientY-r.top];wake();};
  const leave=()=>{pointer=[-9999,-9999];};const media=()=>{progress=portalProgress=0;measure();wake();};
  const visibility=()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else wake();};
  const observer=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);if(visible)wake();});observer.observe(root);observer.observe(portal);
  const resize=new ResizeObserver(measure);resize.observe(hero);window.addEventListener('scroll',wake,{passive:true});window.addEventListener('resize',measure);hero.addEventListener('pointermove',move);hero.addEventListener('pointerleave',leave);document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',media);measure();
  disposeCurrent=()=>{dead=true;cancelAnimationFrame(raf);observer.disconnect();resize.disconnect();window.removeEventListener('scroll',wake);window.removeEventListener('resize',measure);hero.removeEventListener('pointermove',move);hero.removeEventListener('pointerleave',leave);document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',media);paint?.destroy();};
 }
 return {init,dispose:()=>{disposeCurrent();disposeCurrent=()=>{};}};
})();

// Liquid cursor: three spring-following bodies merge through an SVG goo filter.
// It is purely visual and never participates in hit testing.
(()=>{
 const allowed=matchMedia('(pointer:fine) and (hover:hover)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const root=document.createElement('div');root.className='liquid-cursor';root.setAttribute('aria-hidden','true');
 root.innerHTML='<svg width="0" height="0"><filter id="cursor-goo" x="-60%" y="-60%" width="220%" height="220%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur"/><feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -8"/></filter></svg><div class="liquid-bodies"><i></i><i></i><i></i></div><span class="cursor-center"></span>';
 document.body.append(root);const dots=[...root.querySelectorAll('i')],center=root.querySelector('.cursor-center');let raf=0,tx=0,ty=0,active=false,last=0,points=[{x:0,y:0},{x:0,y:0},{x:0,y:0}];
 const hide=()=>{active=false;cancelAnimationFrame(raf);raf=0;root.classList.remove('visible');document.documentElement.classList.remove('liquid-ready');};
 const render=now=>{raf=0;if(!active)return;const dt=Math.min(50,now-(last||now));last=now;let distance=0;points.forEach((p,i)=>{const easing=1-Math.exp(-Math.max(dt,16)/[32,125,210][i]);p.x+=(tx-p.x)*easing;p.y+=(ty-p.y)*easing;distance+=Math.abs(tx-p.x)+Math.abs(ty-p.y);dots[i].style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-50%)`;});center.style.transform=`translate(${tx}px,${ty}px) translate(-50%,-50%)`;if(distance>.15)raf=requestAnimationFrame(render);};
 document.addEventListener('pointermove',e=>{if(!allowed.matches||reduced.matches||e.pointerType==='touch'||e.target.closest('dialog,input,textarea,select,[contenteditable]')){hide();return;}tx=e.clientX;ty=e.clientY;if(!active){active=true;points.forEach(p=>{p.x=tx;p.y=ty});root.classList.add('visible');document.documentElement.classList.add('liquid-ready');}root.classList.toggle('over-link',!!e.target.closest('a,button'));if(!raf)raf=requestAnimationFrame(render);},{passive:true});
 document.documentElement.addEventListener('pointerleave',hide);window.addEventListener('blur',hide);document.addEventListener('keydown',e=>{if(e.key==='Tab'||e.key==='Escape')hide();});document.addEventListener('visibilitychange',()=>{if(document.hidden)hide()});allowed.addEventListener('change',hide);reduced.addEventListener('change',hide);document.querySelector('dialog')?.addEventListener('close',hide);
})();
