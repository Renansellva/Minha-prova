# Sistema de Cabeçalho Personalizado para Provas

## ✅ Funcionalidades Implementadas

### 🎯 **Objetivo**
Criar um sistema que permite personalizar o cabeçalho das provas com o layout similar ao da imagem fornecida, incluindo:
- Logo da escola na lateral direita
- Campos personalizáveis (Aluno, Professor, Série, Data, Disciplina, Nota)
- Possibilidade de mudar o logo para diferentes colégios

### 🏗️ **Arquitetura Implementada**

#### 1. **Banco de Dados**
- **Nova tabela**: `header_templates`
- **Campos**:
  - `id` - ID único do template
  - `nome` - Nome do template
  - `escola_nome` - Nome da escola
  - `logo_path` - Caminho para o logo da escola
  - `campos_personalizados` - JSON com campos customizáveis
  - `professor_id` - ID do professor proprietário
  - `ativo` - Status do template
  - `created_at` - Data de criação

#### 2. **Upload de Logos**
- **Diretório**: `public/uploads/logos/`
- **Configuração Multer**: Upload de imagens até 2MB
- **Formatos aceitos**: PNG, JPG, GIF
- **Nomes únicos**: UUID + nome original

#### 3. **Rotas Implementadas**
- `GET /templates-cabecalho` - Lista templates
- `GET /templates-cabecalho/novo` - Criar novo template
- `POST /api/templates-cabecalho` - Salvar template
- `GET /templates-cabecalho/:id/editar` - Editar template
- `POST /templates-cabecalho/:id/editar` - Atualizar template
- `DELETE /templates-cabecalho/:id` - Excluir template

#### 4. **Views Criadas**
- `views/templates-cabecalho/lista.ejs` - Lista de templates
- `views/templates-cabecalho/novo.ejs` - Criar template
- `views/templates-cabecalho/editar.ejs` - Editar template

### 🎨 **Interface do Usuário**

#### **Lista de Templates**
- Grid responsivo com cards dos templates
- Preview do cabeçalho em cada card
- Botões de ação: Visualizar, Editar, Excluir
- Estado vazio com call-to-action

#### **Criar/Editar Template**
- Formulário com campos:
  - Nome do template
  - Nome da escola
  - Upload de logo (drag & drop)
  - Campos personalizáveis (adicionar/remover)
- Preview em tempo real
- Validação de formulário

#### **Campos Personalizáveis**
- Campos padrão: Aluno(a), Professor(a), Série, Data, Disciplina, Nota
- Possibilidade de adicionar novos campos
- Campos padrão não podem ser removidos
- Preview dos campos no cabeçalho

### 🔧 **Funcionalidades Técnicas**

#### **Banco de Dados**
- Suporte tanto para SQLite (local) quanto banco em memória (Vercel)
- Migração automática da nova tabela
- Template padrão criado automaticamente

#### **Upload de Arquivos**
- Validação de tipo de arquivo
- Limite de tamanho (2MB)
- Nomes únicos para evitar conflitos
- Preview da imagem após upload

#### **Interface Responsiva**
- Design adaptável para desktop e mobile
- Drag & drop para upload de logo
- Preview em tempo real das alterações
- Feedback visual para ações do usuário

### 📋 **Template Padrão Incluído**
```json
{
  "nome": "Colégio Imaculada Conceição",
  "escola_nome": "COLÉGIO IMACULADA CONCEIÇÃO - CIC",
  "campos_personalizados": {
    "Aluno(a)": "Aluno(a):",
    "Professor(a)": "Professor(a):",
    "Série": "Série:",
    "Data": "Data:",
    "Disciplina": "Disciplina:",
    "Nota": "Nota:"
  }
}
```

### 🎯 **Como Usar**

1. **Acesse**: Dashboard → Templates de Cabeçalho
2. **Crie**: Novo template com nome da escola e logo
3. **Personalize**: Adicione/remova campos conforme necessário
4. **Visualize**: Preview em tempo real do cabeçalho
5. **Salve**: Template fica disponível para uso nas provas

### 🔗 **Integração com Dashboard**
- Link adicionado nas "Ações Rápidas" do dashboard
- Ícone: 📋 Templates de Cabeçalho
- Acesso direto para criar e gerenciar templates

### 🚀 **Próximos Passos**
- [ ] Integrar templates nas provas existentes
- [ ] Permitir seleção de template ao criar prova
- [ ] Aplicar cabeçalho personalizado na visualização/impressão
- [ ] Adicionar mais opções de personalização (cores, fontes)

### 📁 **Arquivos Criados/Modificados**

#### **Novos Arquivos**:
- `views/templates-cabecalho/lista.ejs`
- `views/templates-cabecalho/novo.ejs`
- `views/templates-cabecalho/editar.ejs`
- `SISTEMA_CABECALHO_PERSONALIZADO.md`

#### **Arquivos Modificados**:
- `database.js` - Métodos para templates + migração
- `database-memory.js` - Métodos para templates + dados iniciais
- `server.js` - Rotas + configuração Multer
- `views/dashboard.ejs` - Link para templates

### ✅ **Status**: Sistema de templates de cabeçalho implementado e funcional!

