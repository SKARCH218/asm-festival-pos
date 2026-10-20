// Firebase 콘솔 > 프로젝트 설정 > 내 앱(웹)에서 복사한 값으로 교체하세요.
export const firebaseConfig = {
  apiKey: "AIzaSyA41-cx1e_vqOVFMkpDQSEWIuI0npXPVfk",
  authDomain: "asm-festival-pos.firebaseapp.com",
  projectId: "asm-festival-pos",
  storageBucket: "asm-festival-pos.firebasestorage.app",
  messagingSenderId: "204137128375",
  appId: "1:204137128375:web:b1e61534e51f122fb70832",
};

// 선생님(teacher.html) 화면 접근 PIN.
// 클라이언트 측 확인이라 보안 장치가 아니라 "실수 방지용"입니다.
export const TEACHER_PIN = "0000";

// 혼잡도 기준: 조리 대기 중인 주문 수
export const CONGESTION = [
  { max: 2, label: "여유", color: "bg-emerald-500", text: "text-emerald-600" },
  { max: 5, label: "보통", color: "bg-yellow-400", text: "text-yellow-600" },
  { max: 9, label: "혼잡", color: "bg-orange-500", text: "text-orange-600" },
  { max: Infinity, label: "매우 혼잡", color: "bg-red-600", text: "text-red-600" },
];
