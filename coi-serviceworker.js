/*
 * 이전에 사용하던 coi-serviceworker(COOP/COEP 헤더 주입)를 제거하기 위한 "킬 스위치" 서비스 워커.
 *
 * - 변환기는 단일 스레드 gifski(encode.js)를 사용하므로 cross-origin isolation이 필요 없습니다.
 * - COEP: require-corp 가 사이트 전체에 걸리면 Google AdSense 광고 iframe, giscus 댓글 iframe이 차단됩니다.
 * - 이미 설치된 방문자 브라우저는 이 파일을 업데이트로 받아 스스로 등록 해제된 뒤 페이지를 새로고침합니다.
 * - 이 파일은 일정 기간(수개월) 유지한 뒤 삭제해도 됩니다.
 */
if (typeof window === "undefined") {
    self.addEventListener("install", () => self.skipWaiting());
    self.addEventListener("activate", (event) => {
        event.waitUntil(
            (async () => {
                await self.registration.unregister();
                const clients = await self.clients.matchAll({ type: "window" });
                clients.forEach((client) => client.navigate(client.url));
            })()
        );
    });
}
