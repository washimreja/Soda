(() => {
    'use strict';

    const ASSETS = {
        LEAVES:'https://api.getlayers.ai/storage/v1/object/public/public/assets/soda-14ff8a788d/leaves.glb',
        CHERRY:'https://api.getlayers.ai/storage/v1/object/public/public/assets/soda-14ff8a788d/cherry.glb',
        BLUEBERRY:'https://api.getlayers.ai/storage/v1/object/public/public/assets/soda-14ff8a788d/blueberry.glb',
        SODA_CAN:'https://api.getlayers.ai/storage/v1/object/public/public/assets/soda-14ff8a788d/deit_soda2.glb',
        GREEN_SODA_IMG:'https://api.getlayers.ai/storage/v1/object/public/public/assets/soda-14ff8a788d/Green%20Soda.png',
        BLUE_SODA_IMG:'https://api.getlayers.ai/storage/v1/object/public/public/assets/soda-14ff8a788d/Blue%20Soda.png',
        GREEN_BASE_COLOR:'https://api.getlayers.ai/storage/v1/object/public/public/assets/soda-14ff8a788d/green%20base%20color.jpg',
        BLUE_BASE_COLOR:'https://api.getlayers.ai/storage/v1/object/public/public/assets/soda-14ff8a788d/blue%20base%20color.jpg',
        BUBBLE:'https://api.getlayers.ai/storage/v1/object/public/public/assets/soda-14ff8a788d/bubble.png'
    };

    const state = {
        mouse:{x:0,y:0},
        currentMouse:{x:0,y:0},
        pointer:{x:-9999,y:-9999},
        flavor:'classic',
        switching:false,
        switchSpin:0,
        canTexture:null,
        greenTexture:null,
        blueTexture:null
    };

    const product = document.getElementById('product-model');
    const foreground = document.querySelector('.berries-container');
    const background = document.querySelector('.berries-container-bg');
    const leaves = document.querySelector('.leaves-container');
    const body = document.body;
    const cards = [...document.querySelectorAll('.card')];
    const berries = [...document.querySelectorAll('.berry')];
    const leafEls = [...document.querySelectorAll('.leaf')];
    const durations = [5,7,6,8,5.5,6.5,9,11,10];

    // Initial random offsets make the models feel alive without changing their authored positions.
    const berryState = berries.map((el,i) => ({
        el,
        i,
        x:0,y:0,
        phase:Math.random()*Math.PI*2,
        drift:durations[i] || 8
    }));

    function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
    function lerp(a,b,t){return a+(b-a)*t}

    window.addEventListener('pointermove', e => {
        state.mouse.x = (e.clientX / window.innerWidth - .5) * 2;
        state.mouse.y = (e.clientY / window.innerHeight - .5) * 2;
        state.pointer.x = e.clientX;
        state.pointer.y = e.clientY;
    }, {passive:true});

    window.addEventListener('pointerleave', () => {
        state.pointer.x = -9999;
        state.pointer.y = -9999;
    });

    function spawnBubble(){
        const img = document.createElement('img');
        img.className = 'bubble-img';
        img.src = ASSETS.BUBBLE;
        img.alt = '';
        const size = 10 + Math.random()*20;
        const left = Math.random()*100;
        const duration = 4 + Math.random()*6;
        const delay = Math.random()*.25;
        img.style.width = size + 'px';
        img.style.left = left + '%';
        img.style.bottom = (-size - 10) + 'px';
        img.style.opacity = (.2 + Math.random()*.4).toFixed(2);
        img.style.animation = `floatUpImg ${duration}s linear ${delay}s forwards`;
        document.getElementById('bubbles-container').appendChild(img);
        setTimeout(() => img.remove(), (duration + delay + .5)*1000);
    }

    for(let i=0;i<18;i++) setTimeout(spawnBubble, i*220);
    setInterval(spawnBubble, 400);

    // Slow independent leaf motion.
    leafEls.forEach((el,i) => {
        if (window.gsap) {
            gsap.to(el,{
                y:i%2 ? -20 : 20,
                x:i%2 ? 15 : -15,
                rotation:i%2 ? -15 : 15,
                duration:10+i*2,
                repeat:-1,
                yoyo:true,
                ease:'sine.inOut'
            });
        }
    });

    function updateBerryRepulsion(el, i, now){
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width/2;
        const cy = rect.top + rect.height/2;
        const dx = cx - state.pointer.x;
        const dy = cy - state.pointer.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const radius = 400;

        let forceX = 0, forceY = 0;
        if(!state.switching && dist < radius){
            const strength = Math.pow(1 - dist/radius, 2) * 80;
            const inv = dist > 1 ? 1/dist : 1;
            forceX = dx * inv * strength;
            forceY = dy * inv * strength;
        }

        const targetX = forceX + Math.sin(now/1000/((durations[i]||8)/2) + i) * 6;
        const targetY = forceY + Math.sin(now/1000/((durations[i]||8)/2) + i) * 15;

        berryState[i].x = lerp(berryState[i].x, targetX, .1);
        berryState[i].y = lerp(berryState[i].y, targetY, .1);

        el.style.translate = `${berryState[i].x}px ${berryState[i].y}px`;
    }

    function setBerryModel(el, src){
        el.setAttribute('src', src);
    }

    async function warmTextures(){
        if(!product || !product.createTexture) return;
        try{
            state.greenTexture = await product.createTexture(ASSETS.GREEN_BASE_COLOR);
            state.blueTexture = await product.createTexture(ASSETS.BLUE_BASE_COLOR);
            applyTexture(state.greenTexture);
            // Warm the alternate shader path, then restore green.
            if(state.blueTexture) applyTexture(state.blueTexture);
            if(state.greenTexture) applyTexture(state.greenTexture);
        }catch(err){
            console.warn('Texture preload unavailable:', err);
        }
    }

    function applyTexture(texture){
        if(!texture || !product.model || !product.model.materials) return;
        product.model.materials.forEach(material => {
            try{
                const slot = material.pbrMetallicRoughness.baseColorTexture;
                if(slot) slot.setTexture(texture);
            }catch(err){}
        });
        state.canTexture = texture;
    }

    product.addEventListener('load', () => {
        warmTextures();
    }, {once:true});

    function morphBackground(isBlue){
        const target = isBlue
            ? {'--bg-inner':'#0b4f8a','--bg-mid':'#04294e','--bg-outer':'#010c14'}
            : {'--bg-inner':'#0b8a78','--bg-mid':'#044e3b','--bg-outer':'#011411'};
        if(window.gsap){
            gsap.to(body,{
                duration:1.5,
                ease:'power2.inOut',
                ...Object.fromEntries(Object.entries(target).map(([k,v])=>[k,v]))
            });
        }
        body.classList.toggle('blue-theme', isBlue);
    }

    function updateActiveCard(flavor){
        cards.forEach(card => card.classList.toggle('active', card.dataset.flavor === flavor));
    }

    function switchFlavor(nextFlavor){
        if(state.switching || nextFlavor === state.flavor) return;
        state.switching = true;
        body.classList.add('transitioning');
        const isBlue = nextFlavor === 'blue';
        const berryCenterX = window.innerWidth/2;
        const berryCenterY = window.innerHeight/2;

        updateActiveCard(nextFlavor);
        morphBackground(isBlue);

        // Berry implode.
        berries.forEach((el,i)=>{
            const rect = el.getBoundingClientRect();
            const dx = berryCenterX - (rect.left + rect.width/2);
            const dy = berryCenterY - (rect.top + rect.height/2);
            if(window.gsap){
                gsap.to(el,{
                    duration:.5,
                    x:dx,
                    y:dy,
                    scale:.1,
                    opacity:0,
                    ease:'power2.in'
                });
            }
        });

        // Can: 360° fast blur, texture swap, then 720° settle.
        if(window.gsap){
            gsap.killTweensOf(product);
            state.switchSpin = 0;
            gsap.to(state,{
                duration:.6,
                switchSpin:360,
                ease:'power2.in',
                onUpdate:()=>{
                    product.style.filter='blur(15px) drop-shadow(0 25px 45px rgba(0,0,0,.45))';
                }
            });
            gsap.delayedCall(.55,()=>{
                if(isBlue){
                    if(state.blueTexture) applyTexture(state.blueTexture);
                    else product.style.setProperty('--fallback-flavor','blue');
                }else{
                    if(state.greenTexture) applyTexture(state.greenTexture);
                }
                product.style.filter='blur(15px) drop-shadow(0 25px 45px rgba(0,0,0,.45))';
            });
            gsap.to(state,{
                duration:1.5,
                delay:.6,
                switchSpin:720,
                ease:'back.out(.7)',
                onUpdate:()=>{
                    product.style.filter='blur(0px) drop-shadow(0 25px 45px rgba(0,0,0,.45))';
                },
                onComplete:()=>{
                    product.style.filter='';
                    state.switchSpin=0;
                }
            });
        }

        setTimeout(()=>{
            berries.forEach((el,i)=>{
                setBerryModel(el, isBlue ? ASSETS.BLUEBERRY : ASSETS.CHERRY);
                const angle = Math.random()*Math.PI*2;
                const distance = 60 + Math.random()*180;
                const x = Math.cos(angle)*distance;
                const y = Math.sin(angle)*distance;
                el.classList.add('no-animation');
                if(window.gsap){
                    gsap.set(el,{x:0,y:0,scale:.1,opacity:0});
                    gsap.to(el,{
                        duration:.9,
                        x,y,scale:1,opacity:1,
                        ease:'back.out(1.5)',
                        delay:i*.025
                    });
                }else{
                    el.style.opacity='1';
                    el.style.transform=`translate(${x}px,${y}px)`;
                }
            });
        },800);

        setTimeout(()=>{
            state.flavor=nextFlavor;
            state.switching=false;
            body.classList.remove('transitioning');
            berries.forEach(el=>el.classList.remove('no-animation'));
        },1800);
    }

    cards.forEach(card=>{
        card.addEventListener('click',()=>switchFlavor(card.dataset.flavor));
    });

    const arrows = document.querySelectorAll('.nav-arrow');
    arrows[0].addEventListener('click',()=>switchFlavor(state.flavor==='classic'?'blue':'classic'));
    arrows[1].addEventListener('click',()=>switchFlavor(state.flavor==='classic'?'blue':'classic'));

    document.querySelectorAll('.nav-item').forEach(item=>{
        item.addEventListener('click',e=>{
            e.preventDefault();
            document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
            item.classList.add('active');
        });
    });

    document.querySelector('.contact-btn').addEventListener('click',()=>{
        document.querySelector('.contact-btn').animate(
            [{transform:'scale(1)'},{transform:'scale(.94)'},{transform:'scale(1)'}],
            {duration:260,easing:'ease-out'}
        );
    });

    document.querySelector('.primary-btn').addEventListener('click',()=>{
        document.querySelector('.primary-btn').animate(
            [{transform:'translateY(0)'},{transform:'translateY(-3px)'},{transform:'translateY(0)'}],
            {duration:300,easing:'ease-out'}
        );
    });

    function animationFrame(now){
        state.currentMouse.x = lerp(state.currentMouse.x,state.mouse.x,.05);
        state.currentMouse.y = lerp(state.currentMouse.y,state.mouse.y,.05);

        if(product){
            const orbitX = state.currentMouse.x*40 + state.switchSpin;
            const orbitY = 90 + state.currentMouse.y*20;
            product.cameraOrbit = `${orbitX}deg ${orbitY}deg 380%`;
        }

        foreground.style.transform = `translate(${state.currentMouse.x*60}px,${state.currentMouse.y*60}px)`;
        background.style.transform = `translate(${state.currentMouse.x*-30}px,${state.currentMouse.y*-30}px)`;
        leaves.style.transform = `translate(${state.currentMouse.x*-15}px,${state.currentMouse.y*-15}px)`;

        berries.forEach((el,i)=>updateBerryRepulsion(el,i,now));
        requestAnimationFrame(animationFrame);
    }
    requestAnimationFrame(animationFrame);

    // Attempt to warm all berry models without displaying a loader.
    const hiddenPreload = document.createElement('div');
    hiddenPreload.style.cssText='position:fixed;left:-10000px;top:-10000px;width:1px;height:1px;opacity:0;pointer-events:none;';
    [ASSETS.CHERRY,ASSETS.BLUEBERRY,ASSETS.LEAVES].forEach(src=>{
        const mv=document.createElement('model-viewer');
        mv.src=src;
        mv.setAttribute('environment-image','neutral');
        mv.setAttribute('interaction-prompt','none');
        hiddenPreload.appendChild(mv);
    });
    document.body.appendChild(hiddenPreload);
})();
