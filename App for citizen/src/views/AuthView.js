import { store } from '../store.js';

let authMode = 'login'; // 'login' | 'signup' | 'forgot'

export function renderAuthView() {
  const { currentUser } = store.state;

  return `
    <div class="flex-1 flex flex-col bg-slate-950 text-white min-h-screen items-center justify-center p-5 antialiased overflow-y-auto">
      <main class="w-full max-w-md bg-slate-900 p-7 rounded-3xl shadow-2xl border border-slate-800 flex flex-col gap-5 my-auto text-center">

        <!-- Official Prithvi Shield Logo & Header Branding -->
        <div class="flex flex-col items-center gap-3">
          <div class="relative flex items-center justify-center">
            <div class="absolute w-24 h-24 rounded-full bg-cyan-500/20 animate-ping opacity-60"></div>
            <img src="/logo.jpg" alt="Prithvi Shield Logo" class="relative z-10 w-20 h-20 object-contain rounded-2xl shadow-xl border-2 border-cyan-400/40 drop-shadow-[0_0_15px_rgba(0,229,255,0.3)]" onerror="this.src='/icons/icon-192.png'" />
          </div>

          <div class="flex flex-col gap-1 mt-1">
            <h1 class="text-2xl font-black tracking-tight text-white">
              ${authMode === 'signup' ? 'Create Citizen Account' : authMode === 'forgot' ? 'Reset Password' : 'Welcome Back'}
            </h1>
            <p class="text-xs font-bold text-cyan-400 uppercase tracking-wider">
              ${authMode === 'signup' ? 'Join Prithvi Shield Safety Network' : authMode === 'forgot' ? 'Enter email to receive reset link' : 'Protecting Communities, Saving Lives'}
            </p>
          </div>
        </div>

        ${authMode === 'login' ? `
          <!-- LOGIN FORM -->
          <form id="login-form" class="flex flex-col gap-3.5 text-left">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-slate-300">Email Address</label>
              <div class="relative">
                <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">mail</span>
                <input id="login-email" type="email" class="w-full pl-9 pr-3 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder:text-slate-500" placeholder="citizen@prithvishield.gov.in" value="${currentUser.email || 'rahul.sharma@gmail.com'}" required />
              </div>
            </div>

            <div class="flex flex-col gap-1">
              <div class="flex justify-between items-center">
                <label class="text-xs font-bold text-slate-300">Password</label>
                <button type="button" id="switch-to-forgot-btn" class="text-[11px] font-bold text-cyan-400 hover:underline">Forgot Password?</button>
              </div>
              <div class="relative">
                <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">lock</span>
                <input id="login-password" type="password" class="w-full pl-9 pr-3 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder:text-slate-500" placeholder="••••••••" required />
              </div>
            </div>

            <button type="submit" class="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 hover:from-blue-500 hover:to-cyan-500 text-white font-extrabold text-sm shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2 mt-1">
              <span>LOGIN</span>
              <span class="material-symbols-outlined text-[18px]">login</span>
            </button>
          </form>

          <!-- Divider -->
          <div class="flex items-center gap-3 my-0.5">
            <div class="h-px bg-slate-800 flex-1"></div>
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">─────── OR ───────</span>
            <div class="h-px bg-slate-800 flex-1"></div>
          </div>

          <!-- Google Login -->
          <button id="auth-google-login-btn" type="button" class="w-full py-3.5 px-4 bg-slate-800 hover:bg-slate-700/80 text-white font-bold text-sm rounded-2xl border border-slate-700 transition-all flex items-center justify-center gap-3 shadow-md active:scale-98">
            <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"></path>
            </svg>
            <span>Continue with Google</span>
          </button>

          <p class="text-xs text-slate-400 mt-2">
            Don't have an account?
            <button type="button" id="switch-to-signup-btn" class="font-bold text-cyan-400 hover:underline">Sign Up</button>
          </p>
        ` : authMode === 'signup' ? `
          <!-- SIGN UP FORM -->
          <form id="signup-form" class="flex flex-col gap-3 text-left">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-slate-300">Full Name</label>
              <input id="signup-fullname" type="text" class="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder:text-slate-500" placeholder="e.g. Rahul Sharma" value="${currentUser.fullName || ''}" required />
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-slate-300">Email Address</label>
              <input id="signup-email" type="email" class="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder:text-slate-500" placeholder="rahul.sharma@gmail.com" required />
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-slate-300">Mobile Number (+91)</label>
              <div class="flex items-center bg-slate-800 border border-slate-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-cyan-500">
                <span class="px-3 py-2.5 bg-slate-800/80 text-cyan-400 font-bold text-xs border-r border-slate-700 shrink-0">🇮🇳 +91</span>
                <input id="signup-phone" type="tel" maxlength="10" class="w-full px-3 py-2.5 bg-transparent text-white font-mono font-bold text-sm focus:outline-none" placeholder="9876543210" value="${currentUser.mobileNumber ? currentUser.mobileNumber.replace(/^\+91\s*/, '') : ''}" required />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-slate-300">Password</label>
                <input id="signup-password" type="password" class="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" placeholder="••••••••" required />
              </div>

              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-slate-300">Confirm Password</label>
                <input id="signup-confirm-password" type="password" class="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" placeholder="••••••••" required />
              </div>
            </div>

            <button type="submit" class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 hover:from-blue-500 text-white font-extrabold text-sm shadow-xl active:scale-98 transition-all mt-1">
              CREATE ACCOUNT
            </button>
          </form>

          <p class="text-xs text-slate-400 mt-1">
            Already have an account?
            <button type="button" id="switch-to-login-btn" class="font-bold text-cyan-400 hover:underline">Log In</button>
          </p>
        ` : `
          <!-- FORGOT PASSWORD FORM -->
          <form id="forgot-form" class="flex flex-col gap-3.5 text-left">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-slate-300">Registered Email Address</label>
              <input id="forgot-email" type="email" class="w-full px-3.5 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder:text-slate-500" placeholder="citizen@prithvishield.gov.in" required />
            </div>

            <button type="submit" class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 hover:from-blue-500 text-white font-extrabold text-sm shadow-xl transition-all">
              SEND RESET LINK
            </button>
          </form>

          <p class="text-xs text-slate-400 mt-2">
            <button type="button" id="switch-to-login-btn" class="font-bold text-cyan-400 hover:underline">Back to Log In</button>
          </p>
        `}

        <!-- Official Compliance Footer -->
        <footer class="border-t border-slate-800 pt-3 flex items-center justify-center gap-2 text-slate-400 text-[11px]">
          <span class="material-symbols-outlined text-[16px] text-cyan-400">verified_user</span>
          <span>Official Public Safety & Emergency Broadcast System</span>
        </footer>
      </main>
    </div>
  `;
}

export function bindAuthEvents(container) {
  const loginForm = container.querySelector('#login-form');
  const signupForm = container.querySelector('#signup-form');
  const forgotForm = container.querySelector('#forgot-form');

  const switchSignup = container.querySelector('#switch-to-signup-btn');
  const switchLogin = container.querySelector('#switch-to-login-btn');
  const switchForgot = container.querySelector('#switch-to-forgot-btn');
  const googleBtn = container.querySelector('#auth-google-login-btn');

  if (switchSignup) {
    switchSignup.addEventListener('click', () => {
      authMode = 'signup';
      store.notify();
    });
  }

  if (switchLogin) {
    switchLogin.addEventListener('click', () => {
      authMode = 'login';
      store.notify();
    });
  }

  if (switchForgot) {
    switchForgot.addEventListener('click', () => {
      authMode = 'forgot';
      store.notify();
    });
  }

  if (googleBtn) {
    googleBtn.addEventListener('click', () => {
      store.loginWithGoogle();
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = container.querySelector('#login-email')?.value;
      const pass = container.querySelector('#login-password')?.value;
      store.loginWithEmail(email || 'rahul.sharma@gmail.com', pass);
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fn = container.querySelector('#signup-fullname')?.value;
      const em = container.querySelector('#signup-email')?.value;
      const ph = container.querySelector('#signup-phone')?.value;
      const pass = container.querySelector('#signup-password')?.value;
      const confirmPass = container.querySelector('#signup-confirm-password')?.value;

      if (pass !== confirmPass) {
        alert('Passwords do not match. Please re-enter.');
        return;
      }

      if (ph && !/^[6-9]\d{9}$/.test(ph)) {
        alert('Please enter a valid 10-digit Indian mobile number after +91.');
        return;
      }

      store.registerCitizen(fn, em, `+91 ${ph}`, pass);
    });
  }

  if (forgotForm) {
    forgotForm.addEventListener('submit', (e) => {
      e.preventDefault();
      alert('Password reset link sent to your registered email address!');
      authMode = 'login';
      store.notify();
    });
  }
}
