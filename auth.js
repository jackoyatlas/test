import { auth } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const email = document.getElementById("email");
const password = document.getElementById("password");
const authBtn = document.getElementById("auth-btn");
const forgotLink = document.getElementById("forgot-link");

let isLogin = true;

function authStatus(msg) {
  document.getElementById("auth-status").textContent = msg;
  console.log(msg);
}

window.login = () => {
  signInWithEmailAndPassword(auth, email.value, password.value)
    .catch(e => authStatus(e.message));
};

window.signup = () => {
  createUserWithEmailAndPassword(auth, email.value, password.value)
    .catch(e => authStatus(e.message));
};

window.forgot = () => {
  if (!email.value) return authStatus("Enter email first");
  sendPasswordResetEmail(auth, email.value)
    .then(() => authStatus("Password reset email sent"))
    .catch(e => authStatus(e.message));
};

window.logout = () => signOut(auth);

authBtn.addEventListener("click", () => isLogin ? login() : signup());
forgotLink.addEventListener("click", forgot);

window.switchAuth = () => {
  isLogin = !isLogin;
  document.getElementById("auth-title").textContent = isLogin ? "Login" : "Sign Up";
  authBtn.textContent = isLogin ? "Login" : "Create Account";
  document.querySelector(".switch").innerHTML =
    isLogin
      ? `Don’t have an account? <span onclick="switchAuth()">Sign Up</span>`
      : `Already have an account? <span onclick="switchAuth()">Login</span>`;
};

onAuthStateChanged(auth, user => {
  if (user) {
    document.getElementById("app").style.display = "block";
    document.querySelector(".auth-box").style.display = "none";
    import("./app.js").then(m => m.loadCarts());
  } else {
    document.getElementById("app").style.display = "none";
    document.querySelector(".auth-box").style.display = "flex";
  }
});
