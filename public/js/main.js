// Função para gerar uma nova prova para um aluno
async function gerarProva(alunoId) {
    const statusElement = document.getElementById(`status-${alunoId}`);
    
    // Mostra loading
    statusElement.innerHTML = '<span class="loading"></span>Gerando nova prova...';
    statusElement.className = 'status-message info';
    statusElement.style.display = 'block';
    
    try {
        const response = await fetch(`/gerar-prova/${alunoId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            statusElement.innerHTML = `✅ ${data.mensagem}`;
            statusElement.className = 'status-message success';
            
            // Atualiza o botão para mostrar "Ver Prova"
            const btnGerar = document.querySelector(`button[onclick="gerarProva(${alunoId})"]`);
            if (btnGerar) {
                btnGerar.textContent = '🔄 Regenerar Prova';
            }
        } else {
            throw new Error(data.error || 'Erro ao gerar prova');
        }
    } catch (error) {
        console.error('Erro:', error);
        statusElement.innerHTML = `❌ Erro: ${error.message}`;
        statusElement.className = 'status-message error';
    }
    
    // Remove a mensagem após 5 segundos
    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 5000);
}

// Função para verificar o status das provas ao carregar a página
async function verificarStatusProvas() {
    const alunos = document.querySelectorAll('.student-card');
    
    for (const alunoCard of alunos) {
        const alunoId = alunoCard.querySelector('button[onclick*="gerarProva"]')?.onclick?.toString().match(/gerarProva\((\d+)\)/)?.[1];
        
        if (alunoId) {
            try {
                const response = await fetch(`/prova/${alunoId}`, {
                    method: 'HEAD' // Usa HEAD para verificar se existe sem baixar o conteúdo
                });
                
                if (response.ok) {
                    const btnGerar = alunoCard.querySelector(`button[onclick="gerarProva(${alunoId})"]`);
                    if (btnGerar) {
                        btnGerar.textContent = '🔄 Regenerar Prova';
                    }
                }
            } catch (error) {
                console.log(`Prova ainda não existe para aluno ${alunoId}`);
            }
        }
    }
}

// Função para mostrar notificação
function mostrarNotificacao(mensagem, tipo = 'info') {
    // Remove notificação anterior se existir
    const notificacaoAnterior = document.querySelector('.notificacao');
    if (notificacaoAnterior) {
        notificacaoAnterior.remove();
    }
    
    // Cria nova notificação
    const notificacao = document.createElement('div');
    notificacao.className = `notificacao notificacao-${tipo}`;
    notificacao.innerHTML = `
        <div class="notificacao-conteudo">
            <span class="notificacao-icone">
                ${tipo === 'success' ? '✅' : tipo === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span class="notificacao-texto">${mensagem}</span>
            <button class="notificacao-fechar" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    // Adiciona estilos se não existirem
    if (!document.querySelector('#notificacao-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notificacao-styles';
        styles.textContent = `
            .notificacao {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
                max-width: 400px;
                animation: slideIn 0.3s ease-out;
            }
            
            .notificacao-conteudo {
                display: flex;
                align-items: center;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                background: white;
                border-left: 4px solid #007bff;
            }
            
            .notificacao-success .notificacao-conteudo {
                border-left-color: #28a745;
                background: #d4edda;
            }
            
            .notificacao-error .notificacao-conteudo {
                border-left-color: #dc3545;
                background: #f8d7da;
            }
            
            .notificacao-icone {
                font-size: 1.2em;
                margin-right: 10px;
            }
            
            .notificacao-texto {
                flex: 1;
                font-weight: 500;
            }
            
            .notificacao-fechar {
                background: none;
                border: none;
                font-size: 1.5em;
                cursor: pointer;
                margin-left: 10px;
                opacity: 0.7;
            }
            
            .notificacao-fechar:hover {
                opacity: 1;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(notificacao);
    
    // Remove automaticamente após 5 segundos
    setTimeout(() => {
        if (notificacao.parentElement) {
            notificacao.remove();
        }
    }, 5000);
}

// Função para copiar URL da prova
async function copiarURLProva(alunoId) {
    const url = `${window.location.origin}/prova/${alunoId}`;
    
    try {
        await navigator.clipboard.writeText(url);
        mostrarNotificacao('URL copiada para a área de transferência!', 'success');
    } catch (error) {
        // Fallback para navegadores mais antigos
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        mostrarNotificacao('URL copiada para a área de transferência!', 'success');
    }
}

// Função para compartilhar prova
async function compartilharProva(alunoId, nomeAluno) {
    const url = `${window.location.origin}/prova/${alunoId}`;
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: `Prova de ${nomeAluno}`,
                text: `Acesse a prova de ${nomeAluno}`,
                url: url
            });
        } catch (error) {
            console.log('Compartilhamento cancelado');
        }
    } else {
        copiarURLProva(alunoId);
    }
}

// Event listeners quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    // Verifica o status das provas
    verificarStatusProvas();
    
    // Adiciona efeitos de hover nos cards
    const cards = document.querySelectorAll('.student-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
    
    // Adiciona animação de loading nos botões
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            if (this.textContent.includes('Gerar')) {
                this.style.opacity = '0.7';
                setTimeout(() => {
                    this.style.opacity = '1';
                }, 1000);
            }
        });
    });
    
    console.log('🚀 Sistema de Provas carregado com sucesso!');
});








