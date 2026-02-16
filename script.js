console.log("SCRIPT LOADED");
let lastActiveDate = localStorage.getItem("lastActiveDate") || null;
let badges = JSON.parse(localStorage.getItem("badges")) || [];

// ================= TIMER DATA =================
let seconds = 0;
let timer = null;
let startTime = null;
let todaySeconds = parseInt(localStorage.getItem("todaySeconds")) || 0;
let historyData = JSON.parse(localStorage.getItem("historyData")) || [];
let dailyTarget = parseInt(localStorage.getItem("dailyTarget")) || 0;

// ================= GAME PROGRESS DATA =================
let xp = parseInt(localStorage.getItem("xp")) || 0;
let level = parseInt(localStorage.getItem("level")) || 1;
let streak = parseInt(localStorage.getItem("streak")) || 0;
let lastStudyDate = localStorage.getItem("lastStudyDate") || null;

// ================= NAVIGATION =================
function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => {
    p.classList.add("hidden");
  });

  let page = document.getElementById(pageId);
  if (page) {
    page.classList.remove("hidden");
    page.style.animation = "none";
    void page.offsetWidth; // reset animation
    page.style.animation = "fadeIn 0.4s ease";
  }

  if (pageId === "history") updateHistory();
  if (pageId === "stats") updateChart();
  if (pageId === "game") initGameCanvas();
}


function initGameCanvas() {
  canvas = document.getElementById("gameCanvas");
  if (!canvas) return;
  ctx = canvas.getContext("2d");
}



// ================= TIME FORMAT =================
function formatTime(sec) {
  let h = Math.floor(sec / 3600);
  let m = Math.floor((sec % 3600) / 60);
  let s = sec % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ================= TIMER =================
function pauseTimer() {
  clearInterval(timer);
  timer = null;
}

function startTimer() {
  if (timer) return;

  startTime = Date.now() - seconds * 1000;

  timer = setInterval(() => {
    seconds = Math.floor((Date.now() - startTime) / 1000);
    let timeEl = document.getElementById("time");
    if (timeEl) timeEl.innerText = formatTime(seconds);
  }, 1000);
}

function stopTimer() {
  if (seconds === 0) return alert("Belum belajar!");

  // 🛑 Hentikan timer TOTAL
  clearInterval(timer);
  timer = null;

  let noteInput = document.getElementById("studyInput");
  let note = noteInput.value.trim() || "Belajar";
  let now = new Date();
  let dateKey = now.toISOString();
  let dateText = now.toLocaleDateString();
  
  historyData.push({
  note,
  time: seconds,
  dateKey,
  dateText
});

  localStorage.setItem("historyData", JSON.stringify(historyData));

  // 🎯 Tambah ke total hari ini
  todaySeconds += seconds;
  localStorage.setItem("todaySeconds", todaySeconds);

  // 🎮 Reward
  addXP(Math.floor(seconds / 60));
  updateStreak();

  // 🔄 UPDATE UI DULU
  updateHistory();
  updateProgressBar();
  updateChart();
  document.getElementById("todayTotal").innerText = formatTime(todaySeconds);

  // 🔥 RESET TIMER UI
  seconds = 0;
  document.getElementById("time").innerText = "00:00:00";
  noteInput.value = "";

  // 🔔 NOTIFIKASI
  setTimeout(() => {
    alert("✅ Riwayat belajar berhasil disimpan!");
  }, 100);
}

// ================= SOUND =================
function changeSound() {
  let audio = document.getElementById("focusAudio");
  let choice = document.getElementById("soundSelect").value;

  const sounds = {
    disneypiano: "sound/disneypiano.mp3",
    lofisound: "sound/lofisound.mp3",
    relaxcalm: "sound/relaxcalm.mp3",
    taylorswiftpiano: "sound/taylorswiftpiano.mp3"
  };

  if (choice === "off") {
    audio.pause();
    audio.src = "";
  } else {
    audio.src = sounds[choice];
    audio.loop = true; // biar muter terus
    audio.play();
  }
}


// ================= TARGET =================
function saveTarget() {
  dailyTarget = document.getElementById("targetInput").value * 3600;
  localStorage.setItem("dailyTarget", dailyTarget);
  updateProgressBar();
}

function updateProgressBar() {
  let bar = document.getElementById("progressBar");
  let percentText = document.getElementById("progressPercent");
  let text = document.getElementById("progressText");
  if (!bar || !percentText || !text || !dailyTarget) return;

  let percent = Math.min((todaySeconds / dailyTarget) * 100, 100);
  bar.style.width = percent + "%";
  percentText.innerText = Math.floor(percent) + "%";

  let learnedMin = Math.floor(todaySeconds/60);
  let targetMin = Math.floor(dailyTarget/60);
  let remainMin = Math.max(targetMin - learnedMin, 0);

  text.innerText = `Sudah belajar ${learnedMin} menit dari ${targetMin} menit. Sisa ${remainMin} menit lagi.`;
}

// ================= HISTORY =================
function updateHistory() {
  filterHistory("all");
}

function filterHistory(type) {
  let list = document.getElementById("historyList");
  if (!list) return;

  let now = new Date();
  let filtered = historyData;

  if (type === "day") {
    filtered = historyData.filter(i => {
      let d = new Date(i.dateKey);
      return d.toDateString() === now.toDateString();
    });
  }

  if (type === "month") {
    filtered = historyData.filter(i => {
      let d = new Date(i.dateKey);
      return d.getMonth() === now.getMonth() &&
             d.getFullYear() === now.getFullYear();
    });
  }

  if (type === "year") {
    filtered = historyData.filter(i => {
      let d = new Date(i.dateKey);
      return d.getFullYear() === now.getFullYear();
    });
  }

  list.innerHTML = filtered.length === 0
    ? "<li>Tidak ada data</li>"
    : filtered.map(i =>
        `<li>${i.dateText} - ${i.note} (${formatTime(i.time)})</li>`
      ).join("");
}

// ================= CHART =================
let studyChartInstance = null;

function updateChart() {
  let canvas = document.getElementById("studyChart");
  if (!canvas || typeof Chart === "undefined") return;

  let ctx = canvas.getContext("2d");

  let dates = [...new Set(historyData.map(i => i.dateText))];

  let totals = dates.map(d =>
    historyData
      .filter(i => i.dateText === d)
      .reduce((a, b) => a + b.time, 0) / 3600
  );

  if (studyChartInstance) studyChartInstance.destroy();

  studyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dates,
      datasets: [{
        label: 'Jam Belajar',
        data: totals,
        backgroundColor: "#4CAF50"
      }]
    },
    options: {
      plugins: {
        legend: {
          labels: {
            color: "white"   // 🔥 INI bikin "Jam Belajar" jadi putih
          }
        }
      },
      scales: {
        x: {
          ticks: { color: "white" } // tanggal di bawah jadi putih
        },
        y: {
          ticks: { color: "white" } // angka jam jadi putih
        }
      }
    }
  });
}


// ================= XP SYSTEM =================
function addXP(minutes) {
  xp += minutes * 10;
  while (xp >= 100) { xp -= 100; level++; alert("🎉 Level Up!"); }
  localStorage.setItem("xp", xp);
  localStorage.setItem("level", level);
}


function updateStreak() {
  let today = new Date().toLocaleDateString();
  if (lastStudyDate === today) return;
  let yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
  streak = (lastStudyDate === yesterday.toLocaleDateString()) ? streak+1 : 1;
  lastStudyDate = today;
  localStorage.setItem("streak", streak);
  localStorage.setItem("lastStudyDate", today);
}

// ================= GAME =================
let canvas, ctx;
let playerImg = new Image(); playerImg.src = "player.png";
let itemFiles = ["item1.png","item2.png","item3.jpg","item4.png"];
let itemImages = itemFiles.map(f => { let i=new Image(); i.src=f; return i; });

let player = { x:180, y:340, width:70, height:50 };
let stars = [];
let score = 0;
let gameInterval = null;

let gameStartTime = null;
let gameTimeLimit = 5 * 60 * 1000; // 5 menit
let gameRunning = false;

let gameLocked = false;
let studyAfterLock = 0;
let requiredStudyToUnlock = 25 * 60; // 25 menit (detik)

document.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft" && player.x > 0) player.x -= 20;
  if (e.key === "ArrowRight" && player.x < 350) player.x += 20;
});

function startGame() {

  if (gameLocked) {
    let remaining = Math.ceil((requiredStudyToUnlock - studyAfterLock)/60);
    return alert(`Game terkunci 🔒\nBelajar lagi ${remaining} menit untuk membuka game.`);
  }

  canvas = document.getElementById("gameCanvas");
  if (!canvas) return;
  ctx = canvas.getContext("2d");

  stars = [];
  score = 0;
  document.getElementById("score").innerText = score;

  gameStartTime = Date.now();
  gameRunning = true;

  clearInterval(gameInterval);
  gameInterval = setInterval(() => {
    updateGame();
    ctx.shadowColor = "#00ffcc";
ctx.shadowBlur = 15;
ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);
ctx.shadowBlur = 0;
    checkGameTime();
  }, 20);
}


function updateGame() {
  if (!ctx) return;
  ctx.clearRect(0,0,400,400);
  ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);

  if (Math.random() < 0.03) {
    let img = itemImages[Math.floor(Math.random()*itemImages.length)];
    stars.push({ x:Math.random()*350, y:0, size:40, img });
  }

  for (let i=0;i<stars.length;i++){
    stars[i].y += 3;
    ctx.drawImage(stars[i].img, stars[i].x, stars[i].y, stars[i].size, stars[i].size);

    if (stars[i].y + stars[i].size >= player.y &&
        stars[i].x < player.x + player.width &&
        stars[i].x + stars[i].size > player.x) {
      score++;
      document.getElementById("score").innerText = score;
      stars.splice(i,1); i--;
    }
    else if (stars[i].y > 400) {
      stars.splice(i,1); i--;
    }
  }
}

function checkGameTime() {
  if (!gameRunning) return;

  let elapsed = Date.now() - gameStartTime;

  if (elapsed >= gameTimeLimit) {
    stopGame();
    gameLocked = true;
    studyAfterLock = 0;

    alert("⏰ Waktu bermain habis (5 menit).\nSekarang kamu harus belajar 25 menit untuk membuka game lagi 📚");
  }
}

function stopGame() {
  clearInterval(gameInterval);
  gameRunning = false;

  // 🧹 Hapus semua objek game
  stars = [];
  score = 0;

  // 🧼 Bersihkan layar canvas
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // Reset skor tampilan
  let scoreEl = document.getElementById("score");
  if (scoreEl) scoreEl.innerText = "0";
}

function stopGameManually() {
  if (!gameRunning) return;

  stopGame();

  alert("🛑 Game dihentikan.\nAyo lanjut belajar ya! 📚");

  // reset waktu main supaya tidak dianggap habis 5 menit
  gameStartTime = null;
}

// ================= INIT =================
function checkNewDay() {
  let today = new Date().toDateString();

  if (lastActiveDate !== today) {
    todaySeconds = 0;
    localStorage.setItem("todaySeconds", 0);
    localStorage.setItem("lastActiveDate", today);
  }
}

window.onload = () => {

  checkNewDay(); // 🔥 WAJIB

  document.getElementById("todayTotal").innerText = formatTime(todaySeconds);

  updateHistory();
  updateBadgeUI();
  updateProgressBar();
  updateChart();
  showPage("dashboard");
};
