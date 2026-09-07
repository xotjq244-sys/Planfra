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
const authGateSpinner = document.querySelector(".auth-gate-spinner");
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

// 이전에 로그인에 성공한 적이 있으면 기억해뒀다가, 다음 방문 때는 Firebase의
// 로그인 상태 확인이 끝나기 전에 미리 화면을 띄워 "확인 중" 깜빡임을 없앤다.
// 실제로 세션이 끊겨 있었다면 onAuthStateChanged가 곧이어 로그인 화면으로 되돌린다.
const AUTH_HINT_KEY = "planfra_auth_hint";

function showAppRoot() {
  authGateOverlay.hidden = true;
  appRoot.style.display = "";
}

function showLoginGate(message) {
  authGateMessage.textContent = message || "팀 구글 계정으로 로그인해주세요.";
  authGateSpinner.hidden = true;
  googleSignInBtn.hidden = false;
  authGateOverlay.hidden = false;
  appRoot.style.display = "none";
  localStorage.removeItem(AUTH_HINT_KEY);
}

// 로컬(localhost)에서 VS Code Live Server 등으로 열었을 때는 로그인 절차 없이
// 바로 화면을 보여준다 — localhost는 외부에서 접근 불가능하니 안전하다.
// (단, 이 경우 실제 Firestore 데이터는 로그인 전까지 안 뜨고 캐시된 값만 보인다.)
const isLocalDev = ["localhost", "127.0.0.1"].includes(location.hostname);

if (isLocalDev || localStorage.getItem(AUTH_HINT_KEY) === "1") {
  showAppRoot();
}

// script.js의 tasks 리스너가 이 두 함수를 호출해 로그인 성공/거부를 알려준다.
window.__planfraAuthSuccess = function () {
  localStorage.setItem(AUTH_HINT_KEY, "1");
  showAppRoot();
};

window.__planfraAuthDenied = function (attemptedEmail) {
  auth.signOut();
  showLoginGate(`접근 권한이 없는 계정입니다 (${attemptedEmail}). 관리자에게 문의하세요.`);
};

// GitHub Pages는 Cross-Origin-Opener-Policy 헤더를 기본으로 붙이는데, 이게
// Firebase의 signInWithPopup 창 감지(window.closed 체크)를 막아 팝업이
// 로그인 없이 그냥 닫혀버리는 문제가 있다. 그래서 팝업 대신 리디렉션 방식을 쓴다.
googleSignInBtn.addEventListener("click", () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithRedirect(provider).catch((err) => {
    showLoginGate("로그인 실패: " + err.message);
  });
});

auth.getRedirectResult().catch((err) => {
  showLoginGate("로그인 실패: " + err.message);
});

auth.onAuthStateChanged((user) => {
  if (!user) {
    if (!isLocalDev) showLoginGate();
    if (window.detachRealtimeSync) window.detachRealtimeSync();
    return;
  }
  runWhenScriptReady(() => window.attachRealtimeSync(user.email));
});
