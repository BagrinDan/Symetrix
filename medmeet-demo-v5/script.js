document.addEventListener('DOMContentLoaded', () => {
  const sendBtn = document.querySelector('.btn-primary') || document.getElementById('sendBtn');
  const fileInput = document.querySelector('input[type="file"]');
  
  // Elementele formularului tale (adaptează ID-urile/Clasele dacă diferă)
  const toInput = document.querySelector('input[placeholder*="gmail"]') || document.getElementById('to');
  const subjectInput = document.querySelector('input[value*="Proces-verbal"]') || document.getElementById('subject');
  const messageInput = document.querySelector('textarea') || document.getElementById('message');

  sendBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    if (!toInput.value.trim()) {
      alert('Vă rugăm introduceți adresa destinatarului!');
      return;
    }

    const formData = new FormData();
    formData.append('to', toInput.value);
    formData.append('subject', subjectInput.value);
    formData.append('message', messageInput.value);

    if (fileInput && fileInput.files[0]) {
      formData.append('attachment', fileInput.files[0]);
    }

    try {
      sendBtn.innerText = 'Se trimite...';
      sendBtn.disabled = true;

      const response = await fetch('/api/send-email', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ Email-ul a fost trimis și salvat local!');
      } else {
        alert('❌ Eroare: ' + result.error);
      }
    } catch (err) {
      console.error(err);
      alert('❌ Serverul Node.js nu răspunde. Asigură-te că ai pornit serverul!');
    } finally {
      sendBtn.innerText = 'Trimite Email';
      sendBtn.disabled = false;
    }
  });
});