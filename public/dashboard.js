const token = window.sessionStorage.getItem('authToken');

if (!token) {
  window.location.replace('/login');
} else {
  const accountStatus = document.querySelector('[data-account-status]');
  const accountDetails = document.querySelector('[data-account-details]');
  const itemsStatus = document.querySelector('[data-items-status]');
  const itemList = document.querySelector('[data-item-list]');
  const itemCount = document.querySelector('[data-item-count]');
  const profileForm = document.querySelector('[data-profile-form]');
  const profileStatus = document.querySelector('[data-profile-status]');
  const passwordForm = document.querySelector('[data-password-form]');
  const passwordStatus = document.querySelector('[data-password-status]');
  const passwordCard = document.querySelector('[data-password-card]');
  const passwordUnavailable = document.querySelector('[data-password-unavailable]');
  const profileName = profileForm.elements.name;
  const contactRequestForm = document.querySelector('[data-contact-request-form]');
  const contactVerifyForm = document.querySelector('[data-contact-verify-form]');
  const contactRequestStatus = document.querySelector('[data-contact-request-status]');
  const contactVerifyStatus = document.querySelector('[data-contact-verify-status]');
  const contactPending = document.querySelector('[data-contact-pending]');
  const contactChannel = contactRequestForm.elements.channel;
  const contactValue = contactRequestForm.elements.value;
  const contactCode = contactVerifyForm.elements.code;
  let pendingContact = null;

  const requestJson = async (url, options = {}) => {
    const headers = { Authorization: `Bearer ${token}` };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 401) {
        window.sessionStorage.removeItem('authToken');
        window.location.replace('/login');
      }
      throw new Error(result.error || 'The request could not be completed.');
    }
    return result;
  };

  const setFormMessage = (element, message, success = false) => {
    element.textContent = message;
    element.classList.toggle('success', success);
  };

  const updateContactInput = () => {
    const isEmail = contactChannel.value === 'email';
    const label = contactRequestForm.querySelector('[data-contact-value-label]');
    label.textContent = isEmail ? 'Email address' : 'Mobile number';
    contactValue.type = isEmail ? 'email' : 'tel';
    contactValue.autocomplete = isEmail ? 'email' : 'tel';
    contactValue.placeholder = isEmail ? 'you@example.com' : '+15551234567';
    if (isEmail) {
      contactValue.removeAttribute('pattern');
    } else {
      contactValue.pattern = '\\+[1-9][0-9]{7,14}';
    }
    contactValue.value = '';
  };

  const showUserContacts = (user) => {
    document.querySelector('[data-user-email]').textContent = user.email || 'Not provided';
    document.querySelector('[data-email-status]').textContent = user.email
      ? (user.emailVerified ? 'Verified' : 'Not verified')
      : 'Not set';
    document.querySelector('[data-user-mobile]').textContent = user.mobile || 'Not provided';
    document.querySelector('[data-mobile-status]').textContent = user.mobile
      ? (user.mobileVerified ? 'Verified' : 'Not verified')
      : 'Not set';
  };

  document.querySelector('[data-sign-out]').addEventListener('click', () => {
    window.sessionStorage.removeItem('authToken');
    window.location.assign('/login');
  });

  const loadAccount = async () => {
    try {
      const { user, hasPassword } = await requestJson('/users/me');
      document.querySelector('[data-user-name]').textContent = user.name || 'Not provided';
      showUserContacts(user);
      profileName.value = user.name || '';
      accountDetails.hidden = false;
      accountStatus.textContent = 'Your account is ready.';
      passwordCard.hidden = !hasPassword;
      passwordUnavailable.hidden = hasPassword;
    } catch (error) {
      accountStatus.textContent = error.message;
    }
  };

  const loadItems = async () => {
    try {
      const items = await requestJson('/items');
      itemCount.textContent = `${items.length} ${items.length === 1 ? 'item' : 'items'}`;
      if (items.length === 0) {
        itemsStatus.textContent = 'No items yet.';
        return;
      }
      items.forEach((item) => {
        const row = document.createElement('li');
        row.textContent = item.name || 'Untitled item';
        itemList.append(row);
      });
      itemsStatus.textContent = '';
    } catch (error) {
      itemsStatus.textContent = error.message;
    }
  };

  profileForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = profileForm.querySelector('button[type="submit"]');
    button.disabled = true;
    setFormMessage(profileStatus, '');
    try {
      const { user } = await requestJson('/users/me', {
        method: 'PATCH',
        body: { name: profileName.value.trim() },
      });
      document.querySelector('[data-user-name]').textContent = user.name || 'Not provided';
      setFormMessage(profileStatus, 'Profile updated successfully.', true);
    } catch (error) {
      setFormMessage(profileStatus, error.message);
    } finally {
      button.disabled = false;
    }
  });

  contactChannel.addEventListener('change', updateContactInput);

  contactRequestForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!contactValue.reportValidity()) return;

    const button = contactRequestForm.querySelector('button[type="submit"]');
    const channel = contactChannel.value;
    button.disabled = true;
    setFormMessage(contactRequestStatus, '');
    setFormMessage(contactVerifyStatus, '');
    try {
      const result = await requestJson('/users/me/contact-verification/request', {
        method: 'POST',
        body: { channel, value: contactValue.value.trim() },
      });
      pendingContact = { channel: result.channel, value: result.value };
      contactChannel.disabled = true;
      contactValue.disabled = true;
      button.hidden = true;
      contactPending.textContent = `Verify ${result.value} within five minutes.`;
      contactVerifyForm.hidden = false;
      setFormMessage(
        contactRequestStatus,
        `Development mock code: ${result.delivery.code}. It was not sent by email or SMS.`,
        true,
      );
      contactCode.focus();
    } catch (error) {
      setFormMessage(contactRequestStatus, error.message);
    } finally {
      button.disabled = false;
    }
  });

  contactVerifyForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!pendingContact || !contactCode.reportValidity()) return;

    const button = contactVerifyForm.querySelector('button[type="submit"]');
    button.disabled = true;
    setFormMessage(contactVerifyStatus, '');
    try {
      const { user } = await requestJson('/users/me/contact-verification/verify', {
        method: 'POST',
        body: { ...pendingContact, code: contactCode.value.trim() },
      });
      showUserContacts(user);
      setFormMessage(
        contactRequestStatus,
        `${pendingContact.channel === 'email' ? 'Email' : 'Mobile'} updated and verified.`,
        true,
      );
      pendingContact = null;
      contactVerifyForm.reset();
      contactVerifyForm.hidden = true;
      contactChannel.disabled = false;
      contactValue.disabled = false;
      contactRequestForm.reset();
      updateContactInput();
      contactRequestForm.querySelector('button[type="submit"]').hidden = false;
    } catch (error) {
      setFormMessage(contactVerifyStatus, error.message);
    } finally {
      button.disabled = false;
    }
  });

  document.querySelector('[data-cancel-contact]').addEventListener('click', () => {
    pendingContact = null;
    contactVerifyForm.reset();
    contactVerifyForm.hidden = true;
    contactChannel.disabled = false;
    contactValue.disabled = false;
    contactRequestForm.reset();
    updateContactInput();
    contactRequestForm.querySelector('button[type="submit"]').hidden = false;
    setFormMessage(contactRequestStatus, '');
    setFormMessage(contactVerifyStatus, '');
  });

  passwordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = passwordForm.querySelector('button[type="submit"]');
    const newPassword = passwordForm.elements.newPassword.value;
    if (newPassword !== passwordForm.elements.confirmPassword.value) {
      setFormMessage(passwordStatus, 'The new passwords do not match.');
      return;
    }

    button.disabled = true;
    setFormMessage(passwordStatus, '');
    try {
      await requestJson('/users/me/password', {
        method: 'PATCH',
        body: {
          currentPassword: passwordForm.elements.currentPassword.value,
          newPassword,
        },
      });
      passwordForm.reset();
      setFormMessage(passwordStatus, 'Password updated successfully.', true);
    } catch (error) {
      setFormMessage(passwordStatus, error.message);
    } finally {
      button.disabled = false;
    }
  });

  updateContactInput();
  loadAccount();
  loadItems();
}
