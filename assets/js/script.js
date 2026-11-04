(function(){
  'use strict';

  /* ===== MEDIA PLACEHOLDERS =====
     Every <img>/<video> on the page points at the file you should drop in
     (e.g. assets/images/hero-products.jpg). Until that file exists, a labelled
     placeholder box is shown instead. Add the file and it appears — no code edits. */
  var EXTS=['jpg','jpeg','png','webp','avif'];
  function makePh(el){
    if(!el.parentNode||el._phDone)return;
    el._phDone=true;
    var isVid=el.tagName==='VIDEO';
    var src=el.getAttribute('data-src-path')||el.getAttribute('src')||(el.querySelector('source')||{}).src||'';
    src=src.replace(/^.*\/(assets\/)/,'$1');
    var d=document.createElement('div');
    d.className='ph '+(el.getAttribute('data-ph-class')||'');
    var ratio=el.getAttribute('data-ratio');
    if(ratio)d.style.aspectRatio=ratio;
    var title=el.getAttribute('data-ph');
    d.setAttribute('data-label',el.hasAttribute('data-nolabel')?'':((title||(isVid?'VIDEO':'IMAGE'))+(src?'\n'+src:'')));
    d.setAttribute('role','img');d.setAttribute('aria-label',el.getAttribute('alt')||title||'placeholder');
    if(isVid)d.classList.add('ph-video');
    el.parentNode.replaceChild(d,el);
  }
  document.addEventListener('error',function(e){
    var t=e.target;if(!t||!t.tagName)return;
    if(t.tagName==='SOURCE')t=t.parentNode;
    if(t.tagName==='VIDEO')return makePh(t);
    if(t.tagName!=='IMG'||t.id==='lbImg'||!t.getAttribute('src'))return;
    var m=(t.getAttribute('src')||'').match(/^(.*)\.([a-z0-9]+)$/i);
    if(m&&!t.hasAttribute('data-noretry')){
      var tried=(t._tried=t._tried||[m[2].toLowerCase()]);
      for(var i=0;i<EXTS.length;i++){
        if(tried.indexOf(EXTS[i])<0){tried.push(EXTS[i]);t.setAttribute('data-src-path',m[1]+'.'+tried[0]);t.src=m[1]+'.'+EXTS[i];return}
      }
    }
    makePh(t);
  },true);
  window.addEventListener('load',function(){
    Array.prototype.forEach.call(document.querySelectorAll('img'),function(i){if(i.id!=='lbImg'&&i.getAttribute('src')&&i.complete&&i.naturalWidth===0&&!i._tried)makePh(i)});
    Array.prototype.forEach.call(document.querySelectorAll('video'),function(v){if(v.networkState===3)makePh(v)});
  });

  var pl=document.getElementById('preloader'),t0=Date.now();
  function hidePre(){
    if(!pl||pl.classList.contains('done'))return;
    var wait=Math.max(0,2400-(Date.now()-t0));
    setTimeout(function(){document.body.classList.add('loaded');pl.classList.add('done');setTimeout(function(){pl.parentNode&&pl.parentNode.removeChild(pl)},800)},wait);
  }
  if(document.readyState==='complete')hidePre();else window.addEventListener('load',hidePre);
  setTimeout(hidePre,8000);
  if(!pl)document.body.classList.add('loaded');
  var $=function(s,c){return (c||document).querySelector(s)};
  var $$=function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))};

  /* mobile menu */
  var toggle=$('#navToggle'),menu=$('#navMenu');
  var bd=$('#navBackdrop');
  function closeMenu(){bd.classList.remove('show');document.body.classList.remove('no-scroll');menu.classList.remove('open');toggle.classList.remove('open');toggle.setAttribute('aria-expanded','false')}
  toggle.addEventListener('click',function(){
    var o=menu.classList.toggle('open');toggle.classList.toggle('open',o);toggle.setAttribute('aria-expanded',o);bd.classList.toggle('show',o);document.body.classList.toggle('no-scroll',o)
  });
  $$('.nav-link,.nm-foot a').forEach(function(a){a.addEventListener('click',closeMenu)});
  bd.addEventListener('click',closeMenu);

  /* seamless marquees: repeat items until one track covers the widest screen, then duplicate it */
  $$('.marquee').forEach(function(m){
    var t=$('.marquee-track',m);
    var base=t.innerHTML,built=0;
    function contentWidth(){
      var k=t.children,last=k[k.length-1],first=k[0];
      var pr=parseFloat(getComputedStyle(t).paddingRight)||0;
      return last.offsetLeft+last.offsetWidth-first.offsetLeft+pr;
    }
    function build(){
      Array.prototype.slice.call(m.querySelectorAll('.marquee-track')).forEach(function(x,i){if(i>0)m.removeChild(x)});
      t.innerHTML=base;
      var target=Math.max(m.clientWidth,window.innerWidth,(window.screen&&window.screen.width)||0)*1.25;
      var guard=0;
      while(contentWidth()<target&&guard++<40){t.insertAdjacentHTML('beforeend',base)}
      var clone=t.cloneNode(true);clone.setAttribute('aria-hidden','true');
      m.appendChild(clone);
      m.style.setProperty('--speed',(parseFloat(m.dataset.speed)||40)+'s');
      built=Math.max(m.clientWidth,window.innerWidth);
    }
    build();
    var tm;
    function maybeRebuild(){
      clearTimeout(tm);
      tm=setTimeout(function(){if(Math.max(m.clientWidth,window.innerWidth)>built)build()},150);
    }
    window.addEventListener('resize',maybeRebuild);
    window.addEventListener('load',maybeRebuild);
    if('ResizeObserver' in window)new ResizeObserver(maybeRebuild).observe(m);
  });

  /* carousels: seamless infinite loop (slides are cloned at both ends) */
  $$('.carousel').forEach(function(c){
    var track=$('.carousel-track',c),vp=$('.carousel-viewport',c);
    var orig=$$('.carousel-slide',track);
    var dotsWrap=$('.carousel-dots',c),prev=$('.c-prev',c),next=$('.c-next',c);
    var basePer=parseInt(c.dataset.per,10)||3,auto=parseInt(c.dataset.autoplay,10)||0;
    var n=orig.length,per=basePer,off=0,idx=0,timer,isStatic=false,staticMin=parseInt(c.dataset.staticMin,10)||0;

    function pct(i){return -((i+off)*100/per)}
    function setPos(i,animate){
      track.style.transition=animate?'':'none';
      track.style.transform='translateX('+pct(i)+'%)';
      if(!animate){void track.offsetWidth;track.style.transition=''}
    }
    function mark(){
      var a=((idx%n)+n)%n;
      $$('button',dotsWrap).forEach(function(d,k){d.classList.toggle('on',k===a)});
    }
    function normalize(){
      if(idx>=n||idx<0){idx=((idx%n)+n)%n;setPos(idx,false)}
    }
    function go(i){
      normalize();
      idx=i;setPos(idx,true);mark();
      clearTimeout(go.t);
      go.t=setTimeout(normalize,720);
    }
    function build(){
      $$('.carousel-slide.clone',track).forEach(function(s){track.removeChild(s)});
      if(isStatic){off=0;$$('.carousel-slide',track).forEach(function(s){s.style.flexBasis=(100/per)+'%'});return}
      var k=Math.min(per,n),i,cl;
      for(i=0;i<k;i++){cl=orig[i].cloneNode(true);cl.classList.add('clone');cl.setAttribute('aria-hidden','true');track.appendChild(cl)}
      for(i=0;i<k;i++){cl=orig[n-1-i].cloneNode(true);cl.classList.add('clone');cl.setAttribute('aria-hidden','true');track.insertBefore(cl,track.firstChild)}
      off=k;
      $$('.carousel-slide',track).forEach(function(s){s.style.flexBasis=(100/per)+'%'});
    }
    function calc(){
      var w=window.innerWidth;
      per=w<640?1:w<1024?Math.min(2,basePer):basePer;
      isStatic=!!staticMin&&w>=staticMin;c.classList.toggle('is-static',isStatic);
      idx=((idx%n)+n)%n;
      build();
      dotsWrap.innerHTML='';
      for(var i=0;i<n;i++){
        (function(i){
          var b=document.createElement('button');b.setAttribute('aria-label','Go to slide '+(i+1));
          b.addEventListener('click',function(){go(i);restart()});dotsWrap.appendChild(b)
        })(i)
      }
      setPos(idx,false);mark();
    }
    function restart(){clearInterval(timer);if(auto&&!isStatic)timer=setInterval(function(){go(idx+1)},auto)}
    track.addEventListener('transitionend',function(e){if(e.target===track)normalize()});
    document.addEventListener('visibilitychange',function(){if(document.hidden)clearInterval(timer);else restart()});
    prev.addEventListener('click',function(){go(idx-1);restart()});
    next.addEventListener('click',function(){go(idx+1);restart()});
    c.addEventListener('mouseenter',function(){clearInterval(timer)});
    c.addEventListener('mouseleave',restart);

    // finger / mouse drag
    var sx=null,dx=0,dragging=false,pid=null;
    vp.addEventListener('pointerdown',function(e){
      if(e.pointerType==='mouse'&&e.button!==0)return;if(isStatic)return;
      normalize();sx=e.clientX;dx=0;dragging=false;pid=e.pointerId;
    });
    vp.addEventListener('pointermove',function(e){
      if(sx===null||e.pointerId!==pid)return;
      dx=e.clientX-sx;
      if(!dragging&&Math.abs(dx)>6){
        dragging=true;clearInterval(timer);
        track.style.transition='none';vp.classList.add('dragging');
        try{vp.setPointerCapture(pid)}catch(err){}
      }
      if(dragging){
        track.style.transform='translateX('+(pct(idx)+dx/vp.clientWidth*100)+'%)';
      }
    });
    function endDrag(e){
      if(sx===null||(e&&e.pointerId!==pid))return;
      var moved=dragging,d=dx;sx=null;dragging=false;
      track.style.transition='';vp.classList.remove('dragging');
      if(moved){
        var slideW=vp.clientWidth/per;
        if(Math.abs(d)>Math.min(60,slideW*.25))go(idx+(d<0?1:-1));else go(idx);
        c._justDragged=true;setTimeout(function(){c._justDragged=false},60);
        restart();
      }
    }
    vp.addEventListener('pointerup',endDrag);
    vp.addEventListener('pointercancel',endDrag);
    vp.addEventListener('click',function(e){if(c._justDragged){e.preventDefault();e.stopPropagation()}},true);
    vp.addEventListener('dragstart',function(e){e.preventDefault()});

    var rw=window.innerWidth,rt;
    window.addEventListener('resize',function(){
      clearTimeout(rt);rt=setTimeout(function(){if(window.innerWidth!==rw){rw=window.innerWidth;calc()}},150)
    });
    calc();restart();
  });

  /* FAQ accordion */
  $$('.faq-item').forEach(function(item){
    var q=$('.faq-q',item),a=$('.faq-a',item);
    q.addEventListener('click',function(){
      var open=item.classList.contains('open');
      $$('.faq-item.open').forEach(function(o){o.classList.remove('open');$('.faq-a',o).style.maxHeight=null});
      if(!open){item.classList.add('open');a.style.maxHeight=a.scrollHeight+'px'}
    })
  });
  var first=$('.faq-item');
  if(first){first.classList.add('open');$('.faq-a',first).style.maxHeight=$('.faq-a',first).scrollHeight+'px'}


  /* extra reveal animations */
  function tag(sel,cls,stagger){
    $$(sel).forEach(function(el,i){
      el.classList.add('reveal');if(cls)el.classList.add(cls);
      if(stagger)el.style.transitionDelay=((i%stagger)*110)+'ms';
    })
  }
  tag('.about-media','from-left');tag('.about-copy','from-right');
  tag('.sys .split-media','from-left');tag('.sys .split-copy','from-right');
  tag('.process .split-media','from-right');tag('.process .split-copy','from-left');
  tag('.faq-media','from-left');tag('.faq-list-wrap','from-right');
  tag('.contact-info','from-left');tag('.contact-form-wrap','from-right');
  tag('.carousel','zoom');tag('.pt-marquee,.vid-marquee','');tag('.cat-card','zoom',4);tag('.sv-card','zoom',4);tag('.ts-card','zoom',3);
  tag('.faq-item','from-right',4);tag('.ci-card','from-left',4);

  /* scroll reveal */
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){
      es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})
    },{threshold:.12});
    $$('.reveal').forEach(function(el){io.observe(el)});
  }else{$$('.reveal').forEach(function(el){el.classList.add('in')})}

  /* active nav link + back to top */
  var links=$$('.nav-link'),secs=links.map(function(l){var h=l.getAttribute('href');return h&&h.charAt(0)==='#'&&h.length>1?$(h):null});
  var hasSecs=secs.some(function(s){return s});
  var topBtn=$('#toTop');
  window.addEventListener('scroll',function(){
    var y=window.scrollY+140,cur=0;
    if(hasSecs){
      secs.forEach(function(s,i){if(s&&s.offsetTop<=y)cur=i});
      links.forEach(function(l,i){l.classList.toggle('active',i===cur)});
    }
    topBtn.classList.toggle('show',window.scrollY>600);
    $('#siteHeader').classList.toggle('scrolled',window.scrollY>10)
  },{passive:true});
  topBtn.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'})});

  /* contact form -> WhatsApp */
  var form=$('#contactForm'),status=$('#cfStatus');
  form.addEventListener('submit',function(e){
    e.preventDefault();
    var f=form.elements,name=f.name.value.trim(),phone=f.phone.value.trim();
    if(!name||!/^[0-9+\s-]{10,14}$/.test(phone)){status.textContent='Please enter your name and a valid mobile number.';return}
    status.textContent='';
    var msg='Hello Raj Electronics,\nName: '+name+'\nMobile: '+phone+
      '\nCity: '+(f.city.value||'-')+'\nProduct: '+(f.product.value||'-')+'\nDetails: '+(f.message.value||'-');
    window.open('https://wa.me/917376919175?text='+encodeURIComponent(msg),'_blank','noopener');
  });

  $$('.vid-mute').forEach(function(b){
    var v=b.parentNode.querySelector('video');
    b.addEventListener('click',function(e){
      e.stopPropagation();
      var m=b.classList.toggle('muted');
      if(v){v.muted=m;if(!m)v.play().catch(function(){})}
    })
  });
  // play videos only while on screen
  var vids=$$('video[loop]');
  if('IntersectionObserver' in window){
    var vo=new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(e.isIntersecting)e.target.play().catch(function(){});else e.target.pause()
      })
    },{threshold:.25});
    vids.forEach(function(v){vo.observe(v)});
  }


  /* video lightbox */
  var lb=$('#lightbox'),lbv=$('#lbVideo'),lbi=$('#lbImg');
  function openVideo(src){
    $$('video[loop]').forEach(function(v){v.pause()});
    lb.classList.remove('img-mode');lbv.src=src;lb.classList.add('show');lb.setAttribute('aria-hidden','false');
    document.body.classList.add('no-scroll');lbv.play().catch(function(){});
  }
  function openImage(src,alt){
    lbv.pause();lbi.src=src;lbi.alt=alt||'';
    lb.classList.add('img-mode','show');lb.setAttribute('aria-hidden','false');
    document.body.classList.add('no-scroll');
  }
  $$('.split-media img,.am-main img,.am-sub img,.faq-sticky img').forEach(function(im){
    im.classList.add('zoomable');im.setAttribute('tabindex','0');im.setAttribute('role','button');
    im.addEventListener('click',function(){openImage(im.currentSrc||im.src,im.alt)});
    im.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();openImage(im.currentSrc||im.src,im.alt)}});
  });
  function closeVideo(){
    var wasImg=lb.classList.contains('img-mode');
    lbv.pause();lbv.removeAttribute('src');lbv.load();lbi.removeAttribute('src');
    lb.classList.remove('show');lb.setAttribute('aria-hidden','true');
    document.body.classList.remove('no-scroll');
    if(!wasImg)$$('video[loop]').forEach(function(v){v.play().catch(function(){})});
  }
  var videosSec=$('#videos');
  if(videosSec){
    videosSec.addEventListener('click',function(e){
      if(e.target.closest('.vid-mute'))return;
      var card=e.target.closest('.vid-card');if(card&&card.querySelector('video'))openVideo(card.dataset.src);
    });
    videosSec.addEventListener('keydown',function(e){
      if((e.key==='Enter'||e.key===' ')&&e.target.classList.contains('vid-card')&&e.target.querySelector('video')){e.preventDefault();openVideo(e.target.dataset.src)}
    });
  }
  $('#lbClose').addEventListener('click',closeVideo);
  lb.addEventListener('click',function(e){if(e.target===lb||e.target.classList.contains('lb-stage')||e.target===lbi)closeVideo()});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&lb.classList.contains('show'))closeVideo()});

  $('#year').textContent=new Date().getFullYear();
})();
