const DB_NAME = 'AlumniDB';
const DB_VERSION = 1;
const STORE_NAME = 'alumni_records';

let db = null;
let allAlumni = [];

let alumniContainer;
let emptyResults;
let searchInput;
let mentorFilter;
let yearFilter;
let clearFiltersBtn;
let addAlumniButtons = [];

let alumniModal;
let modalContent;
let closeModalBtn;
let cancelBtn;
let newAlumniForm;
let modalMessage;
let submitAlumniBtn;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const dbInstance = event.target.result;
            if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
                const store = dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                store.createIndex('isMentor', 'isMentor', { unique: false });
                store.createIndex('gradYear', 'gradYear', { unique: false });
            }
        };

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(new Error('IndexedDB error: ' + event.target.errorCode));
    });
}

function getStore(mode = 'readonly') {
    if (!db) throw new Error('Database not initialized');
    const transaction = db.transaction([STORE_NAME], mode);
    return transaction.objectStore(STORE_NAME);
}

async function addAlumnus(record) {
    return new Promise((resolve, reject) => {
        try {
            const store = getStore('readwrite');
            record.lastUpdate = Date.now();
            record.isMentor = record.isMentor ? 1 : 0;
            const request = store.add(record);
            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(new Error(`Failed to add record: ${event.target.error}`));
        } catch (error) {
            reject(error);
        }
    });
}

async function getAllAlumni() {
    return new Promise((resolve, reject) => {
        try {
            const store = getStore('readonly');
            const request = store.getAll();
            request.onsuccess = (event) => {
                const results = event.target.result.sort((a, b) => b.lastUpdate - a.lastUpdate);
                resolve(results);
            };
            request.onerror = (event) => reject(new Error(`Failed to get records: ${event.target.error}`));
        } catch (error) {
            reject(error);
        }
    });
}

function updateYearFilterOptions(alumni) {
    if (!yearFilter) return;
    const previouslySelected = yearFilter.value;
    const uniqueYears = [...new Set(alumni.map((alum) => alum.gradYear).filter(Boolean))].sort((a, b) => b - a);
    const options = ['<option value="all">All Years</option>', ...uniqueYears.map((year) => `<option value="${year}">${year}</option>`)];
    yearFilter.innerHTML = options.join('');

    if (previouslySelected !== 'all' && uniqueYears.includes(Number(previouslySelected))) {
        yearFilter.value = previouslySelected;
    } else {
        yearFilter.value = 'all';
    }
}

function renderAlumniCards(alumni) {
    if (!alumniContainer) return;
    alumniContainer.innerHTML = '';

    alumni.forEach((alum) => {
        const isMentor = alum.isMentor === 1;
        const card = document.createElement('article');
        card.className = 'bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 flex flex-col gap-4 hover:border-purple-500/40 transition-colors';
        const initials = (alum.name || '?').charAt(0).toUpperCase();
        const lastUpdated = alum.lastUpdate ? new Date(alum.lastUpdate).toLocaleString() : 'Unknown';
        card.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-lg font-semibold">
                        ${initials}
                    </div>
                    <div>
                        <h3 class="text-xl font-semibold">${alum.name || 'Unnamed Alumni'}</h3>
                        <p class="text-slate-400 text-sm">${alum.field || 'Field not specified'} • ${alum.company || 'Company not provided'}</p>
                    </div>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-medium border ${isMentor ? 'bg-green-500/10 text-green-300 border-green-500/30' : 'bg-slate-700/40 text-slate-300 border-slate-600/50'}">
                    ${isMentor ? 'Mentor' : 'Member'}
                </span>
            </div>
            <div class="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                    <p class="text-slate-400 uppercase text-xs mb-1">Graduation Year</p>
                    <p class="text-white font-medium">${alum.gradYear || '—'}</p>
                </div>
                <div>
                    <p class="text-slate-400 uppercase text-xs mb-1">Contact Email</p>
                    <p class="text-white font-medium break-all">${alum.contactEmail || 'No email provided'}</p>
                </div>
                <div>
                    <p class="text-slate-400 uppercase text-xs mb-1">Phone</p>
                    <p class="text-white font-medium">${alum.mobileNumber || 'No phone provided'}</p>
                </div>
                <div>
                    <p class="text-slate-400 uppercase text-xs mb-1">Last Updated</p>
                    <p class="text-white font-medium">${lastUpdated}</p>
                </div>
            </div>
            ${alum.linkedinProfile ? `
                <a href="${alum.linkedinProfile}" target="_blank" rel="noopener" class="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    LinkedIn Profile
                </a>
            ` : ''}
        `;
        alumniContainer.appendChild(card);
    });
}

function applyFilters() {
    if (!Array.isArray(allAlumni)) return;
    let filtered = [...allAlumni];

    const term = searchInput ? searchInput.value.trim().toLowerCase() : '';
    if (term) {
        filtered = filtered.filter((alum) => {
            const haystack = [alum.name, alum.company, alum.field, alum.contactEmail]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(term);
        });
    }

    if (mentorFilter) {
        const mentorValue = mentorFilter.value;
        if (mentorValue === 'mentor') {
            filtered = filtered.filter((alum) => alum.isMentor === 1);
        } else if (mentorValue === 'non-mentor') {
            filtered = filtered.filter((alum) => alum.isMentor !== 1);
        }
    }

    if (yearFilter) {
        const yearValue = yearFilter.value;
        if (yearValue !== 'all') {
            const yearNumber = Number(yearValue);
            filtered = filtered.filter((alum) => Number(alum.gradYear) === yearNumber);
        }
    }

    renderAlumniCards(filtered);

    if (emptyResults) {
        if (filtered.length === 0) {
            emptyResults.classList.remove('hidden');
        } else {
            emptyResults.classList.add('hidden');
        }
    }
}

function setupFilters() {
    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }
    if (mentorFilter) {
        mentorFilter.addEventListener('change', applyFilters);
    }
    if (yearFilter) {
        yearFilter.addEventListener('change', applyFilters);
    }
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (mentorFilter) mentorFilter.value = 'all';
            if (yearFilter) yearFilter.value = 'all';
            applyFilters();
        });
    }
}

function openModal() {
    if (!alumniModal || !modalContent) {
        console.error('Add Alumni modal elements are missing from the DOM.');
        return;
    }

    alumniModal.classList.remove('hidden');
    alumniModal.classList.add('flex');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
        alumniModal.classList.add('opacity-100');
        modalContent.classList.remove('scale-95', 'opacity-0');
        modalContent.classList.add('scale-100', 'opacity-100');
        modalContent.style.animation = 'bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    }, 10);

    if (modalMessage) {
        modalMessage.classList.add('hidden');
        modalMessage.textContent = '';
        modalMessage.className = 'text-sm text-center text-red-400 hidden message-slide';
    }
}

function closeModal() {
    if (!alumniModal || !modalContent) return;

    modalContent.style.animation = 'bounceOut 0.4s cubic-bezier(0.55, 0.055, 0.675, 0.19)';

    setTimeout(() => {
        alumniModal.classList.remove('opacity-100');
        modalContent.classList.remove('scale-100', 'opacity-100');
        modalContent.classList.add('scale-95', 'opacity-0');
    }, 200);

    setTimeout(() => {
        alumniModal.classList.remove('flex');
        alumniModal.classList.add('hidden');
        modalContent.style.animation = '';
        document.body.style.overflow = 'auto';
        if (modalMessage) {
            modalMessage.classList.add('hidden');
            modalMessage.textContent = '';
            modalMessage.className = 'text-sm text-center text-red-400 hidden message-slide';
        }
        if (newAlumniForm) newAlumniForm.reset();
    }, 400);
}

function setupModal() {
    addAlumniButtons = addAlumniButtons.filter(Boolean);

    if (addAlumniButtons.length === 0) {
        console.warn("No 'Add Alumni' triggers found on the alumni directory page.");
    } else {
        addAlumniButtons.forEach((btn) => btn.addEventListener('click', openModal));
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }
    if (alumniModal) {
        alumniModal.addEventListener('click', (event) => {
            if (event.target === alumniModal) {
                closeModal();
            }
        });
    }
    if (newAlumniForm) {
        newAlumniForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            if (!db) {
                if (modalMessage) {
                    modalMessage.textContent = 'Database not ready. Please wait for initialization.';
                    modalMessage.classList.remove('hidden');
                }
                return;
            }

            if (!submitAlumniBtn) return;

            submitAlumniBtn.disabled = true;
            submitAlumniBtn.textContent = 'Saving...';

            try {
                const newRecord = {
                    name: document.getElementById('alum-name').value.trim(),
                    gradYear: parseInt(document.getElementById('alum-year').value.trim(), 10),
                    field: document.getElementById('alum-field').value.trim(),
                    company: document.getElementById('alum-company').value.trim(),
                    contactEmail: document.getElementById('alum-email').value.trim(),
                    mobileNumber: document.getElementById('alum-mobile').value.trim(),
                    linkedinProfile: document.getElementById('alum-linkedin').value.trim(),
                    isMentor: document.getElementById('alum-mentor').checked,
                };

                await addAlumnus(newRecord);
                if (modalMessage) {
                    modalMessage.textContent = 'Record saved successfully!';
                    modalMessage.className = 'text-sm text-center text-teal-400';
                    modalMessage.classList.remove('hidden');
                }

                await loadAlumni();

                setTimeout(closeModal, 1200);
            } catch (error) {
                console.error('Error adding document: ', error);
                if (modalMessage) {
                    modalMessage.textContent = `Error: ${error.message}. Check console.`;
                    modalMessage.className = 'text-sm text-center text-red-400';
                    modalMessage.classList.remove('hidden');
                }
            } finally {
                submitAlumniBtn.disabled = false;
                submitAlumniBtn.textContent = 'Create Alumni Profile';
            }
        });
    }
}

async function loadAlumni() {
    try {
        allAlumni = await getAllAlumni();
        updateYearFilterOptions(allAlumni);
        applyFilters();
    } catch (error) {
        console.error('Failed to load alumni records:', error);
    }
}

async function init() {
    alumniContainer = document.getElementById('alumni-list');
    emptyResults = document.getElementById('empty-results');
    searchInput = document.getElementById('search-alumni');
    mentorFilter = document.getElementById('filter-mentor');
    yearFilter = document.getElementById('filter-year');
    clearFiltersBtn = document.getElementById('clear-filters');
    addAlumniButtons = [document.getElementById('open-modal-nav')];

    alumniModal = document.getElementById('add-alumni-modal');
    modalContent = document.getElementById('modal-content');
    closeModalBtn = document.getElementById('close-modal-btn');
    cancelBtn = document.getElementById('cancel-btn');
    newAlumniForm = document.getElementById('new-alumni-form');
    modalMessage = document.getElementById('modal-message');
    submitAlumniBtn = document.getElementById('submit-alumni-btn');

    try {
        db = await openDB();
        await loadAlumni();
        setupFilters();
        setupModal();
    } catch (error) {
        console.error('Failed to initialize alumni directory page:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
