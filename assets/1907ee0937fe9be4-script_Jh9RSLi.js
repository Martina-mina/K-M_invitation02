// Helper to start hero video automatically & in loop
function playHeroVideo(){
  const heroVid = document.getElementById('hero-video');
  if(!heroVid) return;
  heroVid.muted = true;
  heroVid.loop = true;
  heroVid.play().catch(function(){});
}

// Preloader
(function(){
  const pre = document.getElementById('preloader');
  const vid = document.getElementById('preloader-video');
  const toggle = document.getElementById('music-toggle');
  let started = false, closed = false;

  function revealMusicToggle(){
    if(toggle) toggle.classList.add('visible');
  }

  if(!pre){
    revealMusicToggle();
    playHeroVideo();
    return;
  }

  document.body.style.overflow = 'hidden';

  // Force iOS Safari & mobile browsers to decode and render frame 0 immediately while paused
  if (vid) {
    const renderFirstFrame = () => {
      try {
        if (!started && vid.paused) {
          vid.currentTime = 0.001;
        }
      } catch(e){}
    };
    if (vid.readyState >= 1) {
      renderFirstFrame();
    } else {
      vid.addEventListener('loadedmetadata', renderFirstFrame, { once: true });
      vid.addEventListener('loadeddata', renderFirstFrame, { once: true });
      vid.addEventListener('canplay', renderFirstFrame, { once: true });
    }
    vid.load();
  }

  function finish(){
    if(closed) return; closed = true;
    pre.classList.add('closing');
    revealMusicToggle();
    setTimeout(()=>{ pre.style.display='none'; document.body.style.overflow=''; }, 800);
  }
  function start(){
    if(started) return; started = true;
    pre.classList.add('started');
    
    // Start hero video IMMEDIATELY on first interaction with preloader
    playHeroVideo();

    // Fallback: force finish after 10 seconds if video stalls
    setTimeout(finish, 10000);
    
    try { 
      const p = vid.play(); 
      if(p && p.catch) p.catch(()=>setTimeout(finish,600)); 
    }
    catch(e){ setTimeout(finish,600); }
  }
  vid.addEventListener('ended', finish);
  vid.addEventListener('error', finish);
  ['click', 'touchstart', 'pointerdown'].forEach(ev => pre.addEventListener(ev, start, { capture: true }));
})();

// Hero video — cross-browser autoplay (Safari fix)
(function(){
  const heroVid = document.getElementById('hero-video');
  if(!heroVid) return;

  // Ensure muted & loop are set programmatically
  heroVid.muted = true;
  heroVid.loop = true;
  heroVid.volume = 0;

  function tryPlay(){
    playHeroVideo();
    if(heroVid.paused){
      const retry = function(){
        playHeroVideo();
        document.removeEventListener('touchstart', retry, true);
        document.removeEventListener('pointerdown', retry, true);
        document.removeEventListener('click', retry, true);
      };
      document.addEventListener('touchstart', retry, { once: true, passive: true, capture: true });
      document.addEventListener('pointerdown', retry, { once: true, passive: true, capture: true });
      document.addEventListener('click', retry, { once: true, passive: true, capture: true });
    }
  }

  // Try immediately
  tryPlay();

  // Also try when page becomes visible
  document.addEventListener('visibilitychange', function(){
    if(!document.hidden && heroVid.paused) tryPlay();
  });
})();

// Countdown
(function(){
  const target = new Date('2027-03-27T19:30:00').getTime();
  const dEl = document.getElementById('cd-days');
  const hEl = document.getElementById('cd-hours');
  const mEl = document.getElementById('cd-min');
  const sEl = document.getElementById('cd-sec');
  function pad(n){return String(n).padStart(2,'0')}
  function tick(){
    const diff = Math.max(0, target - Date.now());
    dEl.textContent = pad(Math.floor(diff/86400000));
    hEl.textContent = pad(Math.floor(diff/3600000)%24);
    mEl.textContent = pad(Math.floor(diff/60000)%60);
    sEl.textContent = pad(Math.floor(diff/1000)%60);
  }
  tick(); setInterval(tick,1000);
})();

// Reveal on scroll
(function(){
  const els = document.querySelectorAll('.fade-up:not(.in-view)');
  const io = new IntersectionObserver((entries)=>{
    for(const e of entries){
      if(e.isIntersecting){ e.target.classList.add('in-view'); io.unobserve(e.target); }
    }
  },{threshold:.12,rootMargin:'0px 0px -40px 0px'});
  els.forEach(el=>io.observe(el));
})();

// RSVP
(function(){
  const form = document.getElementById('rsvp-form');
  const thanks = document.getElementById('rsvp-thanks');
  if(!form) return;
  form.addEventListener('submit',(e)=>{
    e.preventDefault();
    form.classList.add('hidden');
    thanks.classList.remove('hidden');
  });
})();

// Background music (start on first interaction)
(function(){
  const music = document.getElementById('bg-music');
  const toggle = document.getElementById('music-toggle');
  if(!music || !toggle) return;

  let autoStarted = false;
  const unlockEvents = ['pointerdown', 'touchstart', 'click', 'keydown'];

  function setToggleUI(isPlaying){
    toggle.classList.toggle('is-playing', isPlaying);
    toggle.textContent = isPlaying ? '❚❚' : '♪';
    toggle.setAttribute('aria-label', isPlaying ? 'Pause Music' : 'Play Music');
  }

  function playMusic(){
    return music.play()
      .then(()=>{
        setToggleUI(true);
        return true;
      })
      .catch(()=>{
        setToggleUI(false);
        return false;
      });
  }

  function removeUnlockListeners(){
    unlockEvents.forEach((eventName)=>{
      window.removeEventListener(eventName, onFirstInteraction, true);
    });
  }

  function onFirstInteraction(){
    if(autoStarted) return;
    playMusic().then((ok)=>{
      if(ok){
        autoStarted = true;
        removeUnlockListeners();
      }
    });
  }

  unlockEvents.forEach((eventName)=>{
    window.addEventListener(eventName, onFirstInteraction, { passive:true, capture:true });
  });

  toggle.addEventListener('click', ()=>{
    if(music.paused){
      playMusic().then((ok)=>{
        if(ok && !autoStarted){
          autoStarted = true;
          removeUnlockListeners();
        }
      });
    }else{
      music.pause();
      setToggleUI(false);
    }
  });

  music.addEventListener('pause', ()=>setToggleUI(false));
  music.addEventListener('play', ()=>setToggleUI(true));
  setToggleUI(false);
})();

