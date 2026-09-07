// Firebase 프로젝트 설정 — Firebase 콘솔 > 프로젝트 설정 > 내 앱(웹)에서 그대로 복사해 채워넣는다.
// apiKey 등은 비밀값이 아니며, 실제 접근 제어는 Firestore 보안 규칙이 담당한다.
const firebaseConfig = {
  apiKey: "AIzaSyDe7Or_Gb-UXHQ2-gANs_-0qN_hc_oBZLA",
  authDomain: "planfrom-2c51e.firebaseapp.com",
  projectId: "planfrom-2c51e",
  storageBucket: "planfrom-2c51e.firebasestorage.app",
  messagingSenderId: "879012683511",
  appId: "1:879012683511:web:d0ef58b0c4fa62db0cbdf2",
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
window.db = db;

const authGateOverlay = document.getElementById("authGateOverlay");
const authGateMessage = document.getElementById("authGateMessage");
const authGateSpinner = document.querySelector(".auth-gate-spinner");
const appRoot = document.getElementById("appRoot");

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

function showAccessDenied(message) {
  authGateMessage.textContent = message || "데이터 접근이 거부되었습니다. Firestore 보안 규칙을 확인해주세요.";
  authGateSpinner.hidden = true;
  authGateOverlay.hidden = false;
  appRoot.style.display = "none";
}

// 로그인 절차 없이 누구나 바로 화면과 실시간 데이터를 본다.
// 실제 접근 제어는 Firestore 보안 규칙이 담당하므로, 규칙이 인증 없는 읽기/쓰기를
// 허용하도록 되어 있어야 실제 데이터가 뜬다 — 안 그러면 "접근 거부" 화면만 보인다.
showAppRoot();
runWhenScriptReady(() => window.attachRealtimeSync());

// script.js의 tasks 리스너가 이 두 함수를 호출해 최초 연결 성공/거부를 알려준다.
window.__planfraAuthSuccess = function () {
  showAppRoot();
};

window.__planfraAuthDenied = function () {
  showAccessDenied();
};
