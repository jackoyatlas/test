import { auth, db } from "./firebase.js";
import { collection, addDoc, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

let cartId = 0;
const carts = {};
const START_TIME = 30 * 60;

function formatTime(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2,'0');
    const s = String(sec % 60).padStart(2,'0');
    return `${m}:${s}`;
}

export async function loadCarts() {
    const snap = await getDocs(collection(db, "users", auth.currentUser.uid, "carts"));
    snap.forEach(d => {
        cartId++;
        const data = d.data();
        addCartUI(cartId, data.name, data.desc, data.seconds);
    });
}

function addCartUI(id, name="Cart "+id, desc="", seconds=START_TIME) {
    carts[id] = { seconds, interval: null };
    const div = document.createElement("div");
    div.className = "timer";
    div.id = `cart-${id}`;
    div.innerHTML = `
        <input value="${name}" />
        <textarea>${desc}</textarea>
        <div class="time" id="display-${id}">${formatTime(seconds)}</div>
        <button class="start" onclick="startCart(${id})">Start</button>
        <button class="pause" onclick="pauseCart(${id})">Pause</button>
        <button class="reset" onclick="resetCart(${id})">Reset</button>
        <button class="delete" onclick="deleteCart(${id})">Delete</button>
        <button onclick="saveCart(${id})">💾 Save</button>
    `;
    document.getElementById("timers").appendChild(div);
}

window.addCart = () => {
    cartId++;
    addCartUI(cartId);
};

window.saveCart = async id => {
    const el = document.getElementById(`cart-${id}`);
    const name = el.querySelector("input").value;
    const desc = el.querySelector("textarea").value;
    await addDoc(collection(db, "users", auth.currentUser.uid, "carts"), { name, desc, seconds: carts[id].seconds });
};

window.startCart = id => {
    const cart = carts[id];
    if (!cart || cart.interval || cart.seconds <= 0) return;
    cart.interval = setInterval(() => {
        cart.seconds--;
        const display = document.getElementById(`display-${id}`);
        display.textContent = formatTime(cart.seconds);
        if(cart.seconds<=0) { clearInterval(cart.interval); cart.interval=null; display.classList.add("expired"); }
    },1000);
};

window.pauseCart = id => {
    const cart = carts[id];
    if(!cart) return;
    clearInterval(cart.interval);
    cart.interval=null;
};

window.resetCart = id => {
    pauseCart(id);
    carts[id].seconds=START_TIME;
    const display = document.getElementById(`display-${id}`);
    display.textContent = formatTime(START_TIME);
    display.classList.remove("expired");
};

window.deleteCart = id => {
    pauseCart(id);
    delete carts[id];
    document.getElementById(`cart-${id}`)?.remove();
};
