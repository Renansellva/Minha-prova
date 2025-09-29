# 🚀 Minha Prova - Sistema de Gerenciamento de Provas

## 📋 Sobre o Sistema

Sistema completo para gerenciamento de provas escolares com:
- ✅ **Múltiplos usuários** (professores)
- ✅ **Banco de questões** reutilizáveis
- ✅ **Criação de provas** personalizadas
- ✅ **QR codes únicos** por prova
- ✅ **Impressão profissional** (com e sem gabarito)
- ✅ **Navegação intuitiva** com breadcrumbs
- ✅ **Interface responsiva** e moderna

---

## 🎯 Funcionalidades Principais

### 👥 **Sistema de Usuários**
- Login individual para cada professor
- Criação de novos usuários (admin)
- Isolamento de dados por professor

### ❓ **Banco de Questões**
- Questões reutilizáveis
- Múltiplas opções (A, B, C, D, E...)
- Classificação por área e dificuldade
- Filtros e busca avançada

### 📝 **Gerenciamento de Provas**
- Criar provas personalizadas
- Selecionar questões do banco
- Disciplina opcional (ideal para faculdades)
- Turmas livres (digite qualquer uma)

### 📱 **QR Codes e Impressão**
- QR code único por prova (não mais um por questão)
- Impressão com e sem gabarito
- Layout otimizado para A4
- Destaque visual do QR code

---

## 🚀 Deploy na Vercel

### **1. Preparação do Projeto**
O projeto já está configurado com:
- ✅ `vercel.json` configurado
- ✅ `package.json` com scripts de build
- ✅ Servidor otimizado para produção
- ✅ Banco SQLite incluído

### **2. Deploy via Vercel CLI**

```bash
# Instalar Vercel CLI
npm i -g vercel

# Fazer login na Vercel
vercel login

# Deploy do projeto
vercel

# Deploy para produção
vercel --prod
```

### **3. Deploy via GitHub**

1. **Criar repositório** no GitHub
2. **Fazer push** do código
3. **Conectar** na Vercel
4. **Deploy automático** configurado

### **4. Configurações de Produção**

O sistema detecta automaticamente:
- ✅ **NODE_ENV=production** na Vercel
- ✅ **Porta dinâmica** (process.env.PORT)
- ✅ **Banco SQLite** funcional
- ✅ **Logs otimizados** para produção

---

## 🔑 Usuários Padrão

Após o deploy, use estes usuários:

### **👨‍💼 Administrador**
- **E-mail**: `admin@escola.com`
- **Senha**: `admin123`
- **Pode**: Criar novos usuários

### **👩‍🏫 Professores**
- **E-mail**: `maria@escola.com` | **Senha**: `maria123`
- **E-mail**: `joao@escola.com` | **Senha**: `joao123`
- **E-mail**: `ana@escola.com` | **Senha**: `ana123`

---

## 📱 Como Usar

### **1. Acesso**
- Acesse a URL fornecida pela Vercel
- Faça login com um dos usuários
- Veja o dashboard principal

### **2. Criar Questões**
1. Vá em "❓ Adicionar Questão"
2. Preencha enunciado e opções
3. Marque a resposta correta
4. Salve no banco reutilizável

### **3. Criar Provas**
1. Vá em "➕ Criar Nova Prova"
2. Digite título e turma
3. Disciplina é opcional
4. Selecione questões do banco
5. Salve a prova

### **4. Imprimir Provas**
1. Acesse uma prova criada
2. Clique em "🖨️ Imprimir Prova" (para alunos)
3. Ou "📋 Imprimir com Gabarito" (para professor)
4. Configure impressora e imprima

---

## 🛠️ Tecnologias Utilizadas

- **Backend**: Node.js + Express.js
- **Frontend**: EJS + HTML/CSS/JavaScript
- **Banco**: SQLite3
- **Autenticação**: bcryptjs + express-session
- **QR Codes**: qrcode
- **Deploy**: Vercel
- **Estilo**: CSS puro responsivo

---

## 📊 Estrutura do Projeto

```
prova-aleatoria/
├── server.js              # Servidor principal
├── database.js            # Configuração do banco
├── vercel.json            # Configuração Vercel
├── package.json           # Dependências
├── views/                 # Templates EJS
│   ├── dashboard.ejs      # Dashboard principal
│   ├── login.ejs          # Página de login
│   ├── provas/            # Páginas de provas
│   └── questoes/          # Páginas de questões
├── public/                # Arquivos estáticos
│   ├── css/              # Estilos
│   └── js/               # JavaScript
└── database.db           # Banco SQLite
```

---

## 🔧 Comandos Úteis

### **Desenvolvimento Local**
```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Executar em produção
npm start
```

### **Deploy**
```bash
# Deploy na Vercel
vercel

# Deploy para produção
vercel --prod

# Ver logs
vercel logs
```

---

## 🎉 Sistema Pronto para Uso!

### ✅ **Funcionalidades Completas**
- Sistema de autenticação
- Gerenciamento de provas e questões
- Impressão profissional
- QR codes únicos
- Navegação intuitiva
- Interface responsiva

### ✅ **Pronto para Produção**
- Configurado para Vercel
- Banco de dados funcional
- Logs otimizados
- Performance otimizada

### ✅ **Fácil de Usar**
- Interface intuitiva
- Navegação clara
- Documentação completa
- Suporte completo

---

**🚀 Deploy na Vercel e comece a usar seu sistema de provas profissional!**

