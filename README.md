<div align="center">

  <h1>API do Gerenciador de Territórios</h1>
  
  <p>
    <strong>API RESTful robusta para um sistema completo de gerenciamento de territórios.</strong>
  </p>
  
  <p>
    <img src="https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js" alt="Node.js">
    <img src="https://img.shields.io/badge/Express.js-5.x-black?style=for-the-badge&logo=express" alt="Express.js">
    <img src="https://img.shields.io/badge/PostgreSQL-blue?style=for-the-badge&logo=postgresql" alt="PostgreSQL">
    <img src="https://img.shields.io/badge/AWS%20S3-orange?style=for-the-badge&logo=amazon-s3" alt="AWS S3">
    <img src="https://img.shields.io/badge/Deploy-Render-46E3B7?style=for-the-badge&logo=render" alt="Deploy na Render">
  </p>
  <p>
    <img src="https://img.shields.io/github/last-commit/seu-usuario/seu-repositorio?style=flat-square" alt="Last Commit">
    <img src="https://img.shields.io/github/license/seu-usuario/seu-repositorio?style=flat-square" alt="License">
    <img src="https://img.shields.io/badge/status-ativo-brightgreen?style=flat-square" alt="Status">
  </p>

</div>

---

> **⚠️ Atenção:** Esta API foi projetada para ser o cérebro de uma aplicação maior. Ela não possui interface visual própria e deve ser consumida pelo projeto front-end.
>
> 🔗 **Acesse o Front-end:** `[https://github.com/matheuslemess/gerenciador-territorios-frontend]`

---

## 📋 Índice

- [📍 Status do Projeto](#-status-do-projeto)
- [✨ Funcionalidades](#-funcionalidades)
- [🏛️ Arquitetura Visual](#️-arquitetura-visual)
- [🛠️ Tecnologias Utilizadas](#️-tecnologias-utilizadas)
- [🏁 Configuração e Execução Local](#-configuração-e-execução-local)
- [📖 Documentação da API](#-documentação-da-api)
- [🚀 Deploy](#-deploy)
- [🗺️ Roadmap Futuro](#️-roadmap-futuro)
- [🤝 Como Contribuir](#-como-contribuir)
- [📜 Licença](#-licença)
- [📬 Contato](#-contato)

---

## 📍 Status do Projeto

**Ativo e em Manutenção.** O projeto está funcional e pronto para uso, com futuras melhorias planejadas.

---

## ✨ Funcionalidades

- ✅ **Gestão Completa de Territórios:** CRUD com upload de mapas para o S3.
- ✅ **Controle de Pessoas/Publicadores:** Gerenciamento de usuários que trabalham nos territórios.
- ✅ **Sistema de Designação Inteligente:** Lógica transacional para "check-out" e "check-in" de territórios, prevenindo designações duplicadas.
- ✅ **Organização Estruturada:** Agrupamento de territórios por grupos e acompanhamento de campanhas.
- ✅ **Dashboard Analítico:** Endpoint com métricas chave (territórios em campo, atrasados, disponíveis).
- ✅ **Exportação de Relatórios:** Geração de arquivos `.csv` para análise externa.

---

## 🏛️ Arquitetura Visual

A API atua como o intermediário entre o cliente (front-end), o banco de dados e o serviço de armazenamento de arquivos.

```mermaid
graph LR
    %% Define os estilos (cores de fundo, borda e texto)
    classDef frontend fill:#61DAFB,stroke:#333,stroke-width:2px,color:#000
    classDef api fill:#8CC84B,stroke:#333,stroke-width:2px,color:#000
    classDef database fill:#336791,stroke:#333,stroke-width:2px,color:#fff
    classDef storage fill:#FF9900,stroke:#333,stroke-width:2px,color:#000

    %% Define os nós do diagrama
    A[👨‍💻<br/>Front-end<br/>React]
    B{🚀<br/>API<br/>Node.js/Express}
    C[(🐘<br/>Banco de Dados<br/>PostgreSQL)]
    D([📦<br/>Storage<br/>AWS S3])

    %% Conecta os nós
    A -- Requisições HTTP --> B
    B -- Consultas SQL --> C
    B -- Upload/Download --> D

    %% Aplica os estilos definidos aos nós
    class A frontend
    class B api
    class C database
    class D storage
```

---

## 🛠️ Tecnologias Utilizadas

| Categoria                     | Tecnologia                                                                  |
| ----------------------------- | --------------------------------------------------------------------------- |
| **Runtime / Framework**       | [Node.js](https://nodejs.org/) (v18+), [Express.js](https://expressjs.com/) |
| **Banco de Dados**            | [PostgreSQL](https://www.postgresql.org/)                                   |
| **Armazenamento de Arquivos** | [AWS S3](https://aws.amazon.com/s3/) via `@aws-sdk/client-s3`               |
| **Upload Handling**           | [Multer](https://github.com/expressjs/multer) e `multer-s3`                 |
| **Containerização**           | [Docker](https://www.docker.com/)                                           |
| **Utilitários**               | `dotenv`, `cors`, `pg`                                                      |

---

## 🏁 Configuração e Execução Local

Siga este guia detalhado para rodar a API em seu ambiente de desenvolvimento.

### 1. Pré-requisitos

- **Node.js:** Versão 18 ou superior.
- **Git:** Para clonar o projeto.
- **PostgreSQL:** Uma instância local ou remota ativa.

### 2. Instalação

```bash
# Clone o repositório
git clone [SEU-LINK-DO-REPOSITORIO]

# Navegue até o diretório
cd gerenciador-territorios-backend

# Instale todas as dependências
npm install
```

### 3. Configuração do Banco de Dados

- Conecte-se à sua instância PostgreSQL.
- Crie um novo banco de dados para o projeto: `CREATE DATABASE territorios_db;`
- **Execute o script de schema:** Você precisará criar todas as tabelas e relações. Se houver um arquivo `schema.sql` no projeto, execute-o. Caso contrário, a estrutura pode ser inferida a partir das queries em `index.js`.

### 4. Variáveis de Ambiente (.env)

Crie um arquivo `.env` na raiz do projeto. Ele é **essencial** e não deve ser versionado.

```env
# Conexão com o Banco de Dados
DATABASE_URL="postgres://SEU_USUARIO:SUA_SENHA@localhost:5432/territorios_db"

# Credenciais da AWS para Upload no S3
AWS_ACCESS_KEY_ID="SUA_ACCESS_KEY_ID"
AWS_SECRET_ACCESS_KEY="SUA_SECRET_ACCESS_KEY"
```

| Variável                | Descrição                                                               |
| ----------------------- | ----------------------------------------------------------------------- |
| `DATABASE_URL`          | String de conexão completa para seu banco PostgreSQL.                   |
| `AWS_ACCESS_KEY_ID`     | Chave de acesso da sua conta AWS com permissão de escrita no bucket S3. |
| `AWS_SECRET_ACCESS_KEY` | Chave secreta correspondente à sua chave de acesso AWS.                 |

### 5. Executando a Aplicação

```bash
# Inicia o servidor em modo de desenvolvimento com hot-reload
npm run dev
```

🎉 **Pronto!** A API estará rodando e acessível em `http://localhost:3001`.

---

## 📖 Documentação da API

<details>
<summary><strong>Clique para ver detalhes dos Endpoints Principais</strong></summary>

A API segue os padrões REST. Use ferramentas como [Postman](https://www.postman.com/) ou [Insomnia](https://insomnia.rest/) para testes.

#### Recurso: `/territorios`

| Método   | Endpoint           | Descrição                                                                    |
| :------- | :----------------- | :--------------------------------------------------------------------------- |
| `GET`    | `/territorios`     | Lista todos os territórios com filtros opcionais.                            |
| `POST`   | `/territorios`     | Cria um novo território. Aceita `multipart/form-data` para upload de imagem. |
| `PUT`    | `/territorios/:id` | Atualiza um território existente.                                            |
| `DELETE` | `/territorios/:id` | Deleta um território (com regras de segurança).                              |

**Exemplo: `POST /territorios`**

- **Headers:** `Content-Type: multipart/form-data`
- **Body (form-data):**
  - `numero`: `101`
  - `descricao`: `Centro da cidade, lado par`
  - `imagem`: `(file)` (opcional)

**Exemplo de Resposta (Status `201 Created`):**

```json
{
  "id": 1,
  "numero": "101",
  "descricao": "Centro da cidade, lado par",
  "url_imagem": "[https://seu-bucket.s3.us-east-2.amazonaws.com/mapas/mapa-1678886400000.png](https://seu-bucket.s3.us-east-2.amazonaws.com/mapas/mapa-1678886400000.png)",
  "tipo": null,
  "observacoes": null,
  "status": "Disponível",
  "grupo_id": null
}
```

</details>

---

## 🚀 Deploy

### Docker

O `Dockerfile` incluso permite criar uma imagem otimizada para produção.

```bash
# 1. Construa a imagem
docker build -t gerenciador-territorios-api .

# 2. Execute o contêiner (lembre-se de passar as variáveis de ambiente)
docker run --rm -p 3001:3001 \
  -e DATABASE_URL="SUA_DATABASE_URL" \
  -e AWS_ACCESS_KEY_ID="SUA_KEY" \
  -e AWS_SECRET_ACCESS_KEY="SEU_SECRET" \
  --name api-territorios \
  gerenciador-territorios-api
```

### Render

O deploy na [Render](https://render.com/) é automatizado pelo arquivo `render.yaml`.

- **Comando de Build:** `npm install`
- **Comando de Início:** `npm start`
- **Variáveis de Ambiente:** Configure `DATABASE_URL`, `AWS_ACCESS_KEY_ID`, e `AWS_SECRET_ACCESS_KEY` no painel de controle do serviço.

---

## 🗺️ Roadmap Futuro

- [ ] Implementar suíte de testes (Jest / Supertest).
- [ ] Adicionar sistema de autenticação e papéis de usuário (admin, usuário).
- [ ] Criar documentação da API com Swagger/OpenAPI.
- [ ] Melhorar o endpoint do dashboard com mais métricas.
- [ ] Adicionar funcionalidade de exportação de relatórios em PDF.

## 🤝 Como Contribuir

Contribuições tornam a comunidade open source um lugar incrível para aprender, inspirar e criar. Qualquer contribuição que você fizer será **muito apreciada**.

1.  **Fork** o Projeto
2.  Crie sua **Feature Branch** (`git checkout -b feature/AmazingFeature`)
3.  **Commit** suas alterações (`git commit -m 'Add some AmazingFeature'`)
4.  **Push** para a Branch (`git push origin feature/AmazingFeature`)
5.  Abra um **Pull Request**

---

## 🖼️ Demonstração Online

👉 _Veja o Projeto GENTerritórios em ação na [Vercel](https://genterritorios.vercel.app/)_

---

## 📜 Licença

Distribuído sob a Licença ISC. Veja `LICENSE` para mais informações.

---

## 📬 Contato

<p align="center">
by Matheus Lemes with ❤️ 
</p>

<p align="center">
<a href="https://www.linkedin.com/ibn/4matheuslemes">
<img alt="Conecte-se comigo no LinkedIn" src="https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white">
</a>
<a href="https://github.com/matheuslemess">
<img alt="Siga-me no GitHub" src="https://img.shields.io/badge/GitHub-100000?style=flat&logo=github&logoColor=white">
</a>
</p>
