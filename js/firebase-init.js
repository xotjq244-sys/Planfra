// Firebase 프로젝트 설정 — Firebase 콘솔 > 프로젝트 설정 > 내 앱(웹)에서 그대로 복사해 채워넣는다.
// apiKey 등은 비밀값이 아니며, 실제 접근 제어는 Firestore 보안 규칙(허용 이메일 목록)이 담당한다.
const firebaseConfig = {
  apiKey: "AIzaSyDe7Or_Gb-UXHQ2-gANs_-0qN_hc_oBZLA",
  authDomain: "planfra-2c51e.firebaseapp.com",
  projectId: "planfra-2c51e",
  storageBucket: "planfra-2c51e.firebasestorage.app",
  messagingSenderId: "879012683511",
  appId: "1:879012683511:web:d0ef58b0c4fa62db0cbdf2",
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
window.auth = auth;
window.db = db;

const authGateOverlay = document.getElementById("authGateOverlay");
const authGateMessage = document.getElementById("authGateMessage");
const appRoot = document.getElementById("appRoot");
const googleSignInBtn = document.getElementById("googleSignInBtn");

// script.js는 별도 파일(전역 스코프)에서 나중에 로드되며, 그 안에서
// window.attachRealtimeSync / window.detachRealtimeSync 를 정의한다.
// 두 파일의 로드/실행 순서가 뒤바뀌어도 안전하도록 큐를 둔다.
window.__planfraOnReadyQueue = window.__planfraOnReadyQueue || [];
function runWhenScriptReady(fn) {
  if (window.attachRealtimeSync) fn();
  else window.__planfraOnReadyQueue.push(fn);
}

function showAppRoot() {
  authGateOverlay.hidden = true;
  appRoot.style.display = "";
}

function showLoginGate(message) {
  authGateMessage.textContent = message || "팀 구글 계정으로 로그인해주세요.";
  authGateOverlay.hidden = false;
  appRoot.style.display = "none";
}

// script.js의 tasks 리스너가 이 두 함수를 호출해 로그인 성공/거부를 알려준다.
window.__planfraAuthSuccess = function () {
  showAppRoot();
};

window.__planfraAuthDenied = function (attemptedEmail) {
  auth.signOut();
  showLoginGate(`접근 권한이 없는 계정입니다 (${attemptedEmail}). 관리자에게 문의하세요.`);
};

googleSignInBtn.addEventListener("click", () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch((err) => {
    if (err.code === "auth/popup-blocked" || err.code === "auth/operation-not-supported-in-this-environment") {
      auth.signInWithRedirect(provider);
      return;
    }
    showLoginGate("로그인 실패: " + err.message);
  });
});

auth.onAuthStateChanged((user) => {
  if (!user) {
    showLoginGate();
    if (window.detachRealtimeSync) window.detachRealtimeSync();
    return;
  }
  runWhenScriptReady(() => window.attachRealtimeSync(user.email));
});
