// =========================================================================
// STATE & DATA AWAL (Fase 1: localStorage)
// =========================================================================
let currentWizard = {
    created_by: "",
    created_by_detail: {},
    template_key: "",
    signer_mode: "selected",
    signer_id: "",
    signer_nama: "",
    signer_jabatan: "",
    signer_nip: "",
    nomor_surat: "",
    data: {}
};

// Data master dummy untuk penandatangan (dirut/pejabat)
const MASTER_DIRUT = [
    { id: "P001", nama: "Ir. H. Achmad Hidayat, M.B.A.", jabatan: "Direktur Utama", nip: "197208151998031001" },
    { id: "P002", nama: "Dra. Rina Amalia", jabatan: "Direktur Operasional", nip: "197504222002122003" },
    { id: "P003", nama: "Prof. Dr. Supardi, M.T.", jabatan: "Kepala Litbang", nip: "196811301994031002" }
];

// Data master awal untuk template bawaan sistem
const DEFAULT_TEMPLATES = [
    {
        key: "surat_keterangan",
        nama: "Surat Keterangan Kinerja",
        template: `<div style="text-align:center; font-weight:bold; font-size:14pt; margin-bottom:20px;">SURAT KETERANGAN KINERJA BAIK<br>Nomor: {{nomor_surat}}</div>
        <p>Yang bertanda tangan di bawah ini menerangkan bahwa:</p>
        <table style="margin: 15px 0 15px 30px;">
            <tr><td style="width:120px;">Nama</td><td>: <b>{{nama_staf}}</b></td></tr>
            <tr><td>Divisi</td><td>: {{nama_divisi}}</td></tr>
            <tr><td>Periode Evaluasi</td><td>: {{periode_tahun}}</td></tr>
        </table>
        <p>Telah menunjukkan kinerja, loyalitas, dan dedikasi yang sangat baik selama menjalankan tugas di unit kerja terkait.</p>
        <p style="margin-top:15px;">Demikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.</p>
        <div style="margin-top:50px; float:right; width:250px;">
            <p>Jakarta, {{tanggal_surat}}</p>
            <p><b>{{signer_jabatan}}</b></p>
            <br><br><br>
            <p><u><b>{{signer_nama}}</b></u></p>
            <p>NIP. {{signer_nip}}</p>
        </div>`,
        fields: [
            { name: "nama_staf", label: "Nama Lengkap Staf", type: "text", required: true },
            { name: "nama_divisi", label: "Nama Divisi/Bagian", type: "text", required: true },
            { name: "periode_tahun", label: "Tahun Evaluasi", type: "text", required: true },
            { name: "tanggal_surat", label: "Tanggal Surat Dibuat", type: "date", required: true }
        ],
        updated_at: Date.now()
    }
];

// =========================================================================
// CORE APP INITIALIZATION
// =========================================================================
document.addEventListener("DOMContentLoaded", () => {
    if (!localStorage.getItem("templates")) {
        localStorage.setItem("templates", JSON.stringify(DEFAULT_TEMPLATES));
    }
    if (!localStorage.getItem("letters")) {
        localStorage.setItem("letters", JSON.stringify([]));
    }
    
    loadTemplatesTable();
    loadArsipTable();
    initWizardViews();
});

// =========================================================================
// ROUTING / SPA VIEW MANAGER
// =========================================================================
function switchPage(pageId) {
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    const targetSection = document.getElementById(`page-${pageId}`);
    if (targetSection) targetSection.classList.add('active');

    // Menandai button navigasi samping yang aktif
    const activeNavBtn = Array.from(document.querySelectorAll('.nav-btn'))
        .find(b => b.getAttribute('onclick') && b.getAttribute('onclick').includes(`'${pageId}'`));
    if (activeNavBtn) activeNavBtn.classList.add('active');

    // Hook render data khusus saat halaman dibuka
    if (pageId === 'jenis') renderTemplateSelection();
    if (pageId === 'penandatangan') renderSignerSelection();
    if (pageId === 'arsip') loadArsipTable();
    if (pageId === 'template') loadTemplatesTable();
}

// =========================================================================
// ALUR WIZARD: BUAT SURAT
// =========================================================================
function initWizardViews() {
    // Membaca data pembuat dari session jika tersimpan
    const savedPembuat = sessionStorage.getItem("active_pembuat");
    if (savedPembuat) {
        const obj = JSON.parse(savedPembuat);
        document.getElementById("pembuat-nama").value = obj.name;
        document.getElementById("pembuat-jabatan").value = obj.jabatan;
        unlockNav(['btn-nav-jenis']);
    }
}

function unlockNav(ids) {
    ids.forEach(id => document.getElementById(id).removeAttribute('disabled'));
}

function savePembuat(e) {
    e.preventDefault();
    const name = document.getElementById("pembuat-nama").value;
    const jabatan = document.getElementById("pembuat-jabatan").value;
    
    currentWizard.created_by = name;
    currentWizard.created_by_detail = { jabatan: jabatan };
    
    sessionStorage.setItem("active_pembuat", JSON.stringify({ name, jabatan }));
    unlockNav(['btn-nav-jenis']);
    switchPage('jenis');
}

function renderTemplateSelection() {
    const grid = document.getElementById("template-grid");
    const templates = JSON.parse(localStorage.getItem("templates"));
    grid.innerHTML = "";
    
    templates.forEach(t => {
        const div = document.createElement("div");
        div.className = `selectable-card ${currentWizard.template_key === t.key ? 'selected' : ''}`;
        div.innerHTML = `<h3>${t.nama}</h3><small style="color:#666;">Key: ${t.key}</small>`;
        div.onclick = () => {
            currentWizard.template_key = t.key;
            unlockNav(['btn-nav-penandatangan']);
            switchPage('penandatangan');
        };
        grid.appendChild(div);
    });
}

function renderSignerSelection() {
    const container = document.getElementById("signer-select-container");
    container.innerHTML = "";
    
    MASTER_DIRUT.forEach(p => {
        const div = document.createElement("div");
        div.className = `selectable-card ${currentWizard.signer_id === p.id && currentWizard.signer_mode === 'selected' ? 'selected' : ''}`;
        div.innerHTML = `<strong>${p.nama}</strong><br><small>${p.jabatan}</small><br><small style="color:#888;">NIP: ${p.nip}</small>`;
        div.onclick = () => {
            document.querySelectorAll('#signer-select-container .selectable-card').forEach(c => c.classList.remove('selected'));
            div.classList.add('selected');
            currentWizard.signer_id = p.id;
            currentWizard.signer_nama = p.nama;
            currentWizard.signer_jabatan = p.jabatan;
            currentWizard.signer_nip = p.nip;
        };
        container.appendChild(div);
    });
    toggleSignerMode();
}

function toggleSignerMode() {
    const mode = document.getElementById("signer-mode").value;
    currentWizard.signer_mode = mode;
    if (mode === 'selected') {
        document.getElementById("signer-select-container").classList.remove('hidden');
        document.getElementById("signer-manual-container").classList.add('hidden');
    } else {
        document.getElementById("signer-select-container").classList.add('hidden');
        document.getElementById("signer-manual-container").classList.remove('hidden');
        currentWizard.signer_id = "";
    }
}

function savePenandatangan() {
    if (currentWizard.signer_mode === 'manual') {
        currentWizard.signer_nama = document.getElementById("manual-nama").value;
        currentWizard.signer_jabatan = document.getElementById("manual-jabatan").value;
        currentWizard.signer_nip = document.getElementById("manual-nip").value;
    }
    
    if (!currentWizard.signer_nama) {
        alert("Silakan tentukan pejabat penandatangan terlebih dahulu!");
        return;
    }
    
    unlockNav(['btn-nav-form']);
    buildDynamicForm();
    switchPage('form');
}

function buildDynamicForm() {
    const templates = JSON.parse(localStorage.getItem("templates"));
    const activeTemplate = templates.find(t => t.key === currentWizard.template_key);
    const form = document.getElementById("dynamic-form");
    form.innerHTML = "";
    
    activeTemplate.fields.forEach(f => {
        const div = document.createElement("div");
        div.className = "form-group";
        
        const label = document.createElement("label");
        label.innerText = f.label + (f.required ? " *" : "");
        
        let input;
        if (f.type === 'date') {
            input = document.createElement("input");
            input.type = "date";
        } else {
            input = document.createElement("input");
            input.type = "text";
        }
        input.name = f.name;
        input.required = f.required;
        input.value = currentWizard.data[f.name] || "";
        
        div.appendChild(label);
        div.appendChild(input);
        form.appendChild(div);
    });
    
    const btn = document.createElement("button");
    btn.type = "submit";
    btn.className = "btn-primary mt-20";
    btn.innerText = "Simpan & Tinjau Tampilan Surat";
    form.appendChild(btn);
}

// =========================================================================
// ENGINE RENDER (TEMPLATE + DATA = ISI SURAT)
// =========================================================================
function generateSurat(e) {
    e.preventDefault();
    currentWizard.nomor_surat = document.getElementById("surat-nomor").value;
    
    // Tarik input dinamis form ke sub-object data
    const formData = new FormData(document.getElementById("dynamic-form"));
    currentWizard.data = {};
    formData.forEach((value, key) => {
        currentWizard.data[key] = value;
    });
    
    renderPreviewHTML();
    switchPage('preview');
}

