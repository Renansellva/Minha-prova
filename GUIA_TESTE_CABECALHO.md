# 🧪 Guia de Teste - Sistema de Cabeçalho Personalizado

## ✅ **Servidor Iniciado com Sucesso!**

**Status**: 🟢 Rodando na porta 3000 (PID: 95432)
**URL**: http://localhost:3000

---

## 🎯 **Como Testar o Sistema de Templates de Cabeçalho**

### **1. Acesse o Sistema**
1. Abra seu navegador
2. Vá para: http://localhost:3000
3. Faça login com:
   - **Email**: admin@escola.com
   - **Senha**: admin123

### **2. Navegue para Templates de Cabeçalho**
1. No dashboard, clique em **"📋 Templates de Cabeçalho"**
2. Você verá o template padrão já criado: "Colégio Imaculada Conceição"

### **3. Teste Criar Novo Template**
1. Clique em **"➕ Novo Template"**
2. Preencha:
   - **Nome**: "Meu Colégio Personalizado"
   - **Escola**: "ESCOLA MUNICIPAL SÃO JOSÉ"
3. **Upload de Logo**:
   - Clique na área de upload ou arraste uma imagem
   - Teste drag & drop com uma imagem
4. **Campos Personalizados**:
   - Veja os campos padrão já preenchidos
   - Teste adicionar um novo campo: "Turno:"
5. **Preview**: Observe o preview em tempo real
6. Clique em **"✅ Criar Template"**

### **4. Teste Editar Template**
1. Na lista de templates, clique em **"✏️ Editar"** no template criado
2. Modifique o nome da escola
3. Teste trocar o logo
4. Adicione/remova campos
5. Observe o preview atualizar
6. Salve as alterações

### **5. Teste Visualizar Template**
1. Clique em **"👁️ Visualizar"** em qualquer template
2. Veja como ficará o cabeçalho final

### **6. Teste Excluir Template**
1. Clique em **"🗑️ Excluir"** em um template
2. Confirme a exclusão
3. Veja o template ser removido da lista

---

## 🎨 **Funcionalidades para Testar**

### **✅ Upload de Logo**
- [ ] Upload por clique
- [ ] Drag & drop de imagem
- [ ] Preview da imagem após upload
- [ ] Validação de tipo de arquivo
- [ ] Validação de tamanho (máx. 2MB)

### **✅ Campos Personalizados**
- [ ] Campos padrão (não removíveis)
- [ ] Adicionar novos campos
- [ ] Remover campos customizados
- [ ] Preview dos campos no cabeçalho

### **✅ Interface**
- [ ] Preview em tempo real
- [ ] Validação de formulário
- [ ] Mensagens de sucesso/erro
- [ ] Navegação entre páginas
- [ ] Design responsivo

### **✅ Banco de Dados**
- [ ] Criação de templates
- [ ] Edição de templates
- [ ] Exclusão de templates
- [ ] Persistência dos dados

---

## 🎯 **Cenários de Teste Específicos**

### **Cenário 1: Primeira Vez**
1. Acesse o sistema
2. Vá para Templates de Cabeçalho
3. Veja o template padrão "Colégio Imaculada Conceição"
4. Crie seu primeiro template personalizado

### **Cenário 2: Múltiplos Colégios**
1. Crie template para "Colégio A"
2. Crie template para "Colégio B"
3. Crie template para "Escola Municipal"
4. Veja todos na lista
5. Teste editar cada um

### **Cenário 3: Upload de Logo**
1. Prepare 3 imagens diferentes (PNG, JPG, GIF)
2. Teste upload de cada uma
3. Teste drag & drop
4. Teste trocar logo em template existente

### **Cenário 4: Campos Personalizados**
1. Crie template com campos extras: "Turma:", "Professor(a):", "Data:"
2. Teste adicionar campo "Turno:"
3. Teste remover campo customizado
4. Teste tentar remover campo padrão (deve estar desabilitado)

---

## 🚨 **Possíveis Problemas e Soluções**

### **Problema**: Erro ao fazer upload
**Solução**: Verifique se a imagem é PNG/JPG/GIF e menor que 2MB

### **Problema**: Template não salva
**Solução**: Verifique se preencheu nome e escola

### **Problema**: Preview não atualiza
**Solução**: Recarregue a página

### **Problema**: Erro 404 ao acessar templates
**Solução**: Verifique se o servidor está rodando na porta 3000

---

## 📋 **Checklist de Teste**

- [ ] **Login funciona**
- [ ] **Dashboard carrega**
- [ ] **Link "Templates de Cabeçalho" aparece**
- [ ] **Lista de templates carrega**
- [ ] **Template padrão está visível**
- [ ] **Criar novo template funciona**
- [ ] **Upload de logo funciona**
- [ ] **Preview em tempo real funciona**
- [ ] **Campos personalizados funcionam**
- [ ] **Salvar template funciona**
- [ ] **Editar template funciona**
- [ ] **Excluir template funciona**
- [ ] **Interface responsiva**
- [ ] **Validações funcionam**

---

## 🎉 **Resultado Esperado**

Após todos os testes, você deve ter:
- ✅ Sistema de templates funcionando perfeitamente
- ✅ Possibilidade de criar cabeçalhos personalizados
- ✅ Upload de logos funcionando
- ✅ Preview em tempo real
- ✅ Interface intuitiva e responsiva

**O sistema está pronto para personalizar cabeçalhos de provas para diferentes colégios!**

---

## 🔗 **URLs Importantes**
- **Dashboard**: http://localhost:3000/dashboard
- **Templates**: http://localhost:3000/templates-cabecalho
- **Novo Template**: http://localhost:3000/templates-cabecalho/novo
- **Login**: http://localhost:3000/login

