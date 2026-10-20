# 학교 축제 멀티 부스 포스 & 주방 시스템

서버 없는 정적 웹(HTML + Tailwind CDN) + Firebase Firestore 실시간 동기화 + Firebase Hosting.

## 주소 구조
| 주소 | 대상 | 비고 |
|---|---|---|
| `/` | **소비자용** 학급 혼잡도 안내 | 매출 데이터에 접근하지 않음 (`congestion` 컬렉션만 읽음) |
| `/pos` | 운영진 입구 (학년·반 선택) | `noindex` |
| `/pos/order?class=3-1` | 주문 접수·결제, 메뉴 추가/편집, 주문 내역(요리 완성·환불) | |
| `/pos/kitchen?class=3-1` | 주방 실시간 주문 카드, [요리 완성]·[환불] | |
| `/pos/teacher` | 전교 매출·혼잡도·순위 | PIN (`firebase-config.js`) |

## 데이터 구조
```
classes/{class_3_1}     label, orderSeq, totalSales, orderCount        ← 매출 (운영진 전용으로 사용)
  menus/{auto}          name, price, soldOut, createdAt
  orders/{auto}         orderNo, buyer, items[], total, status(pending|done|canceled), createdAt
congestion/{class_3_1}  pendingCount, updatedAt                        ← 소비자 페이지가 읽는 유일한 데이터
```

## 배포
```bash
npx firebase-tools@latest login            # 최초 1회
npx firebase-tools@latest deploy           # hosting + firestore 규칙
```
기본 주소: https://asm-festival-pos.web.app

## 커스텀 도메인 `아스마축제.kro.kr`
브라우저 표기는 한글이지만 DNS에는 punycode로 등록합니다: **`xn--hz2b15nu6bj3deuj.kro.kr`**
1. Firebase 콘솔 → Hosting → **도메인 추가** → `xn--hz2b15nu6bj3deuj.kro.kr` 입력
2. 콘솔이 알려주는 **TXT 레코드**와 **A 레코드**를 kro.kr(내도메인.한국) DNS 관리에 등록
3. 소유권 확인 후 SSL 인증서가 자동 발급됨(수 분~24시간)

## 알아둘 점
- 로그인이 없어 `classes` 문서는 규칙상 누구나 읽을 수 있습니다. 소비자 페이지 코드는 매출을 읽지 않지만, 규칙만으로 매출 열람을 완전히 막을 수는 없습니다. 완전한 차단이 필요하면 Firebase Auth(익명/이메일)를 붙여 `classes`를 인증된 운영진에게만 열어야 합니다.
- 축제가 끝나면 Firestore 규칙을 `allow read, write: if false;`로 잠그세요.
