import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

import { db } from "./firebase.js";

let cartId = 0;
const carts = {};
const START_TIME = 30 * 60;

function formatTime(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

window.addCart = async function () {
  cartId++;

  const docRef = await addDoc(collection(db, "carts"), {
    name: `Cart ${cartId}`,
    description: "",
    status: "created",
    createdAt: serverTimestamp()
  });

  carts[cartId] = {
    seconds: START_TIME,
    interval: null,
    docId: docRef.id
  };

  const div = document.createElement("div");
  div.className = "timer";
  div.id = `cart-${cartId}`;

  div.innerHTML = `
    <input id="name-${cartId}" value="Cart ${cartId}">
    <textarea id="desc-${cartId}" placeholder="Description..."></textarea>
    <div class="time" id="display-${cartId}">30:00</div>
    <button class="start" onclick="startCart(${cartId})">Start</button>
    <button class="pause" onclick="pauseCart(${cartId})">Pause</button>
    <button class="reset" onclick="resetCart(${cartId})">Reset</button>
    <button class="delete" onclick="deleteCart(${cartId})">Delete</button>
  `;

  document.getElementById("timers").appendChild(div);
};

window.startCart = async function (id) {
  const cart = carts[id];
  if (!cart || cart.interval) return;

  await updateDoc(doc(db, "carts", cart.docId), {
    status: "running",
    startTime: new Date(),
    name: document.getElementById(`name-${id}`).value,
    description: document.getElementById(`desc-${id}`).value
  });

  cart.interval = setInterval(() => {
    cart.seconds--;
    document.getElementById(`display-${id}`).textContent = formatTime(cart.seconds);
    if (cart.seconds <= 0) finishCart(id);
  }, 1000);
};

async function finishCart(id) {
  clearInterval(carts[id].interval);

  await updateDoc(doc(db, "carts", carts[id].docId), {
    status: "completed",
    endTime: new Date(),
    durationSeconds: START_TIME
  });

  document.getElementById(`display-${id}`).classList.add("expired");
}

window.pauseCart = function (id) {
  clearInterval(carts[id].interval);
  carts[id].interval = null;
};

window.resetCart = async function (id) {
  pauseCart(id);
  carts[id].seconds = START_TIME;

  await updateDoc(doc(db, "carts", carts[id].docId), { status: "reset" });

  document.getElementById(`display-${id}`).textContent = "30:00";
};

window.deleteCart = async function (id) {
  pauseCart(id);
  await updateDoc(doc(db, "carts", carts[id].docId), { status: "deleted" });
  document.getElementById(`cart-${id}`).remove();
};
