<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Nyapuru Club</title>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js"></script>
<style>
html,body{
  height:100%;
  margin:0;
  font-family:"Inter",sans-serif;
  background:white;
  color:#222;
  display:flex;
  justify-content:center;
  align-items:center;
  flex-direction:column;
  touch-action: manipulation;
}
*{-webkit-tap-highlight-color: transparent;}
h1{
  margin-bottom:30px;
  font-size:1.6em;
}
#penguin{
  width:160px;
  height:160px;
  cursor:pointer;
  display:block;
  transition: transform 0.1s ease;
  user-select:none;
}
#penguin:active{
  transform: scale(0.95);
}
</style>
</head>
<body>
<h1 id="greet">Привет!</h1>
<img id="penguin" src="https://img.cryptorank.io/coins/pudgy_penguins1734444110427.png" alt="Пингвин">

<script>
const firebaseConfig = {
  apiKey: "AIzaSyAsEXre9p0gcOHFDtjcMUN-meh3T4hU_xE",
  authDomain: "nyapclub.firebaseapp.com",
  projectId: "nyapclub",
  storageBucket: "nyapclub.firebasestorage.app",
  messagingSenderId: "53370013681",
  appId: "1:53370013681:web:0f715a2ce01d69db65a650"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const FieldValue = firebase.firestore.FieldValue;

const tg = window.Telegram.WebApp;

// Если сайт открыт не через Telegram
if (!tg.initDataUnsafe?.user) {
  document.body.innerHTML = `
    <h1>Авторизуйтесь через Telegram</h1>
    <p>Сканируйте QR-код, чтобы открыть приложение:</p>
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://t.me/nyapclub_bot" alt="QR код">
  `;
} else {
  // Запрос Fullscreen только на мобильных
  if (/Mobi|Android/i.test(navigator.userAgent)) {
    try { tg.requestFullscreen(); } catch(e) { console.log("Fullscreen error:", e); }
  }

  const user = tg.initDataUnsafe.user;
  const greet = document.getElementById("greet");
  const penguin = document.getElementById("penguin");

  greet.textContent = `Привет, ${user.first_name}!`;

  let clicks = 0;
  const userDoc = db.collection("users").doc(user.id.toString());

  userDoc.get().then(docSnap => {
    if (!docSnap.exists) {
      userDoc.set({
        name: user.first_name,
        clicks: 0,
        photo_url: user.photo_url || "https://placekitten.com/32/32"
      }).then(initClickHandler);
    } else {
      userDoc.set({
        name: user.first_name,
        photo_url: user.photo_url || "https://placekitten.com/32/32"
      }, { merge: true }).then(initClickHandler);
    }
  });

  function initClickHandler() {
    penguin.addEventListener("mousedown", animateClick);
    penguin.addEventListener("touchstart", animateClick);

    penguin.addEventListener("click", () => {
      clicks++;
      userDoc.update({ clicks: FieldValue.increment(1) })
        .catch(err => console.log("Ошибка записи в Firestore:", err));

      if (clicks >= 30) {
        window.location.href = "profile.html";
      }
    });
  }

  function animateClick() {
    penguin.style.transform = "scale(0.95)";
    setTimeout(() => penguin.style.transform = "scale(1)", 100);
  }
}
</script>
</body>
</html>
