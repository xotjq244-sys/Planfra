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

// 지금은 팀 내부용으로 로그인 절차 없이 누구나 바로 실시간 데이터에 접근하게 열어둔 상태다.
// (그만큼 Firestore 보안 규칙도 인증 없이 읽기/쓰기를 허용하도록 되어 있어야 동작한다.)
// 나중에 PIN이나 구글 로그인을 다시 켤 때는 PUBLIC_ACCESS_MODE를 false로 바꾸면
// 아래 로그인 게이트 로직(showLoginGate, 구글 버튼, onAuthStateChanged)이 그대로 살아난다.
const PUBLIC_ACCESS_MODE = true;

// script.js의 tasks 리스너가 이 두 함수를 호출해 로그인 성공/거부(=Firestore 권한 거부)를 알려준다.
// PUBLIC_ACCESS_MODE에서도 attachRealtimeSync는 그대로 이 둘을 호출하므로 항상 정의해둔다.
window.__planfraAuthSuccess = function () {
  localStorage.setItem(AUTH_HINT_KEY, "1");
  showAppRoot();
};

window.__planfraAuthDenied = function (attemptedEmail) {
  if (PUBLIC_ACCESS_MODE) {
    showLoginGate("데이터 접근이 거부되었습니다. Firestore 보안 규칙을 확인해주세요.");
    return;
  }
  auth.signOut();
  showLoginGate(`접근 권한이 없는 계정입니다 (${attemptedEmail}). 관리자에게 문의하세요.`);
};

if (PUBLIC_ACCESS_MODE) {
  showAppRoot();
  runWhenScriptReady(() => window.attachRealtimeSync(null));
} else {
  const isLocalDev = !location.hostname.endsWith("github.io");

  if (isLocalDev || localStorage.getItem(AUTH_HINT_KEY) === "1") {
    showAppRoot();
  }

  // GitHub Pages는 Cross-Origin-Opener-Policy 헤더를 기본으로 붙이는데, 이게
  // Firebase의 signInWithPopup 창 감지(window.closed 체크)를 막아 팝업이
  // 로그인 없이 그냥 닫혀버리는 문제가 있다. 그래서 팝업 대신 리디렉션 방식을 쓴다.
  googleSignInBtn.addEventListener("click", () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithRedirect(provider).catch((err) => {
      showLoginGate("로그인 실패: " + err.message);
    });
  });

  // VS Code 통합 브라우저 같은 특수 웹뷰(location.protocol이 http/https/chrome-extension이
  // 아닌 경우)에서는 Firebase Auth 자체가 동작하지 않아 이 호출이 무조건 실패한다.
  // 그런 환경에서는 애초에 로그인이 불가능하니 호출 자체를 건너뛴다.
  const isAuthSupportedProtocol = ["http:", "https:", "chrome-extension:"].includes(location.protocol);

  if (isAuthSupportedProtocol) {
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
  }
}
