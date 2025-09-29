# 📚 Sistema de Provas Escolares

Um aplicativo web para gerenciamento de provas escolares com geração aleatória e QR codes únicos para cada aluno.

## 🚀 Funcionalidades

- **Geração de Provas Aleatórias**: Cada aluno recebe uma prova única com questões selecionadas aleatoriamente
- **QR Codes**: Cada questão possui um QR Code para identificação
- **Interface Intuitiva**: Design limpo e responsivo para fácil navegação
- **Persistência**: A mesma prova é mantida para o mesmo aluno
- **Impressão**: Funcionalidade de impressão das provas

## 📋 Pré-requisitos

- Node.js (versão 14 ou superior)
- npm ou yarn

## 🛠️ Instalação

1. Clone ou baixe o projeto
2. Abra o terminal na pasta do projeto
3. Instale as dependências:

```bash
npm install
```

## ▶️ Como Executar

1. Inicie o servidor:

```bash
npm start
```

2. Abra seu navegador e acesse:

```
http://localhost:3000
```

## 📱 Como Usar

### Página Principal
- Visualize a lista de alunos cadastrados
- Clique em "Ver Prova" para acessar a prova de um aluno
- Clique em "Gerar Nova Prova" para gerar uma nova prova aleatória

### Página da Prova
- Visualize as questões da prova do aluno
- Cada questão possui um QR Code para identificação
- Use o botão "Imprimir Prova" para imprimir a prova
- Marque as respostas selecionando as opções

## 🎯 Funcionalidades Técnicas

### Backend (Node.js/Express)
- **Endpoints**:
  - `GET /` - Página principal com lista de alunos
  - `GET /gerar-prova/:alunoId` - Gera nova prova para um aluno
  - `GET /prova/:alunoId` - Exibe a prova de um aluno
  - `GET /questao/:questaoId` - Detalhes de uma questão específica
  - `GET /admin/questoes` - Lista todas as questões (admin)
  - `GET /admin/provas` - Lista todas as provas geradas (admin)

### Frontend
- **Tecnologias**: HTML5, CSS3, JavaScript (Vanilla)
- **Templates**: EJS para renderização server-side
- **QR Codes**: Gerados dinamicamente com a biblioteca `qrcode`
- **Responsivo**: Interface adaptável para diferentes tamanhos de tela

## 📊 Dados de Exemplo

### Alunos
- João Silva (9º Ano A)
- Maria Santos (9º Ano A)
- Pedro Oliveira (9º Ano B)

### Áreas de Conhecimento
- Matemática
- Português
- Geografia
- História
- Química

## 🔧 Personalização

### Adicionar Novos Alunos
Edite o array `alunos` no arquivo `server.js`:

```javascript
const alunos = [
  {
    id: 4,
    nome: "Ana Costa",
    turma: "9º Ano C"
  },
  // ... outros alunos
];
```

### Adicionar Novas Questões
Edite o array `questoes` no arquivo `server.js`:

```javascript
const questoes = [
  {
    id: 9,
    enunciado: "Sua pergunta aqui?",
    opcoes: ["Opção A", "Opção B", "Opção C", "Opção D"],
    respostaCorreta: 0, // índice da resposta correta
    area: "Sua Área"
  },
  // ... outras questões
];
```

## 📁 Estrutura do Projeto

```
prova-aleatoria/
├── server.js              # Servidor principal
├── package.json           # Dependências e scripts
├── README.md             # Documentação
├── views/                # Templates EJS
│   ├── index.ejs         # Página principal
│   └── prova.ejs         # Página da prova
└── public/               # Arquivos estáticos
    ├── css/
    │   └── style.css     # Estilos
    └── js/
        └── main.js       # JavaScript do frontend
```

## 🎨 Características do Design

- **Cores**: Gradiente azul/roxo para o fundo, design clean
- **Tipografia**: Segoe UI para melhor legibilidade
- **Animações**: Transições suaves e efeitos hover
- **Responsivo**: Adaptável para desktop, tablet e mobile
- **Acessibilidade**: Contraste adequado e navegação por teclado

## 🔒 Segurança

- Validação de IDs de alunos
- Sanitização de dados de entrada
- Prevenção de XSS com EJS
- Headers de segurança básicos

## 🚀 Melhorias Futuras

- [ ] Banco de dados (MongoDB/PostgreSQL)
- [ ] Sistema de autenticação
- [ ] Painel administrativo
- [ ] Exportação para PDF
- [ ] Estatísticas de desempenho
- [ ] Tempo limite para provas
- [ ] Correção automática
- [ ] Relatórios detalhados

## 📞 Suporte

Para dúvidas ou problemas, verifique:
1. Se o Node.js está instalado corretamente
2. Se todas as dependências foram instaladas
3. Se a porta 3000 está disponível
4. Os logs do console para erros

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

---

**Desenvolvido com ❤️ usando Node.js, Express e tecnologias web modernas.**


