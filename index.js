// 1. Importação dos pacotes que vamos usar
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// 2. Inicialização do Express
const app = express();
const port = process.env.PORT || 3001;

const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');

// 3. Configuração dos Middlewares
// Habilita o CORS para que nosso frontend possa acessar o backend
const allowedOrigins = [
  'http://localhost:5173', // front local
  'https://genterritorios.vercel.app' // front em produção
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

// Habilita o Express para entender requisições com corpo em formato JSON
app.use(express.json());

app.use('/uploads', express.static('uploads'));

// 4. Configuração da Conexão com o Banco de Dados (PostgreSQL)
// **IMPORTANTE: Substitua com suas próprias credenciais!**
const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://usuario:senha@localhost:5432/nomedobanco",
  ssl: isProduction ? { rejectUnauthorized: false } : false
});


// Teste de conexão com o banco de dados
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Erro ao conectar ao PostgreSQL', err.stack);
  } else {
    console.log('Conexão com o PostgreSQL bem-sucedida!');
  }
});

// Configuração do Multer para upload de imagens
// Configura o cliente S3 para se conectar à AWS
// As credenciais serão lidas das variáveis de ambiente que configuraremos no Render
const s3 = new S3Client({
  region: 'us-east-2', // <-- MUDE AQUI para a região do seu bucket S3
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

// Nova configuração do Multer para fazer upload direto para o S3
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'gerenciador-territorios-mapas', // <-- MUDE AQUI para o nome do seu bucket
    metadata: function (req, file, cb) {
      cb(null, {fieldName: file.fieldname});
    },
    key: function (req, file, cb) {
      // Cria um nome de arquivo único para a imagem no S3
      cb(null, 'mapas/mapa-' + Date.now() + path.extname(file.originalname));
    },
    acl: 'public-read' // Define o arquivo como publicamente legível
  })
});
// 5. Definição da Primeira Rota (Rota de Teste)
app.get('/', (req, res) => {
  res.json({ message: 'API do Gerenciador de Territórios está no ar!' });
});

// Rota para CRIAR uma nova pessoa (POST)
app.post('/pessoas', async (req, res) => {
  try {
    // 1. Pega os dados do corpo da requisição
    const { nome, email, telefone } = req.body;

    // Validação simples para ver se o nome foi enviado
    if (!nome) {
      return res.status(400).json({ error: 'O campo nome é obrigatório.' });
    }

    // 2. Cria a query SQL para inserir os dados
    // Usamos $1, $2, $3 para evitar SQL Injection. É uma prática de segurança!
    const novaPessoaQuery = `
      INSERT INTO pessoas (nome, email, telefone) 
      VALUES ($1, $2, $3) 
      RETURNING *;
    `;
    const values = [nome, email, telefone];

    // 3. Executa a query no banco de dados
    const novaPessoa = await pool.query(novaPessoaQuery, values);

    // 4. Retorna a pessoa recém-criada como resposta
    // O status 201 significa "Created" (Criado)
    res.status(201).json(novaPessoa.rows[0]);

  } catch (error) {
    // Em caso de erro, loga no console e retorna uma mensagem de erro
    console.error('Erro ao cadastrar pessoa:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// Rota para LISTAR todas as pessoas (GET)
app.get('/pessoas', async (req, res) => {
  try {
    // 1. Cria e executa a query para selecionar todas as pessoas
    // Adicionamos "ORDER BY nome ASC" para que a lista venha sempre em ordem alfabética
    const todasAsPessoas = await pool.query('SELECT * FROM pessoas ORDER BY nome ASC');

    // 2. Retorna o array de pessoas encontradas
    // O resultado da query fica em "rows"
    res.status(200).json(todasAsPessoas.rows);

  } catch (error) {
    console.error('Erro ao listar pessoas:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// Rota para ATUALIZAR uma pessoa (PUT)
app.put('/pessoas/:id', async (req, res) => {
  try {
    const { id } = req.params; // Pega o ID da URL
    const { nome, email, telefone } = req.body; // Pega os novos dados do corpo

    if (!nome) {
      return res.status(400).json({ error: 'O campo nome é obrigatório.' });
    }

    const updatePessoaQuery = `
      UPDATE pessoas 
      SET nome = $1, email = $2, telefone = $3 
      WHERE id = $4 
      RETURNING *;
    `;
    const values = [nome, email, telefone, id];
    
    const pessoaAtualizada = await pool.query(updatePessoaQuery, values);

    if (pessoaAtualizada.rows.length === 0) {
      return res.status(404).json({ error: 'Pessoa não encontrada.' });
    }

    res.status(200).json(pessoaAtualizada.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar pessoa:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// Rota para DELETAR uma pessoa (DELETE)
app.delete('/pessoas/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Adicionaremos uma verificação: não permitir excluir pessoa se ela tiver um território ativo
    const checkDesignacaoQuery = 'SELECT * FROM designacoes WHERE pessoa_id = $1 AND data_devolucao IS NULL';
    const activeDesignation = await pool.query(checkDesignacaoQuery, [id]);

    if (activeDesignation.rows.length > 0) {
      return res.status(400).json({ error: 'Não é possível excluir. A pessoa está com um território em campo.' });
    }

    const deletePessoaQuery = 'DELETE FROM pessoas WHERE id = $1 RETURNING *;';
    const pessoaDeletada = await pool.query(deletePessoaQuery, [id]);

    if (pessoaDeletada.rows.length === 0) {
      return res.status(404).json({ error: 'Pessoa não encontrada.' });
    }

    res.status(200).json({ message: 'Pessoa deletada com sucesso.', data: pessoaDeletada.rows[0] });
  } catch (error) {
    console.error('Erro ao deletar pessoa:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// Rota para LISTAR todos os territórios (GET) - VERSÃO FINAL COM FILTROS E ORDENAÇÃO
app.get('/territorios', async (req, res) => {
  try {
    const { status, search, sort = 'numero_asc', nao_trabalhado_na_campanha } = req.query;

    let baseQuery = `
      SELECT 
        t.*, 
        p.nome AS pessoa_nome, 
        d_ativa.data_saida, 
        g.nome AS grupo_nome,
        c.titulo AS campanha_titulo, -- <<< LINHA NOVA: Seleciona o título da campanha
        (SELECT MAX(d_hist.data_devolucao) FROM designacoes d_hist WHERE d_hist.territorio_id = t.id) AS ultima_devolucao
      FROM territorios t
      LEFT JOIN designacoes d_ativa ON t.id = d_ativa.territorio_id AND d_ativa.data_devolucao IS NULL
      LEFT JOIN pessoas p ON d_ativa.pessoa_id = p.id
      LEFT JOIN grupos g ON t.grupo_id = g.id
      LEFT JOIN campanhas c ON d_ativa.campanha_id = c.id -- <<< LINHA NOVA: Junta com a tabela de campanhas
    `;

    // O resto da lógica de filtros e ordenação continua exatamente a mesma
    const whereClauses = [];
    const values = [];
    let paramIndex = 1;

    if (nao_trabalhado_na_campanha) {
      whereClauses.push(`t.id NOT IN (SELECT territorio_id FROM designacoes WHERE campanha_id = $${paramIndex})`);
      values.push(nao_trabalhado_na_campanha);
      paramIndex++;
    }
    if (status) {
      whereClauses.push(`t.status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }
    if (search) {
      whereClauses.push(`(t.numero ILIKE $${paramIndex} OR t.descricao ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }
    if (whereClauses.length > 0) {
      baseQuery += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    
    let orderByClause = ' ORDER BY ';
    switch (sort) {
      case 'devolucao_desc':
        orderByClause += 'ultima_devolucao DESC NULLS LAST, CAST(t.numero AS INTEGER) ASC';
        break;
      case 'descricao_asc':
        orderByClause += 't.descricao ASC';
        break;
      default:
        orderByClause += 'CAST(t.numero AS INTEGER) ASC';
        break;
    }
    baseQuery += orderByClause;

    const todosTerritorios = await pool.query(baseQuery, values);
    res.status(200).json(todosTerritorios.rows);

  } catch (error) {
    console.error('Erro ao listar territórios:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// Rota para CRIAR um novo território com upload de imagem (POST)
app.post('/territorios', upload.single('imagem'), async (req, res) => {
  try {
    const { numero, descricao, tipo, observacoes } = req.body;

    // ALTERAÇÃO 1: Adicionamos a validação para os campos obrigatórios
    if (!numero || !descricao) {
      return res.status(400).json({ error: 'Número e Descrição do Território são obrigatórios.' });
    }

    // ALTERAÇÃO 2: A imagem agora é opcional.
    // Se req.file existir, usamos sua localização (URL no S3).
    // Se não, salvamos null no banco de dados.
    const url_imagem = req.file ? req.file.location : null;

    const novoTerritorioQuery = `
      INSERT INTO territorios (numero, descricao, url_imagem, tipo, observacoes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [numero, descricao, url_imagem, tipo, observacoes];

    const novoTerritorio = await pool.query(novoTerritorioQuery, values);

    res.status(201).json(novoTerritorio.rows[0]);

  } catch (error) {
    console.error('Erro ao cadastrar território:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// Rota para ATUALIZAR um território (PUT)
// Nota: Esta versão simples não lida com a troca da imagem.
app.put('/territorios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { numero, descricao, tipo, observacoes } = req.body;

    if (!numero) {
      return res.status(400).json({ error: 'O campo número é obrigatório.' });
    }

    const updateTerritorioQuery = `
      UPDATE territorios 
      SET numero = $1, descricao = $2, tipo = $3, observacoes = $4
      WHERE id = $5 
      RETURNING *;
    `;
    const values = [numero, descricao, tipo, observacoes, id];
    
    const territorioAtualizado = await pool.query(updateTerritorioQuery, values);

    if (territorioAtualizado.rows.length === 0) {
      return res.status(404).json({ error: 'Território não encontrado.' });
    }

    res.status(200).json(territorioAtualizado.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar território:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// Rota para DELETAR um território (DELETE)
app.delete('/territorios/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Trava de segurança: Não permitir excluir território se ele estiver em campo.
    const territorio = await pool.query('SELECT status FROM territorios WHERE id = $1', [id]);

    if (territorio.rows.length === 0) {
      return res.status(404).json({ error: 'Território não encontrado.' });
    }

    if (territorio.rows[0].status === 'Em campo') {
      return res.status(400).json({ error: 'Não é possível excluir um território que está em campo.' });
    }
    
    // Futuramente, aqui também deletaríamos o arquivo da imagem do servidor.
    // Por enquanto, apenas deletamos o registro do banco.

    const territorioDeletado = await pool.query('DELETE FROM territorios WHERE id = $1 RETURNING *;', [id]);

    res.status(200).json({ message: 'Território deletado com sucesso.', data: territorioDeletado.rows[0] });
  } catch (error) {
    console.error('Erro ao deletar território:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// Rota para buscar o histórico completo de todos os territórios
app.get('/historico-completo', async (req, res) => {
  try {
    const query = `
      SELECT 
        t.id AS territorio_id, t.numero AS territorio_numero, t.descricao AS territorio_descricao,
        p.nome AS pessoa_nome, d.data_saida, d.data_devolucao,
        c.titulo AS campanha_titulo -- <<< NOVA COLUNA
      FROM territorios t
      LEFT JOIN designacoes d ON t.id = d.territorio_id
      LEFT JOIN pessoas p ON d.pessoa_id = p.id
      LEFT JOIN campanhas c ON d.campanha_id = c.id -- <<< NOVO JOIN
      ORDER BY t.id, d.data_saida DESC;
    `;
    const result = await pool.query(query);
    
    // Agrupamento dos resultados
    const territoriosMap = new Map();
    result.rows.forEach(row => {
      if (!territoriosMap.has(row.territorio_id)) {
        territoriosMap.set(row.territorio_id, {
          id: row.territorio_id, numero: row.territorio_numero, descricao: row.territorio_descricao,
          historico: []
        });
      }
      if (row.pessoa_nome) {
        territoriosMap.get(row.territorio_id).historico.push({
          pessoa_nome: row.pessoa_nome,
          data_saida: row.data_saida,
          data_devolucao: row.data_devolucao,
          campanha_titulo: row.campanha_titulo // <<< NOVO CAMPO
        });
      }
    });

    const historicoCompleto = Array.from(territoriosMap.values());
    res.status(200).json(historicoCompleto);

  } catch (error) {
    console.error('Erro ao buscar histórico completo:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// Rota para exportar os dados no formato CSV padrão S-13
app.get('/territorios/export', async (req, res) => {
  try {
    // 1. Usamos nossa query mais completa para buscar todos os dados necessários
    const query = `
      SELECT 
        t.numero,
        t.descricao,
        t.status,
        g.nome AS grupo_nome,
        p.nome AS pessoa_nome,
        d_ativa.data_saida,
        (SELECT MAX(d_hist.data_devolucao) FROM designacoes d_hist WHERE d_hist.territorio_id = t.id) AS ultima_devolucao
      FROM 
        territorios t
      LEFT JOIN 
        designacoes d_ativa ON t.id = d_ativa.territorio_id AND d_ativa.data_devolucao IS NULL
      LEFT JOIN 
        pessoas p ON d_ativa.pessoa_id = p.id
      LEFT JOIN
        grupos g ON t.grupo_id = g.id
      ORDER BY 
        CAST(t.numero AS INTEGER) ASC;
    `;
    const result = await pool.query(query);
    const territorios = result.rows;

    // 2. Definimos os cabeçalhos do nosso arquivo CSV
    const csvHeader = [
      "Número do Território",
      "Descrição/Limites",
      "Grupo",
      "Status Atual",
      "Designado Para",
      "Data de Saída",
      "Última Devolução"
    ].join(';'); // Usamos ';' como separador para melhor compatibilidade com Excel no Brasil

    // 3. Mapeamos os dados para o formato de linha do CSV
    const csvRows = territorios.map(t => {
      // Função para formatar a data ou retornar vazio
      const formatDate = (date) => date ? new Date(date).toLocaleDateString('pt-BR') : '';

      // Limpa a descrição para evitar quebras de linha no CSV
      const cleanDescription = t.descricao ? t.descricao.replace(/"/g, '""').replace(/\n/g, ' ') : '';
      
      const row = [
        t.numero || '',
        `"${cleanDescription}"`, // Coloca a descrição entre aspas para segurança
        t.grupo_nome || '',
        t.status || '',
        t.pessoa_nome || '', // Ficará vazio se o território estiver disponível
        formatDate(t.data_saida),
        formatDate(t.ultima_devolucao)
      ];
      return row.join(';');
    });

    // 4. Montamos o CSV completo e adicionamos um BOM para o Excel entender acentos
    const csvContent = '\uFEFF' + [csvHeader, ...csvRows].join('\n');

    // 5. Configuramos a resposta HTTP para forçar o download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="S-13_Relatorio_Territorios_${new Date().toISOString().split('T')[0]}.csv"`);
    res.status(200).end(csvContent);

  } catch (error) {
    console.error('Erro ao exportar territórios:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor ao gerar o relatório.' });
  }
});

// Rota para gerar e baixar o relatório S-13 em PDF


// --- ROTAS DE GRUPOS ---

// CRIAR um novo grupo
app.post('/grupos', async (req, res) => {
  try {
    const { nome } = req.body;
    const novoGrupo = await pool.query("INSERT INTO grupos (nome) VALUES ($1) RETURNING *", [nome]);
    res.status(201).json(novoGrupo.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Erro ao criar grupo.' });
  }
});

app.delete('/grupos/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    // Inicia a transação
    await client.query('BEGIN');

    // 1. Desassocia todos os territórios que pertencem a este grupo
    await client.query("UPDATE territorios SET grupo_id = NULL WHERE grupo_id = $1", [id]);
    
    // 2. Agora, deleta o grupo que está vazio
    const grupoDeletado = await client.query("DELETE FROM grupos WHERE id = $1 RETURNING *", [id]);
    
    if (grupoDeletado.rows.length === 0) {
      throw new Error('Grupo não encontrado.');
    }

    // Se tudo deu certo, efetiva a transação
    await client.query('COMMIT');
    
    res.status(200).json({ message: 'Grupo deletado com sucesso.' });
  } catch (error) {
    // Se algo deu errado, desfaz tudo
    await client.query('ROLLBACK');
    console.error(error.message);
    res.status(500).json({ error: 'Erro ao deletar grupo.' });
  } finally {
    client.release();
  }
});

// ATUALIZAR o nome de um grupo
app.put('/grupos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome } = req.body;

    if (!nome || !nome.trim()) {
      return res.status(400).json({ error: 'O nome do grupo não pode ser vazio.' });
    }

    const grupoAtualizado = await pool.query(
      "UPDATE grupos SET nome = $1 WHERE id = $2 RETURNING *",
      [nome, id]
    );

    if (grupoAtualizado.rows.length === 0) {
      return res.status(404).json({ error: 'Grupo não encontrado.' });
    }

    res.json(grupoAtualizado.rows[0]);
  } catch (error) {
    console.error(error.message);
    // Verifica se é um erro de nome duplicado (unique constraint)
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Já existe um grupo com este nome.' });
    }
    res.status(500).json({ error: 'Erro ao atualizar grupo.' });
  }
});

// LISTAR todos os grupos (com seus territórios associados)
app.get('/grupos', async (req, res) => {
  try {
    // A query agora também busca os territórios de cada grupo
    const query = `
      SELECT 
        g.id, 
        g.nome, 
        ARRAY_AGG(t.id ORDER BY t.numero) FILTER (WHERE t.id IS NOT NULL) as territorio_ids
      FROM 
        grupos g
      LEFT JOIN 
        territorios t ON g.id = t.grupo_id
      GROUP BY 
        g.id
      ORDER BY 
        g.nome ASC;
    `;
    const todosGrupos = await pool.query(query);
    res.json(todosGrupos.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Erro ao listar grupos.' });
  }
});

// Endpoint especial para ASSOCIAR territórios a um grupo
app.put('/grupos/:id/associar-territorios', async (req, res) => {
 const client = await pool.connect();
 try {
     const { id: grupo_id } = req.params;
     const { territorio_ids } = req.body; // Esperamos um array de IDs

     await client.query('BEGIN');

     // 1. Primeiro, desassociamos todos os territórios deste grupo (limpa o estado atual)
     await client.query("UPDATE territorios SET grupo_id = NULL WHERE grupo_id = $1", [grupo_id]);

     // 2. Depois, associamos os novos territórios selecionados
     if (territorio_ids && territorio_ids.length > 0) {
         // "ANY($1)" é uma forma eficiente de fazer UPDATE em múltiplos IDs
         await client.query("UPDATE territorios SET grupo_id = $1 WHERE id = ANY($2)", [grupo_id, territorio_ids]);
     }

     await client.query('COMMIT');
     res.status(200).json({ message: 'Grupo atualizado com sucesso.' });
 } catch (error) {
     await client.query('ROLLBACK');
     console.error(error.message);
     res.status(500).json({ error: 'Erro ao associar territórios ao grupo.' });
 } finally {
     client.release();
 }
});

// Rota para CRIAR uma nova designação (designar um território)
app.post('/designacoes', async (req, res) => {
  // Inicia um "cliente" para controlar a transação
  const client = await pool.connect();

  try {
    const { territorio_id, pessoa_id, data_saida, campanha_id } = req.body;

    // Inicia a transação
    await client.query('BEGIN');

    // 1. Verifica se o território está disponível
    const territorioStatusQuery = 'SELECT status FROM territorios WHERE id = $1';
    const territorioRes = await client.query(territorioStatusQuery, [territorio_id]);
    
    if (territorioRes.rows.length === 0) {
      throw new Error('Território não encontrado.');
    }

    const statusAtual = territorioRes.rows[0].status;
    if (statusAtual !== 'Disponível') {
      throw new Error('O território não está disponível para designação.');
    }

    // 2. Atualiza o status do território para "Em campo"
    const updateTerritorioQuery = 'UPDATE territorios SET status = $1 WHERE id = $2';
    await client.query('UPDATE territorios SET status = $1 WHERE id = $2', ['Em campo', territorio_id]);

    // 3. Insere o novo registro na tabela de designações
const novaDesignacaoQuery = `
      INSERT INTO designacoes (territorio_id, pessoa_id, data_saida, campanha_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [territorio_id, pessoa_id, data_saida, campanha_id]; // campanha_id pode ser null
    const novaDesignacao = await client.query(novaDesignacaoQuery, values);

    await client.query('COMMIT');
    res.status(201).json(novaDesignacao.rows[0]);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar designação:', error.message);
    res.status(error.message.includes('disponível') ? 400 : 500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Rota para ATUALIZAR uma designação (devolver um território)
app.put('/designacoes/devolver', async (req, res) => {
  const client = await pool.connect();

  try {
    const { territorio_id, data_devolucao } = req.body;

    // Validação dos dados de entrada
    if (!territorio_id || !data_devolucao) {
      return res.status(400).json({ error: 'ID do território e data de devolução são obrigatórios.' });
    }

    await client.query('BEGIN');

    // 1. Encontra a designação ATIVA para este território (onde data_devolucao é nula)
    const findDesignacaoQuery = `
      SELECT id FROM designacoes 
      WHERE territorio_id = $1 AND data_devolucao IS NULL;
    `;
    const designacaoResult = await client.query(findDesignacaoQuery, [territorio_id]);

    if (designacaoResult.rows.length === 0) {
      throw new Error('Não foi encontrada uma designação ativa para este território.');
    }
    const designacao_id = designacaoResult.rows[0].id;

    // 2. Atualiza a designação com a data de devolução
    const updateDesignacaoQuery = `
      UPDATE designacoes 
      SET data_devolucao = $1 
      WHERE id = $2 
      RETURNING *;
    `;
    const designacaoAtualizada = await client.query(updateDesignacaoQuery, [data_devolucao, designacao_id]);

    // 3. Atualiza o status do território de volta para "Disponível"
    const updateTerritorioQuery = 'UPDATE territorios SET status = $1 WHERE id = $2';
    await client.query(updateTerritorioQuery, ['Disponível', territorio_id]);

    // Efetiva a transação
    await client.query('COMMIT');

    res.status(200).json(designacaoAtualizada.rows[0]);

  } catch (error) {
    // Desfaz tudo em caso de erro
    await client.query('ROLLBACK');
    console.error('Erro ao devolver território:', error.message);
    res.status(error.message.includes('designação ativa') ? 404 : 500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Rota para buscar as estatísticas do Dashboard
app.get('/dashboard/stats', async (req, res) => {
  try {
    // Consulta 1: Contagens gerais
    const countsQuery = `
      SELECT
        COUNT(*) AS total,
        COUNT(CASE WHEN status = 'Em campo' THEN 1 END) AS em_campo,
        COUNT(CASE WHEN status = 'Disponível' THEN 1 END) AS disponivel
      FROM territorios;
    `;

    // Consulta 2: Territórios atrasados (em campo há mais de 4 meses)
    // Usamos a data atual de '2025-09-09' como referência, ajuste se necessário.
    const overdueQuery = `
      SELECT 
        t.numero,
        p.nome AS pessoa_nome,
        d.data_saida
      FROM 
        territorios t
      JOIN 
        designacoes d ON t.id = d.territorio_id AND d.data_devolucao IS NULL
      JOIN 
        pessoas p ON d.pessoa_id = p.id
      WHERE 
        t.status = 'Em campo' AND d.data_saida <= NOW() - INTERVAL '4 months'
      ORDER BY 
        d.data_saida ASC;
    `;

    // Consulta 3: Sugestões para designação (disponíveis há mais tempo)
    const suggestionsQuery = `
      SELECT 
        t.numero,
        (SELECT MAX(d_hist.data_devolucao) FROM designacoes d_hist WHERE d_hist.territorio_id = t.id) AS ultima_devolucao
      FROM 
        territorios t
      WHERE 
        t.status = 'Disponível'
      ORDER BY 
        ultima_devolucao ASC NULLS FIRST
      LIMIT 5;
    `;

    // Executa todas as consultas em paralelo para máxima eficiência
    const [countsResult, overdueResult, suggestionsResult] = await Promise.all([
      pool.query(countsQuery),
      pool.query(overdueQuery),
      pool.query(suggestionsQuery)
    ]);

    // Monta o objeto de resposta final
    const dashboardData = {
      counts: countsResult.rows[0],
      overdueTerritories: overdueResult.rows,
      assignmentSuggestions: suggestionsResult.rows
    };

    res.status(200).json(dashboardData);

  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// --- ROTAS DE CAMPANHAS ---

// LISTAR todas as campanhas
app.get('/campanhas', async (req, res) => {
  try {
    // Esta query agora usa sub-consultas para calcular o progresso de cada campanha
    const query = `
      SELECT
        c.*,
        (
          SELECT COUNT(DISTINCT d.territorio_id)
          FROM designacoes d
          WHERE d.campanha_id = c.id
        ) AS trabalhados_count,
        (
          (SELECT COUNT(*) FROM territorios)
        ) AS total_territorios
      FROM
        campanhas c
      ORDER BY
        c.data_inicio DESC;
    `;
    const todasCampanhas = await pool.query(query);

    // Adicionamos a contagem de 'faltam' aqui no código para simplicidade
    const campanhasCompletas = todasCampanhas.rows.map(campanha => {
        const trabalhados = parseInt(campanha.trabalhados_count, 10);
        const total = parseInt(campanha.total_territorios, 10);
        return {
            ...campanha,
            faltam_count: total - trabalhados
        };
    });

    res.status(200).json(campanhasCompletas);
  } catch (error) {
    console.error('Erro ao listar campanhas:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// CRIAR uma nova campanha
app.post('/campanhas', async (req, res) => {
  try {
    const { titulo, data_inicio, data_fim } = req.body;
    if (!titulo || !data_inicio || !data_fim) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }
    const novaCampanhaQuery = `
      INSERT INTO campanhas (titulo, data_inicio, data_fim) 
      VALUES ($1, $2, $3) 
      RETURNING *;
    `;
    const novaCampanha = await pool.query(novaCampanhaQuery, [titulo, data_inicio, data_fim]);
    res.status(201).json(novaCampanha.rows[0]);
  } catch (error) {
    console.error('Erro ao criar campanha:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// ATUALIZAR uma campanha
app.put('/campanhas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { titulo, data_inicio, data_fim } = req.body;
        if (!titulo || !data_inicio || !data_fim) {
            return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
        }
        const updateQuery = `
            UPDATE campanhas 
            SET titulo = $1, data_inicio = $2, data_fim = $3 
            WHERE id = $4 
            RETURNING *;
        `;
        const campanhaAtualizada = await pool.query(updateQuery, [titulo, data_inicio, data_fim, id]);
        if (campanhaAtualizada.rows.length === 0) {
            return res.status(404).json({ error: 'Campanha não encontrada.' });
        }
        res.status(200).json(campanhaAtualizada.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar campanha:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});


// DELETAR uma campanha
app.delete('/campanhas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const campanhaDeletada = await pool.query('DELETE FROM campanhas WHERE id = $1 RETURNING *;', [id]);
    if (campanhaDeletada.rows.length === 0) {
      return res.status(404).json({ error: 'Campanha não encontrada.' });
    }
    res.status(200).json({ message: 'Campanha deletada com sucesso.' });
  } catch (error) {
    console.error('Erro ao deletar campanha:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// 6. Iniciando o Servidor
app.listen(port, () => {
  console.log(`Servidor backend rodando em http://localhost:${port}`);
});