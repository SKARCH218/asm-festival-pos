import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, collection, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, runTransaction,
  query, where,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
// 학교 와이파이가 불안정해도 화면이 죽지 않도록 로컬 캐시 사용
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

export {
  doc, collection, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, runTransaction, query, where,
};

export const won = (n) => (n || 0).toLocaleString("ko-KR") + "원";

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// 우리 학교: 3개 학년 × 5학급 (하드코딩)
export const CLASSES = [1, 2, 3].flatMap((g) => [1, 2, 3, 4, 5].map((n) => `${g}-${n}`));

// "3-1" -> "class_3_1"
export const classId = (label) => "class_" + label.replace(/-/g, "_");

// ?class=3-1  ->  { label: "3-1", id: "class_3_1" }
export function getClass() {
  const label = (new URLSearchParams(location.search).get("class") || "").trim();
  if (!CLASSES.includes(label)) { location.replace("/pos/"); throw new Error("올바르지 않은 class 파라미터"); }
  return { label, id: classId(label) };
}

// 혼잡도(조리 대기 건수)는 매출과 분리된 공개용 컬렉션에 저장 — 소비자 페이지는 이것만 읽는다.
export const congestionRef = (id) => doc(db, "congestion", id);
export const congestionCol = () => collection(db, "congestion");

export function classRefs(id) {
  const classRef = doc(db, "classes", id);
  return {
    classRef,
    menusCol: collection(db, "classes", id, "menus"),
    ordersCol: collection(db, "classes", id, "orders"),
  };
}

export async function ensureClass(id, label) {
  await setDoc(doc(db, "classes", id), { label }, { merge: true });
}

export function requirePin(expected) {
  const key = "pin_ok_" + expected;
  if (sessionStorage.getItem(key)) return;
  const input = prompt("PIN을 입력하세요");
  if (input !== expected) {
    document.body.innerHTML = '<p class="p-8 text-center text-lg">PIN이 올바르지 않습니다. 새로고침해서 다시 시도하세요.</p>';
    throw new Error("PIN 불일치");
  }
  sessionStorage.setItem(key, "1");
}

export function toast(msg, ms = 2500) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-lg text-lg z-50 transition-opacity";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = 1;
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.style.opacity = 0), ms);
}

export function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 880; g.gain.value = 0.15;
    o.start(); o.stop(ctx.currentTime + 0.25);
  } catch {}
}

// 요리 완성: pending -> done, 대기 건수 -1
export async function completeOrder(id, orderId) {
  const { classRef, ordersCol } = classRefs(id);
  const oref = doc(ordersCol, orderId);
  await runTransaction(db, async (tx) => {
    const o = (await tx.get(oref)).data();
    if (!o || o.status !== "pending") return; // 이미 완료/취소됨
    const cg = (await tx.get(congestionRef(id))).data() || {};
    tx.update(oref, { status: "done", doneAt: Date.now() });
    tx.set(congestionRef(id), { pendingCount: Math.max(0, (cg.pendingCount || 0) - 1), updatedAt: Date.now() }, { merge: true });
  });
}

// 주문 취소(환불): 매출·주문 수에서 빼고, 조리 대기 중이었다면 대기 건수도 -1
export async function cancelOrder(id, orderId) {
  const { classRef, ordersCol } = classRefs(id);
  const oref = doc(ordersCol, orderId);
  await runTransaction(db, async (tx) => {
    const o = (await tx.get(oref)).data();
    if (!o || o.status === "canceled") return;
    const c = (await tx.get(classRef)).data() || {};
    const cg = (await tx.get(congestionRef(id))).data() || {};
    tx.update(oref, { status: "canceled", canceledAt: Date.now() });
    tx.set(classRef, {
      totalSales: Math.max(0, (c.totalSales || 0) - o.total),
      orderCount: Math.max(0, (c.orderCount || 0) - 1),
    }, { merge: true });
    if (o.status === "pending") {
      tx.set(congestionRef(id), { pendingCount: Math.max(0, (cg.pendingCount || 0) - 1), updatedAt: Date.now() }, { merge: true });
    }
  });
}

// 완전 삭제(복구 불가): 주문 문서를 지운다. 취소되지 않은 주문이면 매출·주문 수(조리 중이면 대기 건수)도 함께 뺀다.
export async function deleteOrder(id, orderId) {
  const { classRef, ordersCol } = classRefs(id);
  const oref = doc(ordersCol, orderId);
  await runTransaction(db, async (tx) => {
    const o = (await tx.get(oref)).data();
    if (!o) return;
    const c = (await tx.get(classRef)).data() || {};
    const cg = (await tx.get(congestionRef(id))).data() || {};
    if (o.status !== "canceled") {
      tx.set(classRef, {
        totalSales: Math.max(0, (c.totalSales || 0) - o.total),
        orderCount: Math.max(0, (c.orderCount || 0) - 1),
      }, { merge: true });
    }
    if (o.status === "pending") {
      tx.set(congestionRef(id), { pendingCount: Math.max(0, (cg.pendingCount || 0) - 1), updatedAt: Date.now() }, { merge: true });
    }
    tx.delete(oref);
  });
}
