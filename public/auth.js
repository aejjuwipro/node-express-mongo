const setMessage = (form, message, success = false) => {
  const status = form.querySelector('[data-status]');
  status.textContent = message;
  status.classList.toggle('success', success);
};

const postJson = async (url, body) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'The request could not be completed.');
  }
  return result;
};

const saveAuthentication = (result) => {
  window.sessionStorage.setItem('authToken', result.token);
};

document.querySelectorAll('[data-email-auth]').forEach((form) => {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const values = new FormData(form);
    const mode = form.dataset.emailAuth;
    const password = values.get('password');
    const body = {
      email: values.get('email'),
      password,
    };

    if (mode === 'register') {
      if (password !== values.get('confirmPassword')) {
        setMessage(form, 'The passwords do not match.');
        return;
      }
      const name = values.get('name').trim();
      if (name) body.name = name;
    }

    button.disabled = true;
    setMessage(form, '');
    try {
      const result = await postJson(`/auth/${mode}`, body);
      saveAuthentication(result);
      setMessage(form, mode === 'register'
        ? 'Account created. You are signed in for this browser session.'
        : 'Signed in successfully for this browser session.', true);
    } catch (error) {
      setMessage(form, error.message);
    } finally {
      button.disabled = false;
    }
  });
});

document.querySelectorAll('[data-mobile-auth]').forEach((form) => {
  const requestButton = form.querySelector('[data-request-otp]');
  const otpFields = form.querySelector('[data-otp-fields]');
  const mobileInput = form.elements.mobile;

  requestButton.addEventListener('click', async () => {
    if (!mobileInput.reportValidity()) return;

    requestButton.disabled = true;
    setMessage(form, '');
    try {
      const result = await postJson('/auth/mobile/request-otp', { mobile: mobileInput.value.trim() });
      otpFields.hidden = false;
      setMessage(
        form,
        `Development mock pass: ${result.delivery.pass}. It was not sent by SMS.`,
        true,
      );
      form.elements.pass.focus();
    } catch (error) {
      setMessage(form, error.message);
    } finally {
      requestButton.disabled = false;
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (otpFields.hidden) {
      setMessage(form, 'Request a verification pass first.');
      return;
    }

    const verifyButton = form.querySelector('button[type="submit"]');
    verifyButton.disabled = true;
    setMessage(form, '');
    try {
      const result = await postJson('/auth/mobile/verify-otp', {
        mobile: mobileInput.value.trim(),
        pass: form.elements.pass.value.trim(),
      });
      saveAuthentication(result);
      setMessage(form, 'Mobile verified. You are signed in for this browser session.', true);
    } catch (error) {
      setMessage(form, error.message);
    } finally {
      verifyButton.disabled = false;
    }
  });
});
