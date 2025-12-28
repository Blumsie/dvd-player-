const params = new URLSearchParams(window.location.search);
const SAVE_KEY = "dvd_user_disc"; 
const TIME_KEY = "dvd_user_time";

let player, isPlaying = false, isThrottled = false;
let x, y, dx = 1, dy = 1, dimensions, speed = 0.8, logo;

window.onYouTubeIframeAPIReady = () => {
    const savedDisc = localStorage.getItem(SAVE_KEY) || ""; 
    const savedTime = parseFloat(localStorage.getItem(TIME_KEY)) || 0;
    
    player = new YT.Player('yt-player', {
        height: '0', width: '0',
        videoId: savedDisc, 
        playerVars: { 
            'listType': savedDisc.length > 11 ? 'playlist' : 'video',
            'start': Math.floor(savedTime)
        },
        events: { 
            'onStateChange': onPlayerStateChange,
            'onReady': () => { 
                player.setVolume(document.getElementById('vol-slider').value);
                if(savedDisc) {
                    setTimeout(updateTitle, 1000);
                    updateThumbnail(savedDisc);
                } else {
                    document.getElementById('now-playing-title').innerText = "NO DISC INSERTED - PRESS EJECT";
                }
            }
        }
    });
};

function changeVolume(val) {
    if (player && player.setVolume) player.setVolume(val);
}

function seek(seconds) {
    if (!player) return;
    player.seekTo(player.getCurrentTime() + seconds, true);
}

function startRandomFlicker() {
    const tear = document.getElementById('signal-tear');
    const trigger = () => {
        if (isPlaying) {
            tear.classList.add('flicker-active');
            setTimeout(() => {
                tear.classList.remove('flicker-active');
            }, 150);
        }
        const nextTick = (Math.random() * 12000) + 8000;
        setTimeout(trigger, nextTick);
    };
    setTimeout(trigger, 10000);
}
startRandomFlicker();

function updateThumbnail(id) {
    const displayBg = document.getElementById('vcr-thumb-bg');
    if (id && id.length === 11) {
        displayBg.style.backgroundImage = `url('https://img.youtube.com/vi/${id}/mqdefault.jpg')`;
    } else {
        displayBg.style.backgroundImage = 'none';
    }
}

function toggleOverlay() {
    const overlay = document.getElementById('tape-overlay');
    const input = document.getElementById('tape-input');
    const isVisible = overlay.style.display === 'flex';
    overlay.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) input.focus();
}

document.getElementById('tape-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'tape-overlay') toggleOverlay();
});

function handleInput(e) {
    if (e.key === 'Enter') {
        const val = e.target.value.trim();
        if (val) {
            const id = extractID(val);
            const titleDisp = document.getElementById('now-playing-title');
            
            titleDisp.style.animation = 'none';
            titleDisp.innerText = "READING DISC...";
            
            localStorage.setItem(SAVE_KEY, id);
            localStorage.setItem(TIME_KEY, 0);
            updateThumbnail(id);
            
            if (val.includes('list=')) {
                const listId = val.split('list=')[1].split('&')[0];
                player.loadPlaylist({list: listId, listType: 'playlist'});
            } else {
                player.loadVideoById(id);
            }
            
            e.target.value = '';
            toggleOverlay();
            setTimeout(updateTitle, 2000);
        }
    }
}

function extractID(input) {
    if (input.includes('list=')) return input.split('list=')[1].split('&')[0];
    if (input.includes('v=')) return input.split('v=')[1].split('&')[0];
    if (input.includes('youtu.be/')) return input.split('youtu.be/')[1].split('?')[0];
    return input;
}

function updateTitle() {
    if (!player || !player.getVideoData) return;
    const data = player.getVideoData();
    const titleDisp = document.getElementById('now-playing-title');
    if (data && data.title) {
        titleDisp.style.animation = 'none';
        void titleDisp.offsetWidth; 
        titleDisp.innerText = "NOW PLAYING: " + data.title.toUpperCase();
        titleDisp.style.animation = 'marquee 15s linear infinite';
    }
}

window.togglePlay = () => {
    if (isThrottled || !player) return;
    isThrottled = true;
    const loader = document.getElementById('vcr-loader');
    loader.style.transition = 'width 1s linear';
    loader.style.width = '100%';
    
    const state = player.getPlayerState();
    if (state === 1) {
        player.pauseVideo();
    } else {
        player.playVideo();
    }
    
    setTimeout(() => {
        isThrottled = false;
        loader.style.transition = 'none';
        loader.style.width = '0%';
        updateTitle();
    }, 1000);
};

function onPlayerStateChange(e) {
    const status = document.getElementById('vcr-status');
    if (e.data == YT.PlayerState.PLAYING) {
        isPlaying = true; 
        status.innerText = "STOP";
        updateTitle();
        updateTimer();
    } else {
        isPlaying = false; 
        status.innerText = "PLAY";
    }
}

function updateTimer() {
    if (!isPlaying) return;
    const t = player.getCurrentTime();
    localStorage.setItem(TIME_KEY, t);
    const h = Math.floor(t / 3600).toString().padStart(2, '0');
    const m = Math.floor((t % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(t % 60).toString().padStart(2, '0');
    document.getElementById('vcr-time').innerText = `${h}:${m}:${s}`;
    setTimeout(updateTimer, 1000);
}

function updateHUDDate() {
    const now = new Date();
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    document.getElementById('hud-date').innerText = `${months[now.getMonth()]}. ${now.getDate().toString().padStart(2, '0')} 1997 ${h}:${m}`;
}
setInterval(updateHUDDate, 1000);
updateHUDDate();

const logoUrl = params.get("logo") || "logos/default.svg";
const xhr = new XMLHttpRequest();
xhr.open("GET", logoUrl, false);
xhr.send();
const svgDoc = new DOMParser().parseFromString(xhr.responseText, "image/svg+xml");
logo = svgDoc.querySelector("svg");
if (logo) {
    logo.id = "logo";
    logo.querySelectorAll("*").forEach(el => { el.removeAttribute("fill"); el.removeAttribute("stroke"); });
    document.body.append(logo);
    const rect = logo.getBoundingClientRect();
    dimensions = [rect.width || 300, rect.height || 150];
    x = Math.random() * (window.innerWidth - dimensions[0]);
    y = Math.random() * (window.innerHeight - dimensions[1]);
    function onBounce() {
        const c = `rgb(${Math.random()*255},${Math.random()*255},${Math.random()*255})`;
        logo.style.fill = c; logo.style.color = c;
        logo.querySelectorAll("*").forEach(el => el.style.fill = c);
        logo.classList.add('glitch-active');
        setTimeout(() => logo.classList.remove('glitch-active'), 250);
    }
    function animate() {
        x += speed * dx; y += speed * dy;
        if (x <= 0) { x = 0; dx = 1; onBounce(); }
        if (x + dimensions[0] >= window.innerWidth) { x = window.innerWidth - dimensions[0]; dx = -1; onBounce(); }
        if (y <= 0) { y = 0; dy = 1; onBounce(); }
        if (y + dimensions[1] >= window.innerHeight) { y = window.innerHeight - dimensions[1]; dy = -1; onBounce(); }
        logo.style.left = x + 'px'; logo.style.top = y + 'px';
        requestAnimationFrame(animate);
    }
    onBounce(); requestAnimationFrame(animate);
}
