const DB_NAME = 'AlumniDB';
const DB_VERSION = 1;
const STORE_NAME = 'alumni_records';

let db = null;
let allAlumni = [];

const metrics = {
    alumni: null,
    mentors: null,
    medianYear: null,
    syncTime: null,
};

let mentorCoverageContainer;
let mentorCoverageSummary;
let topDisciplinesContainer;
let topDisciplinesSummary;
let recentUpdatesContainer;

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

function calculateMedian(sortedArray) {
    if (sortedArray.length === 0) return null;
    const mid = Math.floor(sortedArray.length / 2);
    if (sortedArray.length % 2 === 0) {
        return Math.round((sortedArray[mid - 1] + sortedArray[mid]) / 2);
    }
    return sortedArray[mid];
}

function updateMetricValues() {
    const mentors = allAlumni.filter((alum) => alum.isMentor === 1);
    const gradYears = allAlumni.map((alum) => Number(alum.gradYear)).filter((year) => !Number.isNaN(year)).sort((a, b) => a - b);
    const median = calculateMedian(gradYears);

    if (metrics.alumni) {
        metrics.alumni.textContent = allAlumni.length;
    }
    if (metrics.mentors) {
        metrics.mentors.textContent = mentors.length;
    }
    if (metrics.medianYear) {
        metrics.medianYear.textContent = median ?? '--';
    }
    if (metrics.syncTime) {
        metrics.syncTime.textContent = new Date().toLocaleTimeString();
    }
}

function renderMentorCoverage() {
    if (!mentorCoverageContainer || !mentorCoverageSummary) return;
    const coverageByYear = new Map();

    allAlumni.forEach((alum) => {
        const year = alum.gradYear || 'Unknown';
        if (!coverageByYear.has(year)) {
            coverageByYear.set(year, { total: 0, mentors: 0 });
        }
        const entry = coverageByYear.get(year);
        entry.total += 1;
        if (alum.isMentor === 1) {
            entry.mentors += 1;
        }
    });

    const sortedYears = Array.from(coverageByYear.entries()).sort((a, b) => {
        const yearA = a[0] === 'Unknown' ? 0 : Number(a[0]);
        const yearB = b[0] === 'Unknown' ? 0 : Number(b[0]);
        return yearB - yearA;
    });

    mentorCoverageContainer.innerHTML = '';

    const totalYears = sortedYears.length;
    const coveredYears = sortedYears.filter(([, stats]) => stats.mentors > 0).length;
    mentorCoverageSummary.textContent = `${coveredYears}/${totalYears} years have at least one mentor`;

    sortedYears.slice(0, 6).forEach(([year, stats]) => {
        const percent = stats.total ? Math.round((stats.mentors / stats.total) * 100) : 0;
        const bar = document.createElement('div');
        bar.innerHTML = `
            <div class="flex items-center justify-between text-sm mb-1">
                <span class="text-slate-300">Class of ${year}</span>
                <span class="text-slate-400">${stats.mentors}/${stats.total} mentors</span>
            </div>
            <div class="w-full h-3 bg-slate-700/60 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-purple-500 to-pink-500" style="width: ${percent}%"></div>
            </div>
        `;
        mentorCoverageContainer.appendChild(bar);
    });
}

function renderTopDisciplines() {
    if (!topDisciplinesContainer || !topDisciplinesSummary) return;

    const counts = new Map();
    allAlumni.forEach((alum) => {
        const field = (alum.field || 'Not specified').trim();
        counts.set(field, (counts.get(field) || 0) + 1);
    });

    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    topDisciplinesContainer.innerHTML = '';

    const totalFields = sorted.length;
    topDisciplinesSummary.textContent = totalFields ? `Top ${Math.min(5, totalFields)} of ${totalFields} disciplines` : 'No discipline data';

    sorted.slice(0, 5).forEach(([field, count]) => {
        const share = allAlumni.length ? Math.round((count / allAlumni.length) * 100) : 0;
        const fieldRow = document.createElement('div');
        fieldRow.className = 'flex items-center justify-between text-sm bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-3';
        fieldRow.innerHTML = `
            <div>
                <p class="text-slate-200 font-medium">${field}</p>
                <p class="text-slate-400 text-xs">${share}% of records</p>
            </div>
            <span class="text-slate-300 font-semibold">${count}</span>
        `;
        topDisciplinesContainer.appendChild(fieldRow);
    });
}

function renderRecentUpdates() {
    if (!recentUpdatesContainer) return;

    recentUpdatesContainer.innerHTML = '';

    const recent = [...allAlumni]
        .filter((alum) => alum.lastUpdate)
        .sort((a, b) => b.lastUpdate - a.lastUpdate)
        .slice(0, 6);

    if (recent.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'text-center text-slate-400 py-6 border border-dashed border-slate-700 rounded-xl';
        empty.textContent = 'No recent updates found. Add new alumni to see activity here.';
        recentUpdatesContainer.appendChild(empty);
        return;
    }

    recent.forEach((alum) => {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-3';
        item.innerHTML = `
            <div>
                <p class="text-slate-200 font-medium">${alum.name || 'Unnamed Alumni'}</p>
                <p class="text-slate-400 text-xs">
                    ${alum.company || 'Company not provided'} • ${alum.field || 'Discipline not specified'}
                </p>
            </div>
            <div class="text-right text-sm">
                <p class="text-slate-300">${new Date(alum.lastUpdate).toLocaleDateString()}</p>
                <p class="text-slate-500 text-xs">${new Date(alum.lastUpdate).toLocaleTimeString()}</p>
            </div>
        `;
        recentUpdatesContainer.appendChild(item);
    });
}

function openModal() {
    if (!alumniModal || !modalContent) {
        console.error('Analytics modal elements are missing from the DOM.');
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
        console.warn("No 'Add Alumni' triggers found on the analytics page.");
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

                await loadAnalytics();

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

async function loadAnalytics() {
    try {
        allAlumni = await getAllAlumni();
        updateMetricValues();
        renderMentorCoverage();
        renderTopDisciplines();
        renderRecentUpdates();
    } catch (error) {
        console.error('Failed to load analytics data:', error);
    }
}

async function init() {
    metrics.alumni = document.getElementById('metric-total-alumni');
    metrics.mentors = document.getElementById('metric-total-mentors');
    metrics.medianYear = document.getElementById('metric-median-year');
    metrics.syncTime = document.getElementById('metric-sync-time');

    mentorCoverageContainer = document.getElementById('mentor-coverage-bars');
    mentorCoverageSummary = document.getElementById('mentor-coverage-summary');
    topDisciplinesContainer = document.getElementById('top-disciplines');
    topDisciplinesSummary = document.getElementById('top-disciplines-summary');
    recentUpdatesContainer = document.getElementById('recent-updates');

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
        await loadAnalytics();
        setupModal();

        setInterval(loadAnalytics, 10000);
    } catch (error) {
        console.error('Failed to initialize analytics page:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
