// Form submission handling
document.getElementById('emailForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const emailInput = document.getElementById('email');
    const email = emailInput.value.trim();
    
    if (email) {
        // Aqui você normalmente enviaria para um endpoint real
        // Por enquanto, apenas mostrar um alert de sucesso
        alert('Obrigado! Verifique seu e-mail para receber o ebook gratuito.');
        emailInput.value = '';
        emailInput.focus();
    } else {
        alert('Por favor, insira um e-mail válido.');
    }
});
