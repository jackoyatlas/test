import { db, auth } from "./firebase.js";
import { collection, addDoc, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

let cartId = 0;
const carts = {};
const START_TIME = 30 * 60;
const DATE_FORMAT = new Date().toISOString().split('T')[0];

// Format seconds to mm:ss
const formatTime = sec => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

// Helper to get cart element
const getCartElement = id => document.getElementById(`cart-${id}`);

// Helper to get cart data from DOM
const getCartData = id => {
    const el = getCartElement(id);
    if (!el) return null;
    return {
        name: el.querySelector("input").value,
        desc: el.querySelector("textarea").value,
        seconds: carts[id].seconds
    };
};

// Helper to create cart HTML
const createCartHTML = (id, name = `Cart ${id}`, desc = "", time = "30:00") => `
    <input class="cart-name" type="text" value="${name}" placeholder="Enter cart name" />
    <textarea placeholder="Description...">${desc}</textarea>
    <div class="time" id="display-${id}">${time}</div>
    <button class="start" onclick="startCart(${id})">Start</button>
    <button class="pause" onclick="pauseCart(${id})">Pause</button>
    <button class="reset" onclick="resetCart(${id})">Reset</button>
    <button class="delete" onclick="deleteCart(${id})">Delete</button>
`;

// Helper to create and append cart to DOM
const createCartElement = (id, name, desc, time) => {
    const div = document.createElement("div");
    div.className = "timer";
    div.id = `cart-${id}`;
    div.innerHTML = createCartHTML(id, name, desc, time);
    // Automatically save cart data when cart is clicked (focused)
    div.addEventListener("click", () => {
        saveCart(id);
    });
    document.getElementById("timers").appendChild(div);
};

// Add new cart
window.addCart = async () => {
    cartId++;
    const created = new Date().toISOString();
    carts[cartId] = { seconds: START_TIME, interval: null, created };
    createCartElement(cartId);
    await saveCart(cartId, created);
};

// Start timer
window.startCart = id => {
    const cart = carts[id];
    if (!cart || cart.interval || cart.seconds <= 0) return;
    cart.interval = setInterval(() => {
        cart.seconds--;
        const display = document.getElementById(`display-${id}`);
        display.textContent = formatTime(cart.seconds);
        if (cart.seconds <= 0) {
            clearInterval(cart.interval);
            cart.interval = null;
            display.classList.add("expired");
        }
    }, 1000);
};

// Pause timer
window.pauseCart = id => {
    const cart = carts[id];
    if (!cart) return;
    clearInterval(cart.interval);
    cart.interval = null;
};

// Reset timer
window.resetCart = id => {
    pauseCart(id);
    carts[id].seconds = START_TIME;
    const display = document.getElementById(`display-${id}`);
    display.textContent = formatTime(START_TIME);
    display.classList.remove("expired");
};

// Delete cart
window.deleteCart = id => {
    pauseCart(id);
    delete carts[id];
    getCartElement(id)?.remove();
};

// Save cart to Firebase
window.saveCart = async id => {
    const data = getCartData(id);
    if (!data) return;
    // Attach created timestamp if provided
    let created = carts[id]?.created;
    if (!created) created = new Date().toISOString();
    try {
        await addDoc(collection(db, "users", auth.currentUser.uid, "carts"), {
            ...data,
            created
        });
    } catch (e) {
        console.error("Error saving cart:", e.message);
    }
};

// Modal helpers
const toggleModal = show => {
    document.getElementById("reportModal").style.display = show ? "flex" : "none";
};
window.showReportModal = () => toggleModal(true);
window.closeReportModal = () => toggleModal(false);


// Get formatted report data from Firebase
const getReportData = async () => {
    if (!auth.currentUser) return [];
    // Get date range from UI
    const startInput = document.getElementById('start-date');
    const endInput = document.getElementById('end-date');
    let startDate = startInput && startInput.value ? new Date(startInput.value) : null;
    let endDate = endInput && endInput.value ? new Date(endInput.value) : null;
    if (endDate) endDate.setHours(23,59,59,999); // include full end day
    try {
        const snap = await getDocs(collection(db, "users", auth.currentUser.uid, "carts"));
        const data = [];
        snap.forEach(docData => {
            const d = docData.data();
            const created = d.created ? new Date(d.created) : null;
            // Filter by date range if set
            if (created && startDate && created < startDate) return;
            if (created && endDate && created > endDate) return;
            data.push({
                id: docData.id,
                name: d.name,
                desc: d.desc || "",
                seconds: d.seconds,
                time: formatTime(d.seconds),
                created
            });
        });
        return data.filter(item => item.name);
    } catch (e) {
        console.error("Error loading carts for report:", e.message);
        return [];
    }
};

// Generate report (text file)
window.generateReport = async () => {
    const data = await getReportData();
    let report = "GO CART COUNTDOWN REPORT\n========================\n";
    // Calculate started and ended date range
    let started = null, ended = null;
    const dates = data.map(item => item.created).filter(d => d);
    if (dates.length > 0) {
        dates.sort((a, b) => a - b);
        started = dates[0];
        ended = dates[dates.length - 1];
        const options = { month: 'long', day: 'numeric' };
        let range = started.getFullYear() === ended.getFullYear() && started.getMonth() === ended.getMonth()
            ? `${started.toLocaleDateString(undefined, options)}-${ended.getDate()}, ${ended.getFullYear()}`
            : `${started.toLocaleDateString(undefined, options)} - ${ended.toLocaleDateString(undefined, options)}, ${ended.getFullYear()}`;
        report += `Date Range: ${range}\n`;
    }
    report += `Generated: ${new Date().toLocaleString()}\n\n`;
    if (data.length === 0) {
        report += "No carts found.\n";
    } else {
        report += `Total Carts: ${data.length}\n\n`;
        data.forEach(item => {
            const addedTime = item.created ? item.created.toLocaleString() : "N/A";
            report += `Cart ID: ${item.id}\nName: ${item.name}\nDescription: ${item.desc || "N/A"}\nStarting Time: 30:00\nAdded Time: ${addedTime}\nCurrent Time: ${formatTime(item.seconds)}\n---\n`;
        });
    }
    const element = document.createElement("a");
    element.href = "data:text/plain;charset=utf-8," + encodeURIComponent(report);
    element.download = `cart-report-${DATE_FORMAT}.txt`;
    element.click();

    // Save report to Firebase as plain text
    saveReportToFirebase("text", report);
};

// Export as PDF
window.exportPDF = async () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const data = await getReportData();
    let yPosition = 10;
    doc.setFontSize(16);
    doc.text("GO CART COUNTDOWN REPORT", 10, yPosition);
    yPosition += 10;
    // Calculate started and ended date range
    let started = null, ended = null;
    const dates = data.map(item => item.created).filter(d => d);
    if (dates.length > 0) {
        dates.sort((a, b) => a - b);
        started = dates[0];
        ended = dates[dates.length - 1];
        const options = { month: 'long', day: 'numeric' };
        let range = started.getFullYear() === ended.getFullYear() && started.getMonth() === ended.getMonth()
            ? `${started.toLocaleDateString(undefined, options)}-${ended.getDate()}, ${ended.getFullYear()}`
            : `${started.toLocaleDateString(undefined, options)} - ${ended.toLocaleDateString(undefined, options)}, ${ended.getFullYear()}`;
        doc.text(`Date Range: ${range}`, 10, yPosition);
        yPosition += 10;
    }
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 10, yPosition);
    yPosition += 10;
    if (data.length === 0) {
        doc.text("No carts found.", 10, yPosition);
    } else {
        doc.text(`Total Carts: ${data.length}`, 10, yPosition);
        yPosition += 10;
        data.forEach(item => {
            if (yPosition > 270) {
                doc.addPage();
                yPosition = 10;
            }
            const addedTime = item.created ? item.created.toLocaleString() : "N/A";
            doc.text(`Cart ID: ${item.id}`, 10, yPosition);
            yPosition += 6;
            doc.text(`Name: ${item.name}`, 10, yPosition);
            yPosition += 6;
            doc.text(`Description: ${item.desc || "N/A"}`, 10, yPosition);
            yPosition += 6;
            doc.text(`Starting Time: 30:00`, 10, yPosition);
            yPosition += 6;
            doc.text(`Added Time: ${addedTime}`, 10, yPosition);
            yPosition += 6;
            doc.text(`Current Time: ${formatTime(item.seconds)}`, 10, yPosition);
            yPosition += 8;
        });
    }
    doc.save(`cart-report-${DATE_FORMAT}.pdf`);
    closeReportModal();

    // Save report to Firebase as structured JSON
    saveReportToFirebase("pdf", data);
};

// Export as Excel
window.exportExcel = async () => {
    const header = ["Cart ID", "Name", "Description", "Starting Time", "Added Time", "Current Time", "Seconds", "Created Date"];
    const cartData = await getReportData();
    // Calculate started and ended date range
    let started = null, ended = null;
    const dates = cartData.map(item => item.created).filter(d => d);
    if (dates.length > 0) {
        dates.sort((a, b) => a - b);
        started = dates[0];
        ended = dates[dates.length - 1];
        const options = { month: 'long', day: 'numeric' };
        let range = started.getFullYear() === ended.getFullYear() && started.getMonth() === ended.getMonth()
            ? `${started.toLocaleDateString(undefined, options)}-${ended.getDate()}, ${ended.getFullYear()}`
            : `${started.toLocaleDateString(undefined, options)} - ${ended.toLocaleDateString(undefined, options)}, ${ended.getFullYear()}`;
        // Optionally, you can add this range to the Excel sheet as a header row
        header.push(`Date Range: ${range}`);
    }
    const data = [header];
    cartData.forEach(item => {
        const addedTime = item.created ? item.created.toLocaleString() : "N/A";
        data.push([
            item.id,
            item.name,
            item.desc || "",
            "30:00",
            addedTime,
            item.time,
            item.seconds,
            item.created ? item.created.toLocaleDateString() : ""
        ]);
    });
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Carts");
    worksheet['!cols'] = [
        { wch: 8 },  // Cart ID
        { wch: 15 }, // Name
        { wch: 25 }, // Description
        { wch: 12 }, // Starting Time
        { wch: 18 }, // Added Time
        { wch: 12 }, // Current Time
        { wch: 10 }, // Seconds
        { wch: 14 }  // Created Date
    ];
    XLSX.writeFile(workbook, `cart-report-${DATE_FORMAT}.xlsx`);
    closeReportModal();

    // Save report to Firebase as structured JSON
    saveReportToFirebase("excel", cartData);
};

// Load carts on auth
onAuthStateChanged(auth, async user => {
    if (!user) return;
    // Do not load/display already saved carts

});

// Fetch and display generated reports from Firebase

// View report details

// Save generated report to Firebase
const saveReportToFirebase = async (type, reportData) => {
    if (!auth.currentUser) return;
    try {
        await addDoc(collection(db, "users", auth.currentUser.uid, "reports"), {
            type,
            generated: new Date().toISOString(),
            data: reportData
        });
    } catch (e) {
        console.error("Error saving report:", e.message);
    }
};

// Helper to get structured report data for Firebase
const getStructuredReportData = () => getReportData().map(item => ({
    id: item.id,
    name: item.name,
    desc: item.desc || "",
    seconds: item.seconds,
    time: formatTime(item.seconds)
}));
