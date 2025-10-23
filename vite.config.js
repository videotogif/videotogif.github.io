import { resolve } from "path";

export default {
    root: ".", // 프로젝트 루트
    build: {
        outDir: "assets", // 빌드 산출물 위치
        emptyOutDir: true, // 매 빌드마다 비우기
        lib: {
            entry: resolve(__dirname, "src/main.js"), //  진입 파일 정확히 지정
            formats: ["es"],
            fileName: () => "js/main.js", // /assets/main.js 로 출력
        },
        rollupOptions: {
            output: {
                // CSS를 하나로 추출하려면 main.js에서 `import '../style.css'`를 추가하세요.
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name && assetInfo.name.endsWith(".css")) {
                        return "css/style.css"; // /assets/style.css 로 출력
                    }
                    return assetInfo.name || "[name][extname]";
                },
            },
        },
    },
};