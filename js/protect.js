// 우클릭/개발자도구 단축키를 막아 일반 사용자의 우발적인 소스 열람을 줄인다.
// 참고: 브라우저 메뉴(설정 > 개발자 도구)나 view-source: 접근까지 막지는 못한다.
(function () {
  document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  });

  document.addEventListener("keydown", function (e) {
    const key = e.key.toUpperCase();
    const isDevToolsKey =
      key === "F12" ||
      (e.ctrlKey && e.shiftKey && (key === "I" || key === "J" || key === "C")) ||
      (e.ctrlKey && key === "U");
    if (isDevToolsKey) {
      e.preventDefault();
    }
  });
})();
