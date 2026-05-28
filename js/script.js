// ===== CONFIG =====
const CONFIG = {
    apiKey: 'gmgn_5d401b0d48f150eca84afdc27ec2c505',
    apiBase: 'https://api.gmgn.ai/v1',
    chain: 'sol',
    tokenAddress: '6DVRVmrVgdgi5M2EPVbf4oWdp6WX3PPghxJ3uWWcpump',
    refreshInterval: 30000,
    nftData: [
        { name: 'ZOMBIE #001', desc: 'The First Risen', file: 'photo_1_2026-05-28_03-19-37.jpg' },
        { name: 'ZOMBIE #002', desc: 'Grave Walker', file: 'photo_2_2026-05-28_03-19-37.jpg' },
        { name: 'ZOMBIE #003', desc: 'Flesh Eater', file: 'photo_3_2026-05-28_03-19-37.jpg' },
        { name: 'ZOMBIE #004', desc: 'Bone Crusher', file: 'photo_4_2026-05-28_03-19-37.jpg' },
        { name: 'ZOMBIE #005', desc: 'Soul Reaper', file: 'photo_5_2026-05-28_03-19-37.jpg' },
        { name: 'ZOMBIE #006', desc: 'Grave Lord', file: 'photo_6_2026-05-28_03-19-37.jpg' },
        { name: 'ZOMBIE #007', desc: 'Plague Bringer', file: 'photo_1_2026-05-28_03-31-51.jpg' },
        { name: 'ZOMBIE #008', desc: 'Crow Feeder', file: 'photo_2_2026-05-28_03-31-51.jpg' }
    ]
};

// ===== NAV CA COPY =====
function copyNavCa() {
    navigator.clipboard.writeText('6DVRVmrVgdgi5M2EPVbf4oWdp6WX3PPghxJ3uWWcpump').then(() => {
        const el = document.querySelector('.nav-ca-addr');
        el.textContent = 'COPIED!';
        setTimeout(() => { el.textContent = '6DVRVm...cpump'; }, 2000);
    });
}

// ===== NAVBAR =====
document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('navLinks').classList.toggle('active');
});

document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        document.getElementById('navLinks').classList.remove('active');
    });
});

window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    navbar.style.borderColor = window.scrollY > 50 ? '#4a7c3f' : '#2a2f18';
});

// ===== PARTICLES BACKGROUND =====
(function initParticles() {
    const canvas = document.createElement('canvas');
    const container = document.getElementById('particles-canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const particles = [];
    const count = 70;

    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 1,
            speedY: Math.random() * 0.2 + 0.05,
            speedX: (Math.random() - 0.5) * 0.15,
            alpha: Math.random() * 0.4 + 0.1
        });
    }

    function drawParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            ctx.fillStyle = `rgba(74, 124, 63, ${p.alpha})`;
            ctx.fillRect(p.x, p.y, p.size, p.size * 0.6);
            p.y += p.speedY;
            p.x += p.speedX;
            if (p.y > canvas.height + 5) { p.y = -5; p.x = Math.random() * canvas.width; }
            if (p.x > canvas.width) p.x = 0;
            if (p.x < 0) p.x = canvas.width;
        });
        requestAnimationFrame(drawParticles);
    }
    drawParticles();

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
})();

// ===== HERO CANVAS (Toxic fog / ash fall) =====
(function initHeroCanvas() {
    const canvas = document.getElementById('heroCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const count = 60;

    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 3 + 1,
            speedY: Math.random() * 0.4 + 0.1,
            speedX: (Math.random() - 0.5) * 0.1,
            alpha: Math.random() * 0.3 + 0.05,
            gray: Math.random() > 0.6
        });
    }

    function draw() {
        ctx.fillStyle = 'rgba(10, 11, 6, 0.08)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
            const color = p.gray
                ? `rgba(90, 90, 74, ${p.alpha})`
                : `rgba(74, 124, 63, ${p.alpha})`;
            ctx.fillStyle = color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
            p.y += p.speedY;
            p.x += p.speedX;
            if (p.y > canvas.height) { p.y = -5; p.x = Math.random() * canvas.width; }
            if (p.x > canvas.width) p.x = 0;
            if (p.x < 0) p.x = canvas.width;
        });

        requestAnimationFrame(draw);
    }
    draw();

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
})();

// ===== NFT GALLERY =====
const galleryGrid = document.getElementById('galleryGrid');
let currentNftIndex = 0;

CONFIG.nftData.forEach((nft, index) => {
    const card = document.createElement('div');
    card.className = 'nft-card';
    card.innerHTML = `
        <img src="${nft.file}" alt="${nft.name}" loading="lazy">
        <div class="nft-overlay">
            <h4>${nft.name}</h4>
            <p>${nft.desc}</p>
        </div>
    `;
    card.addEventListener('click', () => openLightbox(index));
    galleryGrid.appendChild(card);
});

// ===== LIGHTBOX =====
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxName = document.getElementById('lightboxName');
const lightboxDesc = document.getElementById('lightboxDesc');

function openLightbox(index) {
    const nft = CONFIG.nftData[index];
    lightboxImg.src = nft.file;
    lightboxName.textContent = nft.name;
    lightboxDesc.textContent = nft.desc;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
}

function navigateLightbox(dir) {
    currentNftIndex = (currentNftIndex + dir + CONFIG.nftData.length) % CONFIG.nftData.length;
    const nft = CONFIG.nftData[currentNftIndex];
    lightboxImg.src = nft.file;
    lightboxName.textContent = nft.name;
    lightboxDesc.textContent = nft.desc;
}

document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
document.getElementById('lightboxPrev').addEventListener('click', () => navigateLightbox(-1));
document.getElementById('lightboxNext').addEventListener('click', () => navigateLightbox(1));

lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
});

document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
});

// ===== GMGN API =====
async function fetchTokenData() {
    const address = CONFIG.tokenAddress;
    if (!address || address === 'YOUR_CA_HERE') {
        document.getElementById('statPrice').textContent = '$?.??';
        document.getElementById('statMc').textContent = '$?';
        document.getElementById('statHolders').textContent = '?';
        return;
    }

    try {
        const url = `${CONFIG.apiBase}/token/info?chain=${CONFIG.chain}&address=${address}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${CONFIG.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        if (data.code === 0 && data.data) {
            const token = data.data;
            const price = token.price?.price || '0';
            const holders = token.holder_count || 0;
            const supply = token.circulating_supply || token.total_supply || 0;
            const marketCap = (parseFloat(price) * parseFloat(supply));

            document.getElementById('statPrice').textContent = `$${parseFloat(price).toFixed(8)}`;
            document.getElementById('statMc').textContent = `$${formatNumber(marketCap)}`;
            document.getElementById('statHolders').textContent = formatNumber(holders);
        }
    } catch (err) {
        console.warn('GMGN API fetch failed:', err.message);
        document.getElementById('statPrice').textContent = '—';
        document.getElementById('statMc').textContent = '—';
        document.getElementById('statHolders').textContent = '—';
    }
}

function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toLocaleString();
}

fetchTokenData();
setInterval(fetchTokenData, CONFIG.refreshInterval);

// ===== CA HANDLING =====
const CA_INPUT_KEY = 'zombs_ca';

function initCaAddress() {
    localStorage.removeItem(CA_INPUT_KEY);
    document.getElementById('caAddress').textContent = truncateCa(CONFIG.tokenAddress);
}

function copyCa() {
    const addr = CONFIG.tokenAddress;
    navigator.clipboard.writeText(addr).then(() => {
        const btn = document.querySelector('.copy-btn');
        btn.textContent = '[COPIED!]';
        setTimeout(() => { btn.textContent = '[COPY]'; }, 2000);
    });
}

function truncateCa(addr) {
    if (addr.length <= 16) return addr;
    return addr.slice(0, 6) + '...' + addr.slice(-6);
}

initCaAddress();

// ===== SCROLL REVEAL =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.about-card, .carousel-ring, .buy-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(25px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// ===== UPDATE CA DISPLAY =====
(function updateCaDisplay() {
    document.getElementById('caAddress').textContent = truncateCa(CONFIG.tokenAddress);
})();

console.log('%c$ZOMBS — THE UNDEAD ARMY', 'font-size:18px; color:#8a7a3a; font-weight:bold;');
console.log('%cToxic wasteland awaits.', 'font-size:13px; color:#4a7c3f;');