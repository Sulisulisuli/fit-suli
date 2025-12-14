
import './style.css'
import { supabase } from './src/supabaseClient'
import {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    getUser,
    onAuthStateChange
} from './src/auth'

// Configuration
const CONFIG = {
    GOAL: 100,
    CIRCLE_RADIUS: 52,
};

const CIRCUMFERENCE = 2 * Math.PI * CONFIG.CIRCLE_RADIUS;

// State Management
let state = {
    pushups: 0,
    pullups: 0,
    lastDate: null,
    user: null,
    authMode: 'login' // 'login' or 'signup'
};

// DOM Elements
const elements = {
    // Auth
    loginOverlay: document.getElementById('login-overlay'),
    mainContent: document.getElementById('main-content'),
    logoutBtn: document.getElementById('logout-btn'),
    authTitle: document.getElementById('auth-title'),
    authSubtitle: document.getElementById('auth-subtitle'),
    emailForm: document.getElementById('email-form'),
    emailInput: document.getElementById('email'),
    nicknameInput: document.getElementById('nickname'),
    passwordInput: document.getElementById('password'),
    confirmPasswordInput: document.getElementById('confirm-password'),
    authSubmitBtn: document.getElementById('auth-submit-btn'),
    authError: document.getElementById('auth-error'),

    authToggleText: document.getElementById('auth-toggle-text'),
    authToggleBtn: document.getElementById('auth-toggle-btn'),

    // App
    date: document.getElementById('current-date'),
    resetBtn: document.getElementById('reset-day'),

    // Pushups
    pushupsRemaining: document.getElementById('pushups-remaining'),
    pushupsDone: document.getElementById('pushups-done'),
    pushupsInput: document.getElementById('pushups-input'),
    pushupsBtn: document.getElementById('add-pushups'),
    pushupsRing: document.querySelector('.pushups-ring'),

    // Pullups
    pullupsRemaining: document.getElementById('pullups-remaining'),
    pullupsDone: document.getElementById('pullups-done'),
    pullupsInput: document.getElementById('pullups-input'),
    pullupsBtn: document.getElementById('add-pullups'),
    pullupsRing: document.querySelector('.pullups-ring'),
};

// Initialization
async function init() {
    setupDate();
    setupRings();
    setupListeners();

    // Auth check
    onAuthStateChange((user) => {
        state.user = user;
        if (user) {
            handleLoginSuccess();
        } else {
            handleLogout();
        }
    })
}

function handleLoginSuccess() {
    elements.loginOverlay.classList.add('hidden');
    elements.mainContent.classList.remove('hidden');
    elements.logoutBtn.classList.remove('hidden');

    // Reset auth form
    elements.emailInput.value = '';
    elements.passwordInput.value = '';
    elements.confirmPasswordInput.value = '';
    elements.authError.textContent = '';

    loadData();
}

function handleLogout() {
    elements.loginOverlay.classList.remove('hidden');
    elements.mainContent.classList.add('hidden');
    elements.logoutBtn.classList.add('hidden');
    state.pushups = 0;
    state.pullups = 0;
    updateUI();
}

function toggleAuthMode() {
    state.authMode = state.authMode === 'login' ? 'signup' : 'login';
    const isLogin = state.authMode === 'login';

    // UI Updates
    elements.authTitle.textContent = isLogin ? 'Zaloguj się' : 'Stwórz konto';
    elements.authSubtitle.textContent = isLogin ? 'Witaj ponownie! 👋' : 'Dołącz do Fit Suli! 🚀';
    elements.authSubmitBtn.textContent = isLogin ? 'Zaloguj się' : 'Zarejestruj się';

    elements.authToggleText.textContent = isLogin ? 'Nie masz konta?' : 'Masz już konto?';
    elements.authToggleBtn.textContent = isLogin ? 'Zarejestruj się' : 'Zaloguj się';

    // Show/Hide Fields
    if (isLogin) {
        elements.confirmPasswordInput.classList.add('hidden');
        elements.confirmPasswordInput.required = false;

        elements.nicknameInput.classList.add('hidden');
        elements.nicknameInput.required = false;
    } else {
        elements.confirmPasswordInput.classList.remove('hidden');
        elements.confirmPasswordInput.required = true;

        elements.nicknameInput.classList.remove('hidden');
        elements.nicknameInput.required = true;
    }

    // Clear error
    elements.authError.textContent = '';
}

async function loadData() {
    if (!state.user) return;

    const today = new Date().toDateString();

    // Try to fetch today's progress
    const { data, error } = await supabase
        .from('daily_progress')
        .select('*')
        .eq('user_id', state.user.id)
        .eq('date_key', today)
        .single();

    if (data) {
        state.pushups = data.pushups || 0;
        state.pullups = data.pullups || 0;
    } else {
        // New day or first time
        state.pushups = 0;
        state.pullups = 0;
    }

    state.lastDate = today;
    updateUI();
}

async function saveData() {
    if (!state.user) return;

    const today = new Date().toDateString();

    const { error } = await supabase
        .from('daily_progress')
        .upsert({
            user_id: state.user.id,
            date_key: today,
            pushups: state.pushups,
            pullups: state.pullups,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, date_key' });

    if (error) console.error('Error saving data:', error);
}

function setupDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date().toLocaleDateString('pl-PL', options);
    elements.date.textContent = today.charAt(0).toUpperCase() + today.slice(1);
}

function setupRings() {
    [elements.pushupsRing, elements.pullupsRing].forEach(ring => {
        ring.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;
        ring.style.strokeDashoffset = CIRCUMFERENCE;
    });
}

function updateUI() {
    updateSection('pushups');
    updateSection('pullups');
}

function updateSection(type) {
    const count = state[type];
    const remaining = Math.max(0, CONFIG.GOAL - count);
    const done = count;

    // Text updates
    elements[`${type}Remaining`].textContent = remaining;
    elements[`${type}Done`].textContent = done;

    // Ring Animation
    const percent = Math.min(100, (count / CONFIG.GOAL) * 100);
    const offset = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE;
    elements[`${type}Ring`].style.strokeDashoffset = offset;
}

async function addProgress(type) {
    const input = elements[`${type}Input`];
    const value = parseInt(input.value);

    if (value && value > 0) {
        state[type] += value;
        updateUI();
        await saveData();

        input.value = '';
        input.focus();
    }
}

async function resetDay() {
    state.pushups = 0;
    state.pullups = 0;
    updateUI();
    await saveData();
}

function setupListeners() {
    // Auth Listeners
    elements.authToggleBtn.addEventListener('click', toggleAuthMode);

    // Google Login removed
    /*
    elements.googleLoginBtn.addEventListener('click', async () => {
        await signInWithGoogle();
    });
    */


    elements.nicknameInput = document.getElementById('nickname');

    elements.emailForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = elements.emailInput.value;
        const password = elements.passwordInput.value;
        elements.authError.textContent = '';

        if (state.authMode === 'login') {
            const { error } = await signInWithEmail(email, password);
            if (error) {
                elements.authError.textContent = 'Błąd logowania: ' + error.message;
            }
        } else {
            // Sign Up
            const nickname = elements.nicknameInput.value;
            const confirmResult = elements.confirmPasswordInput.value;

            if (!nickname) {
                elements.authError.textContent = 'Podaj swój nick!';
                return;
            }

            if (password !== confirmResult) {
                elements.authError.textContent = 'Hasła nie są takie same!';
                return;
            }

            // Pass nickname to Supabase
            const { data, error } = await signUpWithEmail(email, password, {
                display_name: nickname
            });

            if (error) {
                elements.authError.textContent = 'Błąd rejestracji: ' + error.message;
            } else if (data?.session) {
                // Auto-login active
                console.log('Auto-login successful');
            } else {
                elements.authError.style.color = '#4ade80'; // Green
                elements.authError.textContent = 'Konto utworzone! Potwierdź email.';
            }
        }
    });

    elements.logoutBtn.addEventListener('click', async () => {
        await signOut();
    });

    // App Listeners
    elements.pushupsBtn.addEventListener('click', () => addProgress('pushups'));
    elements.pullupsBtn.addEventListener('click', () => addProgress('pullups'));

    elements.pushupsInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addProgress('pushups');
    });
    elements.pullupsInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addProgress('pullups');
    });

    elements.resetBtn.addEventListener('click', () => {
        if (confirm('Czy na pewno chcesz zresetować dzisiejszy postęp?')) {
            resetDay();
        }
    });
}

// Start
init();
