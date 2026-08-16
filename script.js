// Form submission handling
document.getElementById('emailForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const emailInput = document.getElementById('email');
    const email = emailInput.value.trim();
    const formMessage = document.getElementById('formMessage');
    const submitBtn = document.getElementById('submitBtn');

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        formMessage.textContent = 'Por favor, insira um e-mail válido.';
        formMessage.style.color = 'red';
        return;
    }

    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';
    formMessage.textContent = '';
    formMessage.style.color = '';

    // Prepare form data
    const formData = new FormData(this);

    // Submit to Formspree
    fetch(this.action, {
        method: 'POST',
        body: formData,
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Network response was not ok.');
    })
    .then(data => {
        // Success
        formMessage.textContent = 'Obrigado! Verifique seu e-mail para receber o ebook gratuito.';
        formMessage.style.color = 'green';
        this.reset();
    })
    .catch(error => {
        // Error
        console.error('Error:', error);
        formMessage.textContent = 'Ops! Ocorreu um erro ao enviar. Tente novamente novamente.';
        formMessage.style.color = 'red';
    })
    .finally(() => {
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Quero o Ebook Grátis';
    });
});
